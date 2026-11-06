<?php

namespace App\Http\Controllers;

use App\Models\ApplicantProfile;
use App\Models\JobPost;
use App\Services\MatchService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
            'closingDate' => ['nullable', 'date', 'after_or_equal:today'],
            // Fig. 6, step 610: a weight and a minimum level per listed skill.
            'skillSettings' => ['nullable', 'array'],
            'skillSettings.*.name' => ['required', 'string', 'max:60'],
            'skillSettings.*.weight' => ['required', 'integer', Rule::in(JobPost::WEIGHTS)],
            'skillSettings.*.minLevel' => ['nullable', 'integer', Rule::in(JobPost::MIN_LEVELS)],
            // Fig. 6, steps 615-620: optionally attach one of this company's assessments.
            'companyAssessmentId' => ['nullable', 'integer'],
        ]);

        $profile = $user->employerProfile()->firstOrCreate([], ['company_name' => $user->name."'s Company"]);

        // Only companies whose registration an admin has checked may post: the
        // main defence against fake job ads.
        if (! $profile->email_verified) {
            return back()->with('error', 'Your company must be verified before it can post jobs. Submit your DTI/SEC registration under Company Profile.');
        }

        $required = $this->tags($data['requiredSkills']);
        $preferred = $this->tags($data['preferredSkills'] ?? '');
        $listed = collect(array_merge($required, $preferred))->map(fn ($s) => mb_strtolower($s));
        $settings = collect($data['skillSettings'] ?? [])
            ->mapWithKeys(fn ($s) => [mb_strtolower(trim($s['name'])) => ['weight' => (int) $s['weight'], 'minLevel' => $s['minLevel'] ?? null]])
            ->only($listed->all());

        $assessmentId = $data['companyAssessmentId'] ?? null;
        if ($assessmentId && ! $profile->assessments()->whereKey($assessmentId)->where('status', 'Active')->exists()) {
            return back()->withErrors(['companyAssessmentId' => 'Choose one of your own active assessments.']);
        }

        $profile->jobPosts()->create([
            'title' => $data['title'],
            'location_city' => $data['locationCity'],
            'location_region' => $data['locationRegion'] ?? null,
            'employment_type' => $data['employmentType'],
            'work_setup' => $data['workSetup'],
            'salary_range' => $data['salaryRange'] ?? null,
            'description' => $data['description'],
            'responsibilities' => $data['responsibilities'],
            'required_skills' => $required,
            'preferred_skills' => $preferred,
            'skill_settings' => $settings->isEmpty() ? null : $settings->all(),
            'company_assessment_id' => $assessmentId,
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

    /**
     * The employer ends a role and says how: filled or cancelled. A closed role
     * leaves every applicant's matches at once instead of staying up as a ghost job.
     */
    public function close(Request $request, JobPost $jobPost)
    {
        $user = $request->user();
        abort_unless($user->role === 'employer' && $jobPost->employer_profile_id === $user->employerProfile?->id, 403);
        $data = $request->validate(['outcome' => ['required', 'in:filled,cancelled']]);

        $jobPost->update(['status' => 'Closed', 'closed_reason' => $data['outcome'], 'closed_at' => now()]);

        return back()->with('success', $jobPost->title.' closed as '.$data['outcome'].'.');
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
