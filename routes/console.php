<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

// Hosts without a shell (Render free plan): seed the demo data on start, but only
// into an empty database, so a restart or redeploy never wipes real accounts.
Artisan::command('demo:seed-if-empty', function () {
    if (\App\Models\User::exists()) {
        $this->info('Database already has accounts; demo seed skipped.');

        return 0;
    }
    // A public site must never get admin@skillbridge.ph with the known default password.
    if (app()->isProduction() && blank(env('DEMO_PASSWORD'))) {
        $this->error('Set DEMO_PASSWORD before seeding demo accounts in production; demo seed skipped.');

        return 0;   // the site still starts; the seed runs on the next start once it is set
    }
    $this->call('db:seed', ['--force' => true]);
})->purpose('Seed the demo data only when the database has no users');

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Company verification is granted by SkillBridge PH after checking the business
// (permit, domain, a call) - never self-declared, because a verified company's
// assessments issue badges and its reviews verify skills.
Artisan::command('employer:verify {email} {--revoke}', function (string $email) {
    $profile = \App\Models\User::where('email', $email)->where('role', 'employer')->first()?->employerProfile;
    if (! $profile) {
        $this->error("No employer account for {$email}.");

        return 1;
    }
    $approved = ! $this->option('revoke');
    $profile->update([
        'email_verified' => $approved,
        'verification_status' => $approved ? 'approved' : 'rejected',
        'verification_note' => 'Set from the command line',
        'reviewed_at' => now(),
    ]);
    $this->info($profile->company_name.($approved ? ' is now verified.' : ' is no longer verified.'));
})->purpose('Mark an employer company as verified (or --revoke)');

// Admins check companies and certificates in /admin. The role is never offered at
// signup, so it can only be granted by someone with server access.
Artisan::command('admin:create {email} {--name=SkillBridge Admin}', function (string $email) {
    if (\App\Models\User::where('email', $email)->exists()) {
        $this->error("{$email} already has an account.");

        return 1;
    }
    $password = (string) $this->secret('Password (min 12 characters)');
    if (strlen($password) < 12) {
        $this->error('Password must be at least 12 characters.');

        return 1;
    }
    \App\Models\User::create([
        'name' => $this->option('name'), 'first_name' => $this->option('name'), 'surname' => '',
        'email' => $email, 'role' => 'admin', 'password' => \Illuminate\Support\Facades\Hash::make($password),
    ])->forceFill(['email_verified_at' => now()])->save(); // created by someone with server access
    $this->info("Admin {$email} created. Sign in and open /admin.");
})->purpose('Create a SkillBridge PH admin account');
