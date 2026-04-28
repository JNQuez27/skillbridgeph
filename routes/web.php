<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Http\Request;
use Inertia\Inertia;

Route::get('/', function () {
    return Inertia::render('SkillBridge/SkillBridgePage');
});

Route::get('/login', function () {
    return Inertia::render('JobSeeker/Login');
});

Route::get('/signup', function () {
    return Inertia::render('JobSeeker/Signup');
});

Route::get('/forgot-password', function () {
    return Inertia::render('JobSeeker/ForgotPassword');
});

Route::get('/onboarding', function () {
    return Inertia::render('JobSeeker/Onboarding');
});

Route::get('/dashboard', function (Request $request) {
    $role = $request->get('role', 'jobseeker');
    $normalizedRole = $role === 'employer' ? 'employer' : 'jobseeker';
    $initialView = $normalizedRole === 'employer' ? 'employer-dashboard' : 'jobseeker-dashboard';

    return Inertia::render('SkillBridge/SkillBridgePage', [
        'initialView' => $initialView,
        'initialRole' => $normalizedRole,
    ]);
});

Route::get('/profile', function () {
    return Inertia::render('SkillBridge/SkillBridgePage', [
        'initialView' => 'user-profile',
        'initialRole' => 'jobseeker',
        'requiresAuth' => true,
    ]);
});
