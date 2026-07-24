<?php

namespace App\Http\Controllers;

use App\Models\CompanyAssessment;
use App\Services\MatchService;
use Illuminate\Http\Request;

class AssessmentAttemptController extends Controller
{
    /**
     * The applicant takes a company assessment. Passing it verifies the
     * associated skill badge (real proof-of-skill).
     */
    public function store(Request $request, CompanyAssessment $assessment, MatchService $matcher)
    {
        $user = $request->user();
        abort_unless($user->role === 'jobseeker', 403);

        $data = $request->validate([
            'answers' => ['required', 'array'],
        ]);
        $answers = $data['answers'];

        $questions = $assessment->questions ?? [];
        $total = max(count($questions), 1);
        $correct = 0;
        foreach ($questions as $i => $question) {
            if (isset($answers[$i]) && (int) $answers[$i] === (int) $question['answer']) {
                $correct++;
            }
        }
        $score = (int) round($correct / $total * 100);
        $passed = $score >= $assessment->passing_score;

        $profile = $user->applicantProfile()->firstOrCreate(
            [],
            ['location' => 'Philippines', 'experience_level' => 'Entry']
        );

        if ($passed && $assessment->skill) {
            $existing = $profile->skills()->whereRaw('LOWER(name) = ?', [mb_strtolower($assessment->skill)])->first();
            if ($existing) {
                $existing->update([
                    'verification_status' => 'verified',
                    'verification_method' => 'assessment',
                    'badge' => $existing->badge ?: $assessment->skill.' Verified',
                    'level' => max($existing->level, $score),
                ]);
            } else {
                $profile->skills()->create([
                    'name' => $assessment->skill,
                    'level' => $score,
                    'badge' => $assessment->skill.' Verified',
                    'verification_status' => 'verified',
                    'verification_method' => 'assessment',
                ]);
            }
            $matcher->syncFlaggedMatches($profile->load('skills'));

            return back()->with('success', "Passed with {$score}% — {$assessment->skill} badge verified!");
        }

        return back()->with('error', "Scored {$score}% — you need {$assessment->passing_score}% to earn this badge. Try again.");
    }
}
