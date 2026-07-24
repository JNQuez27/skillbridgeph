<?php

use App\Http\Controllers\ApplicantProfileController;
use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\AssessmentAttemptController;
use App\Http\Controllers\AssessmentController;
use App\Http\Controllers\InviteController;
use App\Http\Controllers\Auth\AuthenticatedSessionController;
use App\Http\Controllers\Auth\RegisteredUserController;
use App\Http\Controllers\CredentialController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\EmployerProfileController;
use App\Http\Controllers\JobPostController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

// Public dashboard
Route::get('/', fn () => Inertia::render('SkillBridge/SkillBridgePage'))->name('home');

// Guest auth screens + actions
Route::middleware('guest')->group(function () {
    Route::get('/login', fn () => Inertia::render('JobSeeker/Login'))->name('login');
    Route::post('/login', [AuthenticatedSessionController::class, 'store']);

    Route::get('/signup', fn () => Inertia::render('JobSeeker/Signup'))->name('signup');
    Route::post('/register', [RegisteredUserController::class, 'store']);

    Route::get('/forgot-password', fn () => Inertia::render('JobSeeker/ForgotPassword'))->name('password.request');
});

Route::post('/logout', [AuthenticatedSessionController::class, 'destroy'])
    ->middleware('auth')
    ->name('logout');

// Authenticated app
Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/onboarding', fn () => Inertia::render('JobSeeker/Onboarding'))->name('onboarding');

    // Applicant actions
    Route::put('/applicant-profile', [ApplicantProfileController::class, 'update']);
    Route::post('/credentials', [CredentialController::class, 'store']);
    Route::delete('/credentials/{credential}', [CredentialController::class, 'destroy']);
    Route::post('/applications/{jobPost}', [ApplicationController::class, 'store']);
    Route::post('/assessments/{assessment}/attempt', [AssessmentAttemptController::class, 'store']);

    // Employer actions
    Route::put('/employer-profile', [EmployerProfileController::class, 'update']);
    Route::post('/job-posts', [JobPostController::class, 'store']);
    Route::post('/assessments', [AssessmentController::class, 'store']);
    Route::post('/job-posts/{jobPost}/invite/{applicant}', [InviteController::class, 'store']);
});
