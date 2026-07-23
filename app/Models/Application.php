<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Application extends Model
{
    protected $fillable = [
        'job_post_id',
        'applicant_profile_id',
        'status',
        'match_score',
    ];

    protected $casts = [
        'match_score' => 'integer',
    ];

    public function jobPost()
    {
        return $this->belongsTo(JobPost::class);
    }

    public function applicantProfile()
    {
        return $this->belongsTo(ApplicantProfile::class);
    }
}
