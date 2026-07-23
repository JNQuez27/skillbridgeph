<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

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
            'emailVerified' => ['boolean'],
        ]);

        $profile = $user->employerProfile()->firstOrCreate([], ['company_name' => $user->name."'s Company"]);

        $profile->update([
            'company_name' => $data['companyName'],
            'industry' => $data['industry'] ?? null,
            'company_size' => $data['companySize'] ?? null,
            'location_city' => $data['locationCity'] ?? null,
            'location_region' => $data['locationRegion'] ?? null,
            'recruiter_name' => $data['recruiterName'] ?? null,
            'recruiter_position' => $data['recruiterPosition'] ?? null,
            'recruiter_contact' => $data['recruiterContact'] ?? null,
            'email_verified' => $data['emailVerified'] ?? false,
        ]);

        return back()->with('success', 'Company profile updated.');
    }
}
