<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AssessmentController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless($user->role === 'employer', 403);

        $profile = $user->employerProfile()->firstOrCreate([], ['company_name' => $user->name."'s Company"]);

        // A passed assessment issues a verified badge in this company's name. An
        // unconfirmed company could otherwise mint badges for anyone it likes.
        if (! $profile->email_verified) {
            return back()->withErrors([
                'assessment' => 'Your company must be verified by SkillBridge PH before its assessments can issue badges.',
            ]);
        }

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:255'],
            'skill' => ['required', 'string', 'max:60'],
            'durationMinutes' => ['required', 'integer', 'min:1', 'max:180'],
            'passingScore' => ['required', 'integer', 'min:50', 'max:100'],
            'instructions' => ['nullable', 'string', 'max:2000'],
            // Fig. 16: an optional practical task with a rubric (1610-1620).
            'taskPrompt' => ['nullable', 'string', 'max:3000'],
            'taskFileRequired' => ['boolean'],
            'rubric' => ['nullable', 'required_with:taskPrompt', 'array', 'min:2', 'max:6'],
            'rubric.*.criterion' => ['required', 'string', 'max:200'],
            'rubric.*.points' => ['required', 'integer', 'min:1', 'max:10'],
            'questions' => ['nullable', 'array', 'max:50'],
            'questions.*.prompt' => ['required', 'string', 'max:1000'],
            'questions.*.options' => ['required', 'array', 'min:2', 'max:6'],
            'questions.*.options.*' => ['required', 'string', 'max:300'],
            'questions.*.answer' => ['required', 'integer', 'min:0'],
        ]);

        $data['questions'] ??= [];
        $hasTask = filled($data['taskPrompt'] ?? null);
        if (! $hasTask && count($data['questions']) < 3) {
            return back()->withErrors(['questions' => 'Add at least 3 questions, or a practical task with a rubric.']);
        }

        foreach ($data['questions'] as $i => $q) {
            if ($q['answer'] >= count($q['options'])) {
                return back()->withErrors(["questions.$i.answer" => 'Pick the correct option for question '.($i + 1).'.']);
            }
        }

        $profile->assessments()->create([
            'title' => $data['title'],
            'role' => $data['role'],
            'skill' => trim($data['skill']),
            'industry' => $profile->industry,
            'question_count' => count($data['questions']),
            'duration_minutes' => $data['durationMinutes'],
            'passing_score' => $data['passingScore'],
            'instructions' => $data['instructions'] ?? null,
            'questions' => array_map(fn ($q) => [
                'prompt' => $q['prompt'],
                'options' => array_values($q['options']),
                'answer' => (int) $q['answer'],
            ], $data['questions']),
            'status' => 'Active',
            'task_prompt' => $hasTask ? trim($data['taskPrompt']) : null,
            'task_file_required' => $hasTask && ($data['taskFileRequired'] ?? false),
            'rubric' => $hasTask ? array_map(fn ($r) => ['criterion' => trim($r['criterion']), 'points' => (int) $r['points']], array_values($data['rubric'])) : null,
        ]);

        return back()->with('success', 'Assessment published. Passing it verifies '.trim($data['skill']).'.');
    }
}
