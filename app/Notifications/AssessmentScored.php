<?php

namespace App\Notifications;

use App\Models\CompanyAssessment;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/** Fig. 4, steps 425-460: the applicant hears the rubric result, in the app and by email. */
class AssessmentScored extends Notification
{
    public function __construct(private CompanyAssessment $assessment, private bool $passed, private string $result, private ?string $feedback) {}

    public function via(object $notifiable): array
    {
        return ['database', 'mail'];
    }

    private function text(): string
    {
        return ($this->assessment->employerProfile->company_name ?? 'The company').' scored your "'.$this->assessment->title.'" task. '.$this->result;
    }

    public function toArray(object $notifiable): array
    {
        return ['passed' => $this->passed, 'assessmentId' => $this->assessment->id, 'text' => $this->text(), 'url' => '/dashboard?tab=assessments'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $mail = (new MailMessage)
            ->subject('Assessment result: '.$this->assessment->title)
            ->line($this->text());
        if ($this->feedback) {
            $mail->line('Feedback: '.$this->feedback);
        }

        return $mail->action('View your assessments', url('/dashboard?tab=assessments'));
    }
}
