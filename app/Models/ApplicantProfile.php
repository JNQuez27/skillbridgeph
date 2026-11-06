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
        'education',
        'experience',
        'preferred_work_setups',
        'preferred_job_types',
    ];

    protected $casts = [
        'desired_roles' => 'array',
        'education' => 'array',
        'experience' => 'array',
        'preferred_work_setups' => 'array',
        'preferred_job_types' => 'array',
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

    /**
     * Patent Fig. 20 (2026): held skills backed by one of the applicant's own
     * portfolio work samples linked to them. A file another account also uploaded
     * does not count: copied work must not raise anyone's match.
     *
     * @return array<int, string> lower-case names
     */
    public function evidencedSkillNames(): array
    {
        return once(function () {
            $samples = $this->credentials()->where('type', 'portfolio')->whereNotNull('linked_skills')->get(['sha256', 'linked_skills']);
            $shared = Credential::whereIn('sha256', $samples->pluck('sha256')->filter())
                ->where('applicant_profile_id', '!=', $this->id)->pluck('sha256');
            $held = array_map(fn ($n) => mb_strtolower(trim($n)), $this->skillNames());

            return $samples->reject(fn ($c) => $c->sha256 && $shared->contains($c->sha256))
                ->flatMap(fn ($c) => $c->linked_skills)
                ->map(fn ($n) => mb_strtolower(trim($n)))
                ->unique()->intersect($held)->values()->all();
        });
    }

    /** Skills the applicant holds: verified or still claimed. Not ones marked unverified (Fig. 4, step 460). */
    public function skillNames(): array
    {
        return $this->skills->where('verification_status', '!=', 'unverified')->pluck('name')->all();
    }
}
