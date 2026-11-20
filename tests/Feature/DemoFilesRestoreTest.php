<?php

namespace Tests\Feature;

use App\Models\Credential;
use App\Models\EmployerProfile;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Render's free plan wipes uploaded files on every restart. The seeded demo files
 * are written back on start, so the admin's "view permit / certificate" links work.
 */
class DemoFilesRestoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_wiped_demo_files_are_restored_and_open_again(): void
    {
        Storage::fake('local');
        $this->seed();
        $admin = User::where('email', 'admin@skillbridge.ph')->first();
        $company = EmployerProfile::where('company_name', 'BrightBuild Construction')->first();
        $certificate = Credential::where('original_name', 'bianca-uy-tesda-nc2.docx')->first();

        // A restart: every file is gone, the database still points at them.
        Storage::fake('local');
        $this->actingAs($admin)->get("/employer-verification/{$company->id}/permit")->assertNotFound();

        $this->artisan('demo:restore-files')->assertSuccessful();

        $this->actingAs($admin)->get("/employer-verification/{$company->id}/permit")->assertOk();
        Storage::disk('local')->assertExists($certificate->path);
        $this->assertSame(0, Credential::all()->reject(fn ($c) => Storage::disk('local')->exists($c->path))->count());
    }
}
