<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\AssessmentAttempt;
use App\Models\CompanyAssessment;
use App\Models\EmployerProfile;
use App\Models\User;
use App\Notifications\AssessmentScored;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Patent Fig. 16 (1600): the employer builds a test with a passing threshold
 * (checked at Fig. 4, step 430) and a rubric for practical tasks.
 * Patent Fig. 13 (1300): the applicant does a real task within the time limit
 * (1306) and attaches a work file as proof; it is scored by the rubric (425).
 */
class Figure13And16TaskTest extends TestCase
{
    use RefreshDatabase;

    private User $hr;

    private User $seeker;

    private ApplicantProfile $profile;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $this->hr = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(['user_id' => $this->hr->id, 'company_name' => 'NovaByte', 'email_verified' => true, 'verification_status' => 'approved']);
        $this->seeker = User::factory()->create(['role' => 'jobseeker']);
        $this->profile = ApplicantProfile::create(['user_id' => $this->seeker->id]);
    }

    private function build(array $extra = [])
    {
        return $this->actingAs($this->hr)->post('/assessments', array_merge([
            'title' => 'Landing page task', 'role' => 'Frontend Dev', 'skill' => 'HTML', 'durationMinutes' => 60, 'passingScore' => 70,
            'questions' => [],
            'taskPrompt' => 'Build the attached landing page in HTML and CSS. Hand in a ZIP.',
            'taskFileRequired' => true,
            'rubric' => [['criterion' => 'Works as asked', 'points' => 10], ['criterion' => 'Clean code', 'points' => 5], ['criterion' => 'Matches design', 'points' => 5]],
        ], $extra));
    }

    private function quiz(): array
    {
        return array_fill(0, 3, ['prompt' => 'Q', 'options' => ['right', 'wrong'], 'answer' => 0]);
    }

    private function take(CompanyAssessment $a, array $payload)
    {
        $this->actingAs($this->seeker)->post("/assessments/{$a->id}/start");
        $order = session(\App\Http\Controllers\AssessmentAttemptController::orderKey($a));
        // Answer every quiz question correctly, translating the shuffled order.
        $answers = collect($order)->map(fn ($item) => array_search(0, $item['o'], true))->all();

        return $this->actingAs($this->seeker)->post("/assessments/{$a->id}/attempt", ['answers' => $answers] + $payload);
    }

    private function review(AssessmentAttempt $t, array $scores, ?User $as = null)
    {
        return $this->actingAs($as ?? $this->hr)->post("/assessment-attempts/{$t->id}/review", ['scores' => $scores, 'feedback' => 'Good structure.']);
    }

    public function test_1610_to_1620_the_employer_builds_a_task_with_a_rubric_and_threshold(): void
    {
        $this->build()->assertSessionHas('success');

        $a = CompanyAssessment::first();
        $this->assertTrue($a->hasTask());
        $this->assertTrue($a->task_file_required);
        $this->assertSame(70, $a->passing_score);
        $this->assertSame([['criterion' => 'Works as asked', 'points' => 10], ['criterion' => 'Clean code', 'points' => 5], ['criterion' => 'Matches design', 'points' => 5]], $a->rubric);
        $this->assertSame(0, $a->question_count);   // a task alone is a valid test
    }

    public function test_1616_a_rubric_needs_2_to_6_criteria_of_1_to_10_points_and_a_quiz_alone_needs_3_questions(): void
    {
        $this->build(['rubric' => [['criterion' => 'Only one', 'points' => 5]]])->assertSessionHasErrors('rubric');
        $this->build(['rubric' => [['criterion' => 'A', 'points' => 11], ['criterion' => 'B', 'points' => 5]]])->assertSessionHasErrors('rubric.0.points');
        $this->build(['taskPrompt' => '', 'rubric' => null, 'questions' => array_slice($this->quiz(), 0, 2)])->assertSessionHasErrors('questions');
        $this->assertSame(0, CompanyAssessment::count());
    }

    public function test_1306_to_1316_the_task_and_work_file_are_submitted_in_time_and_wait_for_the_rubric(): void
    {
        $this->build(['questions' => $this->quiz()]);
        $a = CompanyAssessment::first();

        $this->take($a, ['taskAnswer' => 'Notes'])->assertSessionHasErrors('taskFile');   // file required

        $this->take($a, ['taskAnswer' => 'See ZIP', 'taskFile' => UploadedFile::fake()->create('site.zip', 200, 'application/zip')])
            ->assertSessionHas('success');
        $t = AssessmentAttempt::first();
        $this->assertSame(['pending_review', 100, false], [$t->status, $t->mcq_score, $t->passed]);
        Storage::disk('local')->assertExists($t->task_file_path);

        // Counts as used, is not a failure (no cooldown), and blocks a second try until scored.
        $st = \App\Http\Controllers\AssessmentAttemptController::standing($a, $this->profile->id);
        $this->assertSame([1, true, null, false], [$st['used'], $st['pending'], $st['nextAttemptAt'], $st['locked']]);
        $this->actingAs($this->seeker)->post("/assessments/{$a->id}/start")->assertSessionHas('error', fn ($m) => str_contains($m, 'waiting for NovaByte'));
    }

    public function test_1306_a_task_handed_in_after_the_time_limit_is_not_scored(): void
    {
        $this->build();
        $a = CompanyAssessment::first();
        $this->actingAs($this->seeker)->post("/assessments/{$a->id}/start");
        $this->travel(62)->minutes();   // 60-minute limit + 60s grace

        $this->actingAs($this->seeker)->post("/assessments/{$a->id}/attempt", ['taskFile' => UploadedFile::fake()->create('site.zip', 200, 'application/zip')])
            ->assertSessionHas('error', fn ($m) => str_contains($m, 'Time limit reached'));
        $t = AssessmentAttempt::first();
        $this->assertSame(['scored', false, null], [$t->status, $t->passed, $t->task_file_path]);   // no review queued, file not kept
    }

    public function test_425_to_435_a_rubric_pass_issues_the_badge_and_notifies_the_applicant(): void
    {
        Notification::fake();
        $this->build(['questions' => $this->quiz()]);
        $a = CompanyAssessment::first();
        $this->take($a, ['taskFile' => UploadedFile::fake()->create('site.zip', 200, 'application/zip')]);
        $t = AssessmentAttempt::first();

        // Quiz 100%, rubric 8+4+2 = 14/20 = 70% -> (100 + 70) / 2 = 85%.
        $this->review($t, [8, 4, 2])->assertSessionHas('success');
        $t->refresh();
        $this->assertSame(['scored', 85, true, [8, 4, 2], $this->hr->id], [$t->status, $t->score, $t->passed, $t->rubric_scores, $t->reviewed_by]);

        $badge = $this->profile->skills()->where('name', 'HTML')->first();
        $this->assertSame(['verified', 85], [$badge->verification_status, $badge->level]);
        $this->assertMatchesRegularExpression('/^SB-[A-Z0-9]{4}-[A-Z0-9]{4}$/', $badge->verification_id);
        Notification::assertSentTo($this->seeker, AssessmentScored::class, fn ($n, $ch) => $ch === ['database', 'mail'] && $n->toArray($this->seeker)['passed']);

        $this->review($t, [10, 5, 5])->assertSessionHas('error');   // scored once only
        $this->assertSame(85, $t->fresh()->score);
    }

    public function test_430_to_455_a_rubric_fail_keeps_the_skill_pending_and_starts_the_cooldown(): void
    {
        $this->build();   // task only
        $a = CompanyAssessment::first();
        $this->take($a, ['taskFile' => UploadedFile::fake()->create('site.zip', 200, 'application/zip')]);

        $this->review(AssessmentAttempt::first(), [5, 2, 2]);   // 9/20 = 45% < 70
        $this->assertFalse(AssessmentAttempt::first()->passed);
        $this->assertNull($this->profile->skills()->where('name', 'HTML')->where('verification_status', 'verified')->first());
        $st = \App\Http\Controllers\AssessmentAttemptController::standing($a, $this->profile->id);
        $this->assertNotNull($st['nextAttemptAt']);   // 455 cooldown
        $this->assertSame(2, $st['left']);

        $assessments = $this->actingAs($this->seeker)->get('/dashboard')->viewData('page')['props']['account']['assessments'];
        $this->assertSame('Good structure.', $assessments[0]['assessments'][0]['lastFeedback']);
    }

    public function test_460_the_third_failed_task_marks_the_skill_unverified(): void
    {
        $this->build();
        $a = CompanyAssessment::first();
        foreach (range(1, 3) as $i) {
            $this->take($a, ['taskFile' => UploadedFile::fake()->create('site.zip', 200, 'application/zip')])->assertSessionHas('success');
            $this->review(AssessmentAttempt::latest('id')->first(), [1, 1, 1]);
            $this->travel(25)->hours();   // past the 24-hour cooldown
        }

        $this->assertSame('unverified', $this->profile->skills()->where('name', 'HTML')->value('verification_status'));
        $this->assertTrue(\App\Http\Controllers\AssessmentAttemptController::standing($a, $this->profile->id)['locked']);
    }

    public function test_only_the_owning_company_scores_within_the_rubric_and_the_file_stays_private(): void
    {
        $this->build();
        $a = CompanyAssessment::first();
        $this->take($a, ['taskFile' => UploadedFile::fake()->create('site.zip', 200, 'application/zip')]);
        $t = AssessmentAttempt::first();

        $other = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(['user_id' => $other->id, 'company_name' => 'Other', 'email_verified' => true, 'verification_status' => 'approved']);
        $this->review($t, [10, 5, 5], $other)->assertForbidden();
        $this->review($t, [10, 5, 5], $this->seeker)->assertForbidden();
        $this->review($t, [11, 5, 5])->assertSessionHasErrors('scores.0');   // over the criterion's points
        $this->review($t, [10, 5])->assertSessionHasErrors('scores');         // every criterion
        $this->assertSame('pending_review', $t->fresh()->status);

        $this->actingAs($this->hr)->get("/assessment-attempts/{$t->id}/file")->assertOk();
        $this->actingAs($this->seeker)->get("/assessment-attempts/{$t->id}/file")->assertOk();
        $this->actingAs($other)->get("/assessment-attempts/{$t->id}/file")->assertNotFound();

        $queue = $this->actingAs($this->hr)->get('/dashboard')->viewData('page')['props']['account']['taskReviews'];
        $this->assertSame([$t->id], array_column($queue, 'id'));
        $this->assertSame([], $this->actingAs($other)->get('/dashboard')->viewData('page')['props']['account']['taskReviews']);
    }
}
