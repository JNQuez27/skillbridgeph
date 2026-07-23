<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AssessmentController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless($user->role === 'employer', 403);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'role' => ['required', 'string', 'max:255'],
            'questionCount' => ['required', 'integer', 'min:1'],
            'durationMinutes' => ['required', 'integer', 'min:1'],
            'passingScore' => ['required', 'integer', 'min:1', 'max:100'],
            'instructions' => ['nullable', 'string'],
        ]);

        $profile = $user->employerProfile()->firstOrCreate([], ['company_name' => $user->name."'s Company"]);

        $profile->assessments()->create([
            'title' => $data['title'],
            'role' => $data['role'],
            'question_count' => $data['questionCount'],
            'duration_minutes' => $data['durationMinutes'],
            'passing_score' => $data['passingScore'],
            'instructions' => $data['instructions'] ?? null,
            'status' => 'Active',
        ]);

        return back()->with('success', 'Assessment published.');
    }
}
