<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Symfony\Component\Mailer\Bridge\Brevo\Transport\BrevoApiTransport;
use Tests\TestCase;

/**
 * Password resets (and other app email) are sent through
 * Brevo's HTTPS API, because the free Render plan blocks SMTP. A mail outage
 * must never reveal who has an account.
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
