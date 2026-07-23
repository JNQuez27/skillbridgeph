<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ApplicantProfile extends Model
{
    protected $fillable = [
        'user_id',
        'headline',
        'location',
        'experience_level',
        'desired_roles',
        'bio',
    ];

    protected $casts = [
        'desired_roles' => 'array',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function skills()
    {
        return $this->hasMany(ApplicantSkill::class);
    }

    public function credentials()
    {
        return $this->hasMany(Credential::class);
    }

    public function applications()
    {
        return $this->hasMany(Application::class);
    }

    /** Names of skills the applicant has verified. */
    public function verifiedSkillNames(): array
    {
        return $this->skills
            ->where('verification_status', 'verified')
            ->pluck('name')
            ->all();
    }

    /** All skill names (verified or not). */
    public function skillNames(): array
    {
        return $this->skills->pluck('name')->all();
    }
}
