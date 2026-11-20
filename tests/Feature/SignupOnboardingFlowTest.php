<?php

namespace Tests\Feature;

use App\Models\EmployerProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * The reference sign-up (one "Full name", company name for employers, password
 * with a number) and the 3-step applicant setup: skills, goals, proof.
 */
class SignupOnboardingFlowTest extends TestCase
{
    use RefreshDatabase;

    private function register(array $data)
    {
        return $this->post('/register', array_merge(['acceptPrivacy' => true, 'password' => 'secret123'], $data));
    }

    public function test_a_full_name_is_split_and_an_employer_keeps_its_company_name(): void
    {
        $this->register(['role' => 'employer', 'fullName' => 'Paolo  de los Reyes', 'companyName' => 'Kubo Digital', 'email' => 'paolo@kubo.ph'])
            ->assertRedirect('/verify-email');

        $user = User::where('email', 'paolo@kubo.ph')->first();
        $this->assertSame(['Paolo de los', 'Reyes'], [$user->first_name, $user->surname]);
        $this->assertSame('Kubo Digital', EmployerProfile::where('user_id', $user->id)->value('company_name'));
    }

    public function test_one_word_names_and_passwords_without_a_number_are_refused(): void
    {
        $this->register(['role' => 'jobseeker', 'fullName' => 'Mika', 'email' => 'mika@example.com'])
            ->assertSessionHasErrors(['surname' => 'Enter your first and last name.']);
        $this->register(['role' => 'jobseeker', 'fullName' => 'Mika Santos', 'email' => 'mika@example.com', 'password' => 'nonumbers'])
            ->assertSessionHasErrors('password');
        $this->assertSame(0, User::count());
    }

    public function test_onboarding_suggests_demanded_skills_and_saves_goals(): void
    {
        $hr = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(['user_id' => $hr->id, 'company_name' => 'NovaByte', 'email_verified' => true, 'verification_status' => 'approved'])
            ->jobPosts()->create(['title' => 'Dev', 'status' => 'Open', 'required_skills' => ['React', 'CSS'], 'preferred_skills' => ['React']]);
        $seeker = User::factory()->create(['role' => 'jobseeker']);

        $props = $this->actingAs($seeker)->get('/onboarding')->viewData('page')['props'];
        $this->assertSame(['React', 'CSS'], array_slice($props['suggestedSkills'], 0, 2));

        $this->actingAs($seeker)->put('/applicant-profile', [
            'skills' => ['React', 'Communication'], 'desiredRoles' => ['Customer Success Associate'], 'location' => 'Makati, Metro Manila',
            'preferredWorkSetups' => ['Hybrid', 'Remote'], 'expectedSalary' => '₱25,000 – ₱35,000', 'availability' => 'Ready within 30 days',
        ])->assertSessionHasNoErrors();

        $p = $seeker->applicantProfile->fresh()->load('skills');
        $this->assertSame(['Hybrid', 'Remote'], $p->preferred_work_setups);
        $this->assertSame(['₱25,000 – ₱35,000', 'Ready within 30 days'], [$p->expected_salary, $p->availability]);
        $this->assertSame(['pending'], $p->skills->pluck('verification_status')->unique()->values()->all());
    }
}
