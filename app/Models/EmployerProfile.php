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
        'registration_type',
        'registration_number',
        'verification_status',
        'verification_note',
        'reviewed_by',
        'reviewed_at',
        'precheck',
        'precheck_at',
    ];

    protected $casts = [
        'email_verified' => 'boolean',
        'reviewed_at' => 'datetime',
        'precheck' => 'array',
        'precheck_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
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
