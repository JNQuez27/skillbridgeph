<?php

namespace App\Services;

use App\Models\Application;
use App\Models\ApplicantProfile;
use App\Models\JobPost;
use Illuminate\Support\Collection;

/**
 * The core matching engine.
 *
 * Scores an applicant against a job post using the same weighting as the
 * client-side reference (utils/matching.js):
 *   - required skills matched  -> up to 60
 *   - preferred skills matched -> up to 25
 *   - location match           -> 10
 *   - experience level match   -> 5
 *
 * It runs in both directions (jobs-for-applicant, candidates-for-job) and can
 * autonomously flag high-scoring jobs onto an applicant's account.
 */
class MatchService
{
    public const APPLICANT_THRESHOLD = 60;
    public const EMPLOYER_THRESHOLD = 70;

    /** Fig. 8, output 875: the top-ten set an employer can invite in one action. */
    public const TOP_N = 10;

    /**
     * What an unverified claim is worth relative to a verified skill.
     *
     * Claims still count, at a discount. Scoring on verified skills alone used to
     * drop a candidate the moment they verified their first skill, because every
     * remaining claim stopped counting - which punished exactly the behaviour the
     * platform exists to encourage. Verification must only ever raise a score.
     */
    public const CLAIMED_WEIGHT = 0.6;

    /**
     * Patent Fig. 20 (2026): a claimed skill backed by a linked portfolio work
     * sample counts more than a bare claim, and still less than a verified skill
     * (unit 855: verified proof always counts most).
     */
    public const PORTFOLIO_WEIGHT = 0.8;

    private function normalize(?string $value): string
    {
        return trim(mb_strtolower($value ?? ''));
    }

    /** @param array<int, string|null> $values @return array<int, string> */
    private function normalizeTags(array $values): array
    {
        return array_values(array_filter(
            array_map(fn ($value) => $this->normalize($value), $values),
            fn ($value) => $value !== ''
        ));
    }

    /**
     * Patent Fig. 8, unit 840 (preference filter): does this job fit what the
     * applicant said they want? An empty preference means "any".
     *
     * @return array{passed: bool, reasons: array<int, string>}
     */
    public function preferenceFilter(JobPost $job, ApplicantProfile $applicant): array
    {
        $reasons = [];
        foreach ([
            ['work setup', $applicant->preferred_work_setups, $job->work_setup],
            ['job type', $applicant->preferred_job_types, $job->employment_type],
        ] as [$label, $wanted, $actual]) {
            $wanted = $this->normalizeTags($wanted ?? []);
            if ($wanted && ! in_array($this->normalize($actual), $wanted, true)) {
                $reasons[] = ucfirst($label).' is '.($actual ?: 'not set').', not one you chose.';
            }
        }

        return ['passed' => $reasons === [], 'reasons' => $reasons];
    }

    /**
     * Score a single applicant against a single job post: the matching and
     * ranking engine 136, opened up in patent Fig. 8.
     *
     * Inputs (810-835): the job's required and preferred skills, the employer's
     * weight and minimum level per skill, location and experience level; the
     * applicant's held skills, which of them are verified badges, and each
     * badge's proven level (assessment score), plus location and experience.
     */
    public function score(JobPost $job, ApplicantProfile $applicant): array
    {
        // 840 Preference filter. It never changes the number; it decides whether
        // the job reaches the feed (880) and the ranked lists (870, 875).
        $preference = $this->preferenceFilter($job, $applicant);

        $held = $this->normalizeTags($applicant->skillNames());           // verified + claimed, not "unverified"
        $verified = $this->normalizeTags($applicant->verifiedSkillNames());
        $evidenced = $applicant->evidencedSkillNames();
        $levels = $applicant->skills->where('verification_status', 'verified')
            ->mapWithKeys(fn ($s) => [$this->normalize($s->name) => (int) $s->level]);
        $required = $this->normalizeTags($job->required_skills ?? []);
        $preferred = $this->normalizeTags($job->preferred_skills ?? []);

        $units = function (string $skill) use ($held, $verified, $evidenced, $levels, $job): array {
            ['weight' => $weight, 'minLevel' => $min] = $job->settingFor($skill);
            // 845 Skill alignment: does the applicant hold the skill at all?
            $aligned = in_array($skill, $held, true);
            $isVerified = in_array($skill, $verified, true);
            // 850 Proficiency scoring: only a verified badge has a proven level, so
            // only it can meet a minimum level; with no minimum, holding is enough.
            $level = $isVerified ? $levels->get($skill, 0) : null;
            $proficient = $aligned && ($min === null || ($level !== null && $level >= $min));
            // 855 Verification weighting: a verified skill always counts more than a claim.
            $hasSample = ! $isVerified && in_array($skill, $evidenced, true);   // Fig. 20, 2026
            $factor = ! $proficient ? 0.0 : ($isVerified ? 1.0 : ($hasSample ? self::PORTFOLIO_WEIGHT : self::CLAIMED_WEIGHT));

            return [
                'weight' => $weight, 'minLevel' => $min, 'level' => $level, 'factor' => $factor,
                // Fig. 7, step 715: the state shown on the job card comes from the same units.
                'state' => match (true) {
                    ! $aligned => 'missing',
                    ! $proficient => 'below',
                    $isVerified => 'verified',
                    $hasSample => 'evidenced',
                    default => 'claimed',
                },
            ];
        };
        $credit = function (array $needed) use ($units): float {
            $earned = 0.0;
            $total = 0;
            foreach ($needed as $skill) {
                $u = $units($skill);
                $total += $u['weight'];
                $earned += $u['weight'] * $u['factor'];
            }

            return $total > 0 ? $earned / $total : 0.0;
        };

        // 860 Score combiner: required skills up to 60, preferred up to 25,
        // location 10, experience level 5.
        $requiredPoints = count($required) > 0 ? $credit($required) * 60 : 0.0;
        $preferredPoints = count($preferred) > 0 ? $credit($preferred) * 25 : 0.0;
        if (count($required) === 0 && count($preferred) === 0) {
            $requiredPoints = count($held) > 0 ? 50 : 0;   // a job that lists no skills
        }

        $candidateLocation = $this->normalize($applicant->location);
        $jobLocationTokens = $this->normalizeTags([$job->location_city, $job->location_region]);
        $locationPoints = $candidateLocation !== '' && collect($jobLocationTokens)
            ->contains(fn ($token) => $token !== '' && str_contains($candidateLocation, $token)) ? 10 : 0;

        $candidateExperience = $this->normalize($applicant->experience_level);
        $jobExperience = $this->normalize($job->experience_level);
        $experiencePoints = $candidateExperience !== '' && $jobExperience !== '' && $candidateExperience === $jobExperience ? 5 : 0;

        // 865 Match percentage.
        $score = (int) round(min(100, $requiredPoints + $preferredPoints + $locationPoints + $experiencePoints));

        $skills = collect([...($job->required_skills ?? []), ...($job->preferred_skills ?? [])])
            ->unique(fn ($n) => $this->normalize($n))
            ->map(fn ($n) => ['name' => $n, 'required' => in_array($this->normalize($n), $required, true)] + $units($this->normalize($n)))
            ->values();

        return [
            'score' => $score,
            'preferenceFit' => $preference['passed'],
            'matchedRequired' => array_values(array_intersect($required, $held)),
            'matchedPreferred' => array_values(array_intersect($preferred, $held)),
            'verifiedRequired' => count(array_intersect($required, $verified)),
            'locationMatch' => $locationPoints > 0,
            'experienceMatch' => $experiencePoints > 0,
            'skillStates' => $skills->map(fn ($s) => ['name' => $s['name'], 'state' => $s['state']])->all(),
            // What each unit of Fig. 8 found, so the number can be explained on screen.
            'units' => [
                'preference' => $preference,                                                      // 840
                'alignment' => [                                                                  // 845
                    'required' => [count(array_intersect($required, $held)), count($required)],
                    'preferred' => [count(array_intersect($preferred, $held)), count($preferred)],
                ],
                'proficiency' => $skills->where('state', 'below')                                 // 850
                    ->map(fn ($s) => ['name' => $s['name'], 'level' => $s['level'], 'minLevel' => $s['minLevel']])->values()->all(),
                'verification' => [                                                               // 855
                    'verified' => $skills->where('state', 'verified')->count(),
                    'evidenced' => $skills->where('state', 'evidenced')->count(),
                    'claimed' => $skills->where('state', 'claimed')->count(),
                    'evidencedWeight' => self::PORTFOLIO_WEIGHT,
                    'claimedWeight' => self::CLAIMED_WEIGHT,
                ],
                'combiner' => [                                                                   // 860
                    'required' => round($requiredPoints, 1), 'preferred' => round($preferredPoints, 1),
                    'location' => $locationPoints, 'experience' => $experiencePoints, 'total' => $score,
                ],
            ],
        ];
    }

    /**
     * 870 Ranked list for a job and 875 top-ten set: candidates whose preferences
     * this job passes, best score first. Engaged candidates are always kept.
     */
    public function topTen(JobPost $job): Collection
    {
        // Fig. 19: people who declined this job's invitation are not asked again.
        $declined = Application::where('job_post_id', $job->id)->where('status', 'declined')->pluck('applicant_profile_id')->all();

        return $this->candidatesForJob($job)
            ->filter(fn ($entry) => $entry['status'] === null && ! in_array($entry['applicant']->id, $declined, true))
            ->sortByDesc(fn ($entry) => $entry['match']['score'])
            ->take(self::TOP_N)
            ->values();
    }

    /** 880 Job feed: jobs that pass the preference filter and the threshold, highest score first. */
    public function matchesForApplicant(ApplicantProfile $applicant, int $threshold = self::APPLICANT_THRESHOLD): Collection
    {
        $applicant->loadMissing('skills');

        return JobPost::with('employerProfile')
            ->open()
            ->get()
            ->map(fn (JobPost $job) => ['job' => $job, 'match' => $this->score($job, $applicant)])
            ->filter(fn ($entry) => $entry['match']['preferenceFit'] && $entry['match']['score'] >= $threshold)
            ->sortByDesc(fn ($entry) => $entry['match']['score'])
            ->values();
    }

    /**
     * Candidates that fit a job, highest score first.
     *
     * Automated two-way matching: applicants who have engaged with THIS specific
     * job (applied, invited, or moved further along) are auto-included as
     * candidates regardless of their skill score — so when a job seeker acts on an
     * IT (or any) role, they surface in that job's candidate matches immediately.
     * Everyone else must still clear the skill threshold.
     *
     * Each entry carries the applicant's interest `status` (null for pure
     * skill matches) so the employer can tell applicants apart from suggestions.
     */
    public function candidatesForJob(JobPost $job, int $threshold = self::EMPLOYER_THRESHOLD): Collection
    {
        $interested = Application::where('job_post_id', $job->id)
            ->whereIn('status', Application::ENGAGED) // 'saved' is private to the applicant
            ->pluck('status', 'applicant_profile_id');

        return ApplicantProfile::with(['skills', 'user'])
            ->get()
            ->map(fn (ApplicantProfile $applicant) => [
                'applicant' => $applicant,
                'match' => $this->score($job, $applicant),
                'status' => $interested->get($applicant->id),
            ])
            // 840: a suggestion must also fit the applicant's own preferences.
            ->filter(fn ($entry) => $entry['status'] !== null || ($entry['match']['preferenceFit'] && $entry['match']['score'] >= $threshold))
            // Applicants who applied rank above pure skill matches, then by score.
            ->sortByDesc(fn ($entry) => ($entry['status'] !== null ? 1000 : 0) + $entry['match']['score'])
            ->values();
    }

    /**
     * Autonomous matching: flag high-scoring open jobs onto the applicant's
     * account as `flagged` applications (the applicant then picks the ones truly
     * suited to them). Existing rows keep the applicant's chosen status and only
     * have their score refreshed.
     *
     * @return int number of newly flagged jobs
     */
    public function syncFlaggedMatches(ApplicantProfile $applicant, int $threshold = self::APPLICANT_THRESHOLD): int
    {
        $applicant->loadMissing(['skills', 'applications']);
        $existing = $applicant->applications->keyBy('job_post_id');
        $newlyFlagged = 0;

        foreach (JobPost::open()->get() as $job) {
            $result = $this->score($job, $applicant);
            if ($result['score'] < $threshold) {
                continue;
            }

            $application = $existing->get($job->id);
            if ($application) {
                $application->update(['match_score' => $result['score']]);
                continue;
            }
            if (! $result['preferenceFit']) {   // 840: never flag a job outside the applicant's preferences
                continue;
            }

            Application::create([
                'job_post_id' => $job->id,
                'applicant_profile_id' => $applicant->id,
                'status' => 'flagged',
                'match_score' => $result['score'],
            ]);
            $newlyFlagged++;
        }

        return $newlyFlagged;
    }
}
