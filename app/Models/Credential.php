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
    ];

    protected $casts = [
        'size' => 'integer',
    ];

    protected $appends = ['url'];

    public function applicantProfile()
    {
        return $this->belongsTo(ApplicantProfile::class);
    }

    public function getUrlAttribute(): ?string
    {
        return $this->path ? Storage::url($this->path) : null;
    }
}
