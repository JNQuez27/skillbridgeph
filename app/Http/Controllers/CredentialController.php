<?php

namespace App\Http\Controllers;

use App\Models\Credential;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CredentialController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();
        abort_unless($user->role === 'jobseeker', 403);

        $request->validate([
            'type' => ['required', 'in:resume,certificate,portfolio'],
            'title' => ['nullable', 'string', 'max:255'],
            'file' => ['required', 'file', 'max:5120', 'mimes:pdf,doc,docx,png,jpg,jpeg'],
        ]);

        $profile = $user->applicantProfile()->firstOrCreate(
            [],
            ['location' => 'Philippines', 'experience_level' => 'Entry']
        );

        $file = $request->file('file');
        $path = $file->store('credentials', 'public');

        $profile->credentials()->create([
            'type' => $request->input('type'),
            'title' => $request->input('title'),
            'original_name' => $file->getClientOriginalName(),
            'path' => $path,
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
        ]);

        return back()->with('success', 'Credential uploaded.');
    }

    public function destroy(Request $request, Credential $credential)
    {
        abort_unless($credential->applicantProfile->user_id === $request->user()->id, 403);

        Storage::disk('public')->delete($credential->path);
        $credential->delete();

        return back()->with('success', 'Credential removed.');
    }
}
