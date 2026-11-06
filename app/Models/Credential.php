<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;

class Credential extends Model
{
    protected $fillable = [
        'applicant_profile_id',
        'type',
        'title',
        'original_name',
        'path',
        'mime',
        'size',
        'sha256',
        'meta',
        'extracted_skills',
        'challenge_code',
        'registry',
        'registry_number',
        'registry_qualification',
        'registry_status',
        'registry_note',
        'registry_checked_by',
        'registry_checked_at',
        'registry_consent_at',
        'recording_prompts',
        'recording_started_at',
        'linked_skills',
    ];

    protected $casts = [
        'linked_skills' => 'array',
        'size' => 'integer',
        'meta' => 'array',
        'extracted_skills' => 'array',
        'registry_checked_at' => 'datetime',
        'recording_prompts' => 'array',
        'recording_started_at' => 'datetime',
    ];

    /** Official source each registry check is made against. */
    public const REGISTRIES = ['tesda' => 'TESDA registry', 'prc' => 'PRC registry'];

    protected $appends = ['url'];

    public function applicantProfile()
    {
        return $this->belongsTo(ApplicantProfile::class);
    }

    /** Files are private; they are only reachable through an authorized route. */
    public function checker()
    {
        return $this->belongsTo(User::class, 'registry_checked_by');
    }

    public function getUrlAttribute(): ?string
    {
        return $this->path ? route('credentials.file', $this->id) : null;
    }
}
