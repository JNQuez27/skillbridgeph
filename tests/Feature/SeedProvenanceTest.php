<?php

namespace Tests\Feature;

use App\Models\ApplicantSkill;
use App\Models\Application;
use App\Models\AssessmentAttempt;
use App\Models\Credential;
use App\Models\JobPost;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Every badge in the demo data must be backed by the record that would have created it. */
class SeedProvenanceTest extends TestCase
{
    use RefreshDatabase;

    public function test_every_seeded_badge_was_earned_the_way_the_platform_grants_it(): void
    {
        Storage::fake('local');
        $this->seed();

        $badges = ApplicantSkill::where('verification_status', 'verified')->get();
        $this->assertGreaterThan(20, $badges->count());

        foreach ($badges as $badge) {
            $who = "{$badge->name} for applicant {$badge->applicant_profile_id}";
            $this->assertNotNull($badge->verified_at, $who);
            $this->assertNotSame('Demo data', $badge->verified_by, $who);

            if ($badge->verification_method === 'assessment') {
                // Fig. 1: the badge record links the passed attempt (144) on that
                // company's assessment for this very skill.
                $attempt = $badge->assessmentResult()->with('assessment.employerProfile')->first();
                $this->assertNotNull($attempt, "no linked assessment result behind {$who}");
                $this->assertTrue($attempt->passed, $who);
                $this->assertSame($badge->applicant_profile_id, $attempt->applicant_profile_id, $who);
                $this->assertSame(mb_strtolower($badge->name), mb_strtolower($attempt->assessment->skill), $who);
                $this->assertSame($attempt->assessment->employerProfile->company_name, $badge->verified_by, $who);
                $this->assertGreaterThanOrEqual($attempt->assessment->passing_score, $attempt->score, $who);
            } elseif ($badge->verification_method === 'portfolio') {
                // The applicant's own evidence file, and an engaged application to a role
                // of the confirming company that asks for this skill.
                $evidence = Credential::find($badge->evidence_credential_id);
                $this->assertNotNull($evidence, "no evidence behind {$who}");
                $this->assertSame($badge->applicant_profile_id, $evidence->applicant_profile_id, $who);
                $this->assertContains($evidence->type, ['portfolio', 'certificate', 'video'], $who);

                $roles = JobPost::whereHas('employerProfile', fn ($q) => $q->where('company_name', $badge->verified_by))
                    ->whereIn('id', Application::where('applicant_profile_id', $badge->applicant_profile_id)
                        ->whereIn('status', Application::ENGAGED)->pluck('job_post_id'))
                    ->get()
                    ->filter(fn ($job) => in_array(mb_strtolower($badge->name),
                        array_map('mb_strtolower', array_merge($job->required_skills ?? [], $job->preferred_skills ?? [])), true));
                $this->assertNotEmpty($roles, "{$badge->verified_by} never had a role asking for {$who}");
            } else {
                $this->fail("unexpected verification method '{$badge->verification_method}' on {$who}");
            }
        }

        // Unearned claims stay self-reported rather than being dressed up as badges.
        $this->assertGreaterThan(0, ApplicantSkill::where('verification_status', '!=', 'verified')->count());
    }
}
