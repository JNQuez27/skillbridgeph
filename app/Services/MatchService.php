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
     * Score a single applicant against a single job post.
     *
     * @return array{score:int, matchedRequired:array, matchedPreferred:array, locationMatch:bool, experienceMatch:bool}
     */
    public function score(JobPost $job, ApplicantProfile $applicant): array
    {
        $verified = $applicant->verifiedSkillNames();
        $candidateSkills = $this->normalizeTags(
            count($verified) > 0 ? $verified : $applicant->skillNames()
        );
        $required = $this->normalizeTags($job->required_skills ?? []);
        $preferred = $this->normalizeTags($job->preferred_skills ?? []);

        $matchedRequired = array_values(array_intersect($required, $candidateSkills));
        $matchedPreferred = array_values(array_intersect($preferred, $candidateSkills));

        $skillScore = 0.0;
        if (count($required) > 0) {
            $skillScore += (count($matchedRequired) / count($required)) * 60;
        }
        if (count($preferred) > 0) {
            $skillScore += (count($matchedPreferred) / count($preferred)) * 25;
        }
        if (count($required) === 0 && count($preferred) === 0) {
            $skillScore = count($candidateSkills) > 0 ? 50 : 0;
        }

        $candidateLocation = $this->normalize($applicant->location);
        $jobLocationTokens = $this->normalizeTags([$job->location_city, $job->location_region]);
        $locationMatch = $candidateLocation !== '' && collect($jobLocationTokens)
            ->contains(fn ($token) => $token !== '' && str_contains($candidateLocation, $token)) ? 10 : 0;

        $candidateExperience = $this->normalize($applicant->experience_level);
        $jobExperience = $this->normalize($job->experience_level);
        $experienceMatch = $candidateExperience !== '' && $jobExperience !== '' && $candidateExperience === $jobExperience ? 5 : 0;

        $score = (int) round(min(100, $skillScore + $locationMatch + $experienceMatch));

        return [
            'score' => $score,
            'matchedRequired' => $matchedRequired,
            'matchedPreferred' => $matchedPreferred,
            'locationMatch' => $locationMatch > 0,
            'experienceMatch' => $experienceMatch > 0,
        ];
    }

    /** Jobs that fit an applicant, highest score first. */
    public function matchesForApplicant(ApplicantProfile $applicant, int $threshold = self::APPLICANT_THRESHOLD): Collection
    {
        $applicant->loadMissing('skills');

        return JobPost::with('employerProfile')
            ->where('status', 'Open')
            ->get()
            ->map(fn (JobPost $job) => ['job' => $job, 'match' => $this->score($job, $applicant)])
            ->filter(fn ($entry) => $entry['match']['score'] >= $threshold)
            ->sortByDesc(fn ($entry) => $entry['match']['score'])
            ->values();
    }

    /** Candidates that fit a job, highest score first. */
    public function candidatesForJob(JobPost $job, int $threshold = self::EMPLOYER_THRESHOLD): Collection
    {
        return ApplicantProfile::with(['skills', 'user'])
            ->get()
            ->map(fn (ApplicantProfile $applicant) => ['applicant' => $applicant, 'match' => $this->score($job, $applicant)])
            ->filter(fn ($entry) => $entry['match']['score'] >= $threshold)
            ->sortByDesc(fn ($entry) => $entry['match']['score'])
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

        foreach (JobPost::where('status', 'Open')->get() as $job) {
            $result = $this->score($job, $applicant);
            if ($result['score'] < $threshold) {
                continue;
            }

            $application = $existing->get($job->id);
            if ($application) {
                $application->update(['match_score' => $result['score']]);
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
