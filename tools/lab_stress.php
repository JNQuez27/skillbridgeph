<?php
/**
 * SkillBridge PH - internal performance harness (WPR 09 operational check).
 *
 * Measures the real hot paths of this system, not synthetic toy work:
 *   1. MatchService::score()           - the pure scoring function (CPU only)
 *   2. matchesForApplicant()           - jobs-for-one-applicant (applicant dashboard)
 *   3. candidatesForJob()              - candidates-for-one-job (employer dashboard)
 *   4. employer dashboard workload     - every job scored + reviewed, with query count
 *   5. syncFlaggedMatches()            - autonomous flagging across all applicants
 *
 * Run: php tools/lab_stress.php [repeats]
 * Every number printed here is produced by this script; nothing is hardcoded.
 */
$root = dirname(__DIR__);
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\ApplicantProfile;
use App\Models\JobPost;
use App\Services\CandidateReview;
use App\Services\MatchService;
use Illuminate\Support\Facades\DB;

$repeats = (int) ($argv[1] ?? 5);
$matcher = app(MatchService::class);
$reviewer = app(CandidateReview::class);

function stats(array $ms): array
{
    sort($ms);
    $n = count($ms);
    return [
        'min' => round($ms[0], 2),
        'median' => round($ms[intdiv($n, 2)], 2),
        'max' => round($ms[$n - 1], 2),
        'mean' => round(array_sum($ms) / $n, 2),
    ];
}

function timeIt(callable $fn): array
{
    $t0 = microtime(true);
    $result = $fn();
    return [(microtime(true) - $t0) * 1000, $result];
}

function report(string $label, array $s, string $extra = ''): void
{
    printf("%-42s min %8.2f  median %8.2f  mean %8.2f  max %8.2f ms %s\n",
        $label, $s['min'], $s['median'], $s['mean'], $s['max'], $extra);
}

echo "SkillBridge PH - performance harness\n";
echo 'run at        : '.date('Y-m-d H:i:s')."\n";
echo 'php           : '.PHP_VERSION."\n";
echo 'db driver     : '.DB::connection()->getDriverName()."\n";
echo 'repeats       : '.$repeats."\n";

$jobs = JobPost::where('status', 'Open')->get();
$applicants = ApplicantProfile::with(['skills', 'credentials'])->get();
echo 'dataset       : '.$jobs->count().' open jobs, '.$applicants->count().' applicants, '
    .DB::table('applicant_skills')->count()." skills\n";
echo str_repeat('-', 110)."\n";

// --- 1. Pure scoring function (no DB) ------------------------------------
$job = $jobs->first();
$applicant = $applicants->first();
$iterations = 20000;
$t0 = microtime(true);
for ($i = 0; $i < $iterations; $i++) {
    $matcher->score($job, $applicant);
}
$elapsed = (microtime(true) - $t0);
printf("%-42s %s scores in %.2fs  =>  %s scores/sec  (%.1f us each)\n",
    '1. MatchService::score() [CPU only]',
    number_format($iterations), $elapsed,
    number_format((int) ($iterations / $elapsed)), ($elapsed / $iterations) * 1000000);

// --- 2. Applicant dashboard: jobs for one applicant ----------------------
$samples = [];
for ($r = 0; $r < $repeats; $r++) {
    foreach ($applicants as $a) {
        [$ms] = timeIt(fn () => $matcher->matchesForApplicant($a));
        $samples[] = $ms;
    }
}
report('2. matchesForApplicant() per applicant', stats($samples), '('.count($samples).' calls)');

// --- 3. Employer dashboard: candidates for one job -----------------------
$samples = [];
for ($r = 0; $r < $repeats; $r++) {
    foreach ($jobs as $j) {
        [$ms] = timeIt(fn () => $matcher->candidatesForJob($j));
        $samples[] = $ms;
    }
}
report('3. candidatesForJob() per job', stats($samples), '('.count($samples).' calls)');

// --- 4. Full employer dashboard workload, with query count ---------------
$samples = [];
$queryCount = 0;
for ($r = 0; $r < $repeats; $r++) {
    DB::flushQueryLog();
    DB::enableQueryLog();
    [$ms] = timeIt(function () use ($jobs, $matcher, $reviewer) {
        foreach ($jobs as $j) {
            foreach ($matcher->candidatesForJob($j) as $entry) {
                $reviewer->for($j, $entry['applicant']);
            }
        }
        return null;
    });
    $queryCount = count(DB::getQueryLog());
    DB::disableQueryLog();
    $samples[] = $ms;
}
report('4. employer dashboard workload', stats($samples), "({$queryCount} queries/run)");

// --- 5. Autonomous flagging across every applicant -----------------------
$samples = [];
for ($r = 0; $r < $repeats; $r++) {
    [$ms] = timeIt(function () use ($applicants, $matcher) {
        foreach ($applicants as $a) {
            $matcher->syncFlaggedMatches($a);
        }
        return null;
    });
    $samples[] = $ms;
}
report('5. syncFlaggedMatches() all applicants', stats($samples));

echo str_repeat('-', 110)."\n";
printf("peak memory   : %.1f MB\n", memory_get_peak_usage(true) / 1048576);
echo "done\n";
