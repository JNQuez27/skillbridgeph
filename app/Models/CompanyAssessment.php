<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CompanyAssessment extends Model
{
    protected $fillable = [
        'employer_profile_id',
        'title',
        'role',
        'question_count',
        'duration_minutes',
        'passing_score',
        'instructions',
        'status',
    ];

    public function employerProfile()
    {
        return $this->belongsTo(EmployerProfile::class);
    }
}
