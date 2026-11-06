<?php

namespace App\Http\Controllers;

use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\JobPost;
use App\Services\CandidateReview;
use Illuminate\Http\Request;

class CandidateHireController extends Controller
{
    /**
     * Hire a candidate either by accepting the system review (auto) or after
     * reading their documents (manual).
     *
     * Guardrail: auto-approval is only allowed when the review is Green.
     * Anything Amber/Red must be opened and checked by a human first.
     */
    public function store(Request $request, JobPost $jobPost, ApplicantProfile $applicant, CandidateReview $reviewer)
    {
        $user = $request->user();
        abort_unless($user->role === 'employer', 403);
        abort_unless($jobPost->employer_profile_id === $user->employerProfile?->id, 403);

        $data = $request->validate([
            'mode' => ['required', 'in:auto,manual'],
            'checked' => ['array'],
            'checked.*' => ['integer'],
        ]);

        $review = $reviewer->for($jobPost, $applicant);

        if ($data['mode'] === 'auto' && ! $review['canAutoApprove']) {
            return back()->withErrors([
                'hire' => 'This candidate is '.strtoupper($review['status']).' — open their credentials and review manually before hiring.',
            ]);
        }

        $application = Application::where('job_post_id', $jobPost->id)
            ->where('applicant_profile_id', $applicant->id)
            ->whereIn('status', Application::ENGAGED)
            ->first();
        abort_unless($application, 403, 'This candidate has not applied or been invited to this role.');

        // A manual review means every document was actually opened - ticking
        // none of them and hiring anyway would make the audit trail a lie.
        if ($data['mode'] === 'manual') {
            $ids = $applicant->credentials()->pluck('id');
            if ($ids->diff($data['checked'] ?? [])->isNotEmpty()) {
                return back()->withErrors(['hire' => 'Open and tick every credential before hiring on manual review.']);
            }
            $data['checked'] = $ids->all();
        }

        $application->fill([
            'status' => 'hired',
            'reviewed_at' => now(),
            'reviewed_by' => $user->id,
            'review_mode' => $data['mode'],
            'review_verdict' => $review['status'],
            'reviewed_credentials' => $data['checked'] ?? [],
        ])->save();

        return back()->with('success', $data['mode'] === 'auto'
            ? 'Hired on system review — '.$applicant->user->name.'.'
            : 'Hired after manual credential review — '.$applicant->user->name.'.');
    }
}
