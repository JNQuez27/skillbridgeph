<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\Credential;
use App\Models\EmployerProfile;
use App\Models\User;
use App\Services\CandidateReview;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Companies and certificates are checked once, by a SkillBridge admin, against
 * the official registry. Each test is one way that chain could be skipped.
 */
class VerificationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function employer(bool $verified = false): User
    {
        $user = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(['user_id' => $user->id, 'company_name' => 'Acme', 'industry' => 'IT', 'location_city' => 'Davao City', 'recruiter_name' => 'HR', 'recruiter_contact' => '09170000000', 'email_verified' => $verified,
            'verification_status' => $verified ? 'approved' : 'unsubmitted']);

        return $user->fresh();
    }

    private function applicant(array $verified = ['Barista']): User
    {
        $user = User::factory()->create(['role' => 'jobseeker', 'first_name' => 'Bianca', 'surname' => 'Uy']);
        $profile = ApplicantProfile::create(['user_id' => $user->id, 'location' => 'Davao City', 'experience_level' => 'Entry']);
        foreach ($verified as $s) {
            $profile->skills()->create(['name' => $s, 'level' => 80, 'verification_status' => 'verified']);
        }

        return $user->fresh();
    }

    private function jobPayload(): array
    {
        return ['title' => 'Barista', 'locationCity' => 'Davao City', 'employmentType' => 'Full-time', 'workSetup' => 'On-site',
            'description' => 'x', 'responsibilities' => 'x', 'requiredSkills' => 'Barista'];
    }

    private function submitCompany(User $employer)
    {
        return $this->actingAs($employer)->post('/employer-verification', [
            'registrationType' => 'DTI', 'registrationNumber' => '3456789',
            'permit' => UploadedFile::fake()->create('permit.pdf', 50, 'application/pdf'),
        ]);
    }

    private function uploadTesda(User $applicant, string $number = '1234 5678 9012 3456')
    {
        return $this->actingAs($applicant)->post('/credentials', [
            'type' => 'certificate', 'file' => UploadedFile::fake()->create('nc2.pdf', 30, 'application/pdf'),
            'registry' => 'tesda', 'registryNumber' => $number, 'registryQualification' => 'Barista NC II', 'registryConsent' => true,
        ]);
    }

    // --- Admin role ---------------------------------------------------------

    public function test_nobody_can_sign_up_as_admin(): void
    {
        $this->post('/register', ['role' => 'admin', 'firstName' => 'A', 'surname' => 'B', 'email' => 'a@b.ph',
            'password' => 'secret123', 'password_confirmation' => 'secret123'])->assertSessionHasErrors('role');
        $this->assertDatabaseMissing('users', ['role' => 'admin']);
    }

    public function test_only_admins_reach_the_admin_queue(): void
    {
        $company = $this->employer()->employerProfile;

        $this->actingAs($this->applicant())->get('/admin')->assertForbidden();
        $this->actingAs($this->employer())->post("/admin/employers/{$company->id}", ['decision' => 'approve'])->assertForbidden();

        $admin = $this->admin();
        $this->actingAs($admin)->get('/admin')->assertOk();
        $this->actingAs($admin)->get('/dashboard')->assertRedirect('/admin');
    }

    public function test_admin_login_lands_on_the_admin_queue(): void
    {
        $admin = $this->admin();
        $this->post('/login', ['email' => $admin->email, 'password' => 'password'])->assertRedirect('/admin');
    }

    // --- Company verification -----------------------------------------------

    public function test_unverified_company_cannot_post_until_an_admin_approves_it(): void
    {
        $employer = $this->employer();
        $this->actingAs($employer)->post('/job-posts', $this->jobPayload())->assertSessionHas('error');
        $this->assertDatabaseCount('job_posts', 0);

        $this->submitCompany($employer)->assertSessionHasNoErrors();
        $profile = $employer->employerProfile->fresh();
        $this->assertSame('pending', $profile->verification_status);
        $this->assertFalse($profile->email_verified); // submitting proves nothing by itself

        $admin = $this->admin();
        $this->actingAs($admin)->post("/admin/employers/{$profile->id}", ['decision' => 'approve']);
        $profile->refresh();
        $this->assertTrue($profile->email_verified);
        $this->assertSame($admin->id, $profile->reviewed_by);
        $this->assertNotNull($profile->reviewed_at);

        $this->actingAs($employer)->post('/job-posts', $this->jobPayload())->assertSessionHas('success');
        $this->assertDatabaseCount('job_posts', 1);
    }

    public function test_rejection_needs_a_reason(): void
    {
        $employer = $this->employer();
        $this->submitCompany($employer);
        $id = $employer->employerProfile->id;
        $admin = $this->admin();

        $this->actingAs($admin)->post("/admin/employers/{$id}", ['decision' => 'reject'])->assertSessionHasErrors('note');
        $this->actingAs($admin)->post("/admin/employers/{$id}", ['decision' => 'reject', 'note' => 'Not in DTI registry']);
        $this->assertDatabaseHas('employer_profiles', ['id' => $id, 'verification_status' => 'rejected', 'email_verified' => false]);
    }

    public function test_renaming_a_verified_company_sends_it_back_for_review(): void
    {
        $employer = $this->employer(true);
        $this->actingAs($employer)->put('/employer-profile', ['companyName' => 'Jollibee Foods']);

        $profile = $employer->employerProfile->fresh();
        $this->assertSame('pending', $profile->verification_status);
        $this->assertFalse($profile->email_verified);
    }

    public function test_permit_is_private_to_its_company_and_admins(): void
    {
        $employer = $this->employer();
        $this->submitCompany($employer);
        $url = "/employer-verification/{$employer->employerProfile->id}/permit";

        $this->actingAs($employer)->get($url)->assertOk();
        $this->actingAs($this->admin())->get($url)->assertOk();
        $this->actingAs($this->employer(true))->get($url)->assertForbidden();
    }

    // --- Certificate verification -------------------------------------------

    public function test_tesda_number_must_be_complete_enough_to_search(): void
    {
        $this->uploadTesda($this->applicant(), '123')->assertSessionHasErrors('registryNumber');
        $this->assertDatabaseCount('credentials', 0);
    }

    public function test_admin_gets_a_prefilled_tesda_lookup_using_the_account_name(): void
    {
        $this->uploadTesda($this->applicant());

        $this->actingAs($this->admin())->get('/admin')->assertInertia(fn (AssertableInertia $page) => $page
            ->component('SkillBridge/SkillBridgePage')
            ->where('account.role', 'admin')
            ->where('account.credentials.pending.0.qualification', 'Barista NC II')
            ->where('account.credentials.pending.0.lookupUrl', fn ($url) => str_contains($url, 'searchLName=Uy')
                && str_contains($url, 'searchFName=Bianca') && str_contains($url, 'firstFour=1234') && str_contains($url, 'lastFour=3456')));
    }

    public function test_approved_certificate_becomes_a_registry_badge_every_employer_sees(): void
    {
        $user = $this->applicant([]);
        $this->uploadTesda($user)->assertSessionHasNoErrors();
        $file = Credential::first();
        $this->assertSame('pending', $file->registry_status);

        $admin = $this->admin();
        $this->actingAs($admin)->post("/admin/credentials/{$file->id}", ['decision' => 'approve']);

        $skill = $user->applicantProfile->skills()->where('name', 'Barista NC II')->first();
        $this->assertSame('verified', $skill->verification_status);
        $this->assertSame('registry', $skill->verification_method);
        $this->assertSame('TESDA registry', $skill->verified_by);
        $this->assertSame($file->id, $skill->evidence_credential_id);
        $this->assertSame($admin->id, $file->fresh()->registry_checked_by);

        // The evidence behind the badge cannot be deleted.
        $this->actingAs($user)->delete("/credentials/{$file->id}");
        $this->assertDatabaseHas('credentials', ['id' => $file->id]);

        // Two unrelated companies both see the same recorded result.
        foreach ([$this->employer(true), $this->employer(true)] as $employer) {
            $job = $employer->employerProfile->jobPosts()->create(['title' => 'Barista', 'status' => 'Open', 'required_skills' => ['Barista NC II']]);
            Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $user->applicantProfile->id, 'status' => 'applied']);
            $credential = $this->actingAs($employer)->get('/dashboard')->viewData('page')['props']['account']['applicants'][0]['credentials'][0];
            $this->assertSame('verified', $credential['registry']['status']);
            $this->assertSame('TESDA registry', $credential['registry']['label']);
        }
    }

    public function test_certificate_missing_from_the_registry_turns_the_review_red(): void
    {
        $user = $this->applicant();
        $this->uploadTesda($user);
        $file = Credential::first();

        $this->actingAs($this->admin())->post("/admin/credentials/{$file->id}", ['decision' => 'reject', 'note' => 'No Data Found in RWAC']);

        $job = $this->employer(true)->employerProfile->jobPosts()->create(['title' => 'Barista', 'status' => 'Open', 'required_skills' => ['Barista']]);
        $review = app(CandidateReview::class)->for($job, $user->applicantProfile->fresh());
        $this->assertSame('red', $review['status']);
        $this->assertStringContainsString('TESDA registry', collect($review['reasons'])->pluck('text')->implode(' '));
        $this->assertFalse($user->applicantProfile->skills()->where('name', 'Barista NC II')->exists());
    }

    public function test_a_decision_is_final_and_cannot_be_flipped_by_replaying_it(): void
    {
        $this->uploadTesda($this->applicant());
        $file = Credential::first();
        $admin = $this->admin();

        $this->actingAs($admin)->post("/admin/credentials/{$file->id}", ['decision' => 'reject', 'note' => 'Not found']);
        $this->actingAs($admin)->post("/admin/credentials/{$file->id}", ['decision' => 'approve'])->assertStatus(422);
        $this->assertSame('rejected', $file->fresh()->registry_status);
    }

    // --- Employer view ------------------------------------------------------

    public function test_employer_list_ranks_green_before_red_at_equal_engagement(): void
    {
        $employer = $this->employer(true);
        $job = $employer->employerProfile->jobPosts()->create(['title' => 'Barista', 'status' => 'Open', 'required_skills' => ['Barista']]);
        $green = $this->applicant(['Barista'])->applicantProfile;
        $red = $this->applicant(['Barista'])->applicantProfile;
        Credential::create(['applicant_profile_id' => $green->id, 'type' => 'resume', 'original_name' => 'g.pdf', 'path' => 'x',
            'mime' => 'application/pdf', 'size' => 1, 'sha256' => str_repeat('1', 64)]);
        foreach ([$red, $this->applicant(['Barista'])->applicantProfile] as $p) { // same file on two accounts → red
            Credential::create(['applicant_profile_id' => $p->id, 'type' => 'resume', 'original_name' => 'r.pdf', 'path' => 'x',
                'mime' => 'application/pdf', 'size' => 1, 'sha256' => str_repeat('2', 64)]);
        }
        // Red applied first so insertion order alone would put it on top.
        foreach ([$red, $green] as $p) {
            Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $p->id, 'status' => 'applied']);
        }

        $candidates = $this->actingAs($employer)->get('/dashboard')->viewData('page')['props']['account']['matches'][0]['candidates'];
        $this->assertSame(['green', 'red'], array_slice(array_map(fn ($c) => $c['review']['status'], $candidates), 0, 2));
    }
}
