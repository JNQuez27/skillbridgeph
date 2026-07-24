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
    ];

    protected $casts = [
        'questions' => 'array',
    ];

    public function employerProfile()
    {
        return $this->belongsTo(EmployerProfile::class);
    }
}
