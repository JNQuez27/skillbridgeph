<?php
/**
 * SkillBridge PH - scale / stress harness (WPR 09 operational check).
 *
 * The matching engine scores EVERY applicant against a job, so employer-side
 * cost grows with the applicant pool. This measures that curve by temporarily
 * seeding synthetic applicants, taking measurements, then removing them.
 *
 * Synthetic rows all use the email prefix "labtest-" and are deleted in a
 * finally block, so a failed run cannot leave test data behind.
 *
 * Run: php tools/lab_scale.php
 */
$root = dirname(__DIR__);
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();

use App\Models\ApplicantProfile;
use App\Models\JobPost;
use App\Models\User;
use App\Services\CandidateReview;
use App\Services\MatchService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

const PREFIX = 'labtest-';
const SKILL_POOL = ['React', 'CSS', 'JavaScript', 'Laravel', 'MySQL', 'REST API', 'WordPress', 'Webflow', 'HTML', 'Figma', 'Git', 'SEO'];

$matcher = app(MatchService::class);
$reviewer = app(CandidateReview::class);

function purge(): int
{
    $ids = User::where('email', 'like', PREFIX.'%')->pluck('id');
    if ($ids->isEmpty()) {
        return 0;
    }
    User::whereIn('id', $ids)->delete();   // cascades to profile -> skills

    return $ids->count();
}

function seedApplicants(int $n): void
{
    $pw = Hash::make('labtest');
    for ($i = 0; $i < $n; $i++) {
        $u = User::create([
            'name' => 'Lab Test '.$i,
            'first_name' => 'Lab',
            'surname' => 'Test'.$i,
            'role' => 'jobseeker',
            'email' => PREFIX.$i.'-'.uniqid().'@example.test',
            'password' => $pw,
        ]);
        $p = ApplicantProfile::create([
            'user_id' => $u->id,
            'headline' => 'Synthetic applicant',
            'location' => 'Davao City, Philippines',
            'experience_level' => 'Entry',
        ]);
        // 4 verified skills drawn deterministically from the pool
        for ($k = 0; $k < 4; $k++) {
            $p->skills()->create([
                'name' => SKILL_POOL[($i + $k) % count(SKILL_POOL)],
                'level' => 80,
                'verification_status' => 'verified',
                'verification_method' => 'assessment',
            ]);
        }
    }
}

function bench(callable $fn, int $repeats = 3): float
{
    $times = [];
    for ($r = 0; $r < $repeats; $r++) {
        $t0 = microtime(true);
        $fn();
        $times[] = (microtime(true) - $t0) * 1000;
    }
    sort($times);

    return $times[intdiv(count($times), 2)];   // median
}

echo "SkillBridge PH - scale harness\n";
echo 'run at   : '.date('Y-m-d H:i:s')."\n";
echo 'db driver: '.DB::connection()->getDriverName()."\n\n";
printf("%-12s %-10s %14s %16s %18s %12s\n",
    'applicants', 'jobs', 'perJob(ms)', 'employerLoad(ms)', 'flagAll(ms)', 'queries');
echo str_repeat('-', 90)."\n";

$added = 0;
try {
    foreach ([0, 50, 200, 500] as $target) {
        $need = $target - $added;
        if ($need > 0) {
            seedApplicants($need);
            $added += $need;
        }

        $jobs = JobPost::where('status', 'Open')->get();
        $total = ApplicantProfile::count();
        $job = $jobs->first();

        $perJob = bench(fn () => $matcher->candidatesForJob($job));

        DB::flushQueryLog();
        DB::enableQueryLog();
        $employerLoad = bench(function () use ($jobs, $matcher, $reviewer) {
            foreach ($jobs as $j) {
                foreach ($matcher->candidatesForJob($j) as $e) {
                    $reviewer->for($j, $e['applicant']);
                }
            }
        }, 1);
        $queries = count(DB::getQueryLog());
        DB::disableQueryLog();

        $sample = ApplicantProfile::with('skills')->first();
        $flagAll = bench(fn () => $matcher->syncFlaggedMatches($sample), 1);

        printf("%-12s %-10s %14.2f %16.2f %18.2f %12s\n",
            $total, $jobs->count(), $perJob, $employerLoad, $flagAll, number_format($queries));
    }
} finally {
    $removed = purge();
    echo str_repeat('-', 90)."\n";
    echo "cleanup  : removed {$removed} synthetic applicants\n";
    echo 'remaining applicants: '.ApplicantProfile::count()."\n";
    printf("peak memory: %.1f MB\n", memory_get_peak_usage(true) / 1048576);
}
