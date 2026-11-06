<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\EmployerProfile;
use App\Models\JobPost;
use App\Models\User;
use App\Services\CandidateReview;
use App\Services\MatchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Patent Fig. 6 (600): create job (605) -> skills with weights (610) -> attach
 * assessment? (615-620) -> publish (625) -> find applicants (630) -> match scores
 * (635) -> rank (640) -> invite top ten (650) in one action (655).
 */
class Figure6JobTest extends TestCase
{
    use RefreshDatabase;

    private User $hr;

    protected function setUp(): void
    {
        parent::setUp();
        $this->hr = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(['user_id' => $this->hr->id, 'company_name' => 'NovaByte', 'email_verified' => true, 'verification_status' => 'approved']);
    }

    private function postJob(array $extra = [])
    {
        return $this->actingAs($this->hr)->post('/job-posts', array_merge([
            'title' => 'Frontend Dev', 'locationCity' => 'Davao City', 'employmentType' => 'Full-time', 'workSetup' => 'On-site',
            'description' => 'x', 'responsibilities' => 'x', 'requiredSkills' => 'React, CSS', 'preferredSkills' => 'Figma', 'experienceLevel' => 'Entry',
        ], $extra));
    }

    private function applicant(array $skills): ApplicantProfile
    {
        $user = User::factory()->create(['role' => 'jobseeker']);
        $p = ApplicantProfile::create(['user_id' => $user->id, 'location' => 'Davao City', 'experience_level' => 'Entry']);
        foreach ($skills as $name => [$status, $level]) {
            $p->skills()->create(['name' => $name, 'level' => $level, 'verification_status' => $status]);
        }

        return $p->load('skills');
    }

    private function job(array $settings, array $required = ['React', 'CSS']): JobPost
    {
        return $this->hr->employerProfile->jobPosts()->create(['title' => 'Dev', 'status' => 'Open', 'location_city' => 'Davao City',
            'experience_level' => 'Entry', 'required_skills' => $required, 'skill_settings' => $settings]);
    }

    public function test_605_to_625_a_job_saves_weights_minimum_levels_and_an_attached_assessment(): void
    {
        $test = $this->hr->employerProfile->assessments()->create(['title' => 'React test', 'role' => 'Dev', 'skill' => 'React',
            'question_count' => 3, 'duration_minutes' => 10, 'passing_score' => 70, 'status' => 'Active', 'questions' => []]);

        $this->postJob([
            'skillSettings' => [['name' => 'React', 'weight' => 5, 'minLevel' => 70], ['name' => 'CSS', 'weight' => 2, 'minLevel' => null],
                ['name' => 'Ghost', 'weight' => 5, 'minLevel' => 85]],   // not a listed skill: ignored
            'companyAssessmentId' => $test->id,
        ])->assertSessionHas('success');

        $job = JobPost::first();
        $this->assertSame(['weight' => 5, 'minLevel' => 70], $job->settingFor('React'));
        $this->assertSame(['weight' => 2, 'minLevel' => null], $job->settingFor('css'));
        $this->assertSame(['weight' => 3, 'minLevel' => null], $job->settingFor('Figma'));   // default
        $this->assertArrayNotHasKey('ghost', $job->skill_settings);
        $this->assertSame($test->id, $job->assessment->id);
    }

    public function test_610_weights_and_levels_outside_the_allowed_values_and_other_companies_assessments_are_refused(): void
    {
        $this->postJob(['skillSettings' => [['name' => 'React', 'weight' => 7, 'minLevel' => null]]])->assertSessionHasErrors('skillSettings.0.weight');
        $this->postJob(['skillSettings' => [['name' => 'React', 'weight' => 3, 'minLevel' => 60]]])->assertSessionHasErrors('skillSettings.0.minLevel');

        $rival = User::factory()->create(['role' => 'employer']);
        $theirs = EmployerProfile::create(['user_id' => $rival->id, 'company_name' => 'Rival', 'email_verified' => true])
            ->assessments()->create(['title' => 'T', 'role' => 'R', 'skill' => 'X', 'question_count' => 3, 'duration_minutes' => 10,
                'passing_score' => 70, 'status' => 'Active', 'questions' => []]);
        $this->postJob(['companyAssessmentId' => $theirs->id])->assertSessionHasErrors('companyAssessmentId');
        $this->assertSame(0, JobPost::count());
    }

    public function test_635_the_heavier_skill_counts_for_more(): void
    {
        $job = $this->job(['react' => ['weight' => 5, 'minLevel' => null], 'css' => ['weight' => 1, 'minLevel' => null]]);
        $score = fn ($p) => app(MatchService::class)->score($job, $p)['score'];

        $this->assertSame(65, $score($this->applicant(['React' => ['verified', 80]])));   // 5/6 x 60 + 10 + 5
        $this->assertSame(25, $score($this->applicant(['CSS' => ['verified', 80]])));     // 1/6 x 60 + 10 + 5
    }

    public function test_635_equal_weights_score_exactly_as_before(): void
    {
        $job = $this->job([]);
        $this->assertSame(45, app(MatchService::class)->score($job, $this->applicant(['React' => ['verified', 80]]))['score']); // 1/2 x 60 + 15
    }

    public function test_610_635_a_minimum_level_is_met_only_by_a_verified_skill_at_that_level(): void
    {
        $job = $this->job(['react' => ['weight' => 3, 'minLevel' => 70]], ['React']);
        $score = fn ($p) => app(MatchService::class)->score($job, $p)['score'];

        $this->assertSame(75, $score($this->applicant(['React' => ['verified', 80]])));   // met
        $this->assertSame(15, $score($this->applicant(['React' => ['verified', 60]])));   // below minimum: no credit
        $this->assertSame(15, $score($this->applicant(['React' => ['pending', 0]])));     // claim: no proven level

        $below = $this->applicant(['React' => ['verified', 60]]);
        $review = app(CandidateReview::class)->for($job, $below);
        $this->assertSame('amber', $review['status']);
        $this->assertStringContainsString('required level', collect($review['reasons'])->pluck('text')->implode(' '));
    }

    public function test_650_655_invite_top_ten_skips_engaged_people_and_is_owner_only(): void
    {
        $job = $this->job([], ['React']);
        $profiles = collect(range(1, 12))->map(fn ($i) => $this->applicant(['React' => ['verified', 80]]));
        Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $profiles[0]->id, 'status' => 'applied']);

        $rival = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(['user_id' => $rival->id, 'company_name' => 'Rival']);
        $this->actingAs($rival)->post("/job-posts/{$job->id}/invite-top")->assertForbidden();

        $this->actingAs($this->hr)->post("/job-posts/{$job->id}/invite-top")->assertSessionHas('success');

        $this->assertSame(10, Application::where('job_post_id', $job->id)->where('status', 'invited')->count());
        $this->assertSame('applied', Application::where('applicant_profile_id', $profiles[0]->id)->value('status'));

        // A second press only reaches whoever is left.
        $this->actingAs($this->hr)->post("/job-posts/{$job->id}/invite-top");
        $this->assertSame(11, Application::where('job_post_id', $job->id)->where('status', 'invited')->count());
    }
}
