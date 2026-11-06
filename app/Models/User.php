<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'role',
        'first_name',
        'middle_name',
        'surname',
        'email',
        'password',
        'privacy_accepted_at',
    ];

    public function applicantProfile()
    {
        return $this->hasOne(ApplicantProfile::class);
    }

    /** The applicant profile, created on first access. */
    public function applicantProfileOrCreate(): ApplicantProfile
    {
        return $this->applicantProfile()->firstOrCreate(
            [],
            ['location' => 'Philippines', 'experience_level' => 'Entry']
        );
    }

    public function employerProfile()
    {
        return $this->hasOne(EmployerProfile::class);
    }

    public function isEmployer(): bool
    {
        return $this->role === 'employer';
    }

    /** SkillBridge staff who check companies and certificates. Never self-assigned at signup. */
    public function isAdmin(): bool
    {
        return $this->role === 'admin';
    }

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'privacy_accepted_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
}
