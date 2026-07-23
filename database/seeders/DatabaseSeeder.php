<?php

namespace Database\Seeders;

use App\Models\ApplicantProfile;
use App\Models\CompanyAssessment;
use App\Models\EmployerProfile;
use App\Models\JobPost;
use App\Models\User;
use App\Services\MatchService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedEmployer();
        $this->seedApplicants();

        // Autonomous matching: flag fitting jobs onto every applicant account.
        $matcher = app(MatchService::class);
        ApplicantProfile::with('skills')->get()->each(
            fn (ApplicantProfile $profile) => $matcher->syncFlaggedMatches($profile)
        );
    }

    private function seedEmployer(): EmployerProfile
    {
        $user = User::updateOrCreate(
            ['email' => 'employer@skillbridge.ph'],
            [
                'name' => 'NovaByte Recruiter',
                'first_name' => 'Nova',
                'surname' => 'Recruiter',
                'role' => 'employer',
                'password' => Hash::make('password123'),
            ]
        );

        $profile = EmployerProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'company_name' => 'NovaByte Solutions',
                'industry' => 'IT Services & Web Development',
                'company_size' => '18-25',
                'location_city' => 'Davao City',
                'location_region' => 'Davao Region',
                'recruiter_name' => 'Nova Recruiter',
                'recruiter_position' => 'Talent Lead',
                'recruiter_contact' => '+63 917 000 0000',
                'email_verified' => true,
            ]
        );

        $jobs = [
            [
                'title' => 'Junior Frontend Developer',
                'salary_range' => 'PHP 20k-28k',
                'description' => 'Build responsive web interfaces for SME clients using React and modern CSS.',
                'responsibilities' => 'Convert UI designs into React components, maintain styling, and fix UI bugs.',
                'required_skills' => ['React', 'CSS', 'JavaScript'],
                'preferred_skills' => ['Figma', 'Git'],
                'education_requirement' => 'IT-related course preferred',
            ],
            [
                'title' => 'WordPress & Webflow Developer',
                'salary_range' => 'PHP 18k-24k',
                'description' => 'Build and maintain marketing websites for retail and food service clients.',
                'responsibilities' => 'Customize WordPress sites, build Webflow pages, and ensure SEO basics.',
                'required_skills' => ['WordPress', 'Webflow', 'HTML', 'CSS'],
                'preferred_skills' => ['SEO', 'Figma'],
                'education_requirement' => 'Design or IT course preferred',
            ],
            [
                'title' => 'Junior Laravel Backend Developer',
                'salary_range' => 'PHP 22k-30k',
                'description' => 'Develop APIs and admin dashboards for client applications.',
                'responsibilities' => 'Build Laravel endpoints, integrate MySQL, and write basic tests.',
                'required_skills' => ['Laravel', 'MySQL', 'REST API'],
                'preferred_skills' => ['PHP', 'Docker'],
                'education_requirement' => 'IT-related course preferred',
            ],
            [
                'title' => 'UI/UX Designer (Part-time)',
                'employment_type' => 'Part-time',
                'salary_range' => 'PHP 15k-20k',
                'description' => 'Create user flows and UI kits for SME web projects.',
                'responsibilities' => 'Produce wireframes, test flows, and deliver polished UI kits.',
                'required_skills' => ['UI Design', 'UX Research', 'Figma'],
                'preferred_skills' => ['Prototyping', 'Design Systems'],
                'education_requirement' => 'Design course preferred',
            ],
        ];

        foreach ($jobs as $job) {
            JobPost::updateOrCreate(
                ['employer_profile_id' => $profile->id, 'title' => $job['title']],
                array_merge([
                    'location_city' => 'Davao City',
                    'location_region' => 'Davao Region',
                    'employment_type' => 'Full-time',
                    'work_setup' => 'On-site',
                    'experience_level' => 'Entry',
                    'status' => 'Open',
                ], $job)
            );
        }

        foreach ([
            ['title' => 'React UI Fundamentals', 'role' => 'Junior Frontend Developer', 'question_count' => 10, 'duration_minutes' => 18, 'passing_score' => 70],
            ['title' => 'Laravel API Build', 'role' => 'Junior Laravel Backend Developer', 'question_count' => 12, 'duration_minutes' => 20, 'passing_score' => 75],
            ['title' => 'WordPress + Webflow Practical', 'role' => 'WordPress & Webflow Developer', 'question_count' => 8, 'duration_minutes' => 16, 'passing_score' => 70],
            ['title' => 'UI/UX Case Study', 'role' => 'UI/UX Designer (Part-time)', 'question_count' => 6, 'duration_minutes' => 14, 'passing_score' => 70],
        ] as $assessment) {
            CompanyAssessment::updateOrCreate(
                ['employer_profile_id' => $profile->id, 'title' => $assessment['title']],
                array_merge(['status' => 'Active'], $assessment)
            );
        }

        return $profile;
    }

    private function seedApplicants(): void
    {
        // Primary demo applicant with rich, badge-backed skills.
        $this->makeApplicant('Maria Santos', 'demo@skillbridge.ph', 'WordPress & Webflow Developer', [
            ['name' => 'WordPress', 'level' => 94, 'badge' => 'WP Builder', 'verification_status' => 'verified', 'verification_method' => 'assessment'],
            ['name' => 'Webflow', 'level' => 92, 'badge' => 'Webflow Pro', 'verification_status' => 'verified', 'verification_method' => 'portfolio'],
            ['name' => 'HTML', 'level' => 90, 'badge' => 'Semantic HTML', 'verification_status' => 'verified', 'verification_method' => 'assessment'],
            ['name' => 'CSS', 'level' => 88, 'badge' => 'CSS Stylist', 'verification_status' => 'verified', 'verification_method' => 'assessment'],
            ['name' => 'SEO', 'level' => 86, 'badge' => 'SEO Starter', 'verification_status' => 'verified', 'verification_method' => 'portfolio'],
            ['name' => 'Figma', 'level' => 82, 'badge' => 'Design Translator', 'verification_status' => 'verified', 'verification_method' => 'portfolio'],
            ['name' => 'Accessibility', 'level' => 76, 'badge' => 'A11y Ally', 'verification_status' => 'pending', 'verification_method' => 'assessment'],
            ['name' => 'Analytics', 'level' => 72, 'badge' => 'Insight Tracker', 'verification_status' => 'pending', 'verification_method' => 'scenario'],
        ], ['WordPress & Webflow Developer', 'Frontend Developer']);

        $roster = [
            ['Cleo Ramos', 'Junior Frontend Developer', ['React', 'CSS', 'JavaScript', 'Figma']],
            ['Miguel Santos', 'Laravel Backend Intern', ['Laravel', 'MySQL', 'REST API', 'PHP']],
            ['Janelle Cruz', 'WordPress & Webflow Developer', ['WordPress', 'Webflow', 'HTML', 'CSS', 'SEO', 'Figma']],
            ['Paolo Navarro', 'Web Assistant', ['WordPress', 'Webflow', 'HTML', 'SEO']],
            ['Alyssa Gomez', 'WordPress Designer', ['WordPress', 'Webflow', 'HTML', 'CSS', 'SEO']],
            ['Liam Cortez', 'Full Stack Developer', ['Laravel', 'MySQL', 'REST API', 'Docker', 'React', 'CSS', 'JavaScript', 'Git']],
            ['May Velasco', 'UI/UX Designer', ['UI Design', 'UX Research', 'Figma', 'Prototyping']],
            ['Noah Lim', 'Frontend Developer', ['React', 'CSS', 'JavaScript', 'Git']],
            ['Isabelle Flores', 'WordPress & Webflow Developer', ['WordPress', 'Webflow', 'HTML', 'CSS', 'SEO', 'Figma']],
            ['Jerome Reyes', 'Frontend Developer', ['React', 'CSS', 'JavaScript', 'Git', 'Figma']],
        ];

        foreach ($roster as [$name, $role, $skills]) {
            $email = strtolower(str_replace(' ', '.', $name)) . '@skillbridge.ph';
            $this->makeApplicant($name, $email, $role, array_map(fn ($skill) => [
                'name' => $skill,
                'level' => 85,
                'badge' => null,
                'verification_status' => 'verified',
                'verification_method' => 'assessment',
            ], $skills), [$role]);
        }
    }

    /** @param array<int, array<string, mixed>> $skills @param array<int, string> $desiredRoles */
    private function makeApplicant(string $name, string $email, string $headline, array $skills, array $desiredRoles): ApplicantProfile
    {
        $parts = explode(' ', $name);
        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'first_name' => $parts[0] ?? $name,
                'surname' => $parts[count($parts) - 1] ?? '',
                'role' => 'jobseeker',
                'password' => Hash::make('password123'),
            ]
        );

        $profile = ApplicantProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'headline' => $headline,
                'location' => 'Davao City, Philippines',
                'experience_level' => 'Entry',
                'desired_roles' => $desiredRoles,
            ]
        );

        $profile->skills()->delete();
        foreach ($skills as $skill) {
            $profile->skills()->create($skill);
        }

        return $profile;
    }
}
