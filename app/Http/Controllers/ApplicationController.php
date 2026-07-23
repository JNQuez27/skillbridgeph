<?php

namespace App\Http\Controllers;

use App\Models\Application;
use App\Models\JobPost;
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

        $profile = $user->applicantProfile()->firstOrCreate(
            [],
            ['location' => 'Philippines', 'experience_level' => 'Entry']
        );

        $score = $matcher->score($jobPost, $profile->load('skills'))['score'];

        Application::updateOrCreate(
            ['job_post_id' => $jobPost->id, 'applicant_profile_id' => $profile->id],
            ['status' => $data['status'], 'match_score' => $score]
        );

        return back()->with('success', $data['status'] === 'applied' ? 'Application submitted.' : 'Saved to your list.');
    }
}
