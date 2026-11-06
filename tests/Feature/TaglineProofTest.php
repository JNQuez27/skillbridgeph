<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\Credential;
use App\Models\EmployerProfile;
use App\Models\User;
use App\Services\MatchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

/**
 * "Smart hiring starts with verified skills." — one story, end to end, through
 * the real HTTP routes, checking each part of the claim as it happens.
 */
class TaglineProofTest extends TestCase
{
    use RefreshDatabase;

    public function test_smart_hiring_starts_with_verified_skills(): void
    {
        Storage::fake('local');
        $admin = User::factory()->create(['role' => 'admin']);

        // 1. A company cannot hire, or verify anyone, until an admin has checked it.
        $hr = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(['user_id' => $hr->id, 'company_name' => 'Sunrise Cafe', 'industry' => 'Food & Beverage',
            'location_city' => 'Davao City', 'recruiter_name' => 'HR', 'recruiter_contact' => '09170000000']);
        $job = ['title' => 'Barista', 'locationCity' => 'Davao City', 'employmentType' => 'Full-time', 'workSetup' => 'On-site',
            'description' => 'x', 'responsibilities' => 'x', 'requiredSkills' => 'Barista', 'preferredSkills' => 'Customer Service', 'experienceLevel' => 'Entry'];
        // (Green needs EVERY required skill verified; with both required, one verified skill would only be Amber.)
        $this->actingAs($hr)->post('/job-posts', $job)->assertSessionHas('error');
        $this->actingAs($hr)->post('/employer-verification', ['registrationType' => 'DTI', 'registrationNumber' => '3456789',
            'permit' => UploadedFile::fake()->create('permit.pdf', 20, 'application/pdf')]);
        $this->actingAs($admin)->post('/admin/employers/'.$hr->employerProfile->id, ['decision' => 'approve']);
        $this->actingAs($hr)->post('/job-posts', $job)->assertSessionHas('success');
        $jobPost = $hr->employerProfile->jobPosts()->first();

        $this->actingAs($hr)->post('/assessments', [
            'title' => 'Barista basics', 'role' => 'Barista', 'skill' => 'Barista', 'durationMinutes' => 10, 'passingScore' => 75,
            'questions' => array_map(fn ($i) => ['prompt' => "Q{$i}", 'options' => ['a', 'b', 'c'], 'answer' => $i % 3], range(0, 3)),
        ]);
        $assessment = $hr->employerProfile->assessments()->first();

        // 2. Two applicants make the SAME claims. Typing a skill never makes it verified.
        $make = function (string $email) {
            $user = User::factory()->create(['role' => 'jobseeker', 'email' => $email]);
            ApplicantProfile::create(['user_id' => $user->id, 'location' => 'Davao City', 'experience_level' => 'Entry']);
            $this->actingAs($user)->put('/applicant-profile', ['skills' => ['Barista', 'Customer Service']]);

            return $user->fresh();
        };
        $proven = $make('proven@test.ph');
        $claimer = $make('claimer@test.ph');
        $this->assertSame(0, $proven->applicantProfile->skills()->where('verification_status', 'verified')->count());

        $score = fn (User $u) => app(MatchService::class)->score($jobPost, $u->applicantProfile->fresh()->load('skills'))['score'];
        $claimedScore = $score($proven);
        $this->assertSame($claimedScore, $score($claimer)); // identical claims, identical score

        // 3. One of them proves the skill by passing the company's timed, shuffled test.
        $this->actingAs($proven)->post("/assessments/{$assessment->id}/start");
        $answers = array_map(fn ($item) => array_search((int) $assessment->questions[$item['q']]['answer'], $item['o'], true),
            session("assessment_order.{$assessment->id}"));
        $this->actingAs($proven)->post("/assessments/{$assessment->id}/attempt", ['answers' => $answers])->assertSessionHas('success');

        // 4. The badge records who verified it, how, and when.
        $badge = $proven->applicantProfile->skills()->where('name', 'Barista')->first();
        $this->assertSame('verified', $badge->verification_status);
        $this->assertSame('assessment', $badge->verification_method);
        $this->assertSame('Sunrise Cafe', $badge->verified_by);
        $this->assertNotNull($badge->verified_at);

        // 5. Verified skills count for more: the proven applicant now outranks the claimer.
        $this->assertGreaterThan($score($claimer), $score($proven));

        // 6. Both apply. The employer's list starts with the verified candidate, labelled Green.
        foreach ([$proven, $claimer] as $user) {
            Credential::create(['applicant_profile_id' => $user->applicantProfile->id, 'type' => 'resume', 'original_name' => 'cv.pdf',
                'path' => 'x', 'mime' => 'application/pdf', 'size' => 1, 'sha256' => hash('sha256', $user->email)]);
            $this->actingAs($user)->post("/applications/{$jobPost->id}", ['status' => 'applied']);
        }
        $candidates = $this->actingAs($hr)->get('/dashboard')->viewData('page')['props']['account']['matches'][0]['candidates'];
        $this->assertSame('proven@test.ph', User::find(ApplicantProfile::find($candidates[0]['id'])->user_id)->email);
        $this->assertSame('green', $candidates[0]['review']['status']);
        $this->assertNotSame('green', $candidates[1]['review']['status']);

        // 7. Hiring by the system's review is allowed only for the verified candidate.
        $this->actingAs($hr)->post("/job-posts/{$jobPost->id}/hire/{$claimer->applicantProfile->id}", ['mode' => 'auto'])
            ->assertSessionHasErrors('hire');
        $this->actingAs($hr)->post("/job-posts/{$jobPost->id}/hire/{$proven->applicantProfile->id}", ['mode' => 'auto']);
        $this->assertDatabaseHas('applications', ['applicant_profile_id' => $proven->applicantProfile->id, 'status' => 'hired', 'review_verdict' => 'green']);
        $this->assertDatabaseHas('applications', ['applicant_profile_id' => $claimer->applicantProfile->id, 'status' => 'applied']);
    }
}
