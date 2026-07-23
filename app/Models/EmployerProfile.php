<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class EmployerProfile extends Model
{
    protected $fillable = [
        'user_id',
        'company_name',
        'industry',
        'company_size',
        'location_city',
        'location_region',
        'recruiter_name',
        'recruiter_position',
        'recruiter_contact',
        'business_permit_path',
        'email_verified',
    ];

    protected $casts = [
        'email_verified' => 'boolean',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function jobPosts()
    {
        return $this->hasMany(JobPost::class);
    }

    public function assessments()
    {
        return $this->hasMany(CompanyAssessment::class);
    }
}
