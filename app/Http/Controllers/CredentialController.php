<?php

namespace App\Http\Controllers;

use App\Models\Credential;
use App\Services\CredentialAnalyzer;
use App\Services\MatchService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CredentialController extends Controller
{
    /** A recording must be uploaded within this many minutes of starting. */
    private const RECORDING_WINDOW_MINUTES = 15;

    /** Seconds the camera must keep rolling after the last prompt. */
    private const AFTER_LAST_PROMPT = 10;

    private const RECORDING_KEY = 'video_recording';

    /**
     * Prompts for one recording: a spoken code at the start, a physical action at
     * a random moment, and a second code later. Nobody, including the applicant,
     * learns a prompt before its moment, so a video made in advance (or generated)
     * cannot contain them, and splicing in other footage misses the later ones.
     */
    private function buildPrompts(): array
    {
        $code = fn () => strtoupper(Str::random(3)).'-'.random_int(100, 999);
        $actions = [
            'Hold up '.random_int(2, 5).' fingers to the camera',
            'Show both hands to the camera, then your workstation',
            'Point the camera at the tools you are using',
            'Say today\'s date out loud',
        ];

        return [
            ['at' => 0, 'kind' => 'code', 'text' => 'Say this code out loud: '.$code()],
            ['at' => random_int(15, 35), 'kind' => 'action', 'text' => $actions[array_rand($actions)]],
            ['at' => random_int(45, 70), 'kind' => 'code', 'text' => 'Say this new code out loud: '.$code()],
        ];
    }

    /** Start a recording. Returns only the first prompt; the rest are revealed when due. */
    public function startRecording(Request $request)
    {
        abort_unless($request->user()->role === 'jobseeker', 403);

        $prompts = $this->buildPrompts();
        $recording = ['id' => (string) Str::uuid(), 'started_at' => now()->toIso8601String(), 'prompts' => $prompts];
        $request->session()->put(self::RECORDING_KEY, $recording);

        return response()->json([
            'recordingId' => $recording['id'],
            'minSeconds' => end($prompts)['at'] + self::AFTER_LAST_PROMPT,
            'prompts' => [$prompts[0]],
        ]);
    }

    /** The prompts whose moment has come, measured on the server clock. */
    public function recordingPrompts(Request $request)
    {
        $recording = $request->session()->get(self::RECORDING_KEY);
        abort_unless($recording && $request->user()->role === 'jobseeker', 404);

        $elapsed = Carbon::parse($recording['started_at'])->diffInSeconds(now());
        $due = array_values(array_filter($recording['prompts'], fn ($p) => $p['at'] <= $elapsed));

        return response()->json([
            'elapsed' => (int) $elapsed,
            'prompts' => $due,
            'remaining' => count($recording['prompts']) - count($due),
            'canStop' => $elapsed >= end($recording['prompts'])['at'] + self::AFTER_LAST_PROMPT,
        ]);
    }

    public function store(Request $request, CredentialAnalyzer $analyzer, MatchService $matcher)
    {
        $user = $request->user();
        abort_unless($user->role === 'jobseeker', 403);

        $request->validate([
            'type' => ['required', 'in:resume,certificate,portfolio,video'],
            'title' => ['nullable', 'string', 'max:255'],
            // Documents/images up to 10MB; hands-on demo videos up to 60MB.
            'file' => [
                'required', 'file', 'max:61440',
                'mimes:pdf,doc,docx,png,jpg,jpeg,mp4,mov,webm,avi,m4v',
            ],
            'recordingId' => ['required_if:type,video', 'nullable', 'string'],
            // A TESDA NC or PRC license can be sent for a registry check by an admin.
            'registry' => ['nullable', 'in:tesda,prc'],
            'registryNumber' => ['required_with:registry', 'nullable', 'string', 'max:40', 'regex:/^[A-Za-z0-9 -]+$/'],
            'registryQualification' => ['required_with:registry', 'nullable', 'string', 'max:120'],
            // The lookup sends the holder's name to a government registry, so it needs explicit consent.
            'registryConsent' => ['exclude_without:registry', 'accepted'],
            // Fig. 20 (2022): a work sample names the skills it shows.
            'linkedSkills' => ['nullable', 'array', 'max:10'],
            'linkedSkills.*' => ['string', 'max:60'],
        ]);

        $registry = $request->input('type') === 'certificate' ? $request->input('registry') : null;
        // TESDA's registry is searched by the first and last four digits.
        if ($registry === 'tesda' && strlen(preg_replace('/\D/', '', (string) $request->input('registryNumber'))) < 8) {
            return back()->withErrors(['registryNumber' => 'Enter the full TESDA certificate number (at least 8 digits).']);
        }

        // Demo videos come only from a SkillBridge recording, uploaded after every
        // prompt has been shown (so it took real time) and within the window.
        $recording = null;
        if ($request->input('type') === 'video') {
            $recording = $request->session()->get(self::RECORDING_KEY);
            if (! $recording || $recording['id'] !== $request->input('recordingId')) {
                return back()->withErrors(['file' => 'Record the demo video in SkillBridge: start a recording and follow the prompts.']);
            }
            $started = Carbon::parse($recording['started_at']);
            $minSeconds = end($recording['prompts'])['at'] + self::AFTER_LAST_PROMPT;
            if ($started->diffInSeconds(now()) < $minSeconds) {
                return back()->withErrors(['file' => 'The recording ended before all prompts were shown. Record again and follow every prompt.']);
            }
            if (now()->isAfter($started->copy()->addMinutes(self::RECORDING_WINDOW_MINUTES))) {
                $request->session()->forget(self::RECORDING_KEY);

                return back()->withErrors(['file' => 'This recording expired. Upload within '.self::RECORDING_WINDOW_MINUTES.' minutes of starting.']);
            }
            $request->session()->forget(self::RECORDING_KEY);
        }

        $profile = $user->applicantProfileOrCreate();
        $file = $request->file('file');

        $sha256 = hash_file('sha256', $file->getRealPath());
        $path = $file->store('credentials', 'local');
        $absolute = Storage::disk('local')->path($path);

        $text = $analyzer->text($absolute, $file->getClientMimeType());

        $profile->credentials()->create([
            'type' => $request->input('type'),
            'title' => $request->input('title'),
            'original_name' => $file->getClientOriginalName(),
            'path' => $path,
            'mime' => $file->getClientMimeType(),
            'size' => $file->getSize(),
            'sha256' => $sha256,
            'meta' => $analyzer->metadata($file, $absolute),
            'extracted_skills' => $analyzer->skillsIn($text),
            'challenge_code' => $recording ? substr($recording['prompts'][0]['text'], -7) : null,
            'recording_prompts' => $recording['prompts'] ?? null,
            'recording_started_at' => $recording ? Carbon::parse($recording['started_at']) : null,
            'registry' => $registry,
            'registry_number' => $registry ? strtoupper(trim($request->input('registryNumber'))) : null,
            'registry_qualification' => $registry ? trim($request->input('registryQualification')) : null,
            'registry_status' => $registry ? 'pending' : null,
            'registry_consent_at' => $registry ? now() : null,
            'linked_skills' => $request->input('type') === 'portfolio' ? $this->ownSkills($profile, $request->input('linkedSkills', [])) : null,
        ]);
        if ($request->input('type') === 'portfolio' && $request->filled('linkedSkills')) {
            $matcher->syncFlaggedMatches($profile->fresh()->load('skills'));   // Fig. 4, 440: matches refresh
        }

        return back()->with('success', $registry
            ? 'Certificate uploaded. A SkillBridge PH admin will check it against the '.strtoupper($registry).' registry.'
            : 'Credential uploaded.');
    }

    /** Fig. 20 (2022): change which of the applicant's skills a work sample is linked to. */
    public function linkSkills(Request $request, Credential $credential, MatchService $matcher)
    {
        $profile = $request->user()->applicantProfile;
        abort_unless($profile && $credential->applicant_profile_id === $profile->id && $credential->type === 'portfolio', 403);
        $request->validate(['linkedSkills' => ['present', 'array', 'max:10'], 'linkedSkills.*' => ['string', 'max:60']]);

        $credential->update(['linked_skills' => $this->ownSkills($profile, $request->input('linkedSkills', []))]);
        $matcher->syncFlaggedMatches($profile->fresh()->load('skills'));

        return back()->with('success', 'Work sample linked to '.(count($credential->linked_skills) ?: 'no').' skill(s). Your matches were updated.');
    }

    /** Only skills the applicant actually holds can be linked, spelled as they hold them. */
    private function ownSkills($profile, array $names): array
    {
        $held = $profile->skills()->where('verification_status', '!=', 'unverified')->pluck('name');

        return collect($names)->map(fn ($n) => $held->first(fn ($h) => mb_strtolower($h) === mb_strtolower(trim((string) $n))))
            ->filter()->unique()->values()->all();
    }

    /**
     * Serve a credential file. Readable by its owner, or by an employer the
     * applicant actually applied to / was invited by — never by the public.
     */
    public function file(Request $request, Credential $credential)
    {
        abort_unless($this->mayRead($request->user(), $credential), 403);
        abort_unless(Storage::disk('local')->exists($credential->path), 404);

        return Storage::disk('local')->response($credential->path, $credential->original_name);
    }

    private function mayRead($user, Credential $credential): bool
    {
        $credential->loadMissing('applicantProfile');

        if ($credential->applicantProfile->user_id === $user->id || $user->isAdmin()) {
            return true;
        }

        if ($user->role !== 'employer' || ! $user->employerProfile) {
            return false;
        }

        // Only candidates who engaged with one of this employer's jobs.
        return \App\Models\Application::where('applicant_profile_id', $credential->applicant_profile_id)
            ->whereIn('status', \App\Models\Application::ENGAGED)
            ->whereIn('job_post_id', $user->employerProfile->jobPosts()->pluck('id'))
            ->exists();
    }

    public function destroy(Request $request, Credential $credential)
    {
        abort_unless($credential->applicantProfile->user_id === $request->user()->id, 403);

        // Evidence behind a verified badge is part of that badge's record.
        if (\App\Models\ApplicantSkill::where('evidence_credential_id', $credential->id)->exists()) {
            return back()->with('error', 'This file is the evidence for a verified skill, so it cannot be removed.');
        }

        Storage::disk('local')->delete($credential->path);
        $credential->delete();

        return back()->with('success', 'Credential removed.');
    }
}
