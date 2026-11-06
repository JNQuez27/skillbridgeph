<?php

use App\Http\Controllers\AdminController;
use App\Http\Controllers\ApplicantProfileController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\AssessmentAttemptController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\CandidateHireController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\EmailVerificationController;
use App\Http\Controllers\Auth\PasswordResetController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\CredentialController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployerProfileController;
use App\Http\Controllers\JobPostController;
use App\Http\Controllers\PipelineController;
use App\Models\ApplicantSkill;
use App\Models\Application;
use App\Models\EmployerProfile;
use App\Models\JobPost;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Public dashboard. Every number shown here comes from the database: a platform
// built on "verified" cannot advertise figures it made up.
Route::get('/', function () {
    $openJobs = JobPost::with('employerProfile')->open()->latest()->get();
    $statuses = Application::selectRaw('status, count(*) as n')->groupBy('status')->pluck('n', 'status');

    return Inertia::render('SkillBridge/SkillBridgePage', [
        'landing' => [
            'stats' => [
                'openJobs' => $openJobs->count(),
                'verifiedBadges' => ApplicantSkill::where('verification_status', 'verified')->count(),
                'verifiedEmployers' => EmployerProfile::where('email_verified', true)->count(),
                'verifiedApplicants' => ApplicantSkill::where('verification_status', 'verified')->distinct()->count('applicant_profile_id'),
                'shortlisted' => $statuses['shortlisted'] ?? 0,
                'interviewing' => $statuses['interviewing'] ?? 0,
                'hired' => $statuses['hired'] ?? 0,
            ],
            'jobs' => $openJobs->take(6)->map(fn ($j) => [
                'id' => $j->id,
                'title' => $j->title,
                'company' => $j->employerProfile->company_name ?? 'Company',
                'location' => $j->location_city ?: 'Philippines',
                'tag' => $j->work_setup ?: $j->employment_type,
                'skills' => count($j->required_skills ?? []),
            ])->values(),
            'industries' => $openJobs->groupBy(fn ($j) => $j->employerProfile->industry ?: 'Other')
                ->map(fn ($jobs, $industry) => ['title' => $industry, 'openRoles' => $jobs->count()])
                ->sortByDesc('openRoles')->values(),
            'topSkills' => $openJobs->flatMap(fn ($j) => $j->required_skills ?? [])
                ->countBy()->sortDesc()->keys()->take(4)->values(),
        ],
    ]);
})->name('home');

// Patent Fig. 2, 202: a guest can browse open jobs from verified companies. No
// match scores and no applying until they sign up; a signed-in applicant is sent
// to Find Jobs, where the same jobs carry their match.
Route::get('/jobs', function (Request $request) {
    if ($request->user()?->role === 'jobseeker') {
        return redirect('/dashboard?tab=browse');
    }

    return Inertia::render('SkillBridge/SkillBridgePage', [
        'publicJobs' => JobPost::with(['employerProfile', 'assessment'])->open()
            ->whereHas('employerProfile', fn ($q) => $q->where('email_verified', true))
            ->latest()->get()
            ->map(fn (JobPost $j) => [
                'id' => $j->id,
                'title' => $j->title,
                'company' => $j->employerProfile->company_name,
                'industry' => $j->employerProfile->industry,
                'location' => trim(($j->location_city ?? '').($j->location_region ? ', '.$j->location_region : '')),
                'workSetup' => $j->work_setup,
                'employmentType' => $j->employment_type,
                'salaryRange' => $j->salary_range,
                'requiredSkills' => $j->required_skills ?? [],
                'preferredSkills' => $j->preferred_skills ?? [],
                'assessment' => $j->assessment?->status === 'Active' ? $j->assessment->title : null,
                'postedAt' => $j->created_at?->diffForHumans(),
            ])->values(),
    ]);
})->name('jobs.public');

// Patent Fig. 21 (2106): anyone with a badge's link can check it. Only badges
// their holder made shareable are shown; anything else gets the same answer, so
// the page never reveals whether an ID exists. Throttled against guessing.
Route::get('/verify/{verificationId}', function (string $verificationId) {
    $badge = ApplicantSkill::with(['applicantProfile.user', 'assessmentResult.assessment'])
        ->where('verification_id', strtoupper($verificationId))
        ->where('verification_status', 'verified')->whereNotNull('public_at')->first();

    return Inertia::render('VerifyBadge', [
        'verificationId' => strtoupper($verificationId),
        'badge' => $badge ? [
            'holder' => $badge->applicantProfile->user->name,
            'skill' => $badge->name,
            'badge' => $badge->badge ?: $badge->name.' Verified',
            'method' => $badge->verification_method,
            'verifiedBy' => $badge->verified_by,
            'verifiedAt' => $badge->verified_at?->ph()->toFormattedDateString(),
            'level' => $badge->level,
            'assessment' => $badge->assessmentResult?->assessment?->title,
        ] : null,
    ]);
})->middleware('throttle:30,1')->name('badge.verify');

// Privacy notice (Data Privacy Act, RA 10173), readable before signing up.
Route::get('/privacy', fn () => Inertia::render('Privacy'))->name('privacy');

// Guest auth screens + actions
Route::middleware('guest')->group(function () {
    Route::get('/login', fn () => Inertia::render('JobSeeker/Login'))->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);

    Route::get('/signup', fn () => Inertia::render('JobSeeker/Signup'))->name('signup');
    Route::post('/register', [RegisteredUserController::class, 'store']);

    Route::get('/forgot-password', fn () => Inertia::render('JobSeeker/ForgotPassword'))->name('password.request');
    Route::post('/forgot-password', [PasswordResetController::class, 'sendLink'])->name('password.email');
    Route::get('/reset-password/{token}', [PasswordResetController::class, 'edit'])->name('password.reset');
    Route::post('/reset-password', [PasswordResetController::class, 'update'])->name('password.store');
});

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');

// Authenticated app
// Fig. 3, step 310: confirm the email address before anything else.
Route::middleware('auth')->group(function () {
    Route::get('/verify-email', [EmailVerificationController::class, 'notice'])->name('verification.notice');
    Route::get('/verify-email/{id}/{hash}', [EmailVerificationController::class, 'verify'])
        ->middleware(['signed', 'throttle:6,1'])->name('verification.verify');
    Route::post('/email/verification-notification', [EmailVerificationController::class, 'send'])
        ->middleware('throttle:6,1')->name('verification.send');
});

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Applicant onboarding (build skill profile)
    Route::get('/onboarding', function (Request $request) {
        if ($request->user()->role === 'employer') {
            return redirect('/employer/onboarding');
        }
        return Inertia::render('JobSeeker/Onboarding');
    })->name('onboarding');

    // Employer onboarding (company background & verification)
    Route::get('/employer/onboarding', function (Request $request) {
        if ($request->user()->role !== 'employer') {
            return redirect('/onboarding');
        }
        return Inertia::render('Employer/Onboarding');
    })->name('employer.onboarding');

    // Applicant actions
    Route::put('/applicant-profile', [ApplicantProfileController::class, 'update']);
    Route::post('/credentials', [CredentialController::class, 'store']);
    Route::post('/credentials/recording', [CredentialController::class, 'startRecording']);
    Route::get('/credentials/recording/prompts', [CredentialController::class, 'recordingPrompts']);
    Route::get('/credentials/{credential}/file', [CredentialController::class, 'file'])->name('credentials.file');
    Route::delete('/credentials/{credential}', [CredentialController::class, 'destroy']);
    Route::post('/credentials/{credential}/skills', [CredentialController::class, 'linkSkills']);

    // Fig. 21 (2106): the holder turns a badge's shareable verification link on or off.
    Route::post('/badges/{skill}/share', function (Request $request, ApplicantSkill $skill) {
        abort_unless($request->user()->applicantProfile?->id === $skill->applicant_profile_id, 403);
        if ($skill->verification_status !== 'verified' || ! $skill->verification_id) {
            return back()->with('error', 'Only a verified badge can be shared.');
        }
        $on = $request->boolean('public');
        $skill->update(['public_at' => $on ? now() : null]);

        return back()->with('success', $on ? 'Link on: anyone with it can verify your '.$skill->name.' badge.' : 'Link off: the '.$skill->name.' badge is private again.');
    });
    Route::post('/applications/{jobPost}', [ApplicationController::class, 'store']);
    Route::post('/applications/{jobPost}/answer', [ApplicationController::class, 'answer']);
    Route::post('/assessments/{assessment}/start', [AssessmentAttemptController::class, 'start']);
    Route::post('/assessments/{assessment}/attempt', [AssessmentAttemptController::class, 'store']);
    Route::get('/assessment-attempts/{attempt}/file', [AssessmentAttemptController::class, 'file']);
    Route::post('/assessment-attempts/{attempt}/review', [AssessmentAttemptController::class, 'review']);

    // Employer actions
    Route::put('/employer-profile', [EmployerProfileController::class, 'update']);
    Route::post('/employer-verification', [EmployerProfileController::class, 'submitVerification']);
    Route::get('/employer-verification/{employerProfile}/permit', [EmployerProfileController::class, 'permit'])->name('employer.permit');
    Route::post('/job-posts', [JobPostController::class, 'store']);
    Route::post('/job-posts/{jobPost}/close', [JobPostController::class, 'close']);
    Route::post('/assessments', [AssessmentController::class, 'store']);
    Route::post('/job-posts/{jobPost}/invite/{applicant}', [PipelineController::class, 'invite']);
    Route::post('/job-posts/{jobPost}/stage/{applicant}', [PipelineController::class, 'stage']);
    Route::post('/job-posts/{jobPost}/shortlist-green', [PipelineController::class, 'shortlistGreen']);
    Route::post('/job-posts/{jobPost}/invite-top', [PipelineController::class, 'inviteTop']);

    // Fig. 7, step 760: mark the signed-in user's notifications as read.
    Route::post('/notifications/read', function (Request $request) {
        $request->user()->unreadNotifications->markAsRead();

        return back();
    });
    Route::post('/job-posts/{jobPost}/verify-skill/{applicant}', [PipelineController::class, 'verifySkill']);
    Route::post('/job-posts/{jobPost}/interview/{applicant}', [PipelineController::class, 'interview']);
    Route::post('/job-posts/{jobPost}/hire/{applicant}', [CandidateHireController::class, 'store']);

    // SkillBridge admins: check companies and certificates against official registries.
    Route::get('/admin', [AdminController::class, 'index'])->name('admin');
    Route::post('/admin/employers/{employerProfile}', [AdminController::class, 'decideEmployer']);
    Route::post('/admin/credentials/{credential}', [AdminController::class, 'decideCredential']);
    Route::post('/admin/assessments/{assessment}', [AdminController::class, 'moderateAssessment']);
});
