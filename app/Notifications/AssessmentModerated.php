<?php

namespace App\Notifications;

use App\Models\CompanyAssessment;
use Illuminate\Notifications\Notification;

/** Patent Fig. 2, 232: the company is told when SkillBridge PH suspends or reinstates its assessment. */
class AssessmentModerated extends Notification
{
    public function __construct(private CompanyAssessment $assessment) {}

    public function via(object $notifiable): array
    {
        return ['database'];
    }

    public function toArray(object $notifiable): array
    {
        $suspended = $this->assessment->status === 'Suspended';

        return [
            'assessmentId' => $this->assessment->id,
            'text' => $suspended
                ? 'SkillBridge PH suspended your assessment "'.$this->assessment->title.'": '.$this->assessment->moderation_note
                : 'SkillBridge PH reinstated your assessment "'.$this->assessment->title.'". It issues badges again.',
            'url' => '/dashboard?tab=assessments',
        ];
    }
}
