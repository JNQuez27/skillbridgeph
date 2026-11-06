<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AssessmentAttempt extends Model
{
    protected $fillable = [
        'company_assessment_id',
        'applicant_profile_id',
        'score',
        'passed',
        'seconds_taken',
        'status',
        'mcq_score',
        'task_answer',
        'task_file_path',
        'task_file_name',
        'rubric_scores',
        'feedback',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'score' => 'integer',
        'passed' => 'boolean',
        'seconds_taken' => 'integer',
        'mcq_score' => 'integer',
        'rubric_scores' => 'array',
        'reviewed_at' => 'datetime',
    ];

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function assessment()
    {
        return $this->belongsTo(CompanyAssessment::class, 'company_assessment_id');
    }

    public function applicantProfile()
    {
        return $this->belongsTo(ApplicantProfile::class);
    }
}
