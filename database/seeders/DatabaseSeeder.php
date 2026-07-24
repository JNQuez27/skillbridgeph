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
        $this->seedItEmployer();
        $this->seedRestaurantEmployer();
        $this->seedClinicEmployer();
        $this->seedApplicants();

        // Autonomous matching: flag fitting jobs onto every applicant account.
        $matcher = app(MatchService::class);
        ApplicantProfile::with('skills')->get()->each(
            fn (ApplicantProfile $profile) => $matcher->syncFlaggedMatches($profile)
        );
    }

    private function makeEmployer(string $email, string $name, array $profileData): EmployerProfile
    {
        $user = User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'first_name' => explode(' ', $name)[0],
                'role' => 'employer',
                'password' => Hash::make('password123'),
            ]
        );

        return EmployerProfile::updateOrCreate(['user_id' => $user->id], $profileData);
    }

    private function seedJobs(EmployerProfile $profile, array $jobs): void
    {
        foreach ($jobs as $job) {
            JobPost::updateOrCreate(
                ['employer_profile_id' => $profile->id, 'title' => $job['title']],
                array_merge([
                    'employment_type' => 'Full-time',
                    'work_setup' => 'On-site',
                    'experience_level' => 'Entry',
                    'status' => 'Open',
                ], $job)
            );
        }
    }

    private function seedAssessments(EmployerProfile $profile, string $industry, array $assessments): void
    {
        foreach ($assessments as $a) {
            CompanyAssessment::updateOrCreate(
                ['employer_profile_id' => $profile->id, 'title' => $a['title']],
                array_merge([
                    'industry' => $industry,
                    'question_count' => count($a['questions']),
                    'duration_minutes' => 15,
                    'passing_score' => 70,
                    'status' => 'Active',
                ], $a)
            );
        }
    }

    private function seedItEmployer(): void
    {
        $profile = $this->makeEmployer('employer@skillbridge.ph', 'NovaByte Recruiter', [
            'company_name' => 'NovaByte Solutions',
            'industry' => 'IT Services & Web Development',
            'company_size' => '18-25',
            'location_city' => 'Davao City',
            'location_region' => 'Davao Region',
            'recruiter_name' => 'Nova Recruiter',
            'recruiter_position' => 'Talent Lead',
            'recruiter_contact' => '+63 917 000 0000',
            'email_verified' => true,
        ]);

        $this->seedJobs($profile, [
            ['title' => 'Junior Frontend Developer', 'location_city' => 'Davao City', 'location_region' => 'Davao Region', 'salary_range' => 'PHP 20k-28k', 'description' => 'Build responsive web interfaces for SME clients using React and modern CSS.', 'responsibilities' => 'Convert UI designs into React components, maintain styling, and fix UI bugs.', 'required_skills' => ['React', 'CSS', 'JavaScript'], 'preferred_skills' => ['Figma', 'Git']],
            ['title' => 'WordPress & Webflow Developer', 'location_city' => 'Davao City', 'location_region' => 'Davao Region', 'salary_range' => 'PHP 18k-24k', 'description' => 'Build and maintain marketing websites for retail and food service clients.', 'responsibilities' => 'Customize WordPress sites, build Webflow pages, and ensure SEO basics.', 'required_skills' => ['WordPress', 'Webflow', 'HTML', 'CSS'], 'preferred_skills' => ['SEO', 'Figma']],
            ['title' => 'Junior Laravel Backend Developer', 'location_city' => 'Davao City', 'location_region' => 'Davao Region', 'salary_range' => 'PHP 22k-30k', 'description' => 'Develop APIs and admin dashboards for client applications.', 'responsibilities' => 'Build Laravel endpoints, integrate MySQL, and write basic tests.', 'required_skills' => ['Laravel', 'MySQL', 'REST API'], 'preferred_skills' => ['PHP', 'Docker']],
        ]);

        $this->seedAssessments($profile, 'IT', [
            [
                'title' => 'React UI Fundamentals', 'role' => 'Junior Frontend Developer', 'skill' => 'React',
                'questions' => [
                    ['prompt' => 'Which hook lets a function component hold local state?', 'options' => ['useState', 'useEffect', 'useRef', 'useMemo'], 'answer' => 0],
                    ['prompt' => 'What prop is required when rendering a list of elements?', 'options' => ['key', 'id', 'ref', 'name'], 'answer' => 0],
                    ['prompt' => 'In JSX, `className` maps to which HTML attribute?', 'options' => ['class', 'id', 'style', 'for'], 'answer' => 0],
                    ['prompt' => 'Which hook runs side effects after render?', 'options' => ['useEffect', 'useState', 'useContext', 'useReducer'], 'answer' => 0],
                    ['prompt' => 'How do you pass data from a parent to a child component?', 'options' => ['Props', 'State', 'Context only', 'Refs'], 'answer' => 0],
                ],
            ],
            [
                'title' => 'Laravel API Build', 'role' => 'Junior Laravel Backend Developer', 'skill' => 'Laravel', 'passing_score' => 75,
                'questions' => [
                    ['prompt' => 'Which Artisan command creates a new controller?', 'options' => ['php artisan make:controller', 'php artisan serve', 'php artisan migrate', 'php artisan make:model'], 'answer' => 0],
                    ['prompt' => 'Eloquent is Laravel\'s...', 'options' => ['ORM', 'templating engine', 'router', 'queue driver'], 'answer' => 0],
                    ['prompt' => 'Which method throws a 404 when a model is not found?', 'options' => ['findOrFail', 'find', 'first', 'get'], 'answer' => 0],
                    ['prompt' => 'Where are web routes defined?', 'options' => ['routes/web.php', 'config/app.php', '.env', 'public/index.php'], 'answer' => 0],
                    ['prompt' => 'What protects forms against CSRF in Blade?', 'options' => ['@csrf', '@auth', '@include', '@yield'], 'answer' => 0],
                ],
            ],
            [
                'title' => 'WordPress + Webflow Practical', 'role' => 'WordPress & Webflow Developer', 'skill' => 'WordPress',
                'questions' => [
                    ['prompt' => 'A WordPress "child theme" is used to...', 'options' => ['customize safely without losing updates', 'speed up the site', 'install plugins', 'host media'], 'answer' => 0],
                    ['prompt' => 'Webflow exports code in which languages?', 'options' => ['HTML, CSS, JS', 'PHP only', 'Python', 'Ruby'], 'answer' => 0],
                    ['prompt' => 'Reusable template parts are included in WP with...', 'options' => ['get_template_part()', 'import()', 'require_all()', 'load_html()'], 'answer' => 0],
                    ['prompt' => 'Which improves on-page SEO?', 'options' => ['Descriptive title & meta tags', 'Large unoptimized images', 'Hidden text', 'Duplicate pages'], 'answer' => 0],
                ],
            ],
        ]);
    }

    private function seedRestaurantEmployer(): void
    {
        $profile = $this->makeEmployer('cafe@skillbridge.ph', 'Sunrise Cafe HR', [
            'company_name' => 'Sunrise Coffee & Cafe',
            'industry' => 'Food & Beverage',
            'company_size' => '11-50',
            'location_city' => 'Davao City',
            'location_region' => 'Davao Region',
            'recruiter_name' => 'Cafe Manager',
            'recruiter_position' => 'Store Manager',
            'email_verified' => true,
        ]);

        $this->seedJobs($profile, [
            ['title' => 'Barista', 'location_city' => 'Davao City', 'salary_range' => 'PHP 13k-16k', 'description' => 'Prepare espresso-based drinks and deliver friendly service.', 'responsibilities' => 'Brew coffee, handle POS, maintain cleanliness, and serve customers.', 'required_skills' => ['Barista', 'Customer Service'], 'preferred_skills' => ['Cash Handling']],
            ['title' => 'Service Crew', 'location_city' => 'Davao City', 'salary_range' => 'PHP 12k-15k', 'description' => 'Front-of-house service for a busy cafe.', 'responsibilities' => 'Take orders, serve food, and keep the dining area clean.', 'required_skills' => ['Customer Service', 'Food Safety'], 'preferred_skills' => []],
        ]);

        $this->seedAssessments($profile, 'Food & Beverage', [
            [
                'title' => 'Barista & Cafe Service', 'role' => 'Barista', 'skill' => 'Barista',
                'questions' => [
                    ['prompt' => 'A standard espresso shot extracts in about...', 'options' => ['25-30 seconds', '5 seconds', '2 minutes', '10 minutes'], 'answer' => 0],
                    ['prompt' => 'Milk for a latte is steamed to roughly...', 'options' => ['60-65°C', '100°C', '20°C', '90°C'], 'answer' => 0],
                    ['prompt' => 'A customer says their drink is wrong. Your best first response?', 'options' => ['Apologize and remake it promptly', 'Argue that it is correct', 'Ignore them', 'Charge them again'], 'answer' => 0],
                    ['prompt' => 'FIFO in food storage means...', 'options' => ['First In, First Out', 'Fast In, Fast Out', 'Freeze It For One-day', 'Fry In, Fry Out'], 'answer' => 0],
                    ['prompt' => 'Before handling food you should always...', 'options' => ['Wash your hands', 'Check your phone', 'Skip gloves', 'Rush the order'], 'answer' => 0],
                ],
            ],
        ]);
    }

    private function seedClinicEmployer(): void
    {
        $profile = $this->makeEmployer('clinic@skillbridge.ph', 'MediCare HR', [
            'company_name' => 'MediCare Family Clinic',
            'industry' => 'Healthcare',
            'company_size' => '11-50',
            'location_city' => 'Davao City',
            'location_region' => 'Davao Region',
            'recruiter_name' => 'Clinic Administrator',
            'recruiter_position' => 'Admin Head',
            'email_verified' => true,
        ]);

        $this->seedJobs($profile, [
            ['title' => 'Clinic Front Desk Receptionist', 'location_city' => 'Davao City', 'salary_range' => 'PHP 14k-18k', 'description' => 'Manage patient reception, scheduling, and records at a family clinic.', 'responsibilities' => 'Greet patients, schedule appointments, and maintain confidential records.', 'required_skills' => ['Front Desk', 'Customer Service'], 'preferred_skills' => ['Scheduling']],
        ]);

        $this->seedAssessments($profile, 'Healthcare', [
            [
                'title' => 'Clinic Front Desk Essentials', 'role' => 'Clinic Front Desk Receptionist', 'skill' => 'Front Desk',
                'questions' => [
                    ['prompt' => 'A patient arrives without an appointment and is in distress. You should...', 'options' => ['Notify clinical staff immediately', 'Tell them to come back tomorrow', 'Take a message', 'Ignore them'], 'answer' => 0],
                    ['prompt' => 'Patient records must be kept...', 'options' => ['Confidential and secure', 'Posted publicly', 'Shared freely', 'Discarded daily'], 'answer' => 0],
                    ['prompt' => 'When scheduling, you should confirm the patient\'s...', 'options' => ['Full name and date of birth', 'Favorite color', 'Shoe size', 'Nickname only'], 'answer' => 0],
                    ['prompt' => '"PHI" in a clinic refers to...', 'options' => ['Protected Health Information', 'Public Health Index', 'Patient Home Isolation', 'Primary Health Insurance'], 'answer' => 0],
                    ['prompt' => 'A caller asks for another patient\'s results. You should...', 'options' => ['Decline and protect privacy', 'Read them out', 'Email them', 'Confirm the diagnosis'], 'answer' => 0],
                ],
            ],
        ]);
    }

    private function seedApplicants(): void
    {
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
            ['Liam Cortez', 'Full Stack Developer', ['Laravel', 'MySQL', 'REST API', 'Docker', 'React', 'CSS', 'JavaScript', 'Git']],
            ['Noah Lim', 'Frontend Developer', ['React', 'CSS', 'JavaScript', 'Git']],
            ['Jerome Reyes', 'Frontend Developer', ['React', 'CSS', 'JavaScript', 'Git', 'Figma']],
            ['Bianca Uy', 'Barista', ['Barista', 'Customer Service', 'Cash Handling']],
            ['Marco Diaz', 'Clinic Receptionist', ['Front Desk', 'Customer Service', 'Scheduling']],
        ];

        foreach ($roster as [$name, $role, $skills]) {
            $email = strtolower(str_replace(' ', '.', $name)).'@skillbridge.ph';
            $this->makeApplicant($name, $email, $role, array_map(fn ($skill) => [
                'name' => $skill,
                'level' => 85,
                'badge' => null,
                'verification_status' => 'verified',
                'verification_method' => 'assessment',
            ], $skills), [$role]);
        }
    }

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
