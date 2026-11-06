<?php

namespace App\Notifications;

use App\Models\Application;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Patent Fig. 7, steps 740-760: the applicant is told at every status change,
 * in the app and by email.
 */
class ApplicationStatusChanged extends Notification
{
    public const MESSAGES = [
        'applied' => 'Your application for :job at :company was sent.',
        'invited' => ':company invited you to apply for :job.',
        'shortlisted' => 'You were shortlisted for :job at :company.',
        'interviewing' => ':company moved you to the interview stage for :job.',
        'hired' => 'Congratulations! :company hired you as :job.',
        'not_selected' => ':company decided not to move forward with your application for :job.',
    ];

    public function __construct(private Application $application) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    private function text(): string
    {
        $job = $this->application->jobPost;

        return strtr(self::MESSAGES[$this->application->status], [
            ':job' => $job->title,
            ':company' => $job->employerProfile->company_name ?? 'The employer',
        ]);
    }

    public function toArray(object $notifiable): array
    {
        return [
            'status' => $this->application->status,
            'jobId' => $this->application->job_post_id,
            'text' => $this->text(),
            'url' => '/dashboard?tab=matches',
        ];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Application update: '.$this->application->jobPost->title)
            ->greeting('Hello '.($notifiable->first_name ?: $notifiable->name).',')
            ->line($this->text())
            ->action('View your applications', url('/dashboard?tab=matches'))
            ->line('You get this email because your application status changed on SkillBridge PH.');
    }
}
