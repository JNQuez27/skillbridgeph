<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApplicantSkill extends Model
{
    protected $fillable = [
        'applicant_profile_id',
        'name',
        'level',
        'badge',
        'verification_status',
        'verification_method',
    ];

    protected $casts = [
        'level' => 'integer',
    ];

    public function applicantProfile()
    {
        return $this->belongsTo(ApplicantProfile::class);
    }
}
