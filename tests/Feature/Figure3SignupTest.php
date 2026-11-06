<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

/**
 * Patent Fig. 3 (300): sign up (305) -> confirm email (310) -> applicant? (315)
 * -> employer sign-up (320) | profile (325) -> declare skills (330)
 * -> claimed skills saved as pending (340) -> recommend assessments (345).
 */
class Figure3SignupTest extends TestCase
{
    use RefreshDatabase;

    private function register(string $role, string $email)
    {
        return $this->post('/register', ['role' => $role, 'firstName' => 'Ana', 'surname' => 'Cruz', 'email' => $email,
            'password' => 'secret123', 'password_confirmation' => 'secret123', 'acceptPrivacy' => true]);
    }

    private function link(User $user): string
    {
        return URL::temporarySignedRoute('verification.verify', now()->addMinutes(60),
            ['id' => $user->id, 'hash' => sha1($user->email)]);
    }

    public function test_305_310_sign_up_sends_a_confirmation_and_blocks_the_app_until_confirmed(): void
    {
        Notification::fake();
        $this->register('jobseeker', 'ana@test.ph')->assertRedirect('/verify-email');

        $user = User::where('email', 'ana@test.ph')->first();
        $this->assertFalse($user->hasVerifiedEmail());
        Notification::assertSentTo($user, VerifyEmail::class);

        // Nothing else is usable until the email is confirmed.
        $this->get('/dashboard')->assertRedirect('/verify-email');
        $this->get('/onboarding')->assertRedirect('/verify-email');
        $this->put('/applicant-profile', ['skills' => ['React']])->assertRedirect('/verify-email');
        $this->get('/verify-email')->assertOk();

        // Resend works.
        $this->post('/email/verification-notification')->assertSessionHas('success');
        Notification::assertSentToTimes($user, VerifyEmail::class, 2);
    }

    public function test_310_a_tampered_or_expired_link_does_not_confirm(): void
    {
        $this->register('jobseeker', 'ana@test.ph');
        $user = User::where('email', 'ana@test.ph')->first();

        $link = $this->link($user);
        $this->get(str_replace(sha1($user->email), sha1('someone@else.ph'), $link))->assertForbidden();
        $this->travel(61)->minutes();
        $this->get($link)->assertForbidden();
        $this->assertFalse($user->fresh()->hasVerifiedEmail());
    }

    public function test_315_320_325_the_role_decides_the_next_screen_after_confirming(): void
    {
        $this->register('jobseeker', 'ana@test.ph');
        $applicant = User::where('email', 'ana@test.ph')->first();
        $this->get($this->link($applicant))->assertRedirect('/onboarding')->assertSessionHas('success');      // 325
        $this->assertTrue($applicant->fresh()->hasVerifiedEmail());

        $this->post('/logout');
        $this->register('employer', 'hr@test.ph');
        $employer = User::where('email', 'hr@test.ph')->first();
        $this->get($this->link($employer))->assertRedirect('/employer/onboarding'); // 320
    }

    public function test_330_340_declared_skills_are_saved_as_pending_not_verified(): void
    {
        $this->register('jobseeker', 'ana@test.ph');
        $user = User::where('email', 'ana@test.ph')->first();
        $this->get($this->link($user));

        $this->put('/applicant-profile', ['skills' => ['React', 'CSS']])->assertSessionHas('success');
        $this->assertSame(['pending', 'pending'], $user->applicantProfile->skills()->pluck('verification_status')->all());
    }
}
