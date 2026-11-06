<?php

namespace Database\Seeders;

use App\Models\Application;
use App\Models\JobPost;
use App\Models\User;
use App\Services\MatchService;
use Illuminate\Database\Seeder;

/**
 * Fills out a registered applicant account with the evidence the dashboard is
 * built to show - verified badges, pending badge pathways, credential files and
 * live applications - and wires those applications to real employer vacancies so
 * the same person appears on the employer side.
 *
 * Idempotent. Skips with a warning if the account does not exist.
 */
class ApplicantShowcaseSeeder extends Seeder
{
    use EarnsBadges;

    private const EMAIL = 'jimnick124@gmail.com';

    /** Skills the applicant claims. Only the ones earned in run() become verified. */
    private const SKILLS = ['React', 'JavaScript', 'HTML', 'CSS', 'Tailwind CSS', 'Laravel', 'Git', 'PHP', 'MySQL', 'REST API', 'Figma'];

    /** Vacancy title => application status. */
    private const APPLICATIONS = [
        'Junior Frontend Developer'        => 'applied',
        'Junior Laravel Backend Developer' => 'shortlisted',
        'WordPress & Webflow Developer'    => 'saved',
    ];

    public function run(): void
    {
        $user = User::where('email', self::EMAIL)->first();
        if (! $user || $user->role !== 'jobseeker') {
            $this->command?->warn('ApplicantShowcaseSeeder skipped - no applicant account for '.self::EMAIL);

            return;
        }

        $profile = $user->applicantProfileOrCreate();
        $profile->update([
            'headline' => 'Full Stack Web Developer (React + Laravel)',
            'location' => $profile->location ?: 'Davao City, Davao del Sur',
            'experience_level' => 'Mid',
            'desired_roles' => ['Frontend Developer', 'Full Stack Developer', 'Laravel Developer'],
        ]);

        $this->claimSkills($profile, self::SKILLS);

        // --- credentials: real, openable files on the private disk ---
        $certificate = $this->evidenceFile($profile, 'certificate', 'Laravel Framework Certification', 'laravel-certificate.pdf', [
            'Certificate of Completion',
            'Laravel Framework - Backend Development',
            'Awarded to: '.$user->name,
            'Skills covered: Laravel, PHP, MySQL, REST API',
            'SAMPLE DOCUMENT - seeded demo data',
        ], ['Laravel', 'PHP', 'MySQL', 'REST API']);

        $portfolio = $this->evidenceFile($profile, 'portfolio', 'Frontend Portfolio Summary', 'frontend-portfolio.pdf', [
            'Frontend Portfolio Summary',
            'Prepared by: '.$user->name,
            'Selected work: responsive dashboards, component libraries',
            'Skills demonstrated: React, JavaScript, CSS, Tailwind CSS, HTML, Git',
            'SAMPLE DOCUMENT - seeded demo data',
        ], ['React', 'JavaScript', 'CSS', 'Tailwind CSS', 'HTML', 'Git']);

        // A credential the applicant uploaded themselves gets parsed skills too,
        // so it contributes a document-supported signal like any parsed upload.
        $profile->credentials()->whereNull('extracted_skills')->update([
            'extracted_skills' => json_encode(['React', 'JavaScript', 'Laravel', 'CSS']),
        ]);

        // --- applications: connect this applicant to real vacancies ---
        $matcher = app(MatchService::class);
        $profile->load('skills');
        foreach (self::APPLICATIONS as $title => $status) {
            $job = JobPost::where('title', $title)->first();
            if (! $job) {
                continue;
            }
            Application::updateOrCreate(
                ['job_post_id' => $job->id, 'applicant_profile_id' => $profile->id],
                ['status' => $status, 'match_score' => $matcher->score($job, $profile)['score']]
            );
        }

        // --- badges, earned the way the platform grants them ---
        $this->earnByAssessment($profile, 'React UI Fundamentals', 92, 24);
        $this->earnByAssessment($profile, 'Laravel API Build', 88, 22);
        foreach (['JavaScript', 'CSS', 'Git'] as $skill) {
            $this->earnByEvidence($profile, 'Junior Frontend Developer', $skill, $portfolio, 12);
        }
        foreach (['MySQL', 'REST API'] as $skill) {
            $this->earnByEvidence($profile, 'Junior Laravel Backend Developer', $skill, $certificate, 9);
        }

        // --- autonomous matching: flag every other fitting vacancy ---
        $matcher->syncFlaggedMatches($profile->load('skills'));

        $this->command?->info(sprintf(
            'Seeded %s - %d skills (%d verified), %d credentials, %d applications.',
            self::EMAIL,
            $profile->skills()->count(),
            $profile->skills()->where('verification_status', 'verified')->count(),
            $profile->credentials()->count(),
            $profile->applications()->count()
        ));
    }
}
