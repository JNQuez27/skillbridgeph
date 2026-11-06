<?php

namespace App\Services;

use App\Models\EmployerProfile;
use Illuminate\Support\Facades\Storage;

/**
 * Patent Fig. 5, step 530: the automatic part of company validation.
 *
 * DTI's business-name search and SEC's CheckWithSEC are both behind a CAPTCHA
 * (checked 2026-11-05), so the registry itself cannot be queried by software.
 * What can be checked automatically is consistency: does the uploaded permit
 * actually name this company and this registration number, and is either already
 * claimed by another company? A forged permit can pass these checks, so a pass
 * never validates a company on its own: an administrator always decides
 * (535-545). The 530 -> 550 branch is reserved for a registry with machine access.
 */
class CompanyPreCheck
{
    public const PASS = 'pass';
    public const FAIL = 'fail';
    public const UNKNOWN = 'unknown';

    public function __construct(private CredentialAnalyzer $analyzer) {}

    /** @return array<int, array{key:string, label:string, result:string, detail:string}> */
    public function run(EmployerProfile $company): array
    {
        $text = $this->permitText($company);
        $readable = trim($text) !== '';
        $haystack = $this->squash($text);

        $inPermit = fn (string $needle) => ! $readable ? self::UNKNOWN
            : (str_contains($haystack, $this->squash($needle)) ? self::PASS : self::FAIL);

        $number = (string) $company->registration_number;
        $numberTaken = EmployerProfile::where('id', '!=', $company->id)
            ->whereIn('verification_status', ['approved', 'pending'])
            ->get(['registration_number'])
            ->contains(fn ($other) => $this->squash((string) $other->registration_number) === $this->squash($number));
        $nameTaken = EmployerProfile::where('id', '!=', $company->id)
            ->where('verification_status', 'approved')
            ->get(['company_name'])
            ->contains(fn ($other) => $this->squash($other->company_name) === $this->squash($company->company_name));

        $unreadable = 'The permit is an image or has no readable text, so check it by eye.';

        return [
            ['key' => 'permit_name', 'label' => 'Permit names this company', 'result' => $inPermit($company->company_name),
                'detail' => $readable ? 'Looked for "'.$company->company_name.'" in the permit text.' : $unreadable],
            ['key' => 'permit_number', 'label' => 'Permit shows this registration number', 'result' => $inPermit($number),
                'detail' => $readable ? 'Looked for '.$company->registration_type.' '.$number.' in the permit text.' : $unreadable],
            ['key' => 'number_unique', 'label' => 'Registration number not used by another company', 'result' => $numberTaken ? self::FAIL : self::PASS,
                'detail' => $numberTaken ? 'Another company already submitted this number.' : 'No other company uses this number.'],
            ['key' => 'name_unique', 'label' => 'Company name not a duplicate of a verified company', 'result' => $nameTaken ? self::FAIL : self::PASS,
                'detail' => $nameTaken ? 'A verified company already uses this name.' : 'No verified company uses this name.'],
        ];
    }

    private function permitText(EmployerProfile $company): string
    {
        $path = $company->business_permit_path;
        if (! $path || ! Storage::disk('local')->exists($path)) {
            return '';
        }

        return $this->analyzer->text(Storage::disk('local')->path($path), null);
    }

    /** Case, spacing and punctuation never decide a match. */
    private function squash(string $value): string
    {
        return preg_replace('/[^a-z0-9]/', '', mb_strtolower($value));
    }
}
