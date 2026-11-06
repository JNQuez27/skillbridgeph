<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyAssessment extends Model
{
    protected $fillable = [
        'employer_profile_id',
        'title',
        'role',
        'industry',
        'skill',
        'question_count',
        'duration_minutes',
        'passing_score',
        'instructions',
        'questions',
        'status',
        'task_prompt',
        'task_file_required',
        'rubric',
        'moderation_note',
        'moderated_by',
        'moderated_at',
    ];

    protected $casts = [
        'questions' => 'array',
        'rubric' => 'array',
        'task_file_required' => 'boolean',
        'moderated_at' => 'datetime',
    ];

    public function moderator()
    {
        return $this->belongsTo(User::class, 'moderated_by');
    }

    /**
     * Fig. 2, 232: things an administrator should look at. Each flag is a
     * reason to read the test, never a decision by itself.
     *
     * @return array<int, string>
     */
    public function moderationFlags(int $attempts, int $passed): array
    {
        $flags = [];
        $prompts = [];
        foreach ($this->questions ?? [] as $i => $q) {
            $options = array_map(fn ($o) => mb_strtolower(trim($o)), $q['options'] ?? []);
            if (count($options) !== count(array_unique($options))) {
                $flags[] = 'Question '.($i + 1).' has two identical options.';
            }
            $key = mb_strtolower(trim($q['prompt'] ?? ''));
            if (isset($prompts[$key])) {
                $flags[] = 'Question '.($i + 1).' repeats question '.($prompts[$key] + 1).'.';
            }
            $prompts[$key] ??= $i;
        }
        // Scored attempts only; the outcome pattern hints at a broken key or a giveaway.
        if ($attempts >= 5 && $passed === $attempts) {
            $flags[] = "Everyone passed ({$passed} of {$attempts}): it may be too easy to prove the skill.";
        } elseif ($attempts >= 5 && $passed === 0) {
            $flags[] = "Nobody passed (0 of {$attempts}): check the answer key.";
        }

        return $flags;
    }

    /** Fig. 13 / 16: a practical task scored by the employer's rubric (Fig. 4, step 425). */
    public function hasTask(): bool
    {
        return filled($this->task_prompt) && ! empty($this->rubric);
    }

    /**
     * Step 425 for a task: the rubric percentage, averaged with the quiz score
     * when the assessment also has questions.
     */
    public function finalScore(?int $mcqScore, array $rubricScores): int
    {
        $max = array_sum(array_column($this->rubric ?? [], 'points'));
        $rubric = $max > 0 ? array_sum($rubricScores) / $max * 100 : 0;

        return (int) round($mcqScore === null ? $rubric : ($mcqScore + $rubric) / 2);
    }

    public function employerProfile()
    {
        return $this->belongsTo(EmployerProfile::class);
    }

    public function attempts()
    {
        return $this->hasMany(AssessmentAttempt::class);
    }

    /**
     * A fresh random order for one attempt: question order and each question's
     * option order. A shared answer pattern ("B, A, C, D") is useless when every
     * attempt sees a different arrangement.
     *
     * @return array<int, array{q:int, o:array<int,int>}>
     */
    public function shuffledOrder(): array
    {
        $order = array_keys($this->questions ?? []);
        shuffle($order);

        return array_map(function (int $q) {
            $options = array_keys($this->questions[$q]['options']);
            shuffle($options);

            return ['q' => $q, 'o' => $options];
        }, $order);
    }

    /** The questions as this attempt shows them. Never includes the answer key. */
    public function presented(array $order): array
    {
        return array_map(fn ($item) => [
            'prompt' => $this->questions[$item['q']]['prompt'],
            'options' => array_map(fn ($o) => $this->questions[$item['q']]['options'][$o], $item['o']),
        ], $order);
    }

    /** Count correct answers, translating each on-screen choice back to the original option. */
    public function correctAnswers(array $order, array $answers): int
    {
        $correct = 0;
        foreach ($order as $shown => $item) {
            $picked = $answers[$shown] ?? null;
            if ($picked !== null && ($item['o'][(int) $picked] ?? null) === (int) $this->questions[$item['q']]['answer']) {
                $correct++;
            }
        }

        return $correct;
    }
}
