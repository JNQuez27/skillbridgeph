<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\Credential;
use App\Models\EmployerProfile;
use App\Models\JobPost;
use App\Models\User;
use App\Services\MatchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * Patent Fig. 20 (2000): applicants add work samples (2006) and link them to
 * skills (2022), so the portfolio also counts as evidence in the match score (2026).
 */
class Figure20PortfolioTest extends TestCase
{
    use RefreshDatabase;

    private User $seeker;

    private ApplicantProfile $profile;

    private JobPost $job;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        $hr = User::factory()->create(['role' => 'employer']);
        $company = EmployerProfile::create(['user_id' => $hr->id, 'company_name' => 'NovaByte', 'email_verified' => true, 'verification_status' => 'approved']);
        $this->job = $company->jobPosts()->create(['title' => 'Dev', 'status' => 'Open', 'required_skills' => ['React']]);

        $this->seeker = User::factory()->create(['role' => 'jobseeker']);
        $this->profile = ApplicantProfile::create(['user_id' => $this->seeker->id]);
        $this->profile->skills()->create(['name' => 'React', 'level' => 0, 'verification_status' => 'pending']);
        $this->profile->skills()->create(['name' => 'Go', 'level' => 0, 'verification_status' => 'unverified']);
    }

    private function upload(array $linked, string $content = 'my work')
    {
        return $this->actingAs($this->seeker)->post('/credentials', [
            'type' => 'portfolio', 'title' => 'Shop site',
            'file' => UploadedFile::fake()->createWithContent('site.pdf', $content),
            'linkedSkills' => $linked,
        ]);
    }

    private function score(): array
    {
        return app(MatchService::class)->score($this->job, $this->profile->fresh()->load('skills'));
    }

    public function test_2006_to_2022_a_work_sample_links_only_to_skills_the_applicant_holds(): void
    {
        $this->upload(['react', 'Go', 'Cobol'])->assertSessionHasNoErrors();

        // Spelled as held; not the unverified skill, not one they never claimed.
        $this->assertSame(['React'], Credential::first()->linked_skills);
    }

    public function test_2026_a_linked_work_sample_raises_a_claim_but_never_above_a_verified_skill(): void
    {
        $bare = $this->score();
        $this->assertSame(36, $bare['score']);                       // 0.6 x 60

        $this->upload(['React']);
        $sample = $this->score();
        $this->assertSame(48, $sample['score']);                     // 0.8 x 60
        $this->assertSame('evidenced', $sample['skillStates'][0]['state']);
        $this->assertSame(1, $sample['units']['verification']['evidenced']);

        $this->profile->skills()->where('name', 'React')->update(['verification_status' => 'verified', 'level' => 80]);
        $this->assertSame(60, $this->score()['score']);             // verified always counts most (855)
    }

    public function test_2026_a_file_another_account_also_uploaded_does_not_count(): void
    {
        $other = ApplicantProfile::create(['user_id' => User::factory()->create(['role' => 'jobseeker'])->id]);
        $this->upload(['React'], 'copied work');
        $other->credentials()->create(['type' => 'portfolio', 'title' => 'Same', 'original_name' => 'x.pdf', 'path' => 'x', 'mime' => 'application/pdf',
            'size' => 11, 'sha256' => Credential::first()->sha256]);

        $this->assertSame(36, $this->score()['score']);
        $skill = collect($this->actingAs($this->seeker)->get('/dashboard')->viewData('page')['props']['account']['skills'])->firstWhere('name', 'React');
        $this->assertSame([['Shop site'], false], [$skill['workSamples'], $skill['evidenced']]);
    }

    public function test_2022_links_can_be_changed_by_the_owner_only_and_matches_follow(): void
    {
        $this->upload([]);
        $c = Credential::first();
        $this->assertSame(36, $this->score()['score']);

        $this->actingAs($this->seeker)->post("/credentials/{$c->id}/skills", ['linkedSkills' => ['React']])->assertSessionHas('success');
        $this->assertSame(48, $this->score()['score']);
        $this->actingAs($this->seeker)->post("/credentials/{$c->id}/skills", ['linkedSkills' => []]);
        $this->assertSame(36, $this->score()['score']);

        $stranger = User::factory()->create(['role' => 'jobseeker']);
        ApplicantProfile::create(['user_id' => $stranger->id]);
        $this->actingAs($stranger)->post("/credentials/{$c->id}/skills", ['linkedSkills' => ['React']])->assertForbidden();

        $cv = $this->profile->credentials()->create(['type' => 'resume', 'title' => 'CV', 'original_name' => 'cv.pdf', 'path' => 'cv', 'mime' => 'application/pdf', 'size' => 1]);
        $this->actingAs($this->seeker)->post("/credentials/{$cv->id}/skills", ['linkedSkills' => ['React']])->assertForbidden();   // work samples only
    }

    public function test_the_employer_skill_gap_still_counts_a_work_sample_claim_as_not_verified(): void
    {
        $this->upload(['React']);
        \App\Models\Application::create(['job_post_id' => $this->job->id, 'applicant_profile_id' => $this->profile->id, 'status' => 'applied']);
        $hr = $this->job->employerProfile->user;

        $gap = $this->actingAs($hr)->get('/dashboard')->viewData('page')['props']['account']['analytics']['roles'][0]['skillGap'][0];
        $this->assertSame(['skill' => 'React', 'candidates' => 1, 'missing' => 0, 'claimed' => 1, 'below' => 0], $gap);
    }
}
