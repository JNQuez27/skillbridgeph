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
        'closed_reason',
        'closed_at',
        'skill_settings',
        'company_assessment_id',
    ];

    protected $casts = [
        'required_skills' => 'array',
        'preferred_skills' => 'array',
        'closing_date' => 'date',
        'closed_at' => 'datetime',
        'skill_settings' => 'array',
    ];

    /** Patent Fig. 6, step 610: defaults when the employer sets nothing. */
    /** The choices on the post-job form; also what applicants can prefer (Fig. 8, unit 840). */
    public const WORK_SETUPS = ['On-site', 'Hybrid', 'Remote'];

    public const JOB_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship'];

    public const DEFAULT_WEIGHT = 3;

    public const WEIGHTS = [1, 2, 3, 4, 5];

    public const MIN_LEVELS = [50, 70, 85];

    /** @return array{weight:int, minLevel:?int} */
    public function settingFor(string $skill): array
    {
        $set = ($this->skill_settings ?? [])[mb_strtolower(trim($skill))] ?? [];

        return ['weight' => (int) ($set['weight'] ?? self::DEFAULT_WEIGHT), 'minLevel' => isset($set['minLevel']) ? (int) $set['minLevel'] : null];
    }

    /** The assessment attached to this job (Fig. 6, steps 615-620). */
    public function assessment()
    {
        return $this->belongsTo(CompanyAssessment::class, 'company_assessment_id');
    }

    /**
     * Roles applicants can still see and apply to: open, and not past their
     * closing date. A post past its date drops out on its own, so it can never
     * linger as a "ghost" job nobody is hiring for.
     */
    public function scopeOpen($query)
    {
        return $query->where('status', 'Open')
            ->where(fn ($q) => $q->whereNull('closing_date')->orWhereDate('closing_date', '>=', now()->toDateString()));
    }

    public function isOpen(): bool
    {
        return $this->status === 'Open' && (! $this->closing_date || ! $this->closing_date->isBefore(today()));
    }

    public function employerProfile()
    {
        return $this->belongsTo(EmployerProfile::class);
    }

    public function applications()
    {
        return $this->hasMany(Application::class);
    }
}
