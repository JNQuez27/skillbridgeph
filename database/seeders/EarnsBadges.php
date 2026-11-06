<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\ApplicantProfile;
use App\Models\AssessmentAttempt;
use App\Models\CompanyAssessment;
use App\Models\Credential;
use App\Models\JobPost;
use Illuminate\Support\Facades\Storage;

/**
 * Demo badges are earned exactly the way the platform grants them, so every
 * badge a viewer opens is backed by a real record:
 *  - assessment: a passed attempt on that company's assessment (AssessmentAttemptController)
 *  - evidence:   an engaged application to that company's role, the skill listed on
 *                the role, and an uploaded file as evidence (PipelineController::verifySkill)
 * Skills that cannot be earned either way stay self-reported.
 */
trait EarnsBadges
{
    /** Typed skills only: nothing is verified until earned below. */
    protected function claimSkills(ApplicantProfile $profile, array $names): void
    {
        $profile->skills()->delete();
        foreach ($names as $name) {
            $profile->skills()->create(['name' => $name, 'level' => 0, 'verification_status' => 'pending', 'verification_method' => 'assessment']);
        }
    }

    /** Pass a seeded company assessment with this score, some days ago. */
    protected function earnByAssessment(ApplicantProfile $profile, string $assessmentTitle, int $score, int $daysAgo): void
    {
        $assessment = CompanyAssessment::with('employerProfile')->where('title', $assessmentTitle)->firstOrFail();
        throw_unless($score >= $assessment->passing_score, \LogicException::class, "{$assessmentTitle}: {$score} is below the pass mark");
        $at = now()->subDays($daysAgo)->setTime(14, 30);

        $attempt = AssessmentAttempt::firstOrNew(['company_assessment_id' => $assessment->id, 'applicant_profile_id' => $profile->id, 'passed' => true]);
        $attempt->forceFill(['score' => $score, 'seconds_taken' => 420 + $score, 'created_at' => $at, 'updated_at' => $at])->save();

        $this->grant($profile, $assessment->skill, [
            'verification_method' => 'assessment',
            'verified_by' => $assessment->employerProfile->company_name,
            'verified_at' => $at,
            'assessment_attempt_id' => $attempt->id,
        ], $score);
    }

    /**
     * A failed attempt (Fig. 4, step 445), dated in the past so its 24-hour
     * cooldown is long over. It changes no skill: only the last allowed failed
     * attempt marks a skill unverified (step 460), and these are first attempts.
     */
    protected function failAssessment(ApplicantProfile $profile, string $assessmentTitle, int $score, int $daysAgo): void
    {
        $assessment = CompanyAssessment::where('title', $assessmentTitle)->firstOrFail();
        throw_unless($score < $assessment->passing_score, \LogicException::class, "{$assessmentTitle}: {$score} would pass");
        $at = now()->subDays($daysAgo)->setTime(10, 15);

        $attempt = AssessmentAttempt::firstOrNew(['company_assessment_id' => $assessment->id, 'applicant_profile_id' => $profile->id, 'passed' => false]);
        $attempt->forceFill(['score' => $score, 'seconds_taken' => 600 + $score, 'status' => 'scored', 'created_at' => $at, 'updated_at' => $at])->save();
    }

    /** A company the applicant applied to confirms a skill its role asks for, from an uploaded file. */
    protected function earnByEvidence(ApplicantProfile $profile, string $jobTitle, string $skill, Credential $evidence, int $daysAgo): void
    {
        $job = JobPost::with('employerProfile')->where('title', $jobTitle)->firstOrFail();
        $asked = array_map('mb_strtolower', array_merge($job->required_skills ?? [], $job->preferred_skills ?? []));
        throw_unless(in_array(mb_strtolower($skill), $asked, true), \LogicException::class, "{$jobTitle} does not ask for {$skill}");
        throw_unless(in_array($evidence->type, ['portfolio', 'certificate', 'video'], true) && $evidence->applicant_profile_id === $profile->id,
            \LogicException::class, "Evidence must be the applicant's own portfolio, certificate, or video");

        $application = Application::firstOrNew(['job_post_id' => $job->id, 'applicant_profile_id' => $profile->id]);
        if (! in_array($application->status, Application::ENGAGED, true)) {
            $application->status = 'applied';
        }
        $application->save();

        $this->grant($profile, $skill, [
            'verification_method' => 'portfolio',
            'verified_by' => $job->employerProfile->company_name,
            'verified_at' => now()->subDays($daysAgo)->setTime(10, 0),
            'evidence_credential_id' => $evidence->id,
        ], 70);
    }

    private function grant(ApplicantProfile $profile, string $skill, array $provenance, int $level): void
    {
        $existing = $profile->skills()->whereRaw('LOWER(name) = ?', [mb_strtolower($skill)])->first();
        $values = $provenance + ['verification_status' => 'verified', 'badge' => $skill.' Verified'];
        $existing
            ? $existing->update($values + ['level' => max($existing->level, $level)])
            : $profile->skills()->create($values + ['name' => $skill, 'level' => $level]);
    }

    /** A real, openable one-page PDF uploaded as evidence. */
    protected function evidenceFile(ApplicantProfile $profile, string $type, string $title, string $filename, array $lines, array $skills): Credential
    {
        $pdf = $this->pdf($lines);
        $path = 'credentials/seed-'.md5($profile->id.$filename).'.pdf';
        Storage::disk('local')->put($path, $pdf);

        return $profile->credentials()->updateOrCreate(
            ['applicant_profile_id' => $profile->id, 'original_name' => $filename],
            [
                'type' => $type, 'title' => $title, 'path' => $path, 'mime' => 'application/pdf',
                'size' => strlen($pdf), 'sha256' => hash('sha256', $pdf),
                'meta' => ['mime' => 'application/pdf', 'extension' => 'pdf', 'producer' => 'SkillBridge PH seed'],
                'extracted_skills' => $skills,
            ]
        );
    }

    /** Minimal valid single-page PDF with a correct cross-reference table. */
    protected function pdf(array $lines): string
    {
        $content = "BT /F1 12 Tf 72 720 Td 16 TL\n";
        foreach ($lines as $line) {
            $content .= '('.str_replace(['\\', '(', ')'], ['\\\\', '\\(', '\\)'], $line).") Tj T*\n";
        }
        $content .= 'ET';

        $objects = [
            1 => '<</Type/Catalog/Pages 2 0 R>>',
            2 => '<</Type/Pages/Kids[3 0 R]/Count 1>>',
            3 => '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Resources<</Font<</F1 5 0 R>>>>/Contents 4 0 R>>',
            4 => '<</Length '.strlen($content).">>stream\n".$content."\nendstream",
            5 => '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
        ];
        $pdf = "%PDF-1.4\n";
        $offsets = [];
        foreach ($objects as $n => $body) {
            $offsets[$n] = strlen($pdf);
            $pdf .= $n." 0 obj\n".$body."\nendobj\n";
        }
        $start = strlen($pdf);
        $pdf .= "xref\n0 ".(count($objects) + 1)."\n0000000000 65535 f \n";
        foreach ($objects as $n => $body) {
            $pdf .= sprintf("%010d 00000 n \n", $offsets[$n]);
        }

        return $pdf."trailer\n<</Size ".(count($objects) + 1)."/Root 1 0 R>>\nstartxref\n".$start."\n%%EOF";
    }
}
