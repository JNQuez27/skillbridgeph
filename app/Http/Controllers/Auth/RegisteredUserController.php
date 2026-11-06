<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\ApplicantProfile;
use App\Models\EmployerProfile;
use App\Models\User;
use App\Services\MatchService;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;

class RegisteredUserController extends Controller
{
    public function store(Request $request, MatchService $matcher)
    {
        $validated = $request->validate([
            'role' => ['required', 'in:jobseeker,employer'],
            'firstName' => ['required', 'string', 'max:255'],
            'middleName' => ['nullable', 'string', 'max:255'],
            'surname' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', Rules\Password::min(8)],
            // Data Privacy Act (RA 10173): processing needs the person's informed consent.
            'acceptPrivacy' => ['accepted'],
        ]);

        $fullName = trim(collect([$validated['firstName'], $validated['middleName'] ?? null, $validated['surname']])
            ->filter()
            ->implode(' '));

        $user = User::create([
            'name' => $fullName,
            'first_name' => $validated['firstName'],
            'middle_name' => $validated['middleName'] ?? null,
            'surname' => $validated['surname'],
            'role' => $validated['role'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'privacy_accepted_at' => now(),
        ]);

        if ($user->role === 'employer') {
            EmployerProfile::create([
                'user_id' => $user->id,
                'company_name' => $fullName."'s Company",
            ]);
        } else {
            $profile = ApplicantProfile::create([
                'user_id' => $user->id,
                'location' => 'Philippines',
                'experience_level' => 'Entry',
            ]);
            $matcher->syncFlaggedMatches($profile);
        }

        Auth::login($user);

        // The account exists either way; a mail outage must not turn sign-up into an
        // error page. The person can press "Resend" on the next screen.
        try {
            event(new Registered($user));
        } catch (\Throwable $e) {
            report($e);

            return redirect('/verify-email')->with('error', 'Your account was created, but the confirmation email could not be sent. Press "Resend" in a moment.');
        }

        // Fig. 3: confirm the email first (310); the role then decides the next
        // screen (315): applicant onboarding (325) or employer sign-up (320).
        return redirect('/verify-email');
    }
}
