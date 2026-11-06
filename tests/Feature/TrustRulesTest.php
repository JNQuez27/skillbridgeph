<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\Credential;
use App\Models\EmployerProfile;
use App\Models\JobPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * "Smart hiring starts with verified skills" only holds if nobody can
 * verify themselves. Each test is one way a badge or a verdict could be faked.
 */
class TrustRulesTest extends TestCase
{
    use RefreshDatabase;

    private function employer(bool $verified = true): User
    {
        $user = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(['user_id' => $user->id, 'company_name' => 'Acme', 'email_verified' => $verified]);

        return $user->fresh();
    }

    private function applicant(): User
    {
        $user = User::factory()->create(['role' => 'jobseeker']);
        ApplicantProfile::create(['user_id' => $user->id, 'location' => 'Davao City', 'experience_level' => 'Entry']);

        return $user->fresh();
    }

    private function job(User $employer): JobPost
    {
        return $employer->employerProfile->jobPosts()->create([
            'title' => 'Frontend Dev', 'location_city' => 'Davao City', 'employment_type' => 'Full-time',
            'work_setup' => 'On-site', 'description' => 'x', 'responsibilities' => 'x',
            'required_skills' => ['React'], 'preferred_skills' => [], 'experience_level' => 'Entry', 'status' => 'Open',
        ]);
    }

    private function questions(): array
    {
        return array_fill(0, 3, ['prompt' => 'Q?', 'options' => ['a', 'b'], 'answer' => 1]);
    }

    public function test_employer_cannot_mark_itself_verified(): void
    {
        $employer = $this->employer(false);
        $this->actingAs($employer)->put('/employer-profile', ['companyName' => 'Acme', 'emailVerified' => true]);

        $this->assertFalse($employer->employerProfile->fresh()->email_verified);
    }

    public function test_unverified_company_cannot_publish_badge_issuing_assessment(): void
    {
        $this->actingAs($this->employer(false))->post('/assessments', [
            'title' => 'T', 'role' => 'R', 'skill' => 'React', 'durationMinutes' => 10, 'passingScore' => 70,
            'questions' => $this->questions(),
        ])->assertSessionHasErrors('assessment');

        $this->assertDatabaseCount('company_assessments', 0);
    }

    public function test_typed_skills_are_self_reported_and_verified_ones_survive_edits(): void
    {
        $user = $this->applicant();
        $profile = $user->applicantProfile;
        $profile->skills()->create(['name' => 'Laravel', 'level' => 90, 'verification_status' => 'verified']);

        $this->actingAs($user)->put('/applicant-profile', ['skills' => ['React']]);

        $skills = $profile->skills()->pluck('verification_status', 'name');
        $this->assertSame('pending', $skills['React']);
        $this->assertSame('verified', $skills['Laravel']); // not removable by editing the list
    }

    public function test_questions_are_hidden_until_the_server_clock_starts(): void
    {
        $employer = $this->employer();
        $assessment = $employer->employerProfile->assessments()->create([
            'title' => 'T', 'role' => 'R', 'skill' => 'React', 'question_count' => 3, 'duration_minutes' => 10,
            'passing_score' => 70, 'questions' => $this->questions(), 'status' => 'Active',
        ]);
        $user = $this->applicant();

        $before = $this->actingAs($user)->get('/dashboard')->viewData('page')['props']['account']['assessments'][0]['assessments'][0];
        $this->assertEmpty($before['questions']);

        $this->actingAs($user)->post("/assessments/{$assessment->id}/start");
        $after = $this->actingAs($user)->get('/dashboard')->viewData('page')['props']['account']['assessments'][0]['assessments'][0];
        $this->assertCount(3, $after['questions']);
        $this->assertArrayNotHasKey('answer', $after['questions'][0]);
    }

    public function test_evidence_review_needs_an_engaged_candidate_and_locks_the_file(): void
    {
        $employer = $this->employer();
        $job = $this->job($employer);
        $user = $this->applicant();
        $profile = $user->applicantProfile;
        $file = Credential::create([
            'applicant_profile_id' => $profile->id, 'type' => 'portfolio', 'original_name' => 'p.pdf',
            'path' => 'credentials/p.pdf', 'mime' => 'application/pdf', 'size' => 1, 'sha256' => str_repeat('a', 64),
        ]);
        $verify = fn () => $this->actingAs($employer)->post("/job-posts/{$job->id}/verify-skill/{$profile->id}", ['skill' => 'React', 'credentialId' => $file->id]);

        $verify()->assertForbidden(); // never applied or invited

        Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $profile->id, 'status' => 'applied']);
        $verify();

        $skill = $profile->skills()->where('name', 'React')->first();
        $this->assertSame('verified', $skill->verification_status);
        $this->assertSame('Acme', $skill->verified_by);
        $this->assertSame($file->id, $skill->evidence_credential_id);

        $this->actingAs($user)->delete("/credentials/{$file->id}");
        $this->assertDatabaseHas('credentials', ['id' => $file->id]);
    }

    public function test_manual_hire_requires_every_document_reviewed_and_applicant_cannot_undo_it(): void
    {
        $employer = $this->employer();
        $job = $this->job($employer);
        $user = $this->applicant();
        $profile = $user->applicantProfile;
        $file = Credential::create([
            'applicant_profile_id' => $profile->id, 'type' => 'resume', 'original_name' => 'cv.pdf',
            'path' => 'credentials/cv.pdf', 'mime' => 'application/pdf', 'size' => 1, 'sha256' => str_repeat('b', 64),
        ]);
        Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $profile->id, 'status' => 'applied']);
        $hire = fn ($checked) => $this->actingAs($employer)->post("/job-posts/{$job->id}/hire/{$profile->id}", ['mode' => 'manual', 'checked' => $checked]);

        $hire([])->assertSessionHasErrors('hire');
        $hire([$file->id]);
        $this->assertDatabaseHas('applications', ['applicant_profile_id' => $profile->id, 'status' => 'hired']);

        $this->actingAs($user)->post("/applications/{$job->id}", ['status' => 'saved']);
        $this->assertDatabaseHas('applications', ['applicant_profile_id' => $profile->id, 'status' => 'hired']);
    }
}
