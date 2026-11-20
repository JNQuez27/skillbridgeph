<?php

namespace Tests\Feature;

use App\Models\EmployerProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Patent Fig. 3 (300): sign up (305) -> applicant? (315) -> employer sign-up (320)
 * | profile (325) -> declare skills (330) -> claimed skills saved as pending (340).
 * The email-confirmation step (310) was removed at the client's request
 * (2026-11-20): an account is usable right after sign-up.
 */
class Figure3SignupTest extends TestCase
{
    use RefreshDatabase;

    private function register(string $role, string $email)
    {
        return $this->post('/register', ['role' => $role, 'fullName' => 'Ana Cruz', 'email' => $email,
            'password' => 'secret123', 'acceptPrivacy' => true]);
    }

    public function test_305_sign_up_needs_no_email_confirmation(): void
    {
        $this->register('jobseeker', 'ana@test.ph')->assertRedirect('/onboarding');

        $this->get('/onboarding')->assertOk();
        $this->get('/dashboard')->assertOk();
        $this->get('/verify-email')->assertNotFound();
    }

    public function test_315_320_325_the_role_decides_the_next_screen(): void
    {
        $this->register('jobseeker', 'ana@test.ph')->assertRedirect('/onboarding');          // 325
        $this->post('/logout');
        $this->register('employer', 'hr@test.ph')->assertRedirect('/employer/onboarding');   // 320
    }

    public function test_330_340_declared_skills_are_saved_as_pending_not_verified(): void
    {
        $this->register('jobseeker', 'ana@test.ph');
        $user = User::where('email', 'ana@test.ph')->first();

        $this->put('/applicant-profile', ['skills' => ['React', 'CSS']])->assertSessionHas('success');
        $this->assertSame(['pending', 'pending'], $user->applicantProfile->skills()->pluck('verification_status')->all());
    }

    public function test_login_buttons_keep_job_seekers_and_employers_on_their_own_side(): void
    {
        $seeker = User::factory()->create(['role' => 'jobseeker', 'email' => 'ana@test.ph', 'password' => 'secret123']);
        $hr = User::factory()->create(['role' => 'employer', 'email' => 'hr@test.ph', 'password' => 'secret123']);
        EmployerProfile::create(['user_id' => $hr->id, 'company_name' => 'Acme']);
        User::factory()->create(['role' => 'admin', 'email' => 'admin@test.ph', 'password' => 'secret123']);

        $this->post('/login', ['role' => 'employer', 'email' => 'ana@test.ph', 'password' => 'secret123'])
            ->assertSessionHasErrors(['email' => 'This is a job seeker account. Choose “Job seeker” above, then log in.']);
        $this->assertGuest();
        $this->post('/login', ['role' => 'jobseeker', 'email' => 'hr@test.ph', 'password' => 'secret123'])
            ->assertSessionHasErrors('email');
        $this->assertGuest();

        $this->post('/login', ['role' => 'employer', 'email' => 'hr@test.ph', 'password' => 'secret123'])->assertRedirect('/dashboard?role=employer');
        $this->assertAuthenticatedAs($hr);
        $this->post('/logout');
        $this->post('/login', ['role' => 'jobseeker', 'email' => 'admin@test.ph', 'password' => 'secret123'])->assertRedirect('/admin');
        $this->post('/logout');
        $this->post('/login', ['role' => 'jobseeker', 'email' => 'ana@test.ph', 'password' => 'secret123'])->assertRedirect('/dashboard');
        $this->assertAuthenticatedAs($seeker);
    }
}
