<?php

namespace Tests\Feature;

use App\Http\Controllers\AssessmentAttemptController;
use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\AssessmentAttempt;
use App\Models\CompanyAssessment;
use App\Models\EmployerProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Patent Fig. 1 (142 -> 144): every assessment badge is linked to the result
 * that earned it. Patent Fig. 17 (1712): the ranked list puts suggestions in
 * match order so the dashed top-ten line marks exactly who "Invite top 10" invites.
 */
class PatentQuickFixesTest extends TestCase
{
    use RefreshDatabase;

    private User $hr;

    private EmployerProfile $company;

    protected function setUp(): void
    {
        parent::setUp();
        $this->hr = User::factory()->create(['role' => 'employer']);
        $this->company = EmployerProfile::create(['user_id' => $this->hr->id, 'company_name' => 'NovaByte', 'email_verified' => true, 'verification_status' => 'approved']);
    }

    private function seeker(): array
    {
        $user = User::factory()->create(['role' => 'jobseeker']);

        return [$user, ApplicantProfile::create(['user_id' => $user->id, 'location' => 'Davao City', 'experience_level' => 'Entry'])];
    }

    public function test_142_to_144_a_quiz_badge_links_to_the_attempt_that_earned_it(): void
    {
        $a = $this->company->assessments()->create(['title' => 'React test', 'role' => 'Dev', 'skill' => 'React', 'question_count' => 3,
            'duration_minutes' => 10, 'passing_score' => 70, 'status' => 'Active',
            'questions' => array_fill(0, 3, ['prompt' => 'Q', 'options' => ['right', 'wrong'], 'answer' => 0])]);
        [$user, $profile] = $this->seeker();

        $this->actingAs($user)->post("/assessments/{$a->id}/start");
        $answers = collect(session(AssessmentAttemptController::orderKey($a)))->map(fn ($i) => array_search(0, $i['o'], true))->all();
        $this->actingAs($user)->post("/assessments/{$a->id}/attempt", ['answers' => $answers])->assertSessionHas('success');

        $badge = $profile->skills()->where('name', 'React')->first();
        $this->assertSame(AssessmentAttempt::where('passed', true)->value('id'), $badge->assessment_attempt_id);
        $this->assertSame(100, $badge->assessmentResult->score);

        $skill = collect($this->actingAs($user)->get('/dashboard')->viewData('page')['props']['account']['skills'])->firstWhere('name', 'React');
        $this->assertSame(['assessment' => 'React test', 'score' => 100], array_intersect_key($skill['assessmentResult'], array_flip(['assessment', 'score'])));
    }

    public function test_142_to_144_a_rubric_scored_badge_links_to_the_reviewed_attempt(): void
    {
        Storage::fake('local');
        $a = $this->company->assessments()->create(['title' => 'Site task', 'role' => 'Dev', 'skill' => 'HTML', 'question_count' => 0,
            'duration_minutes' => 60, 'passing_score' => 70, 'status' => 'Active', 'questions' => [],
            'task_prompt' => 'Build it', 'task_file_required' => true, 'rubric' => [['criterion' => 'A', 'points' => 5], ['criterion' => 'B', 'points' => 5]]]);
        [$user, $profile] = $this->seeker();
        $this->actingAs($user)->post("/assessments/{$a->id}/start");
        $this->actingAs($user)->post("/assessments/{$a->id}/attempt", ['taskFile' => UploadedFile::fake()->create('s.zip', 10, 'application/zip')]);
        $attempt = AssessmentAttempt::first();

        $this->actingAs($this->hr)->post("/assessment-attempts/{$attempt->id}/review", ['scores' => [5, 4]]);
        $this->assertSame($attempt->id, $profile->skills()->where('name', 'HTML')->value('assessment_attempt_id'));
    }

    public function test_1712_suggestions_are_ranked_by_match_after_engaged_people_and_decliners_last(): void
    {
        $job = $this->company->jobPosts()->create(['title' => 'Dev', 'status' => 'Open', 'location_city' => 'Davao City', 'experience_level' => 'Entry',
            'required_skills' => ['React', 'CSS'], 'preferred_skills' => ['Figma']]);
        $make = function (array $skills, ?string $status = null) use ($job) {
            [, $p] = $this->seeker();
            foreach ($skills as $s) {
                $p->skills()->create(['name' => $s, 'level' => 90, 'verification_status' => 'verified']);
            }
            if ($status) {
                Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $p->id, 'status' => $status]);
            }

            return $p->id;
        };
        $mid = $make(['React', 'CSS']);                       // 75
        $top = $make(['React', 'CSS', 'Figma']);              // 100
        $applied = $make([], 'applied');                      // engaged, low score
        $declined = $make(['React', 'CSS', 'Figma'], 'declined');

        $candidates = $this->actingAs($this->hr)->get('/dashboard')->viewData('page')['props']['account']['matches'][0]['candidates'];
        $this->assertSame([$applied, $top, $mid, $declined], array_column($candidates, 'id'));
        $this->assertSame('declined', $candidates[3]['status']);
        $this->assertNull($candidates[1]['status']);
    }
}
