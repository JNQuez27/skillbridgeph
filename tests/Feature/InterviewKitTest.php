<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\CompanyAssessment;
use App\Models\EmployerProfile;
use App\Models\JobPost;
use App\Models\User;
use App\Support\InterviewKit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/** Structured interviews: same questions per role, scored 1-5, and nothing unlawful asked. */
class InterviewKitTest extends TestCase
{
    use RefreshDatabase;

    private function employer(string $industry = 'Food & Beverage'): User
    {
        $user = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(['user_id' => $user->id, 'company_name' => 'Acme', 'industry' => $industry, 'email_verified' => true, 'verification_status' => 'approved']);

        return $user->fresh();
    }

    private function job(User $employer, string $title = 'Barista', array $skills = ['Barista']): JobPost
    {
        return $employer->employerProfile->jobPosts()->create(['title' => $title, 'status' => 'Open', 'required_skills' => $skills]);
    }

    private function applicant(): ApplicantProfile
    {
        $user = User::factory()->create(['role' => 'jobseeker']);

        return ApplicantProfile::create(['user_id' => $user->id, 'location' => 'Davao City']);
    }

    private function fullRatings(JobPost $job, int $score = 4): array
    {
        return array_fill(0, count(InterviewKit::forJob($job)), ['score' => $score, 'note' => 'ok']);
    }

    public function test_each_role_gets_its_own_questions(): void
    {
        $cafe = $this->job($this->employer('Food & Beverage'));
        $clinic = $this->job($this->employer('Healthcare'), 'Clinic Front Desk Receptionist', ['Front Desk']);
        $dev = $this->job($this->employer('IT Services & Web Development'), 'Junior Frontend Developer', ['React']);
        $other = $this->job($this->employer('Logistics'), 'Warehouse Associate', ['Forklift']);
        $bpo = $this->job($this->employer('BPO'), 'Customer Service Representative', ['English Communication', 'Customer Service']);
        $retail = $this->job($this->employer('Retail'), 'Sales Associate', ['Cash Handling', 'Customer Service']);

        $this->assertSame('food_service', InterviewKit::roleFor($cafe));
        $this->assertSame('clinic_front_desk', InterviewKit::roleFor($clinic));
        $this->assertSame('web_developer', InterviewKit::roleFor($dev));
        $this->assertSame('general', InterviewKit::roleFor($other));
        $this->assertSame('bpo', InterviewKit::roleFor($bpo));
        $this->assertSame('retail', InterviewKit::roleFor($retail));
        $this->assertStringContainsString('angry', InterviewKit::forJob($bpo)[5]['question']);
        $this->assertStringContainsString('return policy', InterviewKit::forJob($retail)[5]['question']);

        foreach ([$cafe, $clinic, $dev, $other, $bpo, $retail] as $job) {
            $kit = InterviewKit::forJob($job);
            $this->assertCount(8, $kit);
            foreach ($kit as $q) {
                // Every question can be scored the same way and traced to a source.
                $this->assertSame([1, 3, 5], array_keys($q['anchors']));
                $this->assertNotEmpty($q['source']);
            }
        }
    }

    public function test_no_kit_asks_about_protected_personal_matters(): void
    {
        $jobs = [
            $this->job($this->employer('Food & Beverage')),
            $this->job($this->employer('Healthcare'), 'Receptionist', ['Front Desk']),
            $this->job($this->employer('IT'), 'Web Developer', ['React']),
            $this->job($this->employer('Logistics'), 'Driver', ['Driving']),
            $this->job($this->employer('BPO'), 'Call Center Agent', ['Customer Support']),
            $this->job($this->employer('Retail'), 'Cashier', ['Cash Handling']),
        ];
        $forbidden = '/\b(how old|your age|birth|religio|pregnan|married|marital|children|vote|ethnic|dialect|sexual|disabilit)/i';
        foreach ($jobs as $job) {
            foreach (InterviewKit::forJob($job) as $q) {
                $this->assertDoesNotMatchRegularExpression($forbidden, $q['question']);
            }
        }
    }

    public function test_recording_an_interview_scores_snapshots_and_moves_the_stage(): void
    {
        $employer = $this->employer();
        $job = $this->job($employer);
        $profile = $this->applicant();
        $url = "/job-posts/{$job->id}/interview/{$profile->id}";

        // Not engaged with this role yet: nothing to interview.
        $this->actingAs($employer)->post($url, ['ratings' => $this->fullRatings($job)])->assertForbidden();

        Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $profile->id, 'status' => 'shortlisted']);

        // Every question must be scored, each from 1 to 5.
        $this->actingAs($employer)->post($url, ['ratings' => array_slice($this->fullRatings($job), 1)])->assertSessionHasErrors('ratings');
        $bad = $this->fullRatings($job);
        $bad[0]['score'] = 7;
        $this->actingAs($employer)->post($url, ['ratings' => $bad])->assertSessionHasErrors('ratings.0.score');

        $ratings = $this->fullRatings($job, 4);
        $ratings[0]['score'] = 2;
        $this->actingAs($employer)->post($url, ['ratings' => $ratings])->assertSessionHas('success');

        $app = Application::first();
        $this->assertSame('interviewing', $app->status);
        $this->assertEqualsWithDelta((2 + 4 * 7) / 8, $app->interview_score, 0.01);
        $this->assertSame($employer->id, $app->interviewed_by);
        $this->assertSame(InterviewKit::forJob($job)[0]['question'], $app->interview_ratings[0]['question']);
        $this->assertSame(2, $app->interview_ratings[0]['score']);
    }

    public function test_hired_stays_hired_and_other_companies_cannot_score(): void
    {
        $employer = $this->employer();
        $job = $this->job($employer);
        $profile = $this->applicant();
        Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $profile->id, 'status' => 'hired']);
        $url = "/job-posts/{$job->id}/interview/{$profile->id}";

        $this->actingAs($this->employer())->post($url, ['ratings' => $this->fullRatings($job)])->assertForbidden();

        $this->actingAs($employer)->post($url, ['ratings' => $this->fullRatings($job, 5)]);
        $this->assertSame('hired', Application::first()->status);
        $this->assertEquals(5, Application::first()->interview_score);
    }

    public function test_employer_dashboard_carries_the_kit_and_the_recorded_interview(): void
    {
        $employer = $this->employer();
        $job = $this->job($employer);
        $profile = $this->applicant();
        Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $profile->id, 'status' => 'applied']);
        $this->actingAs($employer)->post("/job-posts/{$job->id}/interview/{$profile->id}", ['ratings' => $this->fullRatings($job, 3)]);

        $account = $this->actingAs($employer)->get('/dashboard')->viewData('page')['props']['account'];
        $this->assertCount(8, $account['jobPosts'][0]['interviewKit']);
        $this->assertEquals(3, $account['applicants'][0]['interview']['score']);
        $this->assertNotEmpty($account['doNotAsk']);
    }

    public function test_seeded_assessments_are_well_formed(): void
    {
        Storage::fake('local');
        $this->seed();

        $assessments = CompanyAssessment::all();
        $this->assertCount(5, $assessments);
        foreach ($assessments as $a) {
            $this->assertSame(count($a->questions), $a->question_count);
            $answers = [];
            foreach ($a->questions as $q) {
                $this->assertGreaterThanOrEqual(2, count($q['options']));
                $this->assertArrayHasKey($q['answer'], $q['options']);
                $answers[] = $q['answer'];
            }
            // The key is not simply "always the first option".
            $this->assertGreaterThan(1, count(array_unique($answers)), $a->title);
        }
    }
}
