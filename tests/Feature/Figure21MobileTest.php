<?php

namespace Tests\Feature;

use App\Models\ApplicantProfile;
use App\Models\ApplicantSkill;
use App\Models\EmployerProfile;
use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Patent Fig. 21: on a phone, a job feed sorted by match (2102), a badge wallet
 * (2104), and a badge detail page with a shareable verification link (2106).
 */
class Figure21MobileTest extends TestCase
{
    use RefreshDatabase;

    private User $seeker;

    private ApplicantSkill $badge;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seeker = User::factory()->create(['role' => 'jobseeker', 'name' => 'Cleo Ramos']);
        $profile = ApplicantProfile::create(['user_id' => $this->seeker->id, 'location' => 'Davao City', 'experience_level' => 'Entry']);
        $this->badge = $profile->skills()->create(['name' => 'React', 'level' => 88, 'verification_status' => 'verified',
            'verification_method' => 'assessment', 'verified_by' => 'NovaByte', 'verified_at' => now()]);
    }

    private function share(bool $on, ?User $as = null)
    {
        return $this->actingAs($as ?? $this->seeker)->post("/badges/{$this->badge->id}/share", ['public' => $on]);
    }

    public function test_2106_a_badge_link_shows_nothing_until_its_holder_turns_it_on(): void
    {
        $id = $this->badge->verification_id;
        $this->get("/verify/{$id}")->assertOk()->assertInertia(fn (AssertableInertia $p) => $p->component('VerifyBadge')->where('badge', null));

        $this->share(true)->assertSessionHas('success');
        $this->get('/verify/'.strtolower($id))->assertInertia(fn (AssertableInertia $p) => $p
            ->where('badge.holder', 'Cleo Ramos')->where('badge.skill', 'React')->where('badge.verifiedBy', 'NovaByte')->where('badge.level', 88));

        $this->share(false);
        $this->get("/verify/{$id}")->assertInertia(fn (AssertableInertia $p) => $p->where('badge', null));
    }

    public function test_2106_an_unknown_id_and_a_private_badge_look_the_same(): void
    {
        $this->get('/verify/SB-NOPE-NOPE')->assertInertia(fn (AssertableInertia $p) => $p->where('badge', null));
        $this->get("/verify/{$this->badge->verification_id}")->assertInertia(fn (AssertableInertia $p) => $p->where('badge', null));
    }

    public function test_2106_a_shared_badge_that_is_no_longer_verified_stops_showing(): void
    {
        $this->share(true);
        $this->badge->update(['verification_status' => 'unverified']);
        $this->get("/verify/{$this->badge->verification_id}")->assertInertia(fn (AssertableInertia $p) => $p->where('badge', null));
    }

    public function test_only_the_holder_shares_and_only_verified_badges(): void
    {
        $other = User::factory()->create(['role' => 'jobseeker']);
        ApplicantProfile::create(['user_id' => $other->id]);
        $this->share(true, $other)->assertForbidden();
        $hr = User::factory()->create(['role' => 'employer']);
        EmployerProfile::create(['user_id' => $hr->id, 'company_name' => 'X']);
        $this->share(true, $hr)->assertForbidden();
        $this->assertNull($this->badge->fresh()->public_at);

        $claim = $this->badge->applicantProfile->skills()->create(['name' => 'CSS', 'level' => 0, 'verification_status' => 'pending']);
        $this->actingAs($this->seeker)->post("/badges/{$claim->id}/share", ['public' => true])->assertSessionHas('error');
        $this->assertNull($claim->fresh()->public_at);
    }

    public function test_2104_the_wallet_payload_carries_the_share_link_only_when_on(): void
    {
        $skill = fn () => collect($this->actingAs($this->seeker)->get('/dashboard')->viewData('page')['props']['account']['skills'])->firstWhere('name', 'React');
        $this->assertNull($skill()['shareUrl']);
        $this->share(true);
        $this->assertStringEndsWith('/verify/'.$this->badge->verification_id, $skill()['shareUrl']);
    }

    public function test_2106_the_verify_page_is_throttled(): void
    {
        foreach (range(1, 30) as $i) {
            $this->get('/verify/SB-AAAA-'.str_pad((string) $i, 4, '0', STR_PAD_LEFT))->assertOk();
        }
        $this->get('/verify/SB-AAAA-9999')->assertStatus(429);
    }
}
