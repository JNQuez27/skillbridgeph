<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobPost extends Model
{
    protected $fillable = [
        'employer_profile_id',
        'title',
        'description',
        'responsibilities',
        'location_city',
        'location_region',
        'employment_type',
        'work_setup',
        'salary_range',
        'experience_level',
        'education_requirement',
        'required_skills',
        'preferred_skills',
        'status',
        'closing_date',
    ];

    protected $casts = [
        'required_skills' => 'array',
        'preferred_skills' => 'array',
        'closing_date' => 'date',
    ];

    public function employerProfile()
    {
        return $this->belongsTo(EmployerProfile::class);
    }

    public function applications()
    {
        return $this->hasMany(Application::class);
    }
}
