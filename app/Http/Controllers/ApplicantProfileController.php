<?php

namespace App\Http\Controllers;

use App\Services\MatchService;
use Illuminate\Http\Request;

class ApplicantProfileController extends Controller
{
    public function update(Request $request, MatchService $matcher)
    {
        $user = $request->user();
        abort_unless($user->role === 'jobseeker', 403);

        $data = $request->validate([
            'headline' => ['nullable', 'string', 'max:255'],
            'location' => ['nullable', 'string', 'max:255'],
            'experienceLevel' => ['nullable', 'in:Entry,Mid,Senior'],
            'desiredRoles' => ['nullable', 'array'],
            'desiredRoles.*' => ['string', 'max:255'],
        ]);

        $profile = $user->applicantProfile()->firstOrCreate(
            [],
            ['location' => 'Philippines', 'experience_level' => 'Entry']
        );

        $profile->update([
            'headline' => $data['headline'] ?? $profile->headline,
            'location' => $data['location'] ?? $profile->location,
            'experience_level' => $data['experienceLevel'] ?? $profile->experience_level,
            'desired_roles' => $data['desiredRoles'] ?? $profile->desired_roles,
        ]);

        // Re-run autonomous matching against the updated profile.
        $matcher->syncFlaggedMatches($profile->load('skills'));

        return back()->with('success', 'Profile updated.');
    }
}
