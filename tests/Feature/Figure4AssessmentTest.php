<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\CompanyAssessment;
use App\Models\EmployerProfile;
use App\Models\User;
use App\Services\MatchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Patent Fig. 4 (400): pick pending skill (405) -> take assessment (410-420) ->
 * score (425) -> passed? (430) -> YES: badge with score, date and unique
 * verification ID (435), match scores updated (440) | NO: stays pending (445) ->
 * attempts left? (450) -> YES: cooldown then retake (455) | NO: unverified (460).
 */
class Figure4AssessmentTest extends TestCase
{
    use RefreshDatabase;

    private EmployerProfile $company;

    private CompanyAssessment $assessment;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $owner = User::factory()->create(['role' => 'employer']);
        $this->company = EmployerProfile::create(['user_id' => $owner->id, 'company_name' => 'NovaByte', 'email_verified' => true, 'verification_status' => 'approved']);
        $this->assessment = $this->company->assessments()->create([
            'title' => 'React test', 'role' => 'Dev', 'skill' => 'React', 'question_count' => 4, 'duration_minutes' => 10,
            'passing_score' => 75, 'status' => 'Active',
            'questions' => array_fill(0, 4, ['prompt' => 'Q?', 'options' => ['a', 'b'], 'answer' => 1]),
        ]);
        $this->user = User::factory()->create(['role' => 'jobseeker']);
        ApplicantProfile::create(['user_id' => $this->user->id, 'location' => 'Davao City', 'experience_level' => 'Entry']);
        $this->actingAs($this->user)->put('/applicant-profile', ['skills' => ['React']]); // 405: a pending skill
    }

    private function attempt(bool $pass)
    {
        $id = $this->assessment->id;
        $this->actingAs($this->user)->post("/assessments/{$id}/start");
        $order = session("assessment_order.{$id}");
        $answers = array_map(fn ($item) => array_search($pass ? 1 : 0, $item['o'], true), $order);

        return $this->actingAs($this->user)->post("/assessments/{$id}/attempt", ['answers' => $answers]);
    }

    private function skill()
    {
        return $this->user->applicantProfile->skills()->where('name', 'React')->first();
    }

    public function test_430_435_440_passing_issues_a_badge_with_a_unique_verification_id_and_updates_matches(): void
    {
        $job = $this->company->jobPosts()->create(['title' => 'React Dev', 'status' => 'Open', 'location_city' => 'Davao City',
            'experience_level' => 'Entry', 'required_skills' => ['React']]);
        $score = fn () => app(MatchService::class)->score($job, $this->user->applicantProfile->fresh()->load('skills'))['score'];
        $before = $score();

        $this->attempt(true)->assertSessionHas('success');

        $badge = $this->skill();
        $this->assertSame('verified', $badge->verification_status);
        $this->assertSame(100, $badge->level);                       // score
        $this->assertNotNull($badge->verified_at);                   // date
        $this->assertMatchesRegularExpression('/^SB-[2-9A-HJKMNP-Z]{4}-[2-9A-HJKMNP-Z]{4}$/', $badge->verification_id);
        $this->assertStringContainsString($badge->verification_id, session('success'));
        $this->assertGreaterThan($before, $score());                  // 440
    }

    public function test_445_450_455_a_fail_keeps_the_skill_pending_and_starts_a_cooldown(): void
    {
        $this->attempt(false)->assertSessionHas('error');
        $this->assertStringNotContainsString('%', session('error'));  // no score revealed
        $this->assertSame('pending', $this->skill()->verification_status);  // 445

        // 455: neither opening nor submitting works until the cooldown ends.
        $this->actingAs($this->user)->post("/assessments/{$this->assessment->id}/start")->assertSessionHas('error');
        $this->assertStringContainsString('next attempt opens', mb_strtolower(session('error')));
        $this->assertNull(session("assessment_started.{$this->assessment->id}"));

        $this->travel(23)->hours();
        $this->actingAs($this->user)->post("/assessments/{$this->assessment->id}/start")->assertSessionHas('error');

        $this->travel(2)->hours();
        $this->attempt(true)->assertSessionHas('success');
    }

    public function test_460_after_the_last_failed_attempt_the_skill_is_marked_unverified(): void
    {
        $this->attempt(false);
        $this->travel(25)->hours();
        $this->attempt(false);
        $this->travel(25)->hours();
        $this->attempt(false)->assertSessionHas('error');
        $this->assertStringContainsString('Unverified', session('error'));

        $this->assertSame('unverified', $this->skill()->verification_status);
        $this->assertNotContains('React', $this->user->applicantProfile->fresh()->load('skills')->skillNames()); // no claim credit

        // No more attempts, even much later.
        $this->travel(30)->days();
        $this->actingAs($this->user)->post("/assessments/{$this->assessment->id}/start")->assertSessionHas('error');

        // Re-typing or removing the skill cannot reset the mark.
        $this->actingAs($this->user)->put('/applicant-profile', ['skills' => []]);
        $this->actingAs($this->user)->put('/applicant-profile', ['skills' => ['React']]);
        $this->assertSame('unverified', $this->skill()->verification_status);
    }

    public function test_a_skill_verified_another_way_is_never_downgraded_by_failed_tests(): void
    {
        $this->skill()->update(['verification_status' => 'verified', 'verification_method' => 'portfolio', 'verified_by' => 'NovaByte', 'verified_at' => now()]);
        $id = $this->skill()->verification_id;
        $this->assertNotNull($id); // every route to "verified" gets an ID

        $this->actingAs($this->user)->post("/assessments/{$this->assessment->id}/start")->assertSessionHas('error'); // already earned
        $this->assertSame('verified', $this->skill()->verification_status);
        $this->assertSame($id, $this->skill()->fresh()->verification_id); // stable once issued
    }
}
