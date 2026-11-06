<?php

namespace App\Http\Controllers;

use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\Credential;
use App\Models\JobPost;
use App\Services\CandidateReview;
use App\Support\InterviewKit;
use App\Services\MatchService;
use Illuminate\Http\Request;

/**
 * Everything an employer does to move a candidate through one of its roles.
 * Hiring itself stays in CandidateHireController behind the review guardrail.
 */
class PipelineController extends Controller
{
    /** Patent Fig. 6, step 650: how many top candidates one action invites. */
    public const TOP_N = MatchService::TOP_N;

    /** Employer invites a matched candidate to a specific role. */
    public function invite(Request $request, JobPost $jobPost, ApplicantProfile $applicant, MatchService $matcher)
    {
        $this->authorizeJob($request, $jobPost);

        $application = Application::firstOrNew([
            'job_post_id' => $jobPost->id,
            'applicant_profile_id' => $applicant->id,
        ]);

        // Fig. 19: a declined invitation is respected; the same job cannot ask again.
        if ($application->status === 'declined') {
            return back()->with('error', $applicant->user->name.' declined your invitation to '.$jobPost->title.'.');
        }

        // Promote a fresh/flagged/saved row to "invited"; never downgrade a
        // candidate who already applied or moved forward.
        if (! in_array($application->status, Application::ENGAGED, true)) {
            $application->status = 'invited';
        }
        $application->match_score = $matcher->score($jobPost, $applicant->load('skills'))['score'];
        $application->save();

        return back()->with('success', $applicant->user->name.' invited to '.$jobPost->title.'.');
    }

    /**
     * Patent Fig. 6, steps 650-655: invite the ten best-scoring candidates for this
     * role in one action. People who already applied, were invited, or moved
     * further are skipped, so the action never downgrades or repeats anyone.
     */
    public function inviteTop(Request $request, JobPost $jobPost, MatchService $matcher)
    {
        $this->authorizeJob($request, $jobPost);

        $top = $matcher->topTen($jobPost);   // Fig. 8, output 875

        foreach ($top as $entry) {
            $application = Application::firstOrNew(['job_post_id' => $jobPost->id, 'applicant_profile_id' => $entry['applicant']->id]);
            $application->fill(['status' => 'invited', 'match_score' => $entry['match']['score']])->save();
        }

        return back()->with('success', $top->isEmpty()
            ? 'No new candidates to invite for '.$jobPost->title.'.'
            : 'Invited the top '.$top->count().' candidate(s) for '.$jobPost->title.'.');
    }

    /** Move an engaged candidate to shortlisted / interviewing, or mark them not selected (Fig. 7, 740-760). */
    public function stage(Request $request, JobPost $jobPost, ApplicantProfile $applicant)
    {
        $this->authorizeJob($request, $jobPost);
        $data = $request->validate(['status' => ['required', 'in:shortlisted,interviewing,not_selected']]);

        $application = $this->engagedApplication($jobPost, $applicant);
        if ($application->status === 'hired') {
            return back()->with('error', $applicant->user->name.' is already hired.');
        }
        $application->update(['status' => $data['status']]);

        return back()->with('success', $applicant->user->name.' '.($data['status'] === 'not_selected' ? 'marked not selected' : 'moved to '.$data['status']).'. They have been notified.');
    }

    /**
     * One click for the common case: every applicant to this role whose checks
     * all came back Green is shortlisted. Amber/Red stay put for a human read.
     */
    public function shortlistGreen(Request $request, JobPost $jobPost, CandidateReview $reviewer)
    {
        $this->authorizeJob($request, $jobPost);

        $moved = Application::with('applicantProfile')
            ->where('job_post_id', $jobPost->id)
            ->whereIn('status', ['applied', 'invited'])
            ->get()
            ->filter(fn ($a) => $reviewer->for($jobPost, $a->applicantProfile)['canAutoApprove'])
            ->each(fn ($a) => $a->update(['status' => 'shortlisted']))
            ->count();

        return back()->with('success', $moved
            ? "Shortlisted {$moved} candidate(s) whose checks all passed."
            : 'No new candidates with all checks passed yet.');
    }

    /**
     * Portfolio review: a verified employer who has opened a candidate's
     * evidence confirms it demonstrates one of the role's skills. The badge
     * records the company and the exact file, and that file can no longer be
     * deleted while it backs the badge.
     */
    public function verifySkill(Request $request, JobPost $jobPost, ApplicantProfile $applicant, MatchService $matcher)
    {
        $employer = $this->authorizeJob($request, $jobPost);
        if (! $employer->email_verified) {
            return back()->with('error', 'Only verified companies can verify skills.');
        }

        $data = $request->validate([
            'skill' => ['required', 'string', 'max:60'],
            'credentialId' => ['required', 'integer'],
        ]);

        $this->engagedApplication($jobPost, $applicant);

        $jobSkills = collect(array_merge($jobPost->required_skills ?? [], $jobPost->preferred_skills ?? []));
        $skillName = $jobSkills->first(fn ($s) => mb_strtolower($s) === mb_strtolower(trim($data['skill'])));
        abort_unless($skillName, 422, 'You can only verify skills this role asks for.');

        $credential = Credential::where('id', $data['credentialId'])
            ->where('applicant_profile_id', $applicant->id)
            ->whereIn('type', ['portfolio', 'certificate', 'video'])
            ->firstOrFail();

        // A video can be faked or performed by a stand-in, so it only counts once a
        // live interview confirmed the same person and saw them repeat the task.
        if ($credential->type === 'video') {
            $application = $this->engagedApplication($jobPost, $applicant);
            if ($application->video_identity !== 'match' || ! $application->live_task_done) {
                return back()->with('error', 'Interview the candidate first: confirm they are the person in the video and that they repeated the task live.');
            }
        }

        $skill = $applicant->skills()->whereRaw('LOWER(name) = ?', [mb_strtolower($skillName)])->first();
        if ($skill?->verification_status === 'verified') {
            return back()->with('error', $skillName.' is already verified.');
        }

        $values = [
            'verification_status' => 'verified',
            'verification_method' => 'portfolio',
            'verified_by' => $employer->company_name,
            'verified_at' => now(),
            'evidence_credential_id' => $credential->id,
            'badge' => $skillName.' Verified',
        ];
        $skill
            ? $skill->update($values + ['level' => max($skill->level, 70)])
            : $applicant->skills()->create($values + ['name' => $skillName, 'level' => 70]);

        $matcher->syncFlaggedMatches($applicant->load('skills'));

        return back()->with('success', $skillName.' verified for '.$applicant->user->name.' from "'.($credential->title ?: $credential->original_name).'".');
    }

    /**
     * Record a structured interview: every question in this role's kit rated 1-5
     * against its written anchors. The questions are stored as asked, so the
     * score keeps its meaning even if the question bank changes later.
     */
    public function interview(Request $request, JobPost $jobPost, ApplicantProfile $applicant)
    {
        $this->authorizeJob($request, $jobPost);
        $kit = InterviewKit::forJob($jobPost->loadMissing('employerProfile'));

        $data = $request->validate([
            'ratings' => ['required', 'array', 'size:'.count($kit)],
            'ratings.*.score' => ['required', 'integer', 'between:1,5'],
            'ratings.*.note' => ['nullable', 'string', 'max:500'],
            'videoMatch' => ['nullable', 'in:match,mismatch'],
            'liveTask' => ['nullable', 'boolean'],
        ]);

        $application = $this->engagedApplication($jobPost, $applicant);

        $ratings = array_map(fn ($q, $r) => [
            'competency' => $q['competency'],
            'question' => $q['question'],
            'score' => (int) $r['score'],
            'note' => $r['note'] ?? null,
        ], $kit, array_values($data['ratings']));

        $application->fill([
            'interview_ratings' => $ratings,
            'interview_score' => round(collect($ratings)->avg('score'), 2),
            'interviewed_by' => $request->user()->id,
            'interviewed_at' => now(),
            'video_identity' => $data['videoMatch'] ?? null,
            'live_task_done' => $data['liveTask'] ?? null,
        ]);
        // Being interviewed is the next stage; a hire is never undone by it.
        if (in_array($application->status, ['applied', 'invited', 'shortlisted'], true)) {
            $application->status = 'interviewing';
        }
        $application->save();

        return back()->with('success', 'Interview saved for '.$applicant->user->name.': '.number_format($application->interview_score, 1).' / 5.');
    }

    private function authorizeJob(Request $request, JobPost $jobPost)
    {
        $user = $request->user();
        abort_unless($user->role === 'employer', 403);
        abort_unless($jobPost->employer_profile_id === $user->employerProfile?->id, 403);

        return $user->employerProfile;
    }

    private function engagedApplication(JobPost $jobPost, ApplicantProfile $applicant): Application
    {
        $application = Application::where('job_post_id', $jobPost->id)
            ->where('applicant_profile_id', $applicant->id)
            ->whereIn('status', Application::ENGAGED)
            ->first();
        abort_unless($application, 403, 'This candidate has not applied or been invited to this role.');

        return $application;
    }
}
