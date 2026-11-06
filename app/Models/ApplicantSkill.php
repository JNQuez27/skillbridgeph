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
        'verified_by',
        'verified_at',
        'evidence_credential_id',
        'verification_id',
        'assessment_attempt_id',
        'public_at',
    ];

    protected $casts = [
        'level' => 'integer',
        'verified_at' => 'datetime',
        'public_at' => 'datetime',
    ];

    public function applicantProfile()
    {
        return $this->belongsTo(ApplicantProfile::class);
    }

    /**
     * Fig. 4, step 435: a badge gets its unique verification ID the moment it
     * becomes verified, whichever route verified it.
     */
    protected static function booted(): void
    {
        static::saving(function (ApplicantSkill $skill) {
            if ($skill->verification_status === 'verified' && ! $skill->verification_id) {
                $skill->verification_id = self::newVerificationId();
            }
        });
    }

    /** e.g. SB-7K3Q-9XM2. Unambiguous characters only (no 0/O, 1/I/L). */
    public static function newVerificationId(): string
    {
        $alphabet = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
        do {
            $pick = fn () => implode('', array_map(fn () => $alphabet[random_int(0, strlen($alphabet) - 1)], range(1, 4)));
            $id = 'SB-'.$pick().'-'.$pick();
        } while (self::where('verification_id', $id)->exists());

        return $id;
    }

    /** The uploaded file an employer reviewed to verify this skill, if any. */
    /** Patent Fig. 1: the assessment result (144) this badge (142) was earned with. */
    public function assessmentResult()
    {
        return $this->belongsTo(AssessmentAttempt::class, 'assessment_attempt_id');
    }

    public function evidence()
    {
        return $this->belongsTo(Credential::class, 'evidence_credential_id');
    }
}
