<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * Fig. 3, step 310: a new account confirms its email address through a signed,
 * expiring link before it can use the platform. Then step 315 sends applicants
 * to onboarding (325) and employers to employer sign-up (320).
 */
class EmailVerificationController extends Controller
{
    private function next(Request $request): string
    {
        return match ($request->user()->role) {
            'employer' => '/employer/onboarding',
            'admin' => '/admin',
            default => '/onboarding',
        };
    }

    public function notice(Request $request)
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect($this->next($request));
        }

        return Inertia::render('JobSeeker/VerifyEmail', ['email' => $request->user()->email]);
    }

    public function verify(EmailVerificationRequest $request)
    {
        $request->fulfill();

        return redirect($this->next($request))->with('success', 'Email confirmed. Welcome to SkillBridge PH.');
    }

    public function send(Request $request)
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect($this->next($request));
        }
        $request->user()->sendEmailVerificationNotification();

        return back()->with('success', 'A new confirmation link was sent to '.$request->user()->email.'.');
    }
}
