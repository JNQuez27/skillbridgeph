<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\ApplicantProfile;
use App\Models\JobPost;
use App\Services\MatchService;
use Illuminate\Http\Request;

class InviteController extends Controller
{
    /** Employer invites a matched candidate to a specific role. */
    public function store(Request $request, JobPost $jobPost, ApplicantProfile $applicant, MatchService $matcher)
    {
        $user = $request->user();
        abort_unless($user->role === 'employer', 403);
        abort_unless($jobPost->employer_profile_id === $user->employerProfile?->id, 403);

        $score = $matcher->score($jobPost, $applicant->load('skills'))['score'];

        $application = Application::firstOrNew([
            'job_post_id' => $jobPost->id,
            'applicant_profile_id' => $applicant->id,
        ]);

        // Promote a fresh/auto-flagged row to "invited"; never downgrade a
        // candidate who already applied or moved forward.
        if (! $application->exists || $application->status === 'flagged') {
            $application->status = 'invited';
        }
        $application->match_score = $score;
        $application->save();

        return back()->with('success', 'Candidate invited to '.$jobPost->title.'.');
    }
}
