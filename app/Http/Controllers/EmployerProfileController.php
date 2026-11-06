<?php

namespace App\Http\Controllers;

use App\Models\EmployerProfile;
use App\Services\CompanyPreCheck;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EmployerProfileController extends Controller
{
    public function update(Request $request)
    {
        $user = $request->user();
        abort_unless($user->role === 'employer', 403);

        $data = $request->validate([
            'companyName' => ['required', 'string', 'max:255'],
            'industry' => ['nullable', 'string', 'max:255'],
            'companySize' => ['nullable', 'string', 'max:255'],
            'locationCity' => ['nullable', 'string', 'max:255'],
            'locationRegion' => ['nullable', 'string', 'max:255'],
            'recruiterName' => ['nullable', 'string', 'max:255'],
            'recruiterPosition' => ['nullable', 'string', 'max:255'],
            'recruiterContact' => ['nullable', 'string', 'max:255'],
        ]);

        $profile = $user->employerProfile()->firstOrCreate([], ['company_name' => $user->name."'s Company"]);

        // Approval was for one specific registered business name. Renaming the
        // company sends it back to an admin, or a verified account could take
        // on another company's identity.
        if ($profile->verification_status === 'approved' && $profile->company_name !== $data['companyName']) {
            $profile->fill(['verification_status' => 'pending', 'email_verified' => false]);
        }

        $profile->update([
            'company_name' => $data['companyName'],
            'industry' => $data['industry'] ?? null,
            'company_size' => $data['companySize'] ?? null,
            'location_city' => $data['locationCity'] ?? null,
            'location_region' => $data['locationRegion'] ?? null,
            'recruiter_name' => $data['recruiterName'] ?? null,
            'recruiter_position' => $data['recruiterPosition'] ?? null,
            'recruiter_contact' => $data['recruiterContact'] ?? null,
        ]);

        return back()->with('success', 'Company profile updated.');
    }

    /**
     * The employer submits its DTI or SEC registration for an admin to check
     * against the official registry. Submitting never verifies anything by itself.
     */
    /** Patent Fig. 5, step 520: what must be filled in before a company can be checked. */
    private const REQUIRED_DETAILS = [
        'company_name' => 'company name',
        'industry' => 'industry',
        'location_city' => 'city',
        'recruiter_name' => 'recruiter name',
        'recruiter_contact' => 'recruiter contact',
    ];

    public function submitVerification(Request $request, CompanyPreCheck $preCheck)
    {
        $user = $request->user();
        abort_unless($user->role === 'employer', 403);

        $data = $request->validate([
            'registrationType' => ['required', 'in:DTI,SEC'],
            'registrationNumber' => ['required', 'string', 'min:4', 'max:40', 'regex:/^[A-Za-z0-9-]+$/'],
            'permit' => ['required', 'file', 'max:10240', 'mimes:pdf,png,jpg,jpeg'],
        ]);

        $profile = $user->employerProfile()->firstOrCreate([], ['company_name' => $user->name."'s Company"]);
        if ($profile->verification_status === 'approved') {
            return back()->with('error', 'Your company is already verified.');
        }

        // 520: company details complete?
        $missing = collect(self::REQUIRED_DETAILS)->filter(fn ($label, $field) => blank($profile->{$field}));
        if ($missing->isNotEmpty()) {
            return back()->withErrors(['registrationNumber' => 'Complete your company details first (Edit profile): '.$missing->implode(', ').'.']);
        }

        if ($profile->business_permit_path) {
            Storage::disk('local')->delete($profile->business_permit_path);
        }

        $profile->update([
            'registration_type' => $data['registrationType'],
            'registration_number' => strtoupper($data['registrationNumber']),
            'business_permit_path' => $request->file('permit')->store('permits', 'local'),
            'verification_status' => 'pending',
            'verification_note' => null,
        ]);

        // 530: automatic pre-check, then always on to an admin (535).
        $profile->update(['precheck' => $preCheck->run($profile), 'precheck_at' => now()]);

        return back()->with('success', 'Submitted. Automatic checks are done; a SkillBridge PH admin will now review your registration.');
    }

    /** The permit is private: only its company and SkillBridge admins may open it. */
    public function permit(Request $request, EmployerProfile $employerProfile)
    {
        $user = $request->user();
        abort_unless($user->isAdmin() || $employerProfile->user_id === $user->id, 403);
        abort_unless($employerProfile->business_permit_path && Storage::disk('local')->exists($employerProfile->business_permit_path), 404);

        return Storage::disk('local')->response($employerProfile->business_permit_path);
    }
}
