<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\JobPost;
use App\Notifications\InvitationAnswered;
use App\Services\MatchService;
use Illuminate\Http\Request;

class ApplicationController extends Controller
{
    /**
     * The applicant picks a flagged job — saving or applying to the ones truly
     * suited to them.
     */
    public function store(Request $request, JobPost $jobPost, MatchService $matcher)
    {
        $user = $request->user();
        abort_unless($user->role === 'jobseeker', 403);

        $data = $request->validate([
            'status' => ['required', 'in:saved,applied,flagged'],
        ]);

        $profile = $user->applicantProfileOrCreate();

        abort_unless($jobPost->isOpen(), 404);

        $application = Application::firstOrNew(['job_post_id' => $jobPost->id, 'applicant_profile_id' => $profile->id]);

        // Applying is the only move forward an applicant can make; it never
        // undoes a stage the employer has already set (shortlisted, hired, ...).
        $rank = ['flagged' => 0, 'saved' => 1, 'invited' => 2, 'applied' => 3, 'shortlisted' => 4, 'interviewing' => 5, 'hired' => 6, 'not_selected' => 6];
        if (! $application->exists || $rank[$data['status']] > ($rank[$application->status] ?? 0)) {
            $application->status = $data['status'];
        }
        $application->match_score = $matcher->score($jobPost, $profile->load('skills'))['score'];
        $application->save();

        if ($data['status'] !== 'applied') {
            return back()->with('success', 'Saved to your list.');
        }
        if (! $application->wasChanged('status') && ! $application->wasRecentlyCreated) {
            return back()->with('success', 'You already applied for this job.');
        }

        // Fig. 7, step 735: proof travels with the application; no resume is needed.
        $badges = $profile->skills()->where('verification_status', 'verified')->count();
        $files = $profile->credentials()->count();
        $needsTest = $jobPost->assessment?->status === 'Active' && ! \App\Models\AssessmentAttempt::where('company_assessment_id', $jobPost->company_assessment_id)
            ->where('applicant_profile_id', $profile->id)->where('passed', true)->exists();

        return back()->with('success', "Application sent with your {$badges} verified badge(s) and {$files} file(s). No resume needed."
            .($needsTest ? ' This job also asks you to take the "'.$jobPost->assessment->title.'" assessment.' : ''));
    }

    /**
     * Patent Fig. 19, 1914-1916: answer an employer's invitation. Accepting applies
     * (the same as pressing Apply); declining closes the invitation, takes the
     * employer's access to the applicant's documents away, and stops repeat invites
     * for this job. The applicant can still apply later.
     */
    public function answer(Request $request, JobPost $jobPost)
    {
        $user = $request->user();
        abort_unless($user->role === 'jobseeker', 403);
        $data = $request->validate(['answer' => ['required', 'in:accept,decline']]);

        $application = Application::where('job_post_id', $jobPost->id)
            ->where('applicant_profile_id', $user->applicantProfileOrCreate()->id)->first();
        if ($application?->status !== 'invited') {
            return back()->with('error', 'There is no open invitation for this job.');
        }

        $accepted = $data['answer'] === 'accept';
        if ($accepted && ! $jobPost->isOpen()) {
            return back()->with('error', 'This job is no longer open.');
        }
        $application->update(['status' => $accepted ? 'applied' : 'declined']);
        $jobPost->employerProfile?->user?->notify(new InvitationAnswered($application->load('applicantProfile.user', 'jobPost'), $accepted));

        return back()->with('success', $accepted
            ? 'Invitation accepted. Your application for '.$jobPost->title.' was sent with your verified badges and portfolio.'
            : 'Invitation declined. '.($jobPost->employerProfile->company_name ?? 'The employer').' has been told and will not invite you to this job again.');
    }
}
