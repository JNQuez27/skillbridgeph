<?php

namespace App\Http\Controllers;

use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\AssessmentAttempt;
use App\Models\CompanyAssessment;
use App\Models\Credential;
use App\Models\EmployerProfile;
use App\Models\JobPost;
use App\Services\CandidateReview;
use App\Services\MatchService;
use App\Support\InterviewKit;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    private const VERDICT_RANK = [CandidateReview::GREEN => 0, CandidateReview::AMBER => 1, CandidateReview::RED => 2];

    public function index(Request $request, MatchService $matcher)
    {
        $user = $request->user();
        if ($user->isAdmin()) {
            return redirect('/admin');
        }

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

    /** A skill with its provenance: who verified it, how, when, and on what evidence. */
    private function skillPayload($s): array
    {
        return [
            'id' => $s->id,
            'name' => $s->name,
            'level' => $s->level,
            'badge' => $s->badge,
            'verificationStatus' => $s->verification_status,
            'verificationMethod' => $s->verification_method,
            'verifiedBy' => $s->verified_by,
            'verifiedAt' => $s->verified_at?->ph()->toFormattedDateString(),
            'verificationId' => $s->verification_id,
            // Fig. 21 (2106): the shareable verification link, only once the holder turns it on.
            'shareUrl' => $s->public_at && $s->verification_id ? route('badge.verify', $s->verification_id) : null,
            'evidence' => $s->evidence ? ($s->evidence->title ?: $s->evidence->original_name) : null,
            // Fig. 1: the assessment result (144) behind this badge (142).
            'assessmentResult' => $s->assessmentResult ? [
                'assessment' => $s->assessmentResult->assessment?->title,
                'score' => $s->assessmentResult->score,
                'takenAt' => $s->assessmentResult->created_at?->ph()->toFormattedDateString(),
            ] : null,
        ];
    }

    /** A credential as every viewer sees it, including the one shared registry result. */
    private function credentialPayload(Credential $c): array
    {
        return [
            'id' => $c->id,
            'type' => $c->type,
            'title' => $c->title ?: $c->original_name,
            'originalName' => $c->original_name,
            'url' => $c->url,
            'mime' => $c->mime,
            'extractedSkills' => $c->extracted_skills ?? [],
            'challengeCode' => $c->challenge_code,
            // What the viewer should see happen in the video, and roughly when.
            'recording' => $c->recording_prompts ? [
                'prompts' => $c->recording_prompts,
                'startedAt' => $c->recording_started_at?->ph()->toDayDateTimeString(),
            ] : null,
            'registry' => $c->registry ? [
                'label' => Credential::REGISTRIES[$c->registry] ?? $c->registry,
                'qualification' => $c->registry_qualification,
                'number' => $c->registry_number,
                'status' => $c->registry_status,
                'note' => $c->registry_note,
                'checkedAt' => $c->registry_checked_at?->ph()->toFormattedDateString(),
            ] : null,
        ];
    }

    /** The structured interview recorded on an application, if any. */
    private function interviewPayload(?Application $application): ?array
    {
        if (! $application?->interviewed_at) {
            return null;
        }

        return [
            'score' => $application->interview_score,
            'ratings' => $application->interview_ratings ?? [],
            'by' => $application->interviewer?->name,
            'at' => $application->interviewed_at->ph()->toFormattedDateString(),
            'videoMatch' => $application->video_identity,
            'liveTask' => $application->live_task_done,
        ];
    }

    /** This role's skills the candidate holds but nobody has verified yet. */
    private function verifiableSkills(JobPost $job, ApplicantProfile $applicant): array
    {
        $verified = collect($applicant->verifiedSkillNames())->map(fn ($n) => mb_strtolower($n));

        return collect(array_merge($job->required_skills ?? [], $job->preferred_skills ?? []))
            ->reject(fn ($s) => $verified->contains(mb_strtolower($s)))
            ->unique()->values()->all();
    }

    /**
     * Provenance signals an employer can judge for themselves. Deliberately not
     * a real/fake verdict — we report what is checkable and let a human decide.
     */
    private function signalsFor(ApplicantProfile $applicant): array
    {
        $applicant->loadMissing(['skills', 'credentials']);

        $verified = collect($applicant->verifiedSkillNames())->map(fn ($n) => mb_strtolower($n));
        $mentioned = $applicant->credentials
            ->flatMap(fn ($c) => $c->extracted_skills ?? [])
            ->map(fn ($n) => mb_strtolower($n))
            ->unique();

        $hashes = $applicant->credentials->pluck('sha256')->filter();
        $duplicate = $hashes->isNotEmpty() && \App\Models\Credential::whereIn('sha256', $hashes)
            ->where('applicant_profile_id', '!=', $applicant->id)
            ->exists();

        $video = $applicant->credentials->firstWhere('type', 'video');

        return [
            'verifiedSkills' => $verified->count(),
            'claimedSkills' => $applicant->skills->count(),
            'credentials' => $applicant->credentials->count(),
            // Claimed skills that actually appear in an uploaded document.
            'docSupportedSkills' => $verified->intersect($mentioned)->count(),
            'duplicateDocument' => $duplicate,
            'demoVideo' => $video ? ['url' => $video->url, 'livePrompts' => count($video->recording_prompts ?? [])] : null,
        ];
    }

    private function applicantAccount($user, MatchService $matcher): array
    {
        $profile = $user->applicantProfileOrCreate();

        // Autonomous matching: keep flagged jobs current on the account.
        $matcher->syncFlaggedMatches($profile->load('skills'));

        $profile->load(['skills.evidence', 'credentials', 'applications']);
        $applications = $profile->applications->keyBy('job_post_id');
        $verifiedNames = collect($profile->verifiedSkillNames())->map(fn ($n) => mb_strtolower($n));

        // Score every open job once (used for both matches and manual browse).
        $scored = JobPost::with('employerProfile', 'assessment')->open()->get()->map(function (JobPost $job) use ($matcher, $profile, $applications) {
            $match = $matcher->score($job, $profile);
            $application = $applications->get($job->id);

            return [
                'id' => $job->id,
                'title' => $job->title,
                'employerId' => $job->employer_profile_id,
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
                'skillStates' => $match['skillStates'],
                'preferenceFit' => $match['preferenceFit'],
                'units' => $match['units'],   // Fig. 8: what each engine unit found
                // Fig. 7, step 730: the assessment this job asks for, and where the applicant stands on it.
                'assessment' => $job->assessment?->status === 'Active' ? (function () use ($job, $profile) {
                    $st = AssessmentAttemptController::standing($job->assessment, $profile->id);

                    return ['id' => $job->assessment->id, 'title' => $job->assessment->title, 'passed' => $st['passed'],
                        'locked' => $st['locked'], 'left' => $st['left'], 'nextAttemptAt' => $st['nextAttemptAt']?->ph()->format('M j, g:i A')];
                })() : null,
                'status' => $application?->status,
                'postedAt' => optional($job->created_at)->diffForHumans() ?? 'Recently',
            ];
        });

        // Matches = autonomously flagged (score >= 60) OR jobs the applicant already acted on / was invited to.
        $matches = $scored
            ->filter(fn ($j) => $j['score'] >= MatchService::APPLICANT_THRESHOLD || $j['status'])
            ->map(fn ($j) => array_merge($j, ['status' => $j['status'] ?? 'flagged']))
            ->sortByDesc('score')
            ->values();

        // Browse = every open job (manual search).
        $browse = $scored->sortByDesc('score')->values();

        $assessmentCounts = CompanyAssessment::where('status', 'Active')
            ->selectRaw('employer_profile_id, count(*) as c')
            ->groupBy('employer_profile_id')
            ->pluck('c', 'employer_profile_id');

        $companies = EmployerProfile::withCount(['jobPosts' => fn ($q) => $q->open()])
            ->get()
            ->map(fn (EmployerProfile $e) => [
                'id' => $e->id,
                'name' => $e->company_name,
                'industry' => $e->industry,
                'size' => $e->company_size,
                'location' => trim(($e->location_city ?? '').($e->location_region ? ', '.$e->location_region : '')),
                'openRoles' => $e->job_posts_count,
                'recruiter' => $e->recruiter_name,
                'recruiterPosition' => $e->recruiter_position,
                'verified' => (bool) $e->email_verified,
                'assessments' => (int) ($assessmentCounts[$e->id] ?? 0),
                // The employer's open roles, already scored for this applicant.
                'roles' => $scored->where('employerId', $e->id)->map(fn ($j) => [
                    'id' => $j['id'],
                    'title' => $j['title'],
                    'location' => $j['location'],
                    'employmentType' => $j['employmentType'],
                    'workSetup' => $j['workSetup'],
                    'salaryRange' => $j['salaryRange'],
                    'requiredSkills' => $j['requiredSkills'],
                    'score' => $j['score'],
                    'status' => $j['status'],
                ])->sortByDesc('score')->values()->all(),
            ])->values();

        // Only verified companies issue badges, so only their assessments are listed.
        $assessments = CompanyAssessment::with('employerProfile')
            ->where('status', 'Active')
            ->whereHas('employerProfile', fn ($q) => $q->where('email_verified', true))
            ->get()
            ->groupBy(fn ($a) => $a->employerProfile->company_name ?? 'Company')
            ->map(fn ($group, $company) => [
                'company' => $company,
                'industry' => $group->first()->industry,
                'location' => $group->first()->employerProfile->location_city ?? '',
                'assessments' => $group->map(fn ($a) => [
                    'id' => $a->id,
                    'title' => $a->title,
                    'role' => $a->role,
                    'industry' => $a->industry,
                    'skill' => $a->skill,
                    'questionCount' => $a->question_count,
                    'durationMinutes' => $a->duration_minutes,
                    'passingScore' => $a->passing_score,
                    'verified' => $a->skill ? $verifiedNames->contains(mb_strtolower($a->skill)) : false,
                    // Fig. 4, steps 450-460: attempts left, cooldown, and the unverified lock.
                    'attempts' => (function () use ($a, $profile) {
                        $st = AssessmentAttemptController::standing($a, $profile->id);

                        return ['used' => $st['used'], 'left' => $st['left'], 'max' => AssessmentAttemptController::MAX_ATTEMPTS,
                            'locked' => $st['locked'], 'pending' => $st['pending'], 'nextAttemptAt' => $st['nextAttemptAt']?->ph()->format('M j, g:i A')];
                    })(),
                    // Fig. 13: a practical task, shown with its rubric once the clock starts.
                    'hasTask' => $a->hasTask(),
                    'task' => $a->hasTask() && session()->has('assessment_started.'.$a->id)
                        ? ['prompt' => $a->task_prompt, 'fileRequired' => $a->task_file_required, 'rubric' => $a->rubric]
                        : null,
                    'lastFeedback' => AssessmentAttempt::where('company_assessment_id', $a->id)->where('applicant_profile_id', $profile->id)
                        ->where('status', 'scored')->whereNotNull('feedback')->latest('reviewed_at')->value('feedback'),
                    // Questions are only sent once the server clock has started for
                    // this assessment (so they cannot be researched before the timer),
                    // and answers are never sent at all.
                    'started' => session()->has('assessment_started.'.$a->id),
                    'questions' => session()->has('assessment_started.'.$a->id)
                        ? $a->presented(session(AssessmentAttemptController::orderKey($a), []))
                        : [],
                ])->values(),
            ])->values();

        // Same file uploaded by a different account — a real fraud signal.
        $dupeHashes = \App\Models\Credential::whereIn('sha256', $profile->credentials->pluck('sha256')->filter())
            ->where('applicant_profile_id', '!=', $profile->id)
            ->pluck('sha256');

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
                'preferredWorkSetups' => $profile->preferred_work_setups ?? [],
                'preferredJobTypes' => $profile->preferred_job_types ?? [],
                'bio' => $profile->bio,
                'education' => $profile->education ?? [],
                'experience' => $profile->experience ?? [],
                'stats' => [
                    'badges' => $profile->skills->where('verification_status', 'verified')->count(),
                    'applied' => $appliedCount,
                    'matches' => $matches->count(),
                ],
            ],
            // Fig. 20: the work samples linked to each skill, and whether they count (2026).
            'skills' => $profile->skills->map(fn ($s) => $this->skillPayload($s) + [
                'workSamples' => $profile->credentials->where('type', 'portfolio')
                    ->filter(fn ($c) => in_array(mb_strtolower($s->name), array_map('mb_strtolower', $c->linked_skills ?? []), true))
                    ->map(fn ($c) => $c->title ?: $c->original_name)->values(),
                'evidenced' => in_array(mb_strtolower($s->name), $profile->evidencedSkillNames(), true),
            ])->values(),
            'credentials' => $profile->credentials->map(fn ($c) => $this->credentialPayload($c) + [
                'linkedSkills' => $c->linked_skills ?? [],
                'size' => $c->size,
                'supportsClaims' => count(array_intersect(
                    array_map('mb_strtolower', $c->extracted_skills ?? []),
                    $verifiedNames->all()
                )),
                'duplicate' => $dupeHashes->contains($c->sha256),
                'meta' => $c->meta ?? [],
            ])->values(),
            'matches' => $matches,
            // Fig. 19 (1900): invitations to answer and the status of every application,
            // including jobs that have since closed.
            'applications' => $profile->applications()->with('jobPost.employerProfile')
                ->whereIn('status', [...Application::ENGAGED, 'declined'])
                ->latest('updated_at')->get()
                ->map(fn (Application $a) => [
                    'jobId' => $a->job_post_id,
                    'title' => $a->jobPost->title,
                    'company' => $a->jobPost->employerProfile->company_name ?? 'Employer',
                    'location' => $a->jobPost->location_city,
                    'status' => $a->status,
                    'score' => $a->match_score,
                    'jobOpen' => $a->jobPost->isOpen(),
                    'updatedAt' => $a->updated_at?->ph()->format('M j, Y'),
                ])->values(),
            'browse' => $browse,
            'companies' => $companies,
            'assessments' => $assessments,
        ];
    }

    /**
     * Patent Fig. 18: the hiring funnel (1818) and the skill gap panel (1820),
     * per role and for all roles together.
     *
     * Funnel stages are cumulative: someone hired also passed every earlier
     * stage. A candidate marked not selected counts up to "applied or invited"
     * (the stage they were dropped from is not stored) and is shown separately.
     * The skill gap covers each role's matched candidates (Fig. 8, 870) and its
     * required skills: a skill is "lacking" unless it is verified at the level
     * the employer asked for (Fig. 7, 715 states).
     */
    private function analytics($jobPosts, $candidateSets): array
    {
        $stageRank = ['invited' => 1, 'applied' => 1, 'not_selected' => 1, 'shortlisted' => 2, 'interviewing' => 3, 'hired' => 4];
        $apps = Application::whereIn('job_post_id', $jobPosts->pluck('id'))->whereIn('status', Application::ENGAGED)->get()->groupBy('job_post_id');

        $roles = $jobPosts->map(function (JobPost $job) use ($stageRank, $apps, $candidateSets) {
            $ranks = ($apps[$job->id] ?? collect())->map(fn ($a) => $stageRank[$a->status] ?? 0);
            $candidates = $candidateSets[$job->id];
            $required = collect($job->required_skills ?? [])->map(fn ($s) => mb_strtolower(trim($s)))->unique();

            $gap = $required->map(function ($skill) use ($candidates, $job) {
                $states = $candidates->map(fn ($e) => collect($e['match']['skillStates'])->first(fn ($s) => mb_strtolower(trim($s['name'])) === $skill)['state'] ?? 'missing');

                return [
                    'skill' => collect($job->required_skills)->first(fn ($s) => mb_strtolower(trim($s)) === $skill),
                    'candidates' => $states->count(),
                    'missing' => $states->filter(fn ($s) => $s === 'missing')->count(),
                    'claimed' => $states->filter(fn ($s) => in_array($s, ['claimed', 'evidenced'], true))->count(),   // not verified yet
                    'below' => $states->filter(fn ($s) => $s === 'below')->count(),
                ];
            })->values();

            return [
                'jobId' => $job->id,
                'title' => $job->title,
                'funnel' => [
                    'matched' => $candidates->count(),
                    'engaged' => $ranks->filter(fn ($r) => $r >= 1)->count(),
                    'shortlisted' => $ranks->filter(fn ($r) => $r >= 2)->count(),
                    'interviewing' => $ranks->filter(fn ($r) => $r >= 3)->count(),
                    'hired' => $ranks->filter(fn ($r) => $r >= 4)->count(),
                    'notSelected' => ($apps[$job->id] ?? collect())->where('status', 'not_selected')->count(),
                ],
                'skillGap' => $gap->all(),
            ];
        })->values();

        // All roles: funnels add up; the same skill across roles is merged.
        $all = [
            'funnel' => collect(['matched', 'engaged', 'shortlisted', 'interviewing', 'hired', 'notSelected'])
                ->mapWithKeys(fn ($k) => [$k => $roles->sum(fn ($r) => $r['funnel'][$k])])->all(),
            'skillGap' => $roles->flatMap(fn ($r) => $r['skillGap'])
                ->groupBy(fn ($g) => mb_strtolower($g['skill']))
                ->map(fn ($g) => ['skill' => $g->first()['skill']] + collect(['candidates', 'missing', 'claimed', 'below'])
                    ->mapWithKeys(fn ($k) => [$k => $g->sum($k)])->all())
                ->values()->all(),
        ];

        return ['all' => $all, 'roles' => $roles->all()];
    }

    private function employerAccount($user, MatchService $matcher): array
    {
        $profile = $user->employerProfile()->firstOrCreate(
            [],
            ['company_name' => $user->name."'s Company"]
        );

        $jobPosts = $profile->jobPosts()->with('assessment')->withCount('applications')->latest()->get()
            ->each(fn (JobPost $job) => $job->setRelation('employerProfile', $profile));

        // Skills some verified company already tests. A required skill nobody
        // tests can never be assessment-verified, so the employer is told.
        $assessedSkills = CompanyAssessment::where('status', 'Active')
            ->whereHas('employerProfile', fn ($q) => $q->where('email_verified', true))
            ->pluck('skill')->filter()->map(fn ($s) => mb_strtolower($s))->unique();
        $assessments = $profile->assessments()
            ->withCount(['attempts as attempts_passed' => fn ($q) => $q->where('passed', true)])
            ->latest()->get();

        $reviewer = app(CandidateReview::class);

        // Fig. 8, output 870: the ranked candidates per role, scored once and reused below.
        $candidateSets = $jobPosts->mapWithKeys(fn (JobPost $job) => [$job->id => $matcher->candidatesForJob($job)]);

        $matches = $jobPosts->map(function (JobPost $job) use ($candidateSets, $reviewer) {
            // Review state already recorded for this job, keyed by applicant.
            $apps = Application::with('interviewer')->where('job_post_id', $job->id)->get()->keyBy('applicant_profile_id');

            return [
                'job' => [
                    'id' => $job->id,
                    'title' => $job->title,
                    'locationCity' => $job->location_city,
                    'locationRegion' => $job->location_region,
                    'workSetup' => $job->work_setup,
                    'employmentType' => $job->employment_type,
                ],
                'candidates' => $candidateSets[$job->id]->map(function ($entry) use ($job, $apps, $reviewer) {
                    $applicant = $entry['applicant'];
                    $application = $apps->get($applicant->id);
                    // A1: documents are only readable for candidates who engaged with this job.
                    $engaged = in_array($application?->status, Application::ENGAGED, true);

                    return [
                        'id' => $applicant->id,
                        'name' => $applicant->user->name,
                        'avatar' => $this->initials($applicant->user->name),
                        'role' => $applicant->headline ?: 'Applicant',
                        'location' => $applicant->location,
                        'score' => $entry['match']['score'],
                        'matchedSkills' => count($entry['match']['matchedRequired']) + count($entry['match']['matchedPreferred']),
                        // Fig. 19: someone who declined this job's invitation is marked, not suggested again.
                        'status' => $entry['status'] ?? ($application?->status === 'declined' ? 'declined' : null),
                        'signals' => $this->signalsFor($applicant),
                        'review' => $reviewer->for($job, $applicant),
                        'skills' => $applicant->skills->map(fn ($s) => $this->skillPayload($s))->values(),
                        'verifiable' => $this->verifiableSkills($job, $applicant),
                        'canReadCredentials' => $engaged,
                        'credentials' => $engaged
                            ? $applicant->credentials->map(fn ($c) => $this->credentialPayload($c))->values()
                            : [],
                        'hired' => $application?->status === 'hired',
                        'reviewedMode' => $application?->review_mode,
                        'reviewedAt' => $application?->reviewed_at?->ph()->toDayDateTimeString(),
                        'interview' => $this->interviewPayload($application),
                    ];
                })
                    // The employer starts from a ranked list: people who engaged first
                    // (Green before Amber before Red, then by score), then suggestions
                    // ranked purely by match score (Fig. 8, 870), so the first ten
                    // suggestions are exactly the top-ten set (875) "Invite top 10" uses.
                    ->sortBy(fn ($c) => match (true) {
                        $c['status'] === 'declined' => [2, 0, -$c['score']],
                        $c['status'] !== null => [0, self::VERDICT_RANK[$c['review']['status']], -$c['score']],
                        default => [1, 0, -$c['score']],
                    })->values(),
            ];
        })->values();

        // Everyone who actually engaged with one of this employer's roles:
        // they applied themselves, or the employer invited them.
        $applicants = Application::with(['applicantProfile.user', 'applicantProfile.skills', 'applicantProfile.credentials', 'jobPost.assessment', 'interviewer'])
            ->whereIn('job_post_id', $jobPosts->pluck('id'))
            ->whereIn('status', [...Application::ENGAGED, 'declined'])   // Fig. 19: declined invitations are shown, without documents
            ->latest('updated_at')
            ->get()
            ->map(function (Application $a) use ($reviewer) {
                $p = $a->applicantProfile;

                return [
                    'id' => $p->id,
                    'name' => $p->user->name,
                    'avatar' => $this->initials($p->user->name),
                    'role' => $p->headline ?: 'Applicant',
                    'location' => $p->location,
                    'jobId' => $a->job_post_id,
                    'jobTitle' => $a->jobPost->title,
                    'status' => $a->status,
                    'score' => $a->match_score,
                    'appliedAt' => optional($a->updated_at)->diffForHumans(),
                    'review' => $reviewer->for($a->jobPost, $p),
                    'skills' => $p->skills->map(fn ($s) => $this->skillPayload($s))->values(),
                    'verifiable' => $this->verifiableSkills($a->jobPost, $p),
                    'hired' => $a->status === 'hired',
                    // Fig. 7, step 730: whether the candidate took the assessment this job asks for.
                    'assessment' => $a->jobPost->assessment ? (function () use ($a, $p) {
                        $st = AssessmentAttemptController::standing($a->jobPost->assessment, $p->id);

                        return ['title' => $a->jobPost->assessment->title,
                            'state' => $st['passed'] ? 'passed' : ($st['locked'] ? 'failed' : ($st['used'] ? 'in_progress' : 'not_taken'))];
                    })() : null,
                    'reviewedMode' => $a->review_mode,
                    'reviewedAt' => $a->reviewed_at?->ph()->toDayDateTimeString(),
                    'interview' => $this->interviewPayload($a),
                    'canReadCredentials' => $a->status !== 'declined',
                    'credentials' => $a->status === 'declined' ? [] : $p->credentials->map(fn ($c) => $this->credentialPayload($c))->values(),
                ];
            })->values();

        // Top candidates across all of this employer's roles (best score each).
        $topCandidates = ApplicantProfile::with(['skills', 'user'])->get()
            ->map(function (ApplicantProfile $applicant) use ($jobPosts, $matcher) {
                $best = $jobPosts->map(fn ($job) => ['job' => $job, 'score' => $matcher->score($job, $applicant)['score']])
                    ->sortByDesc('score')->first();

                return [
                    'id' => $applicant->id,
                    'name' => $applicant->user->name,
                    'avatar' => $this->initials($applicant->user->name),
                    'role' => $applicant->headline ?: 'Applicant',
                    'skills' => $applicant->verifiedSkillNames(),
                    'claimed' => count($applicant->skillNames()) - count($applicant->verifiedSkillNames()),
                    'score' => $best['score'] ?? 0,
                    // Invite to the role this person actually fits best.
                    'bestJobId' => $best['job']->id ?? null,
                    'bestJobTitle' => $best['job']->title ?? null,
                ];
            })
            ->sortByDesc('score')
            ->take(10)
            ->values();

        // 'flagged' rows are autonomous suggestions, not real applicants, so the
        // tiles count only people who applied / were invited / moved forward.
        $engagedByJob = $applicants->groupBy('jobId')->map->count();

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
                'verification' => [
                    'status' => $profile->verification_status,
                    'registrationType' => $profile->registration_type,
                    'registrationNumber' => $profile->registration_number,
                    'note' => $profile->verification_note,
                    'reviewedAt' => $profile->reviewed_at?->ph()->toFormattedDateString(),
                    'permitUrl' => $profile->business_permit_path ? route('employer.permit', $profile->id) : null,
                    'precheck' => $profile->precheck ?? [],
                ],
            ],
            'analytics' => $this->analytics($jobPosts, $candidateSets),
            'stats' => [
                'activeApplicants' => $applicants->where('status', '!=', 'declined')->count(),
                'shortlisted' => $applicants->where('status', 'shortlisted')->count(),
                'interviewing' => $applicants->where('status', 'interviewing')->count(),
                'hired' => $applicants->where('status', 'hired')->count(),
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
                'closedReason' => $job->closed_reason,
                'closingDate' => $job->closing_date?->ph()->toFormattedDateString(),
                // Past its closing date: hidden from applicants until the employer acts.
                'expired' => $job->status === 'Open' && ! $job->isOpen(),
                'applicants' => $engagedByJob->get($job->id, 0),
                'postedAt' => optional($job->created_at)->toDateString(),
                'requiredSkills' => $job->required_skills ?? [],
                'preferredSkills' => $job->preferred_skills ?? [],
                'interviewKit' => InterviewKit::forJob($job),
                // Fig. 6: weight and minimum level per skill, and the attached assessment.
                'skillSettings' => collect(array_merge(
                    array_map(fn ($s) => ['name' => $s, 'type' => 'required'], $job->required_skills ?? []),
                    array_map(fn ($s) => ['name' => $s, 'type' => 'preferred'], $job->preferred_skills ?? []),
                ))->map(fn ($s) => $s + $job->settingFor($s['name']))->values(),
                'assessment' => $job->assessment ? ['id' => $job->assessment->id, 'title' => $job->assessment->title, 'skill' => $job->assessment->skill] : null,
                'unassessedSkills' => collect($job->required_skills ?? [])
                    ->reject(fn ($s) => $assessedSkills->contains(mb_strtolower($s)))->values(),
            ])->values(),
            'assessments' => $assessments->map(fn ($a) => [
                'id' => $a->id,
                'title' => $a->title,
                'role' => $a->role,
                'skill' => $a->skill,
                'questionCount' => $a->question_count,
                'durationMinutes' => $a->duration_minutes,
                'passingScore' => $a->passing_score,
                'instructions' => $a->instructions,
                'moderationNote' => $a->status === 'Suspended' ? $a->moderation_note : null,
                'taskPrompt' => $a->task_prompt,
                'taskFileRequired' => $a->task_file_required,
                'rubric' => $a->rubric,
                'passed' => $a->attempts_passed ?? 0,
                'status' => $a->status,
                'createdAt' => optional($a->created_at)->toDateString(),
            ])->values(),
            // Fig. 4, step 425 / Fig. 16: practical tasks waiting for this company's rubric score.
            'taskReviews' => AssessmentAttempt::with(['assessment', 'applicantProfile.user'])
                ->where('status', 'pending_review')
                ->whereIn('company_assessment_id', $assessments->pluck('id'))
                ->oldest()->get()
                ->map(fn (AssessmentAttempt $t) => [
                    'id' => $t->id,
                    'applicant' => $t->applicantProfile->user->name,
                    'assessment' => $t->assessment->title,
                    'skill' => $t->assessment->skill,
                    'taskPrompt' => $t->assessment->task_prompt,
                    'rubric' => $t->assessment->rubric,
                    'passingScore' => $t->assessment->passing_score,
                    'mcqScore' => $t->mcq_score,
                    'answer' => $t->task_answer,
                    'fileName' => $t->task_file_name,
                    'fileUrl' => $t->task_file_path ? '/assessment-attempts/'.$t->id.'/file' : null,
                    'submittedAt' => $t->created_at->ph()->format('M j, g:i A'),
                ])->values(),
            'matches' => $matches,
            'applicants' => $applicants,
            'topCandidates' => $topCandidates,
            'doNotAsk' => InterviewKit::DO_NOT_ASK,
        ];
    }
}
