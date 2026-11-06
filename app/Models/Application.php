<?php

namespace App\Models;

use App\Notifications\ApplicationStatusChanged;
use Illuminate\Database\Eloquent\Model;

class Application extends Model
{
    /**
     * A candidate and an employer are "engaged" once the applicant applied or the
     * employer invited them. Only engaged employers may read that candidate's
     * documents, move them through the pipeline, or verify their skills.
     * ('flagged' and 'saved' are private to the applicant.) 'not_selected' stays
     * engaged so the record and its documents remain reviewable.
     */
    public const ENGAGED = ['applied', 'invited', 'shortlisted', 'interviewing', 'hired', 'not_selected'];

    /**
     * Patent Fig. 7, steps 740-760: every status change the applicant should know
     * about notifies them, in the app and by email. Hooked on the model, so no
     * code path that moves an application can skip it.
     */
    protected static function booted(): void
    {
        static::saved(function (Application $application) {
            $changed = $application->wasRecentlyCreated || $application->wasChanged('status');
            if ($changed && array_key_exists($application->status, ApplicationStatusChanged::MESSAGES)) {
                $application->loadMissing('jobPost.employerProfile', 'applicantProfile.user');
                $application->applicantProfile->user?->notify(new ApplicationStatusChanged($application));
            }
        });
    }

    protected $fillable = [
        'job_post_id',
        'applicant_profile_id',
        'status',
        'match_score',
        'reviewed_at',
        'reviewed_by',
        'review_mode',
        'review_verdict',
        'reviewed_credentials',
        'interview_ratings',
        'interview_score',
        'interviewed_by',
        'interviewed_at',
        'video_identity',
        'live_task_done',
    ];

    protected $casts = [
        'match_score' => 'integer',
        'reviewed_at' => 'datetime',
        'reviewed_credentials' => 'array',
        'interview_ratings' => 'array',
        'interview_score' => 'float',
        'interviewed_at' => 'datetime',
        'live_task_done' => 'boolean',
    ];

    public function interviewer()
    {
        return $this->belongsTo(User::class, 'interviewed_by');
    }

    public function jobPost()
    {
        return $this->belongsTo(JobPost::class);
    }

    public function applicantProfile()
    {
        return $this->belongsTo(ApplicantProfile::class);
    }
}
