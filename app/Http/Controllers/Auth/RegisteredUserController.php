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

        event(new Registered($user));
        Auth::login($user);

        return $user->role === 'employer'
            ? redirect('/dashboard?role=employer')
            : redirect('/dashboard');
    }
}
