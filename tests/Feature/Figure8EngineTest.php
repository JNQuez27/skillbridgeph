<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\EmployerProfile;
use App\Models\JobPost;
use App\Models\User;
use App\Services\MatchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Patent Fig. 8 (800): the matching and ranking engine 136. Inputs 810-835 pass
 * through five units in order (840 preference filter, 845 skill alignment,
 * 850 proficiency scoring, 855 verification weighting, 860 score combiner) and
 * come out as 865 match percentage, 870 ranked list, 875 top ten, 880 job feed.
 */
class Figure8EngineTest extends TestCase
{
    use RefreshDatabase;

    private EmployerProfile $company;

    private MatchService $engine;

    protected function setUp(): void
    {
        parent::setUp();
        $hr = User::factory()->create(['role' => 'employer']);
        $this->company = EmployerProfile::create(['user_id' => $hr->id, 'company_name' => 'NovaByte', 'email_verified' => true, 'verification_status' => 'approved']);
        $this->engine = app(MatchService::class);
    }

    private function job(array $extra = []): JobPost
    {
        return $this->company->jobPosts()->create(array_merge([
            'title' => 'Frontend Dev', 'status' => 'Open', 'location_city' => 'Davao City', 'experience_level' => 'Entry',
            'work_setup' => 'On-site', 'employment_type' => 'Full-time',
            'required_skills' => ['React', 'CSS'], 'preferred_skills' => ['Figma'],
        ], $extra));
    }

    private function applicant(array $skills, array $extra = []): ApplicantProfile
    {
        $user = User::factory()->create(['role' => 'jobseeker']);
        $p = ApplicantProfile::create(array_merge(['user_id' => $user->id, 'location' => 'Davao City', 'experience_level' => 'Entry'], $extra));
        foreach ($skills as $name => [$status, $level]) {
            $p->skills()->create(['name' => $name, 'level' => $level, 'verification_status' => $status]);
        }

        return $p->load('skills');
    }

    public function test_840_preference_filter_keeps_jobs_out_of_the_feed_without_changing_the_number(): void
    {
        $job = $this->job();
        $any = $this->applicant(['React' => ['verified', 90], 'CSS' => ['verified', 90]]);
        $remoteOnly = $this->applicant(['React' => ['verified', 90], 'CSS' => ['verified', 90]], ['preferred_work_setups' => ['Remote']]);

        $this->assertTrue($this->engine->score($job, $any)['preferenceFit']);   // empty preference = any
        $miss = $this->engine->score($job, $remoteOnly);
        $this->assertFalse($miss['preferenceFit']);
        $this->assertSame(['Work setup is On-site, not one you chose.'], $miss['units']['preference']['reasons']);
        $this->assertSame($this->engine->score($job, $any)['score'], $miss['score']);

        // 880 job feed and autonomous flagging both respect it.
        $this->assertCount(1, $this->engine->matchesForApplicant($any));
        $this->assertCount(0, $this->engine->matchesForApplicant($remoteOnly));
        $this->assertSame(0, $this->engine->syncFlaggedMatches($remoteOnly));

        // 870 ranked list: not suggested to the employer, unless they engaged.
        $ranked = fn () => $this->engine->candidatesForJob($job)->pluck('applicant.id')->all();
        $this->assertSame([$any->id], $ranked());
        Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $remoteOnly->id, 'status' => 'applied']);
        $this->assertContains($remoteOnly->id, $ranked());
    }

    public function test_845_to_855_each_skill_passes_alignment_then_proficiency_then_verification_weighting(): void
    {
        $job = $this->job(['skill_settings' => ['css' => ['weight' => 3, 'minLevel' => 70]]]);
        $p = $this->applicant(['React' => ['pending', 0], 'CSS' => ['verified', 60]]);

        $u = $this->engine->score($job, $p)['units'];
        $this->assertSame(['required' => [2, 2], 'preferred' => [0, 1]], $u['alignment']);              // 845
        $this->assertSame([['name' => 'CSS', 'level' => 60, 'minLevel' => 70]], $u['proficiency']);   // 850
        $this->assertSame(['verified' => 0, 'evidenced' => 0, 'claimed' => 1, 'evidencedWeight' => 0.8, 'claimedWeight' => 0.6], $u['verification']);   // 855
        // React claimed (0.6 x 3) + CSS below level (0) over weight 6 -> 0.3 x 60 = 18; + location 10 + experience 5.
        $this->assertSame(['required' => 18.0, 'preferred' => 0.0, 'location' => 10, 'experience' => 5, 'total' => 33], $u['combiner']);   // 860
    }

    public function test_855_a_verified_skill_always_counts_more_than_the_same_skill_claimed(): void
    {
        $job = $this->job();
        $claimed = $this->engine->score($job, $this->applicant(['React' => ['pending', 0], 'CSS' => ['pending', 0]]));
        $verified = $this->engine->score($job, $this->applicant(['React' => ['verified', 1], 'CSS' => ['verified', 1]]));

        $this->assertGreaterThan($claimed['score'], $verified['score']);
        $this->assertSame(['verified' => 0, 'evidenced' => 0, 'claimed' => 2, 'evidencedWeight' => 0.8, 'claimedWeight' => 0.6], $claimed['units']['verification']);
        $this->assertSame(2, $verified['units']['verification']['verified']);
    }

    public function test_860_the_combiner_parts_add_up_to_the_865_percentage_shown(): void
    {
        $job = $this->job();
        foreach ([
            ['React' => ['verified', 90], 'CSS' => ['pending', 0], 'Figma' => ['verified', 80]],
            ['CSS' => ['pending', 0]],
            [],
        ] as $skills) {
            $m = $this->engine->score($job, $this->applicant($skills, ['location' => 'Cebu City']));
            $c = $m['units']['combiner'];
            $this->assertSame($m['score'], (int) round($c['required'] + $c['preferred'] + $c['location'] + $c['experience']));
            $this->assertSame($m['score'], $c['total']);
        }
    }

    public function test_875_top_ten_is_capped_skips_engaged_people_and_respects_preferences(): void
    {
        $job = $this->job();
        $strong = ['React' => ['verified', 90], 'CSS' => ['verified', 90], 'Figma' => ['verified', 90]];
        $people = collect(range(1, 12))->map(fn () => $this->applicant($strong));
        $picky = $this->applicant($strong, ['preferred_job_types' => ['Part-time']]);
        Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $people[0]->id, 'status' => 'applied']);

        $top = $this->engine->topTen($job)->pluck('applicant.id');
        $this->assertCount(MatchService::TOP_N, $top);
        $this->assertNotContains($people[0]->id, $top);
        $this->assertNotContains($picky->id, $top);
    }

    public function test_the_applicant_sets_preferences_in_settings_and_sees_the_breakdown_on_each_job(): void
    {
        $job = $this->job();
        $p = $this->applicant(['React' => ['verified', 90]]);
        $user = $p->user;

        $this->actingAs($user)->put('/applicant-profile', ['preferredWorkSetups' => ['Moon base']])->assertSessionHasErrors('preferredWorkSetups.0');
        $this->actingAs($user)->put('/applicant-profile', ['preferredWorkSetups' => ['Remote', 'Hybrid'], 'preferredJobTypes' => []])->assertSessionHas('success');
        $this->assertSame(['Remote', 'Hybrid'], $p->fresh()->preferred_work_setups);

        $card = collect($this->actingAs($user)->get('/dashboard')->viewData('page')['props']['account']['browse'])->firstWhere('id', $job->id);
        $this->assertFalse($card['preferenceFit']);   // still listed in Find Jobs, but marked
        $this->assertSame(['preference', 'alignment', 'proficiency', 'verification', 'combiner'], array_keys($card['units']));

        // Clearing them means "any" again.
        $this->actingAs($user)->put('/applicant-profile', ['preferredWorkSetups' => []]);
        $this->assertSame([], $p->fresh()->preferred_work_setups);
    }
}
