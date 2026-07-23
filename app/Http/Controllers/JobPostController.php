<?php

namespace App\Http\Controllers;

use App\Models\ApplicantProfile;
use App\Services\MatchService;
use Illuminate\Http\Request;

class JobPostController extends Controller
{
    public function store(Request $request, MatchService $matcher)
    {
        $user = $request->user();
        abort_unless($user->role === 'employer', 403);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'locationCity' => ['required', 'string', 'max:255'],
            'locationRegion' => ['nullable', 'string', 'max:255'],
            'employmentType' => ['required', 'string'],
            'workSetup' => ['required', 'string'],
            'salaryRange' => ['nullable', 'string'],
            'description' => ['required', 'string'],
            'responsibilities' => ['required', 'string'],
            'requiredSkills' => ['required', 'string'],
            'preferredSkills' => ['nullable', 'string'],
            'experienceLevel' => ['nullable', 'string'],
            'educationRequirement' => ['nullable', 'string'],
            'closingDate' => ['nullable', 'date'],
        ]);

        $profile = $user->employerProfile()->firstOrCreate([], ['company_name' => $user->name."'s Company"]);

        $profile->jobPosts()->create([
            'title' => $data['title'],
            'location_city' => $data['locationCity'],
            'location_region' => $data['locationRegion'] ?? null,
            'employment_type' => $data['employmentType'],
            'work_setup' => $data['workSetup'],
            'salary_range' => $data['salaryRange'] ?? null,
            'description' => $data['description'],
            'responsibilities' => $data['responsibilities'],
            'required_skills' => $this->tags($data['requiredSkills']),
            'preferred_skills' => $this->tags($data['preferredSkills'] ?? ''),
            'experience_level' => $data['experienceLevel'] ?? 'Entry',
            'education_requirement' => $data['educationRequirement'] ?? null,
            'closing_date' => $data['closingDate'] ?? null,
            'status' => 'Open',
        ]);

        // Autonomous matching: flag this new role to every fitting applicant.
        ApplicantProfile::with('skills')->get()->each(
            fn (ApplicantProfile $applicant) => $matcher->syncFlaggedMatches($applicant)
        );

        return back()->with('success', 'Job offer published.');
    }

    /** @return array<int, string> */
    private function tags(string $value): array
    {
        return collect(explode(',', $value))
            ->map(fn ($tag) => trim($tag))
            ->filter()
            ->values()
            ->all();
    }
}
