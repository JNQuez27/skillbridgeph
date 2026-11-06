<?php

namespace App\Http\Controllers;

use App\Models\AssessmentAttempt;
use App\Models\CompanyAssessment;
use App\Notifications\AssessmentScored;
use App\Services\MatchService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * Taking a company assessment.
 *
 * A multiple-choice test that can be retried without limit, and that reports a
 * score each time, is not a test: the score is an oracle and the key can be
 * recovered in a handful of submissions. Three controls close that:
 *   1. every attempt is recorded; after a failed attempt there is a cooldown
 *      before the next (Fig. 4, step 455), and after the last allowed attempt
 *      the skill is marked unverified (step 460);
 *   2. a failing attempt returns no score, only that it did not pass;
 *   3. the clock starts on the server when the assessment is opened, and a late
 *      submission is refused.
 */
class AssessmentAttemptController extends Controller
{
    /** Attempts allowed per assessment (Fig. 4, step 450). */
    public const MAX_ATTEMPTS = 3;

    /** Wait after a failed attempt before the next one (Fig. 4, step 455). */
    public const COOLDOWN_HOURS = 24;

    /** Grace added to the time limit for submission and network latency. */
    private const GRACE_SECONDS = 60;

    private function sessionKey(CompanyAssessment $assessment): string
    {
        return 'assessment_started.'.$assessment->id;
    }

    /** The shuffled arrangement this attempt was shown. */
    public static function orderKey(CompanyAssessment $assessment): string
    {
        return 'assessment_order.'.$assessment->id;
    }

    /**
     * Open an assessment. The server records when the clock started; the client
     * cannot set it, so the limit cannot be extended from the browser.
     */
    public function start(Request $request, CompanyAssessment $assessment)
    {
        $user = $request->user();
        abort_unless($user->role === 'jobseeker', 403);

        $profile = $user->applicantProfileOrCreate();

        if ($assessment->status !== 'Active' || ! $assessment->employerProfile?->email_verified) {
            return back()->with('error', 'This assessment is not issuing badges right now.');
        }

        if ($refusal = $this->refusal(self::standing($assessment, $profile->id), $assessment, $profile)) {
            return back()->with('error', $refusal);
        }

        $request->session()->put($this->sessionKey($assessment), now()->toIso8601String());
        $request->session()->put($this->orderKey($assessment), $assessment->shuffledOrder());

        return back();
    }

    public function store(Request $request, CompanyAssessment $assessment, MatchService $matcher)
    {
        $user = $request->user();
        abort_unless($user->role === 'jobseeker', 403);

        $hasTask = $assessment->hasTask();
        $data = $request->validate([
            'answers' => [count($assessment->questions ?? []) > 0 ? 'required' : 'nullable', 'array'],
            // Fig. 13: the task answer and a work file as proof (1314, 1316).
            'taskAnswer' => ['nullable', 'string', 'max:10000'],
            'taskFile' => [$hasTask && $assessment->task_file_required ? 'required' : 'nullable', 'file', 'max:10240',
                'mimes:pdf,jpg,jpeg,png,zip,docx,pptx,xlsx'],
        ]);
        if ($hasTask && blank($data['taskAnswer'] ?? null) && ! $request->hasFile('taskFile')) {
            return back()->withErrors(['taskAnswer' => 'Answer the practical task or attach your work file.']);
        }
        $data['answers'] ??= [];

        $profile = $user->applicantProfileOrCreate();

        // Fig. 2, 232: a test suspended by an administrator (or whose company lost
        // its verification) issues nothing, even mid-attempt.
        if ($assessment->status !== 'Active' || ! $assessment->employerProfile?->email_verified) {
            return back()->with('error', 'This assessment is not issuing badges right now.');
        }

        // Attempt limit and cooldown: the controls that make brute force impractical.
        if ($refusal = $this->refusal(self::standing($assessment, $profile->id), $assessment, $profile)) {
            return back()->with('error', $refusal);
        }

        // Server-side clock. No recorded start means the assessment was not opened
        // through the application, so the submission is not accepted.
        $startedAt = $request->session()->get($this->sessionKey($assessment));
        if (! $startedAt) {
            return back()->with('error', 'Open the assessment before submitting your answers.');
        }

        $seconds = Carbon::parse($startedAt)->diffInSeconds(now());
        $allowed = ($assessment->duration_minutes * 60) + self::GRACE_SECONDS;
        $order = $request->session()->get($this->orderKey($assessment), []);
        $request->session()->forget([$this->sessionKey($assessment), $this->orderKey($assessment)]);

        if ($seconds > $allowed) {
            $this->record($assessment, $profile->id, 0, false, $seconds);

            return back()->with('error', 'Time limit reached, so this attempt counts as not passed. '.$this->afterFail($assessment, $profile));
        }

        // Score on the server against the retained key.
        $total = count($assessment->questions ?? []);
        $score = $total > 0 ? (int) round($assessment->correctAnswers($order, $data['answers']) / $total * 100) : null;

        // Step 425 for a practical task: a person scores it with the rubric, so the
        // attempt waits (and counts as used) until the company reviews it.
        if ($hasTask) {
            $file = $request->file('taskFile');
            AssessmentAttempt::create([
                'company_assessment_id' => $assessment->id,
                'applicant_profile_id' => $profile->id,
                'score' => 0,
                'passed' => false,
                'seconds_taken' => $seconds,
                'status' => 'pending_review',
                'mcq_score' => $score,
                'task_answer' => $data['taskAnswer'] ?? null,
                'task_file_path' => $file?->store('assessment-work', 'local'),
                'task_file_name' => $file?->getClientOriginalName(),
            ]);

            return back()->with('success', 'Submitted. '.($assessment->employerProfile->company_name ?? 'The company')
                .' will score your task with its rubric, and you will be notified of the result.');
        }

        $passed = $score >= $assessment->passing_score;
        $attempt = $this->record($assessment, $profile->id, $score, $passed, $seconds);

        if (! $passed) {
            // Deliberately no score (step 445). Reporting it would let a candidate
            // vary one answer at a time and read the key off the feedback.
            return back()->with('error', 'You did not reach the passing score. '.$this->afterFail($assessment, $profile));
        }

        return back()->with('success', $this->issueBadge($assessment, $profile, $score, $matcher, $attempt));
    }

    /**
     * Fig. 4, step 425 for a practical task: the company scores each rubric
     * criterion. Then 430 decides: pass issues the badge (435), fail follows the
     * cooldown / unverified path (445-460). The applicant is notified either way.
     */
    public function review(Request $request, AssessmentAttempt $attempt, MatchService $matcher)
    {
        $assessment = $attempt->assessment;
        $company = $request->user()->employerProfile;
        abort_unless($request->user()->role === 'employer' && $company && $company->id === $assessment->employer_profile_id, 403);

        if ($attempt->status !== 'pending_review') {
            return back()->with('error', 'This attempt has already been scored.');
        }
        if ($assessment->status !== 'Active') {
            return back()->with('error', 'This assessment is suspended by SkillBridge PH, so it cannot issue badges. Its tasks can be scored once it is reinstated.');
        }

        $rubric = $assessment->rubric ?? [];
        $data = $request->validate([
            'scores' => ['required', 'array', 'size:'.count($rubric)],
            'scores.*' => ['required', 'integer', 'min:0'],
            'feedback' => ['nullable', 'string', 'max:2000'],
        ]);
        foreach ($rubric as $i => $criterion) {
            if (! array_key_exists($i, $data['scores']) || $data['scores'][$i] > $criterion['points']) {
                return back()->withErrors(["scores.$i" => $criterion['criterion'].' is out of '.$criterion['points'].' points.']);
            }
        }

        $scores = array_map('intval', array_values($data['scores']));
        $final = $assessment->finalScore($attempt->mcq_score, $scores);
        $passed = $final >= $assessment->passing_score;
        $attempt->update([
            'status' => 'scored', 'score' => $final, 'passed' => $passed, 'rubric_scores' => $scores,
            'feedback' => $data['feedback'] ?? null, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now(),
        ]);

        $profile = $attempt->applicantProfile;
        $message = $passed ? $this->issueBadge($assessment, $profile, $final, $matcher, $attempt) : 'Not passed yet. '.$this->afterFail($assessment, $profile);
        $profile->user?->notify(new AssessmentScored($assessment, $passed, $message, $attempt->feedback));

        return back()->with('success', $profile->user->name.'\'s task scored '.$final.'% - '.($passed ? 'passed, badge issued.' : 'not passed.').' They have been notified.');
    }

    /** The submitted work file: for the applicant who sent it, the company that set the task, and admins. */
    public function file(Request $request, AssessmentAttempt $attempt)
    {
        $user = $request->user();
        $allowed = $user->role === 'admin'
            || $user->applicantProfile?->id === $attempt->applicant_profile_id
            || ($user->employerProfile && $user->employerProfile->id === $attempt->assessment->employer_profile_id);
        abort_unless($allowed && $attempt->task_file_path && Storage::disk('local')->exists($attempt->task_file_path), 404);

        return Storage::disk('local')->response($attempt->task_file_path, $attempt->task_file_name);
    }

    /** Step 435: issue (or upgrade) the verified badge and refresh matches (440). */
    private function issueBadge(CompanyAssessment $assessment, $profile, int $score, MatchService $matcher, AssessmentAttempt $attempt): string
    {
        if ($assessment->skill) {
            $provenance = [
                'verification_status' => 'verified',
                'verification_method' => 'assessment',
                'verified_by' => $assessment->employerProfile->company_name ?? 'Employer',
                'verified_at' => now(),
                'assessment_attempt_id' => $attempt->id,   // Fig. 1: badge 142 -> result 144
            ];
            $existing = $profile->skills()->whereRaw('LOWER(name) = ?', [mb_strtolower($assessment->skill)])->first();
            if ($existing) {
                $existing->update($provenance + [
                    'badge' => $existing->badge ?: $assessment->skill.' Verified',
                    'level' => max($existing->level, $score),
                ]);
            } else {
                $profile->skills()->create($provenance + [
                    'name' => $assessment->skill,
                    'level' => $score,
                    'badge' => $assessment->skill.' Verified',
                ]);
            }
            $matcher->syncFlaggedMatches($profile->load('skills'));
        }

        $badge = $profile->skills()->whereRaw('LOWER(name) = ?', [mb_strtolower((string) $assessment->skill)])->first();

        return "Passed with {$score}% - {$assessment->skill} badge verified"
            .($badge?->verification_id ? " (verification ID {$badge->verification_id})." : '.');
    }

    private function record(CompanyAssessment $assessment, int $profileId, int $score, bool $passed, ?int $seconds): AssessmentAttempt
    {
        return AssessmentAttempt::create([
            'company_assessment_id' => $assessment->id,
            'applicant_profile_id' => $profileId,
            'score' => $score,
            'passed' => $passed,
            'seconds_taken' => $seconds,
        ]);
    }

    /**
     * Where an applicant stands on one assessment: attempts used and left, whether
     * they passed, when the next attempt opens, and whether they are out of attempts.
     */
    public static function standing(CompanyAssessment $assessment, int $profileId): array
    {
        $attempts = AssessmentAttempt::where('company_assessment_id', $assessment->id)
            ->where('applicant_profile_id', $profileId)->orderBy('created_at')->get();
        $passed = $attempts->contains('passed', true);
        $pending = $attempts->contains('status', 'pending_review');   // a task waiting for the rubric
        $left = max(0, self::MAX_ATTEMPTS - $attempts->count());
        $lastFail = $attempts->where('status', 'scored')->where('passed', false)->last();
        $opensAt = $lastFail?->created_at->copy()->addHours(self::COOLDOWN_HOURS);

        return [
            'used' => $attempts->count(),
            'left' => $left,
            'passed' => $passed,
            'pending' => $pending,
            'locked' => ! $passed && ! $pending && $left === 0,                            // step 460
            'nextAttemptAt' => ! $passed && $left > 0 && $opensAt?->isFuture() ? $opensAt : null, // step 455
        ];
    }

    private function refusal(array $standing, CompanyAssessment $assessment, $profile): ?string
    {
        // Fig. 4 starts from a pending skill (405): a skill verified another way needs no test.
        $alreadyVerified = $assessment->skill && $profile->skills()->whereRaw('LOWER(name) = ?', [mb_strtolower($assessment->skill)])
            ->where('verification_status', 'verified')->exists();

        return match (true) {
            $standing['passed'], $alreadyVerified => 'You have already earned this badge.',
            $standing['pending'] => 'Your last attempt is waiting for '.($assessment->employerProfile->company_name ?? 'the company').' to score your task.',
            $standing['locked'] => 'You have used all '.self::MAX_ATTEMPTS.' attempts. '.$assessment->skill.' is marked Unverified for this assessment.',
            $standing['nextAttemptAt'] !== null => 'Your next attempt opens '.$standing['nextAttemptAt']->diffForHumans().' ('.$standing['nextAttemptAt']->ph()->format('M j, g:i A').' PH time).',
            default => null,
        };
    }

    /** After a failed attempt: cooldown (455) if attempts remain, otherwise mark unverified (460). */
    private function afterFail(CompanyAssessment $assessment, $profile): string
    {
        $standing = self::standing($assessment, $profile->id);
        if (! $standing['locked']) {
            return $standing['left'].' attempt(s) left. You can try again in '.self::COOLDOWN_HOURS.' hours.';
        }

        if ($assessment->skill) {
            $skill = $profile->skills()->whereRaw('LOWER(name) = ?', [mb_strtolower($assessment->skill)])->first();
            // A skill already verified another way is never downgraded.
            if (! $skill) {
                $profile->skills()->create(['name' => $assessment->skill, 'level' => 0, 'verification_status' => 'unverified', 'verification_method' => 'assessment']);
            } elseif ($skill->verification_status !== 'verified') {
                $skill->update(['verification_status' => 'unverified', 'verification_method' => 'assessment', 'level' => 0]);
            }
        }

        return 'That was your last attempt, so '.$assessment->skill.' is now marked Unverified.';
    }
}
