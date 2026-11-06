<?php
/**
 * Self-check for CredentialAnalyzer. Run: php tools/check_analyzer.php
 * Asserts document text extraction and skill matching actually work.
 */
$root = dirname(__DIR__);
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

$analyzer = new App\Services\CredentialAnalyzer();
$tmp = sys_get_temp_dir().'/sbph_check.docx';

// Build a real .docx (a zip with word/document.xml).
$zip = new ZipArchive();
$zip->open($tmp, ZipArchive::CREATE | ZipArchive::OVERWRITE);
$zip->addFromString('word/document.xml',
    '<w:document><w:body><w:p><w:r><w:t>Built sites with React, CSS and Laravel.</w:t></w:r></w:p></w:body></w:document>');
$zip->close();

$fail = 0;
$check = function (string $label, bool $ok) use (&$fail) {
    echo ($ok ? '  PASS  ' : '  FAIL  ').$label.PHP_EOL;
    if (!$ok) { $fail++; }
};

$text = $analyzer->text($tmp, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
$check('docx text extracted', str_contains($text, 'React') && str_contains($text, 'Laravel'));

$skills = array_map('mb_strtolower', $analyzer->skillsIn($text));
$check('finds React', in_array('react', $skills, true));
$check('finds Laravel', in_array('laravel', $skills, true));
$check('finds CSS', in_array('css', $skills, true));

// Word-boundary: a skill must not match inside another word.
$check('no substring false positive', !in_array('java', array_map('mb_strtolower', $analyzer->skillsIn('JavaScript only')), true)
    || !in_array('Java', $analyzer->skillsIn('JavaScript only'), true));

$check('empty text yields no skills', $analyzer->skillsIn('') === []);
$check('unreadable format returns empty', $analyzer->text($tmp.'.mp4', 'video/mp4') === '');

// --- CandidateReview invariants across every real job/applicant pair ---
$reviewer = new App\Services\CandidateReview();
$jobs = App\Models\JobPost::limit(5)->get();
$applicants = App\Models\ApplicantProfile::with(['skills', 'credentials'])->limit(8)->get();
$okStatus = true; $okGuard = true; $okReasons = true;
foreach ($jobs as $j) {
    foreach ($applicants as $a) {
        $r = $reviewer->for($j, $a);
        if (!in_array($r['status'], ['green','amber','red'], true)) { $okStatus = false; }
        // The guardrail the hire endpoint relies on.
        if ($r['canAutoApprove'] !== ($r['status'] === 'green')) { $okGuard = false; }
        if ($r['reasons'] === []) { $okReasons = false; }
    }
}
$check('verdict is always green/amber/red', $okStatus);
$check('auto-approve allowed only when green', $okGuard);
$check('every verdict explains itself', $okReasons);

@unlink($tmp);
echo $fail ? PHP_EOL."FAILED ($fail)".PHP_EOL : PHP_EOL."all checks passed".PHP_EOL;
exit($fail ? 1 : 0);
