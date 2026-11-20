<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class AuthenticatedSessionController extends Controller
{
    public function store(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        // Five tries per account and address per minute: enough for typos, too few to guess passwords.
        $key = Str::lower($credentials['email']).'|'.$request->ip();
        if (RateLimiter::tooManyAttempts($key, 5)) {
            throw ValidationException::withMessages([
                'email' => 'Too many attempts. Try again in '.RateLimiter::availableIn($key).' seconds.',
            ]);
        }

        if (! Auth::attempt($credentials, $request->boolean('remember'))) {
            RateLimiter::hit($key, 60);
            throw ValidationException::withMessages([
                'email' => 'Invalid credentials. Please try again.',
            ]);
        }
        RateLimiter::clear($key);

        // The login page has Job seeker / Employer buttons. A right password on the
        // wrong side signs nobody in; admins may use either button.
        $chosen = $request->input('role');
        $role = Auth::user()->role;
        if (in_array($chosen, ['jobseeker', 'employer'], true) && $role !== 'admin' && $role !== $chosen) {
            Auth::logout();
            throw ValidationException::withMessages([
                'email' => $role === 'employer'
                    ? 'This is an employer account. Choose “Employer” above, then log in.'
                    : 'This is a job seeker account. Choose “Job seeker” above, then log in.',
            ]);
        }

        $request->session()->regenerate();

        return match (Auth::user()->role) {
            'admin' => redirect()->intended('/admin'),
            'employer' => redirect()->intended('/dashboard?role=employer'),
            default => redirect()->intended('/dashboard'),
        };
    }

    public function destroy(Request $request)
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
