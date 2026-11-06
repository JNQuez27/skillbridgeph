<?php

namespace App\Http\Controllers;

use App\Models\CompanyAssessment;
use App\Models\Credential;
use App\Models\EmployerProfile;
use App\Services\MatchService;
use Illuminate\Http\Request;
use Inertia\Inertia;

/**
 * SkillBridge staff check each company and each certificate once, against the
 * official registry, so no employer has to. Every decision records who made it,
 * when, and why, and every employer then sees that same result.
 */
class AdminController extends Controller
{
    private function authorizeAdmin(Request $request): void
    {
        abort_unless($request->user()?->isAdmin(), 403);
    }

    /** Official search page for each registry, pre-filled where the registry allows it. */
    private function lookupUrl(Credential $c): ?string
    {
        $user = $c->applicantProfile->user;
        $digits = preg_replace('/\D/', '', (string) $c->registry_number);

        return match ($c->registry) {
            // TESDA's public Registry of Certified Workers takes the holder's name and
            // the first and last four digits of the certificate number.
            'tesda' => 'https://t2mis.tesda.gov.ph/RWAC/IndexProc2?'.http_build_query([
                'searchLName' => $user->surname, 'searchFName' => $user->first_name,
                'firstFour' => substr($digits, 0, 4), 'lastFour' => substr($digits, -4),
            ]),
            // PRC's form is protected by reCAPTCHA, so it is opened, never automated.
            'prc' => 'https://verification.prc.gov.ph/',
            default => null,
        };
    }

    public function index(Request $request)
    {
        $this->authorizeAdmin($request);

        $employer = fn (EmployerProfile $e) => [
            'id' => $e->id,
            'companyName' => $e->company_name,
            'industry' => $e->industry,
            'location' => trim(($e->location_city ?? '').($e->location_region ? ', '.$e->location_region : '')),
            'recruiter' => $e->recruiter_name,
            'accountEmail' => $e->user->email,
            'registrationType' => $e->registration_type,
            'registrationNumber' => $e->registration_number,
            'permitUrl' => $e->business_permit_path ? route('employer.permit', $e->id) : null,
            // Both registries use a CAPTCHA, so an admin opens them by hand (checked 2026-11-05).
            'lookupUrl' => $e->registration_type === 'SEC' ? 'https://checkwithsec.sec.gov.ph/' : 'https://bnrs.dti.gov.ph/search/search_this',
            'status' => $e->verification_status,
            'note' => $e->verification_note,
            'precheck' => $e->precheck ?? [],
            'precheckAt' => $e->precheck_at?->ph()->toDayDateTimeString(),
            'reviewedBy' => $e->reviewer?->name,
            'reviewedAt' => $e->reviewed_at?->ph()->toDayDateTimeString(),
        ];

        $credential = fn (Credential $c) => [
            'id' => $c->id,
            'holder' => $c->applicantProfile->user->name,
            'firstName' => $c->applicantProfile->user->first_name,
            'surname' => $c->applicantProfile->user->surname,
            'registry' => $c->registry,
            'registryLabel' => Credential::REGISTRIES[$c->registry] ?? $c->registry,
            'number' => $c->registry_number,
            'qualification' => $c->registry_qualification,
            'fileUrl' => $c->url,
            'lookupUrl' => $this->lookupUrl($c),
            'status' => $c->registry_status,
            'note' => $c->registry_note,
            'checkedBy' => $c->checker?->name,
            'checkedAt' => $c->registry_checked_at?->ph()->toDayDateTimeString(),
        ];

        // Fig. 2, 232: every company's assessment, answer key included, for moderation.
        $assessments = CompanyAssessment::with(['employerProfile', 'moderator'])
            ->withCount(['attempts as scored_count' => fn ($q) => $q->where('status', 'scored'),
                'attempts as passed_count' => fn ($q) => $q->where('passed', true)])
            ->latest()->get()
            ->map(fn (CompanyAssessment $a) => [
                'id' => $a->id,
                'title' => $a->title,
                'company' => $a->employerProfile->company_name ?? 'Company',
                'skill' => $a->skill,
                'role' => $a->role,
                'status' => $a->status,
                'passingScore' => $a->passing_score,
                'durationMinutes' => $a->duration_minutes,
                'questions' => $a->questions ?? [],
                'taskPrompt' => $a->task_prompt,
                'rubric' => $a->rubric,
                'attempts' => $a->scored_count,
                'passed' => $a->passed_count,
                'flags' => $a->moderationFlags($a->scored_count, $a->passed_count),
                'note' => $a->moderation_note,
                'moderatedBy' => $a->moderator?->name,
                'moderatedAt' => $a->moderated_at?->ph()->toDayDateTimeString(),
            ])->values();

        $employers = EmployerProfile::with(['user', 'reviewer'])->where('verification_status', '!=', 'unsubmitted')->latest('updated_at')->get();
        $credentials = Credential::with(['applicantProfile.user', 'checker'])->whereNotNull('registry')->latest('updated_at')->get();

        // Rendered in the same page shell as the applicant and employer dashboards.
        return Inertia::render('SkillBridge/SkillBridgePage', [
            'account' => [
                'role' => 'admin',
                'employers' => [
                    'pending' => $employers->where('verification_status', 'pending')->map($employer)->values(),
                    'decided' => $employers->where('verification_status', '!=', 'pending')->take(20)->map($employer)->values(),
                ],
                'assessments' => $assessments,
                'credentials' => [
                    'pending' => $credentials->where('registry_status', 'pending')->map($credential)->values(),
                    'decided' => $credentials->where('registry_status', '!=', 'pending')->take(20)->map($credential)->values(),
                ],
            ],
        ]);
    }

    /**
     * Fig. 2, 232: suspend an assessment (it stops issuing badges and is hidden
     * from applicants) or reinstate it. A suspension needs a reason the company
     * sees. Badges already earned are kept: they were earned under the rules then.
     */
    public function moderateAssessment(Request $request, CompanyAssessment $assessment)
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'decision' => ['required', 'in:suspend,reinstate'],
            'note' => ['required_if:decision,suspend', 'nullable', 'string', 'max:500'],
        ]);
        $suspend = $data['decision'] === 'suspend';
        if ($assessment->status !== ($suspend ? 'Active' : 'Suspended')) {
            return back()->with('error', 'This assessment is already '.mb_strtolower($assessment->status).'.');
        }

        $assessment->update([
            'status' => $suspend ? 'Suspended' : 'Active',
            'moderation_note' => $data['note'] ?? null,
            'moderated_by' => $request->user()->id,
            'moderated_at' => now(),
        ]);
        $assessment->employerProfile?->user?->notify(new \App\Notifications\AssessmentModerated($assessment));

        return back()->with('success', '"'.$assessment->title.'" '.($suspend ? 'suspended. It no longer issues badges.' : 'reinstated.'));
    }

    public function decideEmployer(Request $request, EmployerProfile $employerProfile)
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'note' => ['required_if:decision,reject', 'nullable', 'string', 'max:500'],
        ]);
        abort_unless($employerProfile->verification_status === 'pending', 422, 'Only pending companies can be decided.');

        $approved = $data['decision'] === 'approve';
        $employerProfile->update([
            'verification_status' => $approved ? 'approved' : 'rejected',
            // The one place a company becomes trusted to post jobs and issue badges.
            'email_verified' => $approved,
            'verification_note' => $data['note'] ?? null,
            'reviewed_by' => $request->user()->id,
            'reviewed_at' => now(),
        ]);

        return back()->with('success', $employerProfile->company_name.($approved ? ' approved.' : ' rejected.'));
    }

    public function decideCredential(Request $request, Credential $credential, MatchService $matcher)
    {
        $this->authorizeAdmin($request);
        $data = $request->validate([
            'decision' => ['required', 'in:approve,reject'],
            'note' => ['required_if:decision,reject', 'nullable', 'string', 'max:500'],
        ]);
        abort_unless($credential->registry_status === 'pending', 422, 'Only pending certificates can be decided.');

        $approved = $data['decision'] === 'approve';
        $credential->update([
            'registry_status' => $approved ? 'verified' : 'rejected',
            'registry_note' => $data['note'] ?? null,
            'registry_checked_by' => $request->user()->id,
            'registry_checked_at' => now(),
        ]);

        if ($approved) {
            // The certified qualification becomes a verified skill whose evidence is
            // this certificate, so it matches jobs and cannot be deleted from under the badge.
            $profile = $credential->applicantProfile;
            $name = $credential->registry_qualification;
            $values = [
                'verification_status' => 'verified',
                'verification_method' => 'registry',
                'verified_by' => Credential::REGISTRIES[$credential->registry],
                'verified_at' => now(),
                'evidence_credential_id' => $credential->id,
                'badge' => $name.' Verified',
            ];
            $skill = $profile->skills()->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])->first();
            $skill
                ? $skill->update($values + ['level' => max($skill->level, 90)])
                : $profile->skills()->create($values + ['name' => $name, 'level' => 90]);

            $matcher->syncFlaggedMatches($profile->load('skills'));
        }

        return back()->with('success', $credential->registry_qualification.($approved ? ' confirmed in the registry.' : ' rejected.'));
    }
}
