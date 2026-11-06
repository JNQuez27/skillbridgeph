<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\CompanyAssessment;
use App\Models\Credential;
use App\Models\EmployerProfile;
use App\Models\JobPost;
use App\Models\User;
use App\Services\CandidateReview;
use App\Services\MatchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * One test per behaviour the platform promises, so a change that breaks one
 * fails here before anyone sees it in the browser.
 */
class CoreFlowsTest extends TestCase
{
    use RefreshDatabase;

    private function employer(bool $verified = true, string $name = 'Acme'): User
    {
        $user = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(['user_id' => $user->id, 'company_name' => $name, 'email_verified' => $verified]);

        return $user->fresh();
    }

    private function applicant(array $verified = [], array $claimed = [], string $location = 'Davao City'): User
    {
        $user = User::factory()->create(['role' => 'jobseeker']);
        $profile = ApplicantProfile::create(['user_id' => $user->id, 'location' => $location, 'experience_level' => 'Entry']);
        foreach ($verified as $s) {
            $profile->skills()->create(['name' => $s, 'level' => 80, 'verification_status' => 'verified']);
        }
        foreach ($claimed as $s) {
            $profile->skills()->create(['name' => $s, 'level' => 0, 'verification_status' => 'pending']);
        }

        return $user->fresh();
    }

    private function job(User $employer, array $required = ['React'], array $preferred = [], string $status = 'Open'): JobPost
    {
        return $employer->employerProfile->jobPosts()->create([
            'title' => 'Frontend Dev', 'location_city' => 'Davao City', 'employment_type' => 'Full-time',
            'work_setup' => 'On-site', 'description' => 'x', 'responsibilities' => 'x',
            'required_skills' => $required, 'preferred_skills' => $preferred, 'experience_level' => 'Entry', 'status' => $status,
        ]);
    }

    private function assessment(User $employer, int $minutes = 10): CompanyAssessment
    {
        return $employer->employerProfile->assessments()->create([
            'title' => 'React test', 'role' => 'Dev', 'skill' => 'React', 'question_count' => 4, 'duration_minutes' => $minutes,
            'passing_score' => 75, 'status' => 'Active',
            'questions' => array_fill(0, 4, ['prompt' => 'Q?', 'options' => ['a', 'b'], 'answer' => 1]),
        ]);
    }

    /** The on-screen answers that are correct for the arrangement this attempt was shown. */
    private function correctAnswersFor(CompanyAssessment $assessment): array
    {
        return array_map(
            fn ($item) => array_search((int) $assessment->questions[$item['q']]['answer'], $item['o'], true),
            session('assessment_order.'.$assessment->id)
        );
    }

    // --- Accounts -----------------------------------------------------------

    public function test_registration_creates_the_right_profile_and_onboarding(): void
    {
        $form = fn ($role, $email) => ['role' => $role, 'firstName' => 'Ana', 'surname' => 'Cruz', 'email' => $email,
            'password' => 'secret123', 'password_confirmation' => 'secret123', 'acceptPrivacy' => true];

        $this->post('/register', $form('jobseeker', 'ana@test.ph'))->assertRedirect('/verify-email');
        $this->assertNotNull(User::where('email', 'ana@test.ph')->first()->applicantProfile);

        $this->post('/logout');
        $this->post('/register', $form('employer', 'hr@test.ph'))->assertRedirect('/verify-email');
        $this->assertNotNull(User::where('email', 'hr@test.ph')->first()->employerProfile);
    }

    public function test_login_rejects_a_wrong_password_and_guests_cannot_open_the_dashboard(): void
    {
        $user = $this->applicant();

        $this->post('/login', ['email' => $user->email, 'password' => 'wrong'])->assertSessionHasErrors('email');
        $this->assertGuest();
        $this->get('/dashboard')->assertRedirect('/login');

        $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($user);
    }

    // --- Matching engine ----------------------------------------------------

    public function test_score_weights_required_preferred_location_and_experience(): void
    {
        $job = $this->job($this->employer(), ['React', 'CSS'], ['Figma']);
        $score = fn (User $u) => app(MatchService::class)->score($job, $u->applicantProfile->load('skills'))['score'];

        $this->assertSame(100, $score($this->applicant(['React', 'CSS', 'Figma'])));            // 60 + 25 + 10 + 5
        $this->assertSame(45, $score($this->applicant(['React'])));                              // 30 + 10 + 5
        $this->assertSame(35, $score($this->applicant(['React'], [], 'Cebu City')));             // 30 + 5, wrong city
        $this->assertSame(33, $score($this->applicant([], ['React'])));                          // claim = 0.6 × 30 + 15
    }

    public function test_verifying_a_skill_never_lowers_a_score(): void
    {
        $job = $this->job($this->employer(), ['React', 'CSS']);
        $user = $this->applicant([], ['React', 'CSS']);
        $profile = $user->applicantProfile;
        $before = app(MatchService::class)->score($job, $profile->load('skills'))['score'];

        $profile->skills()->where('name', 'React')->update(['verification_status' => 'verified']);
        $after = app(MatchService::class)->score($job, $profile->fresh()->load('skills'))['score'];

        $this->assertGreaterThan($before, $after);
    }

    public function test_posting_a_job_flags_it_only_to_fitting_applicants(): void
    {
        $fit = $this->applicant(['React']);
        $misfit = $this->applicant(['Baking'], [], 'Cebu City');

        $this->actingAs($this->employer())->post('/job-posts', [
            'title' => 'React Dev', 'locationCity' => 'Davao City', 'employmentType' => 'Full-time', 'workSetup' => 'On-site',
            'description' => 'x', 'responsibilities' => 'x', 'requiredSkills' => 'React', 'experienceLevel' => 'Entry',
        ])->assertSessionHasNoErrors();

        $this->assertDatabaseHas('applications', ['applicant_profile_id' => $fit->applicantProfile->id, 'status' => 'flagged']);
        $this->assertDatabaseMissing('applications', ['applicant_profile_id' => $misfit->applicantProfile->id]);
    }

    // --- Applying -----------------------------------------------------------

    public function test_applicant_can_apply_to_open_roles_only_and_employers_cannot_apply(): void
    {
        $employer = $this->employer();
        $open = $this->job($employer);
        $closed = $this->job($employer, ['React'], [], 'Closed');
        $user = $this->applicant(['React']);

        $this->actingAs($user)->post("/applications/{$open->id}", ['status' => 'applied']);
        $this->assertDatabaseHas('applications', ['job_post_id' => $open->id, 'status' => 'applied']);

        $this->actingAs($user)->post("/applications/{$closed->id}", ['status' => 'applied'])->assertNotFound();
        $this->actingAs($employer)->post("/applications/{$open->id}", ['status' => 'applied'])->assertForbidden();
    }

    // --- Assessments --------------------------------------------------------

    public function test_passing_an_assessment_verifies_the_skill_with_its_issuer(): void
    {
        $employer = $this->employer();
        $assessment = $this->assessment($employer);
        $user = $this->applicant();

        $this->actingAs($user)->post("/assessments/{$assessment->id}/start");
        $this->actingAs($user)->post("/assessments/{$assessment->id}/attempt", ['answers' => $this->correctAnswersFor($assessment)])
            ->assertSessionHas('success');

        $skill = $user->applicantProfile->skills()->where('name', 'React')->first();
        $this->assertSame('verified', $skill->verification_status);
        $this->assertSame('assessment', $skill->verification_method);
        $this->assertSame('Acme', $skill->verified_by);
    }

    public function test_failed_attempts_reveal_no_score_and_lock_after_three(): void
    {
        $assessment = $this->assessment($this->employer());
        $user = $this->applicant();
        $fail = function () use ($user, $assessment) {
            $this->actingAs($user)->post("/assessments/{$assessment->id}/start");

            $wrong = array_map(fn ($right) => 1 - $right, $this->correctAnswersFor($assessment)); // two options each

            return $this->actingAs($user)->post("/assessments/{$assessment->id}/attempt", ['answers' => $wrong]);
        };

        $first = $fail();
        $this->assertStringNotContainsString('%', session('error'));
        $first->assertSessionHas('error');
        $this->travel(25)->hours(); // past the cooldown (Fig. 4, step 455)
        $fail();
        $this->travel(25)->hours();
        $fail();

        $this->actingAs($user)->post("/assessments/{$assessment->id}/start")->assertSessionHas('error');
        $this->assertDatabaseCount('assessment_attempts', 3);
        $this->assertFalse($user->applicantProfile->skills()->where('verification_status', 'verified')->exists());
    }

    public function test_each_attempt_is_shuffled_and_still_scored_against_the_real_key(): void
    {
        $employer = $this->employer();
        $assessment = $employer->employerProfile->assessments()->create([
            'title' => 'T', 'role' => 'R', 'skill' => 'React', 'question_count' => 6, 'duration_minutes' => 10, 'passing_score' => 75, 'status' => 'Active',
            'questions' => array_map(fn ($i) => ['prompt' => "Q{$i}", 'options' => ['a', 'b', 'c', 'd'], 'answer' => $i % 4], range(0, 5)),
        ]);

        // Over several draws the arrangement changes, but the answer key never leaves the server.
        $orders = collect(range(1, 8))->map(fn () => json_encode($assessment->shuffledOrder()))->unique();
        $this->assertGreaterThan(1, $orders->count());
        $shown = $assessment->presented($assessment->shuffledOrder());
        $this->assertArrayNotHasKey('answer', $shown[0]);
        $this->assertCount(6, $shown);

        // Answering by the original positions (a leaked key) fails under a shuffle...
        $order = [['q' => 0, 'o' => [3, 2, 1, 0]], ['q' => 1, 'o' => [3, 2, 1, 0]]];
        $this->assertSame(0, $assessment->correctAnswers($order, [0, 1]));
        // ...while picking the right option text wherever it landed scores.
        $this->assertSame(2, $assessment->correctAnswers($order, [3, 2]));
    }

    public function test_late_or_unopened_submissions_are_not_scored(): void
    {
        $assessment = $this->assessment($this->employer(), 5);
        $user = $this->applicant();

        // Never opened: the server has no start time.
        $this->actingAs($user)->post("/assessments/{$assessment->id}/attempt", ['answers' => [1, 1, 1, 1]])->assertSessionHas('error');

        $this->actingAs($user)->post("/assessments/{$assessment->id}/start");
        $this->travel(7)->minutes(); // 5-minute limit + 60s grace exceeded
        $this->actingAs($user)->post("/assessments/{$assessment->id}/attempt", ['answers' => [1, 1, 1, 1]])->assertSessionHas('error');

        $this->assertNull($user->applicantProfile->skills()->where('name', 'React')->first());
    }

    public function test_an_unverified_company_assessment_cannot_be_taken(): void
    {
        $assessment = $this->assessment($this->employer(false));
        $user = $this->applicant();

        $this->actingAs($user)->post("/assessments/{$assessment->id}/start")->assertSessionHas('error');
    }

    // --- Credentials --------------------------------------------------------

    public function test_upload_is_private_and_only_engaged_employers_can_read_it(): void
    {
        Storage::fake('local');
        $user = $this->applicant();
        $this->actingAs($user)->post('/credentials', [
            'type' => 'resume', 'file' => UploadedFile::fake()->create('cv.pdf', 20, 'application/pdf'),
        ])->assertSessionHasNoErrors();

        $file = Credential::first();
        $this->assertSame(64, strlen($file->sha256));
        Storage::disk('local')->assertExists($file->path);

        $this->get("/credentials/{$file->id}/file")->assertOk(); // owner

        $employer = $this->employer();
        $this->actingAs($employer)->get("/credentials/{$file->id}/file")->assertForbidden();

        Application::create(['job_post_id' => $this->job($employer)->id, 'applicant_profile_id' => $user->applicantProfile->id, 'status' => 'applied']);
        $this->actingAs($employer)->get("/credentials/{$file->id}/file")->assertOk();
    }

    public function test_demo_video_must_come_from_a_skillbridge_recording(): void
    {
        Storage::fake('local');
        $user = $this->applicant();
        $video = fn ($id = null) => ['type' => 'video', 'recordingId' => $id, 'file' => UploadedFile::fake()->create('demo.webm', 100, 'video/webm')];

        // A file picked from disk, with no recording behind it, is refused.
        $this->actingAs($user)->post('/credentials', $video())->assertSessionHasErrors('recordingId');

        $id = $this->actingAs($user)->postJson('/credentials/recording')->json('recordingId');
        $this->travel(90)->seconds();
        $this->actingAs($user)->post('/credentials', $video($id))->assertSessionHasNoErrors();
        $this->assertCount(3, Credential::first()->recording_prompts);
    }

    public function test_the_same_document_on_two_accounts_turns_the_review_red(): void
    {
        $job = $this->job($this->employer());
        $a = $this->applicant(['React'])->applicantProfile;
        $b = $this->applicant(['React'])->applicantProfile;
        foreach ([$a, $b] as $p) {
            Credential::create(['applicant_profile_id' => $p->id, 'type' => 'resume', 'original_name' => 'cv.pdf',
                'path' => 'credentials/x.pdf', 'mime' => 'application/pdf', 'size' => 1, 'sha256' => str_repeat('c', 64)]);
        }

        $review = app(CandidateReview::class)->for($job, $a);
        $this->assertSame('red', $review['status']);
        $this->assertFalse($review['canAutoApprove']);
    }

    // --- Employer pipeline --------------------------------------------------

    public function test_invite_never_downgrades_and_other_companies_cannot_touch_the_role(): void
    {
        $employer = $this->employer();
        $job = $this->job($employer);
        $applied = $this->applicant(['React'])->applicantProfile;
        $fresh = $this->applicant(['React'])->applicantProfile;
        Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $applied->id, 'status' => 'applied']);

        $this->actingAs($employer)->post("/job-posts/{$job->id}/invite/{$fresh->id}");
        $this->actingAs($employer)->post("/job-posts/{$job->id}/invite/{$applied->id}");
        $this->assertDatabaseHas('applications', ['applicant_profile_id' => $fresh->id, 'status' => 'invited']);
        $this->assertDatabaseHas('applications', ['applicant_profile_id' => $applied->id, 'status' => 'applied']);

        $this->actingAs($this->employer(true, 'Rival'))->post("/job-posts/{$job->id}/invite/{$fresh->id}")->assertForbidden();
    }

    public function test_shortlist_green_moves_only_candidates_whose_checks_all_pass(): void
    {
        $employer = $this->employer();
        $job = $this->job($employer);
        $green = $this->applicant(['React'])->applicantProfile;
        $amber = $this->applicant([], ['React'])->applicantProfile; // claimed only → red/amber
        Credential::create(['applicant_profile_id' => $green->id, 'type' => 'resume', 'original_name' => 'g.pdf',
            'path' => 'credentials/g.pdf', 'mime' => 'application/pdf', 'size' => 1, 'sha256' => str_repeat('d', 64)]);
        foreach ([$green, $amber] as $p) {
            Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $p->id, 'status' => 'applied']);
        }

        $this->actingAs($employer)->post("/job-posts/{$job->id}/shortlist-green");

        $this->assertDatabaseHas('applications', ['applicant_profile_id' => $green->id, 'status' => 'shortlisted']);
        $this->assertDatabaseHas('applications', ['applicant_profile_id' => $amber->id, 'status' => 'applied']);
    }

    public function test_auto_hire_is_refused_unless_the_review_is_green(): void
    {
        $employer = $this->employer();
        $job = $this->job($employer);
        $profile = $this->applicant([], ['React'])->applicantProfile;
        Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $profile->id, 'status' => 'applied']);

        $this->actingAs($employer)->post("/job-posts/{$job->id}/hire/{$profile->id}", ['mode' => 'auto'])
            ->assertSessionHasErrors('hire');
        $this->assertDatabaseHas('applications', ['applicant_profile_id' => $profile->id, 'status' => 'applied']);
    }
}
