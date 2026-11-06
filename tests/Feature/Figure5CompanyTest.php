<?php

namespace Tests\Feature;

use App\Models\EmployerProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia;
use Tests\TestCase;

/**
 * Patent Fig. 5 (500): company details (510) -> proof of registration (515) ->
 * fields complete? (520) -> automatic check (530) -> admin review (535) ->
 * approve (540) / reject with reason (545) -> validated (550).
 * Option A: the automatic check never validates on its own; an admin always decides.
 */
class Figure5CompanyTest extends TestCase
{
    use RefreshDatabase;

    private function employer(array $details = []): User
    {
        $user = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(array_merge(['user_id' => $user->id, 'company_name' => 'BrightBuild Construction', 'industry' => 'Construction',
            'location_city' => 'Davao City', 'recruiter_name' => 'Rafael Mendoza', 'recruiter_contact' => '09170000000'], $details));

        return $user->fresh();
    }

    /** A real, readable one-page PDF with these lines, as a permit upload. */
    private function permit(array $lines): UploadedFile
    {
        $maker = new class { use \Database\Seeders\EarnsBadges; public function make(array $l): string { return $this->pdf($l); } };

        return UploadedFile::fake()->createWithContent('permit.pdf', $maker->make($lines));
    }

    private function submit(User $employer, UploadedFile $permit, string $number = '3456789')
    {
        return $this->actingAs($employer)->post('/employer-verification', ['registrationType' => 'DTI', 'registrationNumber' => $number, 'permit' => $permit]);
    }

    private function checks(User $employer): array
    {
        return collect($employer->employerProfile->fresh()->precheck)->pluck('result', 'key')->all();
    }

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    public function test_520_incomplete_company_details_are_sent_back_with_what_is_missing(): void
    {
        $employer = $this->employer(['industry' => null, 'recruiter_contact' => null]);
        $this->submit($employer, $this->permit(['BRIGHTBUILD CONSTRUCTION', 'BNN 3456789']))->assertSessionHasErrors('registrationNumber');
        $this->assertStringContainsString('industry, recruiter contact', session('errors')->first('registrationNumber'));
        $this->assertSame('unsubmitted', $employer->employerProfile->fresh()->verification_status ?? 'unsubmitted');
    }

    public function test_530_a_consistent_permit_passes_every_check_but_still_waits_for_an_admin(): void
    {
        $employer = $this->employer();
        $this->submit($employer, $this->permit(['Certificate of Business Name Registration', 'Brightbuild  Construction', 'Business Name No. 3456789']))
            ->assertSessionHas('success');

        $this->assertSame(['permit_name' => 'pass', 'permit_number' => 'pass', 'number_unique' => 'pass', 'name_unique' => 'pass'], $this->checks($employer));
        $company = $employer->employerProfile->fresh();
        $this->assertSame('pending', $company->verification_status); // 535: never auto-validated
        $this->assertFalse($company->email_verified);
        $this->assertNotNull($company->precheck_at);
    }

    public function test_530_a_permit_that_does_not_match_fails_the_matching_checks(): void
    {
        $employer = $this->employer();
        $this->submit($employer, $this->permit(['Certificate of Business Name Registration', 'SOME OTHER TRADING', 'BNN 1111111']));

        $checks = $this->checks($employer);
        $this->assertSame('fail', $checks['permit_name']);
        $this->assertSame('fail', $checks['permit_number']);
    }

    public function test_530_an_image_permit_cannot_be_read_so_the_admin_checks_it_by_eye(): void
    {
        $employer = $this->employer();
        $this->submit($employer, UploadedFile::fake()->create('permit.jpg', 50, 'image/jpeg'));

        $checks = $this->checks($employer);
        $this->assertSame('unknown', $checks['permit_name']);
        $this->assertSame('unknown', $checks['permit_number']);
    }

    public function test_530_a_registration_number_or_name_already_used_is_flagged(): void
    {
        $owner = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(['user_id' => $owner->id, 'company_name' => 'BrightBuild Construction', 'registration_number' => '3456789',
            'verification_status' => 'approved', 'email_verified' => true]);

        $copycat = $this->employer();
        $this->submit($copycat, $this->permit(['BRIGHTBUILD CONSTRUCTION', 'BNN 3456789']));

        $checks = $this->checks($copycat);
        $this->assertSame('fail', $checks['number_unique']);
        $this->assertSame('fail', $checks['name_unique']);
    }

    public function test_535_540_545_550_the_admin_sees_the_checks_and_decides(): void
    {
        $employer = $this->employer();
        $this->submit($employer, $this->permit(['BRIGHTBUILD CONSTRUCTION', 'BNN 3456789']));
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->get('/admin')->assertInertia(fn (AssertableInertia $page) => $page
            ->has('account.employers.pending.0.precheck', 4)
            ->where('account.employers.pending.0.lookupUrl', 'https://bnrs.dti.gov.ph/search/search_this'));

        $id = $employer->employerProfile->id;
        $this->actingAs($admin)->post("/admin/employers/{$id}", ['decision' => 'reject'])->assertSessionHasErrors('note'); // 545 needs a reason
        $this->actingAs($admin)->post("/admin/employers/{$id}", ['decision' => 'approve']);                                   // 540
        $this->assertTrue($employer->employerProfile->fresh()->email_verified);                                               // 550
    }
}
