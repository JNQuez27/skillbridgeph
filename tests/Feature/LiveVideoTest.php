<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\Credential;
use App\Models\EmployerProfile;
use App\Models\JobPost;
use App\Models\User;
use App\Services\CandidateReview;
use App\Support\InterviewKit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * A hands-on video could be AI-generated, edited, or performed by someone else.
 * It must be recorded live against prompts nobody knew in advance, and it only
 * earns a badge after a live interview confirms the same person can do the task.
 */
class LiveVideoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
    }

    private function applicant(): User
    {
        $user = User::factory()->create(['role' => 'jobseeker']);
        ApplicantProfile::create(['user_id' => $user->id, 'location' => 'Davao City']);

        return $user->fresh();
    }

    private function upload(User $user, ?string $recordingId)
    {
        return $this->actingAs($user)->post('/credentials', [
            'type' => 'video', 'recordingId' => $recordingId,
            'file' => UploadedFile::fake()->create('demo.webm', 200, 'video/webm'),
        ]);
    }

    public function test_prompts_are_revealed_only_when_their_moment_comes(): void
    {
        $user = $this->applicant();
        $start = $this->actingAs($user)->postJson('/credentials/recording')->assertOk();

        // At the start only the first code is known; later prompts are not sent at all.
        $this->assertCount(1, $start->json('prompts'));
        $now = $this->actingAs($user)->getJson('/credentials/recording/prompts')->json();
        $this->assertCount(1, $now['prompts']);
        $this->assertSame(2, $now['remaining']);
        $this->assertFalse($now['canStop']);

        $this->travel(90)->seconds();
        $later = $this->actingAs($user)->getJson('/credentials/recording/prompts')->json();
        $this->assertCount(3, $later['prompts']);
        $this->assertSame(['code', 'action', 'code'], array_column($later['prompts'], 'kind'));
        $this->assertTrue($later['canStop']);

        // Fresh prompts every time: two recordings never share codes.
        $again = $this->actingAs($user)->postJson('/credentials/recording')->json('prompts.0.text');
        $this->assertNotSame($start->json('prompts.0.text'), $again);
    }

    public function test_upload_must_follow_a_live_recording_in_time(): void
    {
        $user = $this->applicant();

        $this->upload($user, 'made-up-id')->assertSessionHasErrors('file');

        $id = $this->actingAs($user)->postJson('/credentials/recording')->json('recordingId');
        $this->travel(20)->seconds();
        $this->upload($user, $id)->assertSessionHasErrors('file'); // stopped before every prompt was shown

        $this->travel(16)->minutes();
        $this->upload($user, $id)->assertSessionHasErrors('file'); // window expired

        $id = $this->actingAs($user)->postJson('/credentials/recording')->json('recordingId');
        $this->travel(90)->seconds();
        $this->upload($user, $id)->assertSessionHasNoErrors();

        $video = Credential::first();
        $this->assertCount(3, $video->recording_prompts);
        $this->assertNotNull($video->recording_started_at);

        // One recording, one upload.
        $this->upload($user, $id)->assertSessionHasErrors('file');
    }

    public function test_a_video_earns_a_badge_only_after_a_live_interview_check(): void
    {
        $hrUser = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(['user_id' => $hrUser->id, 'company_name' => 'Sunrise Cafe', 'industry' => 'Food & Beverage', 'email_verified' => true, 'verification_status' => 'approved']);
        $job = $hrUser->employerProfile->jobPosts()->create(['title' => 'Barista', 'status' => 'Open', 'required_skills' => ['Latte Art']]);

        $user = $this->applicant();
        $id = $this->actingAs($user)->postJson('/credentials/recording')->json('recordingId');
        $this->travel(90)->seconds();
        $this->upload($user, $id);
        $video = Credential::first();
        $profile = $user->applicantProfile;
        Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $profile->id, 'status' => 'applied']);

        $verify = fn () => $this->actingAs($hrUser)->post("/job-posts/{$job->id}/verify-skill/{$profile->id}", ['skill' => 'Latte Art', 'credentialId' => $video->id]);
        $interview = fn (array $check) => $this->actingAs($hrUser)->post("/job-posts/{$job->id}/interview/{$profile->id}",
            ['ratings' => array_fill(0, count(InterviewKit::forJob($job)), ['score' => 4])] + $check);

        // Watching the video is not enough.
        $verify()->assertSessionHas('error');
        $this->assertFalse($profile->skills()->where('verification_status', 'verified')->exists());

        // Same person, but the task was not repeated live: still not enough.
        $interview(['videoMatch' => 'match', 'liveTask' => false]);
        $verify()->assertSessionHas('error');

        $interview(['videoMatch' => 'match', 'liveTask' => true]);
        $verify()->assertSessionHas('success');
        $badge = $profile->skills()->where('name', 'Latte Art')->first();
        $this->assertSame('verified', $badge->verification_status);
        $this->assertSame($video->id, $badge->evidence_credential_id);
    }

    public function test_a_different_person_in_the_video_turns_the_candidate_red(): void
    {
        $hrUser = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(['user_id' => $hrUser->id, 'company_name' => 'Sunrise Cafe', 'industry' => 'Food & Beverage', 'email_verified' => true, 'verification_status' => 'approved']);
        $job = $hrUser->employerProfile->jobPosts()->create(['title' => 'Barista', 'status' => 'Open', 'required_skills' => ['Barista']]);
        $user = $this->applicant();
        $profile = $user->applicantProfile;
        $profile->skills()->create(['name' => 'Barista', 'level' => 80, 'verification_status' => 'verified']);
        Application::create(['job_post_id' => $job->id, 'applicant_profile_id' => $profile->id, 'status' => 'applied']);

        $this->actingAs($hrUser)->post("/job-posts/{$job->id}/interview/{$profile->id}",
            ['ratings' => array_fill(0, count(InterviewKit::forJob($job)), ['score' => 5]), 'videoMatch' => 'mismatch', 'liveTask' => false]);

        $review = app(CandidateReview::class)->for($job, $profile->fresh());
        $this->assertSame('red', $review['status']);
        $this->assertStringContainsString('different person', collect($review['reasons'])->pluck('text')->implode(' '));
    }

    public function test_a_video_not_recorded_live_needs_a_look(): void
    {
        $job = JobPost::forceCreate(['employer_profile_id' => EmployerProfile::create(['user_id' => User::factory()->create(['role' => 'employer'])->id, 'company_name' => 'X'])->id,
            'title' => 'Barista', 'status' => 'Open', 'required_skills' => ['Barista']]);
        $profile = $this->applicant()->applicantProfile;
        $profile->skills()->create(['name' => 'Barista', 'level' => 80, 'verification_status' => 'verified']);
        Credential::create(['applicant_profile_id' => $profile->id, 'type' => 'video', 'original_name' => 'old.mp4', 'path' => 'x',
            'mime' => 'video/mp4', 'size' => 1, 'sha256' => str_repeat('e', 64)]);

        $review = app(CandidateReview::class)->for($job, $profile->fresh());
        $this->assertSame('amber', $review['status']);
        $this->assertStringContainsString('live prompts', collect($review['reasons'])->pluck('text')->implode(' '));
    }
}
