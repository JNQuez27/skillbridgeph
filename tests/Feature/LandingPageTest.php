<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\EmployerProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/** The public page may only show figures the database can back up. */
class LandingPageTest extends TestCase
{
    use RefreshDatabase;

    public function test_landing_numbers_come_from_the_database(): void
    {
        $owner = User::factory()->create(['role' => 'employer']);
        $company = EmployerProfile::create(['user_id' => $owner->id, 'company_name' => 'Acme', 'industry' => 'Healthcare', 'email_verified' => true]);
        $job = fn (string $status) => $company->jobPosts()->create(['title' => 'Nurse', 'status' => $status, 'required_skills' => ['Triage', 'CPR']]);
        $job('Open');
        $job('Open');
        $job('Closed');

        $seeker = User::factory()->create(['role' => 'jobseeker']);
        $profile = ApplicantProfile::create(['user_id' => $seeker->id]);
        $profile->skills()->create(['name' => 'CPR', 'level' => 80, 'verification_status' => 'verified']);
        $profile->skills()->create(['name' => 'Triage', 'level' => 50, 'verification_status' => 'self_reported']);

        $this->get('/')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
            ->where('landing.stats.openJobs', 2)
            ->where('landing.stats.verifiedBadges', 1)
            ->where('landing.stats.verifiedEmployers', 1)
            ->where('landing.stats.verifiedApplicants', 1)
            ->has('landing.jobs', 2)
            ->where('landing.jobs.0.skills', 2)
            ->where('landing.industries.0', ['title' => 'Healthcare', 'openRoles' => 2])
            ->where('landing.topSkills', ['Triage', 'CPR']));
    }

    public function test_empty_platform_shows_zeroes_not_placeholders(): void
    {
        $this->get('/')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page
            ->where('landing.stats.openJobs', 0)
            ->where('landing.stats.verifiedBadges', 0)
            ->has('landing.jobs', 0));
    }
}
