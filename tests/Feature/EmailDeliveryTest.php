<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoApiTransport;
use Tests\TestCase;

/**
 * Sign-up confirmation (Fig. 3, step 310) and password resets are sent through
 * Brevo's HTTPS API, because the free Render plan blocks SMTP. A mail outage
 * must never break sign-up or reveal who has an account.
 */
class EmailDeliveryTest extends TestCase
{
    use RefreshDatabase;

    private function breakMail(): void
    {
        // The Brevo mailer with no API key cannot send: it throws, like an outage.
        config(['mail.default' => 'brevo', 'services.brevo.key' => null]);
    }

    public function test_the_brevo_mailer_uses_brevos_https_api(): void
    {
        config(['services.brevo.key' => 'test-key']);

        $this->assertInstanceOf(BrevoApiTransport::class, Mail::mailer('brevo')->getSymfonyTransport());
    }

    public function test_a_mail_outage_still_creates_the_account_and_says_to_resend(): void
    {
        $this->breakMail();

        $this->post('/register', ['role' => 'jobseeker', 'firstName' => 'Ana', 'surname' => 'Cruz', 'email' => 'ana@example.com',
            'password' => 'secret123', 'password_confirmation' => 'secret123', 'acceptPrivacy' => true])
            ->assertRedirect('/verify-email')
            ->assertSessionHas('error', fn ($m) => str_contains($m, 'Resend'));

        $this->assertAuthenticatedAs(User::where('email', 'ana@example.com')->firstOrFail());
    }

    public function test_resend_during_an_outage_shows_an_error_instead_of_failing(): void
    {
        $user = User::factory()->unverified()->create(['role' => 'jobseeker']);
        $this->breakMail();

        $this->actingAs($user)->from('/verify-email')->post('/email/verification-notification')
            ->assertRedirect('/verify-email')
            ->assertSessionHas('error');
    }

    public function test_a_failed_reset_email_gives_the_same_answer_as_an_unknown_address(): void
    {
        User::factory()->create(['email' => 'real@example.com']);
        $this->breakMail();

        $known = $this->from('/forgot-password')->post('/forgot-password', ['email' => 'real@example.com']);
        $unknown = $this->from('/forgot-password')->post('/forgot-password', ['email' => 'nobody@example.com']);

        $known->assertRedirect('/forgot-password')->assertSessionHas('success');
        $unknown->assertRedirect('/forgot-password')->assertSessionHas('success');
        $this->assertSame(session('success'), $known->getSession()->get('success'));
    }
}
