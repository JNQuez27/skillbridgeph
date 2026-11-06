<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\EmployerProfile;
use App\Models\JobPost;
use App\Models\User;
use App\Notifications\InvitationAnswered;
use App\Services\MatchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Tests\TestCase;

/**
 * Patent Fig. 19 (1900): the applicant's applications screen. A status tracker
 * (1908) shows where each application stands; employer invitations appear with
 * Accept (1914) and Decline (1916).
 */
class Figure19ApplicationsTest extends TestCase
{
    use RefreshDatabase;

    private User $hr;

    private User $seeker;

    private ApplicantProfile $profile;

    private JobPost $job;

    protected function setUp(): void
    {
        parent::setUp();
        $this->hr = User::factory()->create(['role' => 'employer']);
        $company = EmployerProfile::create(['user_id' => $this->hr->id, 'company_name' => 'NovaByte', 'email_verified' => true, 'verification_status' => 'approved']);
        $this->job = $company->jobPosts()->create(['title' => 'Frontend Dev', 'status' => 'Open', 'location_city' => 'Davao City', 'experience_level' => 'Entry', 'required_skills' => ['React']]);
        $this->seeker = User::factory()->create(['role' => 'jobseeker']);
        $this->profile = ApplicantProfile::create(['user_id' => $this->seeker->id, 'location' => 'Davao City', 'experience_level' => 'Entry']);
        $this->profile->skills()->create(['name' => 'React', 'level' => 90, 'verification_status' => 'verified']);
    }

    private function invite()
    {
        return $this->actingAs($this->hr)->post("/job-posts/{$this->job->id}/invite/{$this->profile->id}");
    }

    private function answer(string $answer)
    {
        return $this->actingAs($this->seeker)->post("/applications/{$this->job->id}/answer", ['answer' => $answer]);
    }

    private function account(User $user): array
    {
        return $this->actingAs($user)->get('/dashboard')->viewData('page')['props']['account'];
    }

    public function test_1914_accepting_an_invitation_applies_and_tells_the_employer(): void
    {
        Notification::fake();
        $this->invite();
        $this->assertSame('invited', $this->account($this->seeker)['applications'][0]['status']);

        $this->answer('accept')->assertSessionHas('success', fn ($m) => str_contains($m, 'Invitation accepted'));
        $this->assertSame('applied', Application::first()->status);
        Notification::assertSentTo($this->hr, InvitationAnswered::class, fn ($n) => $n->toArray($this->hr)['accepted'] === true);
    }

    public function test_1916_declining_hides_documents_tells_the_employer_and_blocks_repeat_invites(): void
    {
        Notification::fake();
        $this->profile->credentials()->create(['type' => 'portfolio', 'title' => 'Site', 'original_name' => 'x.pdf', 'path' => 'x.pdf', 'mime' => 'application/pdf', 'size' => 10]);
        $this->invite();
        $this->answer('decline')->assertSessionHas('success');
        $this->assertSame('declined', Application::first()->status);
        Notification::assertSentTo($this->hr, InvitationAnswered::class, fn ($n) => $n->toArray($this->hr)['text'] === "{$this->seeker->name} declined your invitation for Frontend Dev.");

        // Employer sees the decline, without documents, and cannot ask again.
        $card = collect($this->account($this->hr)['applicants'])->firstWhere('id', $this->profile->id);
        $this->assertSame(['declined', false, []], [$card['status'], $card['canReadCredentials'], $card['credentials']]);
        $this->invite()->assertSessionHas('error', fn ($m) => str_contains($m, 'declined'));
        $this->assertSame('declined', Application::first()->status);
        $this->assertNotContains($this->profile->id, app(MatchService::class)->topTen($this->job)->pluck('applicant.id'));
        $this->actingAs($this->hr)->post("/job-posts/{$this->job->id}/invite-top");
        $this->assertSame('declined', Application::first()->status);
    }

    public function test_the_applicant_can_still_apply_after_declining(): void
    {
        $this->invite();
        $this->answer('decline');
        $this->actingAs($this->seeker)->post("/applications/{$this->job->id}", ['status' => 'applied'])->assertSessionHas('success');
        $this->assertSame('applied', Application::first()->status);
    }

    public function test_only_an_open_invitation_can_be_answered(): void
    {
        $this->answer('accept')->assertSessionHas('error');                       // never invited
        // Someone who applied on their own has no invitation to decline; their application stays.
        $this->actingAs($this->seeker)->post("/applications/{$this->job->id}", ['status' => 'saved']);
        $this->answer('decline')->assertSessionHas('error');
        $this->assertSame('saved', Application::first()->status);
        $this->invite();
        $this->answer('maybe')->assertSessionHasErrors('answer');
        $this->job->update(['status' => 'Closed']);
        $this->answer('accept')->assertSessionHas('error', 'This job is no longer open.');
        $this->answer('decline')->assertSessionHas('success');                   // declining a closed job is fine
        $this->answer('accept')->assertSessionHas('error');                       // already answered
        $this->actingAs($this->hr)->post("/applications/{$this->job->id}/answer", ['answer' => 'accept'])->assertForbidden();
    }

    public function test_1908_the_tracker_lists_every_application_with_its_stage_including_closed_jobs(): void
    {
        $this->actingAs($this->seeker)->post("/applications/{$this->job->id}", ['status' => 'applied']);
        $this->actingAs($this->hr)->post("/job-posts/{$this->job->id}/stage/{$this->profile->id}", ['status' => 'shortlisted']);
        $this->job->update(['status' => 'Closed']);

        $apps = $this->account($this->seeker)['applications'];
        $this->assertCount(1, $apps);
        $this->assertSame(['shortlisted', false, 'NovaByte'], [$apps[0]['status'], $apps[0]['jobOpen'], $apps[0]['company']]);

        // Saved jobs are private bookmarks, not applications.
        $other = $this->job->employerProfile->jobPosts()->create(['title' => 'Other', 'status' => 'Open', 'required_skills' => ['React']]);
        $this->actingAs($this->seeker)->post("/applications/{$other->id}", ['status' => 'saved']);
        $this->assertCount(1, $this->account($this->seeker)['applications']);
    }
}
