<?php

namespace Tests\Feature;

use App\Http\Controllers\AssessmentAttemptController;
use App\Models\ApplicantProfile;
use App\Models\AssessmentAttempt;
use App\Models\CompanyAssessment;
use App\Models\EmployerProfile;
use App\Models\User;
use App\Notifications\AssessmentModerated;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Patent Fig. 2 (200): a guest (202) can only browse; the administrator portal
 * (230) validates companies (231) and moderates assessments (232).
 */
class Figure2RolesTest extends TestCase
{
    use RefreshDatabase;

    private User $hr;

    private EmployerProfile $company;

    private CompanyAssessment $test;

    protected function setUp(): void
    {
        parent::setUp();
        $this->hr = User::factory()->create(['role' => 'employer']);
        $this->company = EmployerProfile::create(['user_id' => $this->hr->id, 'company_name' => 'NovaByte', 'email_verified' => true, 'verification_status' => 'approved']);
        $this->test = $this->company->assessments()->create(['title' => 'React test', 'role' => 'Dev', 'skill' => 'React', 'question_count' => 3,
            'duration_minutes' => 10, 'passing_score' => 70, 'status' => 'Active',
            'questions' => array_fill(0, 3, ['prompt' => 'Q', 'options' => ['right', 'wrong'], 'answer' => 0])]);
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function moderate(string $decision, ?string $note = null, ?User $as = null)
    {
        return $this->actingAs($as ?? $this->admin())->post("/admin/assessments/{$this->test->id}", ['decision' => $decision, 'note' => $note]);
    }

    public function test_202_a_guest_browses_open_jobs_from_verified_companies_only(): void
    {
        $this->company->jobPosts()->create(['title' => 'Frontend Dev', 'status' => 'Open', 'required_skills' => ['React'], 'company_assessment_id' => $this->test->id]);
        $this->company->jobPosts()->create(['title' => 'Closed role', 'status' => 'Closed', 'required_skills' => ['CSS']]);
        $shadyHr = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(['user_id' => $shadyHr->id, 'company_name' => 'Unverified Co', 'email_verified' => false])
            ->jobPosts()->create(['title' => 'Shady role', 'status' => 'Open', 'required_skills' => ['Cash']]);

        $this->get('/jobs')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
            ->has('publicJobs', 1)
            ->where('publicJobs.0.title', 'Frontend Dev')
            ->where('publicJobs.0.assessment', 'React test')
            ->missing('publicJobs.0.score')     // no match score for a guest
            ->missing('account'));
    }

    public function test_202_a_guest_cannot_apply_and_a_signed_in_applicant_is_sent_to_find_jobs(): void
    {
        $job = $this->company->jobPosts()->create(['title' => 'Frontend Dev', 'status' => 'Open', 'required_skills' => ['React']]);
        $this->post("/applications/{$job->id}", ['status' => 'applied'])->assertRedirect('/login');

        $seeker = User::factory()->create(['role' => 'jobseeker']);
        $this->actingAs($seeker)->get('/jobs')->assertRedirect('/dashboard?tab=browse');
    }

    public function test_232_the_admin_sees_every_test_with_its_answer_key_and_warnings(): void
    {
        $this->test->update(['questions' => [
            ['prompt' => 'Pick one', 'options' => ['Yes', 'yes ', 'No'], 'answer' => 0],
            ['prompt' => 'Pick one', 'options' => ['A', 'B'], 'answer' => 1],
            ['prompt' => 'Third', 'options' => ['A', 'B'], 'answer' => 0],
        ]]);
        $seeker = ApplicantProfile::create(['user_id' => User::factory()->create(['role' => 'jobseeker'])->id]);
        foreach (range(1, 5) as $i) {
            AssessmentAttempt::create(['company_assessment_id' => $this->test->id, 'applicant_profile_id' => $seeker->id, 'score' => 100, 'passed' => true]);
        }

        $a = $this->actingAs($this->admin())->get('/admin')->viewData('page')['props']['account']['assessments'][0];
        $this->assertSame([0, 1, 0], array_column($a['questions'], 'answer'));
        $this->assertSame(['Question 1 has two identical options.', 'Question 2 repeats question 1.',
            'Everyone passed (5 of 5): it may be too easy to prove the skill.'], $a['flags']);

        // Not for anyone else.
        $this->actingAs($this->hr)->get('/admin')->assertForbidden();
    }

    public function test_232_suspending_needs_a_reason_stops_badges_hides_the_test_and_tells_the_company(): void
    {
        Notification::fake();
        $this->moderate('suspend')->assertSessionHasErrors('note');
        $this->moderate('suspend', 'Question 2 key is wrong')->assertSessionHas('success');
        $this->test->refresh();
        $this->assertSame(['Suspended', 'Question 2 key is wrong'], [$this->test->status, $this->test->moderation_note]);
        Notification::assertSentTo($this->hr, AssessmentModerated::class);

        $seekerUser = User::factory()->create(['role' => 'jobseeker']);
        ApplicantProfile::create(['user_id' => $seekerUser->id]);
        $this->actingAs($seekerUser)->post("/assessments/{$this->test->id}/start")->assertSessionHas('error');
        $this->assertSame([], $this->actingAs($seekerUser)->get('/dashboard')->viewData('page')['props']['account']['assessments']);

        $card = $this->actingAs($this->hr)->get('/dashboard')->viewData('page')['props']['account']['assessments'][0];
        $this->assertSame(['Suspended', 'Question 2 key is wrong'], [$card['status'], $card['moderationNote']]);

        $this->moderate('reinstate')->assertSessionHas('success');
        $this->assertSame('Active', $this->test->fresh()->status);
        $this->moderate('reinstate')->assertSessionHas('error');   // already active
    }

    public function test_232_a_test_suspended_mid_attempt_issues_no_badge_and_its_tasks_wait(): void
    {
        $seekerUser = User::factory()->create(['role' => 'jobseeker']);
        $profile = ApplicantProfile::create(['user_id' => $seekerUser->id]);
        $this->actingAs($seekerUser)->post("/assessments/{$this->test->id}/start");
        $answers = collect(session(AssessmentAttemptController::orderKey($this->test)))->map(fn ($i) => array_search(0, $i['o'], true))->all();
        $this->moderate('suspend', 'Under review');

        $this->actingAs($seekerUser)->post("/assessments/{$this->test->id}/attempt", ['answers' => $answers])->assertSessionHas('error');
        $this->assertFalse($profile->skills()->where('verification_status', 'verified')->exists());

        // A practical task already submitted cannot be scored into a badge while suspended.
        Storage::fake('local');
        $this->test->update(['task_prompt' => 'Build it', 'rubric' => [['criterion' => 'A', 'points' => 5], ['criterion' => 'B', 'points' => 5]]]);
        $t = AssessmentAttempt::create(['company_assessment_id' => $this->test->id, 'applicant_profile_id' => $profile->id, 'score' => 0, 'passed' => false, 'status' => 'pending_review']);
        $this->actingAs($this->hr)->post("/assessment-attempts/{$t->id}/review", ['scores' => [5, 5]])->assertSessionHas('error');
        $this->assertSame('pending_review', $t->fresh()->status);
    }

    public function test_only_admins_moderate(): void
    {
        $this->moderate('suspend', 'x', $this->hr)->assertForbidden();
        $this->assertSame('Active', $this->test->fresh()->status);
    }
}
