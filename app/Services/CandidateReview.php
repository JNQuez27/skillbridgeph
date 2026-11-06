<?php

namespace App\Services;

use App\Models\ApplicantProfile;
use App\Models\Credential;
use App\Models\JobPost;

/**
 * Turns the provenance signals into an explainable Green / Amber / Red status
 * for one candidate against one job.
 *
 * This is NOT a claim that documents are authentic — it reports whether the
 * checks we can actually run came back clean. Every status carries its reasons
 * so an employer can see exactly why, and Amber/Red force a manual read.
 */
class CandidateReview
{
    public const GREEN = 'green';
    public const AMBER = 'amber';
    public const RED = 'red';

    public function for(JobPost $job, ApplicantProfile $applicant): array
    {
        $applicant->loadMissing(['skills', 'credentials']);

        $required = collect($job->required_skills ?? [])->map(fn ($s) => mb_strtolower($s));
        $verified = collect($applicant->verifiedSkillNames())->map(fn ($s) => mb_strtolower($s));
        // A required skill verified below the job's minimum level (Fig. 6, step 610) is not yet met.
        $levels = $applicant->skills->where('verification_status', 'verified')
            ->mapWithKeys(fn ($s) => [mb_strtolower($s->name) => (int) $s->level]);
        $missing = $required->reject(fn ($s) => $verified->contains($s)
            && (($min = $job->settingFor($s)['minLevel']) === null || $levels->get($s, 0) >= $min))->values();

        $credentials = $applicant->credentials;
        $hashes = $credentials->pluck('sha256')->filter();
        $duplicate = $hashes->isNotEmpty() && Credential::whereIn('sha256', $hashes)
            ->where('applicant_profile_id', '!=', $applicant->id)
            ->exists();

        // Certificates an admin checked against the TESDA/PRC registry.
        $registryFailed = $credentials->where('registry_status', 'rejected');
        $registryConfirmed = $credentials->where('registry_status', 'verified');

        // A demo video counts only if it was recorded in SkillBridge with live prompts.
        $videoUnverified = $credentials->where('type', 'video')->contains(fn ($c) => empty($c->recording_prompts));
        // This employer's interviewer saw a different person from the one in the video.
        $videoMismatch = \App\Models\Application::where('job_post_id', $job->id)
            ->where('applicant_profile_id', $applicant->id)
            ->where('video_identity', 'mismatch')->exists();

        $reasons = [];
        $status = self::GREEN;

        // Red — something actively contradicts the claim.
        if ($duplicate) {
            $status = self::RED;
            $reasons[] = ['level' => self::RED, 'text' => 'A document was also uploaded by a different account'];
        }
        if ($videoMismatch) {
            $status = self::RED;
            $reasons[] = ['level' => self::RED, 'text' => 'Interviewer reported the demo video shows a different person'];
        }
        if ($registryFailed->isNotEmpty()) {
            $status = self::RED;
            $reasons[] = ['level' => self::RED, 'text' => 'A certificate was not confirmed in the '
                .$registryFailed->map(fn ($c) => strtoupper($c->registry))->unique()->implode('/').' registry'];
        }
        if ($verified->isEmpty()) {
            $status = self::RED;
            $reasons[] = ['level' => self::RED, 'text' => 'No skill has been verified yet'];
        }

        // Amber — nothing wrong, but not fully evidenced either.
        if ($status !== self::RED) {
            if ($missing->isNotEmpty()) {
                $status = self::AMBER;
                $reasons[] = ['level' => self::AMBER, 'text' => 'Not verified at the required level yet: '.$missing->implode(', ')];
            }
            if ($credentials->isEmpty()) {
                $status = self::AMBER;
                $reasons[] = ['level' => self::AMBER, 'text' => 'No credentials uploaded'];
            }
            if ($videoUnverified) {
                $status = self::AMBER;
                $reasons[] = ['level' => self::AMBER, 'text' => 'Demo video was not recorded in SkillBridge with live prompts'];
            }
        }

        if ($status === self::GREEN) {
            $reasons[] = ['level' => self::GREEN, 'text' => 'All required skills verified'];
            $reasons[] = ['level' => self::GREEN, 'text' => $credentials->count().' credential(s) on file, none reused'];
        }
        if ($status !== self::RED && $registryConfirmed->isNotEmpty()) {
            $reasons[] = ['level' => self::GREEN, 'text' => $registryConfirmed->count().' certificate(s) confirmed in the '
                .$registryConfirmed->map(fn ($c) => strtoupper($c->registry))->unique()->implode('/').' registry'];
        }

        return [
            'status' => $status,
            'reasons' => $reasons,
            'canAutoApprove' => $status === self::GREEN,
            'requiredSkills' => $required->count(),
            'verifiedRequired' => $required->count() - $missing->count(),
        ];
    }
}
