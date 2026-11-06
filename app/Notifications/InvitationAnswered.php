<?php

namespace App\Notifications;

use App\Models\Application;
use Illuminate\Notifications\Notification;

/** Patent Fig. 19, 1914-1916: the employer hears whether an invitation was accepted or declined. */
class InvitationAnswered extends Notification
{
    public function __construct(private Application $application, private bool $accepted) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $name = $this->application->applicantProfile->user->name;
        $job = $this->application->jobPost->title;

        return [
            'jobId' => $this->application->job_post_id,
            'accepted' => $this->accepted,
            'text' => $this->accepted ? "{$name} accepted your invitation and applied for {$job}." : "{$name} declined your invitation for {$job}.",
            'url' => '/dashboard?tab=applicants',
        ];
    }
}
