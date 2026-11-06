<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\EmployerProfile;
use App\Models\JobPost;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/** Consent, account recovery, login limits, and jobs that end instead of lingering. */
class AccountSafetyTest extends TestCase
{
    use RefreshDatabase;

    private function signup(array $extra = [])
    {
        return $this->post('/register', array_merge(['role' => 'jobseeker', 'firstName' => 'Ana', 'surname' => 'Cruz',
            'email' => 'ana@test.ph', 'password' => 'secret123', 'password_confirmation' => 'secret123'], $extra));
    }

    private function employerWithJob(array $job = []): array
    {
        $user = User::factory()->create(['role' => 'employer']);
        $company = EmployerProfile::create(['user_id' => $user->id, 'company_name' => 'Acme', 'email_verified' => true, 'verification_status' => 'approved']);
        $post = $company->jobPosts()->create(array_merge(['title' => 'Barista', 'status' => 'Open', 'location_city' => 'Davao City',
            'experience_level' => 'Entry', 'required_skills' => ['Barista']], $job));

        return [$user, $post];
    }

    private function applicant(): User
    {
        $user = User::factory()->create(['role' => 'jobseeker']);
        $profile = ApplicantProfile::create(['user_id' => $user->id, 'location' => 'Davao City', 'experience_level' => 'Entry']);
        $profile->skills()->create(['name' => 'Barista', 'level' => 80, 'verification_status' => 'verified']);

        return $user->fresh();
    }

    // --- Consent (RA 10173) --------------------------------------------------

    public function test_signup_requires_accepting_the_privacy_notice_and_records_when(): void
    {
        $this->signup()->assertSessionHasErrors('acceptPrivacy');
        $this->assertDatabaseCount('users', 0);

        $this->signup(['acceptPrivacy' => true])->assertRedirect('/verify-email');
        $this->assertNotNull(User::first()->privacy_accepted_at);
        $this->get('/privacy')->assertOk();
    }

    public function test_registry_check_needs_explicit_consent(): void
    {
        Storage::fake('local');
        $user = $this->applicant();
        $upload = fn (array $extra) => $this->actingAs($user)->post('/credentials', array_merge([
            'type' => 'certificate', 'file' => UploadedFile::fake()->create('nc.pdf', 20, 'application/pdf'),
            'registry' => 'tesda', 'registryNumber' => '1234567890123456', 'registryQualification' => 'Barista NC II',
        ], $extra));

        $upload([])->assertSessionHasErrors('registryConsent');
        $this->assertDatabaseCount('credentials', 0);

        $upload(['registryConsent' => true])->assertSessionHasNoErrors();
        $this->assertNotNull($user->applicantProfile->credentials()->first()->registry_consent_at);
    }

    // --- Login limit ---------------------------------------------------------

    public function test_login_locks_after_five_wrong_passwords(): void
    {
        $user = $this->applicant();
        foreach (range(1, 5) as $i) {
            $this->post('/login', ['email' => $user->email, 'password' => 'wrong'.$i]);
        }

        // Even the right password is refused while locked.
        $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertSessionHasErrors('email');
        $this->assertStringContainsString('Too many attempts', session('errors')->first('email'));
        $this->assertGuest();

        $this->travel(61)->seconds();
        $this->post('/login', ['email' => $user->email, 'password' => 'password'])->assertRedirect('/dashboard');
    }

    // --- Password reset ------------------------------------------------------

    public function test_password_reset_works_once_and_never_reveals_who_has_an_account(): void
    {
        Notification::fake();
        $user = $this->applicant();

        $this->post('/forgot-password', ['email' => 'nobody@test.ph'])->assertSessionHas('success');
        $this->post('/forgot-password', ['email' => $user->email])->assertSessionHas('success'); // same answer

        $token = null;
        Notification::assertSentTo($user, ResetPassword::class, function ($notification) use (&$token) {
            $token = $notification->token;

            return true;
        });

        $this->get("/reset-password/{$token}?email={$user->email}")->assertOk();
        $reset = ['token' => $token, 'email' => $user->email, 'password' => 'newpass123', 'password_confirmation' => 'newpass123'];
        $this->post('/reset-password', $reset)->assertRedirect('/login');
        $this->assertTrue(Hash::check('newpass123', $user->fresh()->password));

        // The same link cannot be used twice.
        $this->post('/reset-password', array_merge($reset, ['password' => 'again1234', 'password_confirmation' => 'again1234']))
            ->assertSessionHasErrors('email');
        $this->assertTrue(Hash::check('newpass123', $user->fresh()->password));
    }

    // --- Jobs that end -------------------------------------------------------

    public function test_a_past_closing_date_hides_the_job_everywhere(): void
    {
        [, $post] = $this->employerWithJob(['closing_date' => now()->subDay()]);
        $user = $this->applicant();

        $this->get('/')->assertInertia(fn (AssertableInertia $page) => $page->where('landing.stats.openJobs', 0));
        $this->actingAs($user)->post("/applications/{$post->id}", ['status' => 'applied'])->assertNotFound();
        $this->actingAs($user)->get('/dashboard');
        $this->assertDatabaseMissing('applications', ['job_post_id' => $post->id]); // never auto-flagged
    }

    public function test_employer_closes_a_role_with_an_outcome_and_others_cannot(): void
    {
        [$employer, $post] = $this->employerWithJob();
        $user = $this->applicant();
        Application::create(['job_post_id' => $post->id, 'applicant_profile_id' => $user->applicantProfile->id, 'status' => 'flagged']);

        [$rival] = $this->employerWithJob();
        $this->actingAs($rival)->post("/job-posts/{$post->id}/close", ['outcome' => 'filled'])->assertForbidden();

        $this->actingAs($employer)->post("/job-posts/{$post->id}/close", ['outcome' => 'filled']);
        $post->refresh();
        $this->assertSame('Closed', $post->status);
        $this->assertSame('filled', $post->closed_reason);
        $this->assertNotNull($post->closed_at);

        $matches = $this->actingAs($user)->get('/dashboard')->viewData('page')['props']['account']['matches'];
        $this->assertEmpty(collect($matches)->where('id', $post->id));
    }

    public function test_a_closing_date_in_the_past_cannot_be_posted(): void
    {
        [$employer] = $this->employerWithJob();
        $this->actingAs($employer)->post('/job-posts', ['title' => 'Cook', 'locationCity' => 'Davao City', 'employmentType' => 'Full-time',
            'workSetup' => 'On-site', 'description' => 'x', 'responsibilities' => 'x', 'requiredSkills' => 'Cooking',
            'closingDate' => now()->subDay()->toDateString()])->assertSessionHasErrors('closingDate');
        $this->assertSame(1, JobPost::count());
    }
}
