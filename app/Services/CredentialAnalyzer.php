<?php

namespace App\Services;

use App\Models\ApplicantSkill;
use App\Models\JobPost;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;

/**
 * Reads an uploaded credential and produces *provenance signals* — never a
 * verdict on whether a document is "AI generated". Reliable AI-text detection
 * does not exist, and published research shows detectors disproportionately
 * flag non-native English writers, so we deliberately do not attempt it.
 *
 * What we can say honestly:
 *   - what skills the document actually mentions (vs. what was claimed)
 *   - whether this exact file was uploaded by someone else (sha256)
 *   - what the file's own metadata reports (producer, dates, pages)
 */
class CredentialAnalyzer
{
    /** Extract readable text. Returns '' for formats we cannot read (images, video). */
    public function text(string $absolutePath, ?string $mime): string
    {
        $ext = strtolower(pathinfo($absolutePath, PATHINFO_EXTENSION));

        try {
            if ($ext === 'pdf') {
                return (new \Smalot\PdfParser\Parser())->parseFile($absolutePath)->getText();
            }
            if ($ext === 'docx') {
                return $this->docxText($absolutePath);
            }
            if (in_array($ext, ['txt', 'md'], true)) {
                return (string) file_get_contents($absolutePath);
            }
        } catch (\Throwable $e) {
            return '';
        }

        return '';
    }

    /** A .docx is a zip; the body lives in word/document.xml. No dependency needed. */
    private function docxText(string $path): string
    {
        $zip = new \ZipArchive();
        if ($zip->open($path) !== true) {
            return '';
        }
        $xml = $zip->getFromName('word/document.xml') ?: '';
        $zip->close();

        return trim(html_entity_decode(strip_tags(str_replace('<', ' <', $xml))));
    }

    /**
     * Skills the document mentions, matched against the vocabulary the platform
     * actually uses (every skill on a profile or a job post).
     *
     * @return array<int, string>
     */
    public function skillsIn(string $text): array
    {
        if (trim($text) === '') {
            return [];
        }

        $haystack = mb_strtolower($text);
        $found = [];
        foreach ($this->vocabulary() as $skill) {
            $needle = mb_strtolower($skill);
            // Word-boundary match so "R" doesn't match every word containing r.
            if (preg_match('/(?<![\p{L}\p{N}])'.preg_quote($needle, '/').'(?![\p{L}\p{N}])/u', $haystack)) {
                $found[] = $skill;
            }
        }

        return array_values(array_unique($found));
    }

    /** Known skill names across the platform, cached briefly. */
    private function vocabulary(): array
    {
        return Cache::remember('skill-vocabulary', 300, function () {
            $fromProfiles = ApplicantSkill::distinct()->pluck('name')->all();
            $fromJobs = JobPost::get(['required_skills', 'preferred_skills'])
                ->flatMap(fn ($j) => array_merge($j->required_skills ?? [], $j->preferred_skills ?? []))
                ->all();

            return array_values(array_unique(array_filter(array_merge($fromProfiles, $fromJobs))));
        });
    }

    /** Whatever the file reports about itself. Descriptive only — not proof. */
    public function metadata(UploadedFile $file, string $absolutePath): array
    {
        $meta = [
            'mime' => $file->getClientMimeType(),
            'extension' => strtolower($file->getClientOriginalExtension()),
            'uploaded_at' => now()->toIso8601String(),
        ];

        if ($meta['extension'] === 'pdf') {
            try {
                $details = (new \Smalot\PdfParser\Parser())->parseFile($absolutePath)->getDetails();
                foreach (['Producer', 'Creator', 'CreationDate', 'ModDate', 'Pages'] as $k) {
                    if (isset($details[$k]) && is_scalar($details[$k])) {
                        $meta[strtolower($k)] = (string) $details[$k];
                    }
                }
            } catch (\Throwable $e) {
                // Unreadable metadata is not suspicious on its own.
            }
        }

        return $meta;
    }
}
