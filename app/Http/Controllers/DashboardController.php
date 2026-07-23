<?php

namespace App\Http\Controllers;

use App\Models\ApplicantProfile;
use App\Models\CompanyAssessment;
use App\Models\JobPost;
use App\Services\MatchService;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request, MatchService $matcher)
    {
        $user = $request->user();

        $account = $user->role === 'employer'
            ? $this->employerAccount($user, $matcher)
            : $this->applicantAccount($user, $matcher);

        return Inertia::render('SkillBridge/SkillBridgePage', [
            'account' => $account,
        ]);
    }

    private function initials(string $name): string
    {
        $parts = array_values(array_filter(explode(' ', $name)));
        $letters = array_map(fn ($p) => mb_substr($p, 0, 1), array_slice($parts, 0, 2));

        return mb_strtoupper(implode('', $letters)) ?: 'U';
    }

    private function applicantAccount($user, MatchService $matcher): array
    {
        $profile = $user->applicantProfile()->firstOrCreate(
            [],
            ['location' => 'Philippines', 'experience_level' => 'Entry']
        );

        // Autonomous matching: keep flagged jobs current on the account.
        $matcher->syncFlaggedMatches($profile->load('skills'));

        $profile->load(['skills', 'credentials', 'applications']);
        $applications = $profile->applications->keyBy('job_post_id');

        $matches = $matcher->matchesForApplicant($profile)->map(function ($entry) use ($applications) {
            $job = $entry['job'];
            $match = $entry['match'];
            $application = $applications->get($job->id);

            return [
                'id' => $job->id,
                'title' => $job->title,
                'company' => $job->employerProfile->company_name ?? 'Employer',
                'location' => trim(($job->location_city ?? '').($job->location_region ? ', '.$job->location_region : '')),
                'employmentType' => $job->employment_type,
                'workSetup' => $job->work_setup,
                'salaryRange' => $job->salary_range,
                'requiredSkills' => $job->required_skills ?? [],
                'preferredSkills' => $job->preferred_skills ?? [],
                'requiredCount' => count($job->required_skills ?? []),
                'preferredCount' => count($job->preferred_skills ?? []),
                'matchedRequired' => count($match['matchedRequired']),
                'matchedPreferred' => count($match['matchedPreferred']),
                'locationMatch' => $match['locationMatch'],
                'experienceMatch' => $match['experienceMatch'],
                'score' => $match['score'],
                'status' => $application?->status ?? 'flagged',
                'postedAt' => optional($job->created_at)->diffForHumans() ?? 'Recently',
            ];
        })->values();

        $assessments = CompanyAssessment::with('employerProfile')
            ->where('status', 'Active')
            ->get()
            ->groupBy(fn ($a) => $a->employerProfile->company_name ?? 'Company')
            ->map(fn ($group, $company) => [
                'company' => $company,
                'location' => $group->first()->employerProfile->location_city ?? '',
                'assessments' => $group->map(fn ($a) => [
                    'id' => 'assessment-'.$a->id,
                    'title' => $a->title,
                    'status' => 'Invited',
                    'score' => null,
                    'date' => null,
                    'questionCount' => $a->question_count,
                    'durationMinutes' => $a->duration_minutes,
                    'passingScore' => $a->passing_score,
                    'summary' => $a->instructions ?: 'Company assessment for '.$a->role.'.',
                ])->values(),
            ])->values();

        $appliedCount = $profile->applications
            ->whereIn('status', ['applied', 'shortlisted', 'interviewing', 'hired'])
            ->count();

        return [
            'role' => 'jobseeker',
            'profile' => [
                'name' => $user->name,
                'initials' => $this->initials($user->name),
                'headline' => $profile->headline ?: 'Job seeker',
                'location' => $profile->location,
                'experienceLevel' => $profile->experience_level,
                'desiredRoles' => $profile->desired_roles ?? [],
                'stats' => [
                    'badges' => $profile->skills->where('verification_status', 'verified')->count(),
                    'applied' => $appliedCount,
                    'matches' => $matches->count(),
                ],
            ],
            'skills' => $profile->skills->map(fn ($s) => [
                'name' => $s->name,
                'level' => $s->level,
                'badge' => $s->badge,
                'verificationStatus' => $s->verification_status,
                'verificationMethod' => $s->verification_method,
            ])->values(),
            'credentials' => $profile->credentials->map(fn ($c) => [
                'id' => $c->id,
                'type' => $c->type,
                'title' => $c->title ?: $c->original_name,
                'originalName' => $c->original_name,
                'url' => $c->url,
                'size' => $c->size,
            ])->values(),
            'matches' => $matches,
            'assessments' => $assessments,
        ];
    }

    private function employerAccount($user, MatchService $matcher): array
    {
        $profile = $user->employerProfile()->firstOrCreate(
            [],
            ['company_name' => $user->name."'s Company"]
        );

        $jobPosts = $profile->jobPosts()->withCount('applications')->latest()->get();
        $assessments = $profile->assessments()->latest()->get();

        $matches = $jobPosts->map(function (JobPost $job) use ($matcher) {
            return [
                'job' => [
                    'id' => $job->id,
                    'title' => $job->title,
                    'locationCity' => $job->location_city,
                    'locationRegion' => $job->location_region,
                    'workSetup' => $job->work_setup,
                    'employmentType' => $job->employment_type,
                ],
                'candidates' => $matcher->candidatesForJob($job)->map(fn ($entry) => [
                    'id' => $entry['applicant']->id,
                    'name' => $entry['applicant']->user->name,
                    'avatar' => $this->initials($entry['applicant']->user->name),
                    'role' => $entry['applicant']->headline ?: 'Applicant',
                    'location' => $entry['applicant']->location,
                    'score' => $entry['match']['score'],
                    'matchedSkills' => count($entry['match']['matchedRequired']) + count($entry['match']['matchedPreferred']),
                ])->values(),
            ];
        })->values();

        // Top candidates across all of this employer's roles (best score each).
        $topCandidates = ApplicantProfile::with(['skills', 'user'])->get()
            ->map(function (ApplicantProfile $applicant) use ($jobPosts, $matcher) {
                $best = $jobPosts->map(fn ($job) => $matcher->score($job, $applicant)['score'])->max() ?? 0;

                return [
                    'id' => $applicant->id,
                    'name' => $applicant->user->name,
                    'avatar' => $this->initials($applicant->user->name),
                    'role' => $applicant->headline ?: 'Applicant',
                    'skills' => $applicant->skillNames(),
                    'score' => $best,
                ];
            })
            ->sortByDesc('score')
            ->take(10)
            ->values();

        $totalApplicants = $jobPosts->sum('applications_count');

        return [
            'role' => 'employer',
            'company' => [
                'companyName' => $profile->company_name,
                'industry' => $profile->industry,
                'companySize' => $profile->company_size,
                'locationCity' => $profile->location_city,
                'locationRegion' => $profile->location_region,
                'recruiterName' => $profile->recruiter_name,
                'recruiterPosition' => $profile->recruiter_position,
                'recruiterContact' => $profile->recruiter_contact,
                'emailVerified' => (bool) $profile->email_verified,
            ],
            'stats' => [
                'activeApplicants' => $totalApplicants,
                'shortlisted' => 0,
                'interviewing' => 0,
                'hired' => 0,
            ],
            'jobPosts' => $jobPosts->map(fn ($job) => [
                'id' => $job->id,
                'title' => $job->title,
                'locationCity' => $job->location_city,
                'locationRegion' => $job->location_region,
                'workSetup' => $job->work_setup,
                'employmentType' => $job->employment_type,
                'salaryRange' => $job->salary_range,
                'status' => $job->status,
                'applicants' => $job->applications_count,
                'postedAt' => optional($job->created_at)->toDateString(),
                'requiredSkills' => $job->required_skills ?? [],
                'preferredSkills' => $job->preferred_skills ?? [],
            ])->values(),
            'assessments' => $assessments->map(fn ($a) => [
                'id' => $a->id,
                'title' => $a->title,
                'role' => $a->role,
                'questionCount' => $a->question_count,
                'durationMinutes' => $a->duration_minutes,
                'passingScore' => $a->passing_score,
                'instructions' => $a->instructions,
                'status' => $a->status,
                'createdAt' => optional($a->created_at)->toDateString(),
            ])->values(),
            'matches' => $matches,
            'topCandidates' => $topCandidates,
        ];
    }
}
