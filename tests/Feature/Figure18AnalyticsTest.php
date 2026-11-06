<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\EmployerProfile;
use App\Models\JobPost;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Patent Fig. 18 (1800): employer analytics, the hiring funnel (1818) and the
 * skill gap panel (1820) showing which skills candidates lack most.
 */
class Figure18AnalyticsTest extends TestCase
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

    private function job(string $title, array $required, array $settings = []): JobPost
    {
        return $this->company->jobPosts()->create(['title' => $title, 'status' => 'Open', 'location_city' => 'Davao City',
            'experience_level' => 'Entry', 'required_skills' => $required, 'skill_settings' => $settings]);
    }

    private function applicant(array $skills, ?JobPost $job = null, ?string $status = null): ApplicantProfile
    {
        $user = User::factory()->create(['role' => 'jobseeker']);
        $p = ApplicantProfile::create(['user_id' => $user->id, 'location' => 'Davao City', 'experience_level' => 'Entry']);
        foreach ($skills as $name => [$state, $level]) {
            $p->skills()->create(['name' => $name, 'level' => $level, 'verification_status' => $state]);
        }
        if ($job && $status) {
            Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $p->id, 'status' => $status]);
        }

        return $p;
    }

    private function analytics(): array
    {
        return $this->actingAs($this->hr)->get('/dashboard')->viewData('page')['props']['account']['analytics'];
    }

    public function test_1818_the_funnel_counts_each_stage_cumulatively_and_not_selected_apart(): void
    {
        $job = $this->job('Dev', ['React']);
        $strong = ['React' => ['verified', 90]];
        $this->applicant($strong);                              // matched only
        $this->applicant($strong, $job, 'invited');
        $this->applicant($strong, $job, 'applied');
        $this->applicant($strong, $job, 'shortlisted');
        $this->applicant($strong, $job, 'interviewing');
        $this->applicant($strong, $job, 'hired');
        $this->applicant($strong, $job, 'not_selected');
        $this->applicant($strong, $job, 'saved');               // private to the applicant: not engaged

        $f = $this->analytics()['roles'][0]['funnel'];
        $this->assertSame(['matched' => 8, 'engaged' => 6, 'shortlisted' => 3, 'interviewing' => 2, 'hired' => 1, 'notSelected' => 1], $f);
    }

    public function test_1820_the_skill_gap_counts_who_lacks_each_required_skill_verified_at_the_level(): void
    {
        $job = $this->job('Dev', ['React', 'CSS'], ['css' => ['weight' => 3, 'minLevel' => 70]]);
        // Engaged so they are in the ranked list whatever their score.
        $this->applicant(['React' => ['verified', 90], 'CSS' => ['verified', 80]], $job, 'applied');   // has both
        $this->applicant(['React' => ['pending', 0], 'CSS' => ['verified', 60]], $job, 'applied');    // React claimed, CSS below 70
        $this->applicant([], $job, 'applied');                                                           // both missing

        $gap = collect($this->analytics()['roles'][0]['skillGap'])->keyBy('skill');
        $this->assertSame(['skill' => 'React', 'candidates' => 3, 'missing' => 1, 'claimed' => 1, 'below' => 0], $gap['React']);
        $this->assertSame(['skill' => 'CSS', 'candidates' => 3, 'missing' => 1, 'claimed' => 0, 'below' => 1], $gap['CSS']);
    }

    public function test_all_roles_adds_funnels_and_merges_the_same_skill_across_roles(): void
    {
        $a = $this->job('Frontend', ['React']);
        $b = $this->job('Fullstack', ['react', 'Laravel']);
        $this->applicant([], $a, 'applied');
        $this->applicant(['React' => ['verified', 90]], $b, 'shortlisted');

        $all = $this->analytics()['all'];
        $this->assertSame(2, $all['funnel']['engaged']);
        $this->assertSame(1, $all['funnel']['shortlisted']);
        $gap = collect($all['skillGap'])->keyBy(fn ($g) => strtolower($g['skill']));
        // The React-verified applicant is also a 75% match for Frontend, so React
        // counts 3 candidate-role pairs: one per role a person is ranked for.
        $this->assertSame([3, 1], [$gap['react']['candidates'], $gap['react']['missing']]);
        $this->assertSame([1, 1], [$gap['laravel']['candidates'], $gap['laravel']['missing']]);
    }

    public function test_an_employer_sees_only_its_own_roles(): void
    {
        $this->job('Mine', ['React']);
        $otherHr = User::factory()->create(['role' => 'employer']);
        $other = EmployerProfile::create(['user_id' => $otherHr->id, 'company_name' => 'Other', 'email_verified' => true, 'verification_status' => 'approved']);
        $other->jobPosts()->create(['title' => 'Theirs', 'status' => 'Open', 'required_skills' => ['Go']]);

        $this->assertSame(['Mine'], array_column($this->analytics()['roles'], 'title'));
    }
}
