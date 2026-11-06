<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\AssessmentAttempt;
use App\Models\EmployerProfile;
use App\Models\JobPost;
use App\Models\User;
use App\Notifications\ApplicationStatusChanged;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Patent Fig. 7 (700): browse with filters (705-710) -> job shows the applicant's
 * standing per skill (715) -> apply (720) -> attached assessment (725-730) ->
 * badges and portfolio go with it (735) -> employer moves it (740-750) -> the
 * applicant is notified in the app and by email (760).
 */
class Figure7ApplyTest extends TestCase
{
    use RefreshDatabase;

    private User $hr;

    private User $seeker;

    private ApplicantProfile $profile;

    private JobPost $job;

    protected function setUp(): void
    {
        parent::setUp();
        $this->hr = User::factory()->create(['role' => 'employer']);
        $company = EmployerProfile::create(['user_id' => $this->hr->id, 'company_name' => 'NovaByte', 'email_verified' => true, 'verification_status' => 'approved']);
        $test = $company->assessments()->create(['title' => 'React test', 'role' => 'Dev', 'skill' => 'React',
            'question_count' => 3, 'duration_minutes' => 10, 'passing_score' => 70, 'status' => 'Active', 'questions' => []]);
        $this->job = $company->jobPosts()->create(['title' => 'Frontend Dev', 'status' => 'Open', 'location_city' => 'Davao City',
            'work_setup' => 'On-site', 'employment_type' => 'Full-time', 'experience_level' => 'Entry',
            'required_skills' => ['React', 'CSS', 'Git'], 'preferred_skills' => ['Figma'],
            'skill_settings' => ['git' => ['weight' => 3, 'minLevel' => 85]], 'company_assessment_id' => $test->id]);

        $this->seeker = User::factory()->create(['role' => 'jobseeker']);
        $this->profile = ApplicantProfile::create(['user_id' => $this->seeker->id, 'location' => 'Davao City', 'experience_level' => 'Entry']);
        $this->profile->skills()->create(['name' => 'React', 'level' => 80, 'verification_status' => 'verified']);
        $this->profile->skills()->create(['name' => 'CSS', 'level' => 60, 'verification_status' => 'pending']);
        $this->profile->skills()->create(['name' => 'Git', 'level' => 70, 'verification_status' => 'verified']);   // below the 85 minimum
    }

    private function browse(): array
    {
        return collect($this->actingAs($this->seeker)->get('/dashboard')->viewData('page')['props']['account']['browse'])
            ->firstWhere('id', $this->job->id);
    }

    private function stage(string $status)
    {
        return $this->actingAs($this->hr)->post("/job-posts/{$this->job->id}/stage/{$this->profile->id}", ['status' => $status]);
    }

    public function test_715_each_skill_on_the_job_shows_the_applicants_standing(): void
    {
        $states = collect($this->browse()['skillStates'])->pluck('state', 'name')->all();

        $this->assertSame(['React' => 'verified', 'CSS' => 'claimed', 'Git' => 'below', 'Figma' => 'missing'], $states);
    }

    public function test_730_the_attached_assessment_and_the_applicants_standing_travel_with_the_job(): void
    {
        $this->assertSame(['title' => 'React test', 'passed' => false, 'locked' => false, 'left' => 3],
            array_intersect_key($this->browse()['assessment'], array_flip(['title', 'passed', 'locked', 'left'])));

        AssessmentAttempt::create(['company_assessment_id' => $this->job->company_assessment_id, 'applicant_profile_id' => $this->profile->id, 'score' => 90, 'passed' => true]);
        $this->assertTrue($this->browse()['assessment']['passed']);
    }

    public function test_720_to_735_applying_needs_no_resume_and_names_the_proof_and_the_required_assessment(): void
    {
        Notification::fake();
        $this->profile->credentials()->create(['type' => 'portfolio', 'title' => 'Site', 'original_name' => 'x.pdf', 'path' => 'x.pdf', 'mime' => 'application/pdf', 'size' => 10]);

        $this->actingAs($this->seeker)->post("/applications/{$this->job->id}", ['status' => 'applied'])
            ->assertSessionHas('success', 'Application sent with your 2 verified badge(s) and 1 file(s). No resume needed. This job also asks you to take the "React test" assessment.');

        $this->actingAs($this->seeker)->post("/applications/{$this->job->id}", ['status' => 'applied'])
            ->assertSessionHas('success', 'You already applied for this job.');
        Notification::assertSentToTimes($this->seeker, ApplicationStatusChanged::class, 1);
    }

    public function test_740_to_760_every_status_change_notifies_the_applicant_in_app_and_by_email(): void
    {
        Notification::fake();
        $this->actingAs($this->seeker)->post("/applications/{$this->job->id}", ['status' => 'applied']);
        $this->stage('shortlisted')->assertSessionHas('success');
        $this->stage('interviewing');
        $this->stage('not_selected')->assertSessionHas('success', fn ($m) => str_contains($m, 'marked not selected'));

        $sent = [];
        Notification::assertSentTo($this->seeker, ApplicationStatusChanged::class, function ($n, $channels) use (&$sent) {
            $this->assertSame(['database', 'mail'], $channels);
            $sent[] = $n->toArray($this->seeker)['status'];

            return true;
        });
        $this->assertSame(['applied', 'shortlisted', 'interviewing', 'not_selected'], $sent);
    }

    public function test_760_the_in_app_bell_lists_updates_and_marks_them_read(): void
    {
        $this->actingAs($this->seeker)->post("/applications/{$this->job->id}", ['status' => 'applied']);
        $this->travel(5)->minutes();   // timestamps are per second; real stage changes are minutes apart
        $this->stage('shortlisted');

        $bell = $this->actingAs($this->seeker)->get('/dashboard')->viewData('page')['props']['notifications'];
        $this->assertSame(2, $bell['unread']);
        $this->assertSame('You were shortlisted for Frontend Dev at NovaByte.', $bell['items'][0]['text']);

        $this->actingAs($this->seeker)->post('/notifications/read');
        $this->assertSame(0, $this->seeker->fresh()->unreadNotifications()->count());
        $this->assertSame(0, $this->hr->notifications()->count());   // only the applicant is told
    }

    public function test_not_selected_is_final_for_the_applicant_and_closed_to_hired_candidates(): void
    {
        $this->actingAs($this->seeker)->post("/applications/{$this->job->id}", ['status' => 'applied']);
        $this->stage('not_selected');

        // Re-applying cannot undo the employer's decision.
        $this->actingAs($this->seeker)->post("/applications/{$this->job->id}", ['status' => 'applied']);
        $this->assertSame('not_selected', Application::first()->status);

        // The employer can still read the record (still engaged) and a hire cannot be undone this way.
        $this->assertContains('not_selected', Application::ENGAGED);
        Application::first()->update(['status' => 'hired']);
        $this->stage('not_selected')->assertSessionHas('error');
        $this->assertSame('hired', Application::first()->status);
    }

    public function test_the_stage_endpoint_only_accepts_known_stages_from_the_jobs_own_employer(): void
    {
        $this->actingAs($this->seeker)->post("/applications/{$this->job->id}", ['status' => 'applied']);
        $this->stage('hired')->assertSessionHasErrors('status');

        $other = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(['user_id' => $other->id, 'company_name' => 'Other', 'email_verified' => true, 'verification_status' => 'approved']);
        $this->actingAs($other)->post("/job-posts/{$this->job->id}/stage/{$this->profile->id}", ['status' => 'not_selected'])->assertForbidden();
        $this->assertSame('applied', Application::first()->status);
    }
}
