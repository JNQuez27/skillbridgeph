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
            'bio' => ['nullable', 'string', 'max:5000'],
            'location' => ['nullable', 'string', 'max:255'],
            'experienceLevel' => ['nullable', 'in:Entry,Mid,Senior'],
            'desiredRoles' => ['nullable', 'array'],
            'desiredRoles.*' => ['string', 'max:255'],
            // Fig. 8, unit 840: optional job preferences (empty = any).
            'preferredWorkSetups' => ['nullable', 'array'],
            'preferredWorkSetups.*' => ['in:'.implode(',', \App\Models\JobPost::WORK_SETUPS)],
            'preferredJobTypes' => ['nullable', 'array'],
            'preferredJobTypes.*' => ['in:'.implode(',', \App\Models\JobPost::JOB_TYPES)],
            // Self-reported skills. They match at a discount until verified.
            'skills' => ['nullable', 'array', 'max:40'],
            'skills.*' => ['string', 'max:60'],
            'education' => ['nullable', 'array'],
            'education.school' => ['nullable', 'string', 'max:255'],
            'education.degree' => ['nullable', 'string', 'max:255'],
            'education.year' => ['nullable', 'string', 'max:10'],
            'experience' => ['nullable', 'array'],
            'experience.title' => ['nullable', 'string', 'max:255'],
            'experience.company' => ['nullable', 'string', 'max:255'],
            'experience.description' => ['nullable', 'string', 'max:2000'],
        ]);

        $profile = $user->applicantProfileOrCreate();

        $profile->update([
            'headline' => $data['headline'] ?? $profile->headline,
            'bio' => $data['bio'] ?? $profile->bio,
            'location' => $data['location'] ?? $profile->location,
            'experience_level' => $data['experienceLevel'] ?? $profile->experience_level,
            'desired_roles' => $data['desiredRoles'] ?? $profile->desired_roles,
            'preferred_work_setups' => array_key_exists('preferredWorkSetups', $data) ? array_values($data['preferredWorkSetups'] ?? []) : $profile->preferred_work_setups,
            'preferred_job_types' => array_key_exists('preferredJobTypes', $data) ? array_values($data['preferredJobTypes'] ?? []) : $profile->preferred_job_types,
            'education' => $data['education'] ?? $profile->education,
            'experience' => $data['experience'] ?? $profile->experience,
        ]);

        if (array_key_exists('skills', $data)) {
            $this->syncClaimedSkills($profile, $data['skills'] ?? []);
        }

        // Re-run autonomous matching against the updated profile.
        $matcher->syncFlaggedMatches($profile->load('skills'));

        return back()->with('success', 'Profile updated.');
    }

    /**
     * Replace the applicant's self-reported skills. Verified skills are never
     * touched here: a badge can only be earned, never typed in or removed by
     * editing the list.
     */
    private function syncClaimedSkills($profile, array $names): void
    {
        $wanted = collect($names)->map(fn ($n) => trim($n))->filter()
            ->unique(fn ($n) => mb_strtolower($n));
        $existing = $profile->skills()->get();
        $held = $existing->map(fn ($s) => mb_strtolower($s->name));

        $existing->whereNotIn('verification_status', ['verified', 'unverified'])
            ->reject(fn ($s) => $wanted->contains(fn ($n) => mb_strtolower($n) === mb_strtolower($s->name)))
            ->each->delete();

        $wanted->reject(fn ($n) => $held->contains(mb_strtolower($n)))
            ->each(fn ($n) => $profile->skills()->create([
                'name' => $n,
                'level' => 0,
                'verification_status' => 'pending',
                'verification_method' => 'assessment',
            ]));
    }
}
