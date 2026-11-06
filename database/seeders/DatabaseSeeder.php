<?php

namespace Database\Seeders;

use App\Models\ApplicantProfile;
use App\Models\Application;
use App\Models\Credential;
use App\Models\CompanyAssessment;
use App\Models\EmployerProfile;
use App\Models\JobPost;
use App\Models\User;
use App\Services\CredentialAnalyzer;
use App\Services\MatchService;
use Illuminate\Database\Seeder;
use ZipArchive;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

class DatabaseSeeder extends Seeder
{
    use EarnsBadges;

    public function run(): void
    {
        // Demo data is not a real status change: send no application notifications.
        Application::withoutEvents(fn () => $this->seed());
    }

    private function seed(): void
    {
        $this->seedItEmployer();
        $this->seedRestaurantEmployer();
        $this->seedClinicEmployer();
        $this->seedApplicants();
        $this->seedOwnerAccounts();
        $this->earnDemoBadges();
        $this->seedVerificationQueue();

        // Fill out the registered applicant account (skips if absent).
        $this->call(ApplicantShowcaseSeeder::class);

        // Autonomous matching: flag fitting jobs onto every applicant account.
        $matcher = app(MatchService::class);
        ApplicantProfile::with('skills')->get()->each(
            fn (ApplicantProfile $profile) => $matcher->syncFlaggedMatches($profile)
        );

        $this->seedOpenInvitation($matcher);
    }

    /**
     * Fig. 20 demo: a work sample linked to a skill that is still only claimed,
     * so it counts as evidence (80%) without being a verified badge.
     */
    private function seedLinkedWorkSample(ApplicantProfile $cleo): void
    {
        $this->evidenceFile($cleo, 'portfolio', 'Figma UI mockups', 'cleo-ramos-figma-mockups.pdf', [
            'Figma UI mockups - Cleo Ramos', 'Mobile checkout flow designed in Figma, 6 screens', 'Shared component library with auto layout',
        ], ['Figma'])->update(['linked_skills' => ['Figma']]);
    }

    /** Fig. 19 demo: Cleo has an open invitation to answer (Accept 1914 / Decline 1916). */
    private function seedOpenInvitation(MatchService $matcher): void
    {
        $cleo = User::where('email', 'cleo.ramos@skillbridge.ph')->first()?->applicantProfile;
        $job = JobPost::where('title', 'Junior React Developer')->first();
        if ($cleo && $job) {
            Application::updateOrCreate(
                ['job_post_id' => $job->id, 'applicant_profile_id' => $cleo->id],
                ['status' => 'invited', 'match_score' => $matcher->score($job, $cleo->load('skills'))['score']]
            );
        }
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
        $user->forceFill(['email_verified_at' => $user->email_verified_at ?? now()])->save(); // seeded: no inbox to confirm

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
                    // Job knowledge: react.dev/reference/react/useState
                    ['prompt' => 'Which hook adds state to a function component?', 'options' => ['useEffect', 'useState', 'useRef', 'useMemo'], 'answer' => 1],
                    // Job knowledge: react.dev/learn/rendering-lists
                    ['prompt' => 'Why does React ask for a `key` on each item when rendering a list?', 'options' => ['To style each item differently', 'To make the items clickable', 'To identify which items changed, were added, or were removed between renders', 'To sort the list alphabetically'], 'answer' => 2],
                    // Job knowledge: react.dev/reference/react/useEffect
                    ['prompt' => 'A component must fetch data from an API when it first appears on screen. Where does that code belong?', 'options' => ['Inside a useEffect hook', 'Directly in the JSX return', 'Inside a CSS file', 'In the key prop'], 'answer' => 0],
                    // Job knowledge: react.dev/learn/passing-props-to-a-component
                    ['prompt' => 'How does a parent component pass data down to a child component?', 'options' => ['Through global variables', 'Through props', 'By editing the child file', 'Through the browser URL only'], 'answer' => 1],
                    // Situational judgment (LinkedIn: prioritization / collaboration)
                    ['prompt' => 'The page you built does not match the designer\'s mobile mockup, and the deadline is tomorrow. What is the best first step?', 'options' => ['Ship it and hope nobody notices', 'Quietly change the design to whatever is easier', 'Tell the designer and lead early, show what differs, and agree on what to fix before the deadline', 'Ask for the deadline to be moved without explaining why'], 'answer' => 2],
                    // Situational judgment (CareerFoundry: explaining technical work)
                    ['prompt' => 'A non-technical client asks what an API is. Which answer is most helpful?', 'options' => ['"It is a REST endpoint returning JSON over HTTP."', '"It is like a waiter: your app asks for something, and the API brings back what the kitchen prepared."', '"You would not understand it."', '"It is part of the database."'], 'answer' => 1],
                ],
            ],
            [
                'title' => 'Laravel API Build', 'role' => 'Junior Laravel Backend Developer', 'skill' => 'Laravel', 'passing_score' => 75,
                'questions' => [
                    // Job knowledge: laravel.com/docs/controllers
                    ['prompt' => 'Which Artisan command creates a new controller?', 'options' => ['php artisan migrate', 'php artisan make:controller', 'php artisan serve', 'php artisan make:model'], 'answer' => 1],
                    // Job knowledge: laravel.com/docs/eloquent (Not Found Exceptions)
                    ['prompt' => 'Which Eloquent method automatically returns a 404 response when the record does not exist?', 'options' => ['find()', 'first()', 'findOrFail()', 'get()'], 'answer' => 2],
                    // Job knowledge: laravel.com/docs/csrf
                    ['prompt' => 'What should every HTML form that posts to a Laravel web route include?', 'options' => ['@csrf', '@auth', '@yield', '@include'], 'answer' => 0],
                    // Job knowledge: laravel.com/docs/hashing
                    ['prompt' => 'How should user passwords be stored?', 'options' => ['As plain text so support can read them', 'Encrypted so they can be decrypted later', 'Hashed, for example with Hash::make()', 'Base64-encoded'], 'answer' => 2],
                    // Job knowledge: OWASP - client-side checks can be bypassed
                    ['prompt' => 'A form is already validated with JavaScript in the browser. Should the API validate it again on the server?', 'options' => ['No, browser validation is enough', 'Yes, because browser checks can be bypassed by sending requests directly', 'Only for admin users', 'Only if the form has more than five fields'], 'answer' => 1],
                    // Situational judgment (LinkedIn: growth potential - manager unavailable)
                    ['prompt' => 'Users report an error in production and your supervisor is offline. What is the best first step?', 'options' => ['Push an untested fix directly to production', 'Reproduce the error, check the logs, and inform the team of what you found and propose', 'Ignore it until the supervisor is back', 'Delete the failing feature'], 'answer' => 1],
                ],
            ],
            [
                'title' => 'WordPress + Webflow Practical', 'role' => 'WordPress & Webflow Developer', 'skill' => 'WordPress',
                // Figs. 13 and 16: a real task with a work file, scored by NovaByte's rubric.
                'duration_minutes' => 60,
                'task_prompt' => "Build a one-page site for a small Davao bakery in WordPress (or Webflow): a hero with the shop name and hours, a menu of 3 items with photos, and a contact section with a map link.\nHand in a PDF with screenshots (desktop and mobile), and put the live or staging link in your answer.",
                'task_file_required' => true,
                'rubric' => [
                    ['criterion' => 'All three sections built and working', 'points' => 10],
                    ['criterion' => 'Readable on mobile', 'points' => 5],
                    ['criterion' => 'Accessibility and SEO basics (alt text, headings, page title)', 'points' => 5],
                ],
                'questions' => [
                    // Job knowledge: developer.wordpress.org/themes/advanced-topics/child-themes/
                    ['prompt' => 'Why use a WordPress child theme instead of editing the parent theme?', 'options' => ['So customizations are not lost when the parent theme updates', 'It makes the site load twice as fast', 'It is required to install plugins', 'It hosts the media library'], 'answer' => 0],
                    // Job knowledge: developer.wordpress.org/reference/functions/get_template_part/
                    ['prompt' => 'Which WordPress function loads a reusable template part, such as a header section?', 'options' => ['import()', 'load_html()', 'get_template_part()', 'require_all()'], 'answer' => 2],
                    // Job knowledge: Google Search Central - title links and meta descriptions
                    ['prompt' => 'Which change best helps a page show well in search results?', 'options' => ['Hiding keywords in white text', 'A unique, descriptive title and meta description', 'Copying the same page several times', 'Using only images instead of text'], 'answer' => 1],
                    // Job knowledge: W3C WAI images tutorial
                    ['prompt' => 'What is image alt text mainly for?', 'options' => ['Describing the image for screen-reader users and when the image fails to load', 'Making the image larger', 'Adding a watermark', 'Speeding up page load'], 'answer' => 0],
                    // Job knowledge: wordpress.org/documentation/article/updating-wordpress/ (back up first)
                    ['prompt' => 'Before updating plugins on a client\'s live site, you should first...', 'options' => ['Update everything at once and check later', 'Make a full backup, ideally test on a staging copy', 'Delete unused pages', 'Change the admin password'], 'answer' => 1],
                    // Situational judgment (scope management)
                    ['prompt' => 'Near the deadline, a client asks for a new feature that was not in the agreed scope. What do you do?', 'options' => ['Build it silently and miss the deadline', 'Refuse without discussion', 'Clarify the request, explain the effect on time or cost, and agree on it before starting', 'Remove another agreed feature to make room'], 'answer' => 2],
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
                    // Job knowledge: coffeehouse training guides - a ~13 s shot is under-extracted and sour
                    ['prompt' => 'An espresso shot finishes in about 13 seconds and tastes sour. What is the most likely fix?', 'options' => ['Use a coarser grind', 'Use a finer grind so the water flows more slowly', 'Add more milk', 'Use colder water'], 'answer' => 1],
                    // Situational judgment: Workable barista interview guide
                    ['prompt' => 'A customer says you made the wrong drink, but you are sure you made what they ordered. What do you do?', 'options' => ['Show them the receipt to prove you were right', 'Apologize and remake the drink promptly', 'Tell them to order again and pay', 'Ignore the complaint'], 'answer' => 1],
                    // Situational judgment: Workable barista interview guide
                    ['prompt' => 'The line is long and the next customer places a complicated order. What is the best approach?', 'options' => ['Skip hygiene steps to go faster', 'Make the simple orders first and leave this one for later', 'Acknowledge waiting customers, keep your standards, and coordinate with teammates to keep the line moving', 'Ask the customer to come back later'], 'answer' => 2],
                    // Job knowledge: Code on Sanitation (PD 856) - danger zone about 4.44 °C to 60 °C
                    ['prompt' => 'Perishable food should not be kept for long within which temperature range, where bacteria grow fastest?', 'options' => ['About 5 °C to 60 °C', 'Below 0 °C', 'Above 75 °C', 'Exactly 100 °C'], 'answer' => 0],
                    // Job knowledge: FDA Philippines food-handler advisory
                    ['prompt' => 'You wake up with vomiting and diarrhea before your shift. What should you do?', 'options' => ['Go to work and wear gloves', 'Stay home and inform your supervisor', 'Work only at the cashier', 'Take medicine and work as usual'], 'answer' => 1],
                    // Job knowledge: FIFO stock rotation
                    ['prompt' => 'Under FIFO stock rotation, which milk should be used first?', 'options' => ['The newest delivery', 'Whichever is closest to the counter', 'The oldest stock that is still within its use-by date', 'The largest container'], 'answer' => 2],
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
                    // Job knowledge: WHO Patient Safety Solutions - at least two identifiers, never the room number
                    ['prompt' => 'Before pulling up a patient\'s record, how should you confirm their identity?', 'options' => ['By their room or queue number', 'With at least two identifiers, such as full name and date of birth', 'By how they look', 'By first name only'], 'answer' => 1],
                    // Job knowledge: Data Privacy Act of 2012 (RA 10173) - health information is sensitive personal information
                    ['prompt' => 'Under the Data Privacy Act (RA 10173), a patient\'s health information is classified as...', 'options' => ['Public information', 'Sensitive personal information', 'Company property that may be shared freely', 'Marketing data'], 'answer' => 1],
                    // Situational judgment: confidentiality (RA 10173)
                    ['prompt' => 'A caller says they are a patient\'s relative and asks for the patient\'s test results. What do you do?', 'options' => ['Read the results to them', 'Decline politely and follow clinic policy for authorized release', 'Email the results to them', 'Confirm the diagnosis only'], 'answer' => 1],
                    // Situational judgment: patient safety
                    ['prompt' => 'A walk-in patient without an appointment says they have chest pain and looks unwell. What do you do first?', 'options' => ['Ask them to book an appointment for tomorrow', 'Alert the clinical staff immediately', 'Finish your current phone call first', 'Ask them to fill in all forms before anything else'], 'answer' => 1],
                    // Situational judgment: Monster receptionist interview guide
                    ['prompt' => 'A patient is upset about waiting a long time. What is the best response?', 'options' => ['Tell them everyone has to wait', 'Acknowledge their concern, apologize, and give an honest estimate of the wait', 'Move them ahead of everyone else', 'Ignore them until their turn'], 'answer' => 1],
                    // Situational judgment: scheduling
                    ['prompt' => 'Two patients were booked in the same slot with the same doctor. What should you do?', 'options' => ['Let them decide who goes first', 'Cancel both appointments', 'Apologize to both, explain the error, and offer each a fair option such as the next available slot or another doctor', 'Say nothing and hope one does not show up'], 'answer' => 2],
                ],
            ],
        ]);
    }

    private function seedApplicants(): void
    {
        $this->makeApplicant('Maria Santos', 'demo@skillbridge.ph', 'WordPress & Webflow Developer',
            ['WordPress', 'Webflow', 'HTML', 'CSS', 'SEO', 'Figma', 'Accessibility', 'Analytics'],
            ['WordPress & Webflow Developer', 'Frontend Developer']);

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
            $this->makeApplicant($name, $email, $role, $skills, [$role]);
        }
    }

    /**
     * Every demo badge is earned the way the platform grants it (see EarnsBadges):
     * a passed company assessment, or a company the applicant applied to
     * confirming a skill its role asks for from an uploaded file. Anything not
     * earned stays self-reported, so some candidates are Amber on purpose.
     */
    private function earnDemoBadges(): void
    {
        $profile = fn (string $email) => User::where('email', $email)->firstOrFail()->applicantProfile;

        // Maria: passed NovaByte's WordPress test; NovaByte confirmed the rest from her client-site portfolio.
        $maria = $profile('demo@skillbridge.ph');
        $this->earnByAssessment($maria, 'WordPress + Webflow Practical', 92, 21);
        $sites = $this->evidenceFile($maria, 'portfolio', 'Client websites portfolio', 'maria-santos-client-sites.pdf', [
            'Client websites portfolio - Maria Santos',
            'Webflow marketing site for a Davao cafe; responsive HTML/CSS landing pages',
            'Links and screenshots of three live client projects',
        ], ['Webflow', 'HTML', 'CSS']);
        foreach (['Webflow', 'HTML', 'CSS'] as $skill) {
            $this->earnByEvidence($maria, 'WordPress & Webflow Developer', $skill, $sites, 14);
        }

        // Cleo: passed the React test; NovaByte confirmed CSS and JavaScript from her portfolio.
        $cleo = $profile('cleo.ramos@skillbridge.ph');
        $this->earnByAssessment($cleo, 'React UI Fundamentals', 88, 18);
        $cleoWork = $this->evidenceFile($cleo, 'portfolio', 'Frontend projects', 'cleo-ramos-projects.pdf', [
            'Frontend projects - Cleo Ramos', 'Responsive dashboard UI in React with custom CSS', 'Form validation and DOM scripting in JavaScript',
        ], ['React', 'CSS', 'JavaScript']);
        foreach (['CSS', 'JavaScript'] as $skill) {
            $this->earnByEvidence($cleo, 'Junior Frontend Developer', $skill, $cleoWork, 10);
        }
        $this->seedLinkedWorkSample($cleo);

        // Miguel: passed the Laravel test; NovaByte confirmed MySQL and REST API from his API project.
        $miguel = $profile('miguel.santos@skillbridge.ph');
        $this->earnByAssessment($miguel, 'Laravel API Build', 84, 16);
        $this->failAssessment($miguel, 'React UI Fundamentals', 45, 12);   // a backend dev trying frontend: 2 attempts left
        $api = $this->evidenceFile($miguel, 'portfolio', 'Inventory REST API project', 'miguel-santos-api.pdf', [
            'Inventory REST API - Miguel Santos', 'Laravel REST API endpoints with MySQL migrations and seeders',
        ], ['Laravel', 'MySQL', 'REST API']);
        foreach (['MySQL', 'REST API'] as $skill) {
            $this->earnByEvidence($miguel, 'Junior Laravel Backend Developer', $skill, $api, 9);
        }

        // Test badges only: these candidates still have self-reported skills (Amber for some roles).
        $this->earnByAssessment($profile('janelle.cruz@skillbridge.ph'), 'WordPress + Webflow Practical', 80, 12);
        $liam = $profile('liam.cortez@skillbridge.ph');
        $this->earnByAssessment($liam, 'Laravel API Build', 90, 25);
        $this->failAssessment($liam, 'React UI Fundamentals', 60, 23);   // failed first, passed after the cooldown
        $this->earnByAssessment($liam, 'React UI Fundamentals', 86, 20);
        $this->failAssessment($profile('noah.lim@skillbridge.ph'), 'React UI Fundamentals', 55, 10);
        $this->earnByAssessment($profile('noah.lim@skillbridge.ph'), 'React UI Fundamentals', 78, 7);
        $this->earnByAssessment($profile('bianca.uy@skillbridge.ph'), 'Barista & Cafe Service', 90, 11);

        // Jerome: passed the React test; Quezada Ventures confirmed CSS and JavaScript from his portfolio.
        $jerome = $profile('jerome.reyes@skillbridge.ph');
        $this->earnByAssessment($jerome, 'React UI Fundamentals', 94, 15);
        $jeromeWork = $this->evidenceFile($jerome, 'portfolio', 'UI component library', 'jerome-reyes-components.pdf', [
            'UI component library - Jerome Reyes', 'Reusable React components styled with CSS modules', 'Accessible JavaScript interactions',
        ], ['React', 'CSS', 'JavaScript']);
        foreach (['CSS', 'JavaScript'] as $skill) {
            $this->earnByEvidence($jerome, 'Junior React Developer', $skill, $jeromeWork, 6);
        }

        // Marco: passed MediCare's front desk test; MediCare confirmed Customer Service from his training certificate.
        $marco = $profile('marco.diaz@skillbridge.ph');
        $this->earnByAssessment($marco, 'Clinic Front Desk Essentials', 86, 13);
        $training = $this->evidenceFile($marco, 'certificate', 'Patient service training', 'marco-diaz-patient-service.pdf', [
            'Certificate of Completion - Patient Service and Front Desk Communication', 'Awarded to: Marco Diaz',
        ], ['Customer Service', 'Front Desk']);
        $this->earnByEvidence($marco, 'Clinic Front Desk Receptionist', 'Customer Service', $training, 8);

        // Project owner: passed the React test; NovaByte confirmed the rest from the uploaded portfolio.
        $owner = $profile('jquezada_230000000642@uic.edu.ph');
        $this->earnByAssessment($owner, 'React UI Fundamentals', 88, 19);
        $ownerPortfolio = $owner->credentials()->where('type', 'portfolio')->first();
        if ($ownerPortfolio) {
            foreach (['CSS', 'JavaScript', 'Figma', 'Git'] as $skill) {
                $this->earnByEvidence($owner, 'Junior Frontend Developer', $skill, $ownerPortfolio, 5);
            }
        }
    }

    /**
     * The project owner's own accounts. Kept in the seeder so a migrate:fresh
     * never wipes them. Skills are chosen to actually match a seeded job, so
     * the Matches tab has something in it straight away.
     */
    private function seedOwnerAccounts(): void
    {
        // --- Applicant side -------------------------------------------------
        $ownerProfile = $this->makeApplicant(
            'JimNick Quezada',
            'jquezada_230000000642@uic.edu.ph',
            'Frontend Developer',
            // WordPress stays unearned on purpose: the WordPress test is a badge pathway to try.
            ['React', 'CSS', 'JavaScript', 'Figma', 'Git', 'WordPress'],
            ['Frontend Developer', 'Junior Frontend Developer']
        );

        $this->seedOwnerCredentials($ownerProfile);

        // Fig. 6-7 demo: the frontend role asks for its company's React assessment (steps 615-620, 725-730).
        JobPost::where('title', 'Junior Frontend Developer')->update([
            'company_assessment_id' => \App\Models\CompanyAssessment::where('title', 'React UI Fundamentals')->value('id'),
        ]);

        // Apply to a live role so an employer can actually open those documents
        // (credentials stay private until the applicant applies or is invited).
        $frontendRole = JobPost::where('title', 'Junior Frontend Developer')->first();
        if ($frontendRole) {
            Application::updateOrCreate(
                ['job_post_id' => $frontendRole->id, 'applicant_profile_id' => $ownerProfile->id],
                ['status' => 'applied', 'match_score' => 100]
            );
        }

        // --- Employer side --------------------------------------------------
        $employer = $this->makeEmployer('jquezada_230000000642+employer@uic.edu.ph', 'JimNick Quezada', [
            'company_name' => 'Quezada Ventures',
            'industry' => 'IT Services & Web Development',
            'company_size' => '1-10',
            'location_city' => 'Davao City',
            'location_region' => 'Davao Region',
            'recruiter_name' => 'JimNick Quezada',
            'recruiter_position' => 'Owner',
            'email_verified' => true,
        ]);

        // A real role so the employer dashboard is not empty: its required
        // skills match several seeded applicants, so candidates appear at once.
        $this->seedJobs($employer, [
            [
                'title' => 'Junior React Developer',
                'location_city' => 'Davao City',
                'location_region' => 'Davao Region',
                'salary_range' => 'PHP 20k-26k',
                'description' => 'Build and maintain React interfaces for client projects.',
                'responsibilities' => 'Ship React components, fix UI bugs, and keep styling consistent.',
                'required_skills' => ['React', 'CSS', 'JavaScript'],
                'preferred_skills' => ['Figma', 'Git'],
            ],
        ]);
    }

    /**
     * Sample CV + portfolio for the owner's applicant account, written as real
     * .docx files into private storage and parsed like a genuine upload, so the
     * employer review screen has documents to open right after a fresh seed.
     */
    private function seedOwnerCredentials(ApplicantProfile $profile): void
    {
        if (! class_exists(ZipArchive::class)) {
            $this->command?->warn('zip extension missing - skipped seeding sample credentials.');

            return;
        }

        $analyzer = app(CredentialAnalyzer::class);
        Cache::forget('skill-vocabulary');   // parse against freshly seeded skills
        Storage::disk('local')->makeDirectory('credentials');

        $documents = [
            [
                'file' => 'jimnick-quezada-cv.docx',
                'type' => 'resume',
                'title' => 'JimNick Quezada - CV',
                'body' => 'JimNick Quezada. Frontend Developer based in Davao City. '
                    .'Built responsive interfaces with React, CSS and JavaScript. '
                    .'Comfortable translating Figma designs and collaborating through Git. '
                    .'Education: BS Information Technology. Seeking a junior frontend role.',
            ],
            [
                'file' => 'jimnick-quezada-portfolio.docx',
                'type' => 'portfolio',
                'title' => 'Frontend Portfolio',
                'body' => 'Selected work. 1) Campus event site - React and CSS, responsive layout. '
                    .'2) Small business landing page - JavaScript interactions, Figma handoff. '
                    .'3) Inventory dashboard UI - reusable React components, Git version control.',
            ],
        ];

        foreach ($documents as $doc) {
            $path = 'credentials/'.$doc['file'];
            $absolute = Storage::disk('local')->path($path);

            $zip = new ZipArchive();
            $zip->open($absolute, ZipArchive::CREATE | ZipArchive::OVERWRITE);
            $zip->addFromString(
                'word/document.xml',
                '<w:document><w:body><w:p><w:r><w:t>'.$doc['body'].'</w:t></w:r></w:p></w:body></w:document>'
            );
            $zip->close();

            $text = $analyzer->text($absolute, null);

            Credential::updateOrCreate(
                ['applicant_profile_id' => $profile->id, 'original_name' => $doc['file']],
                [
                    'type' => $doc['type'],
                    'title' => $doc['title'],
                    'path' => $path,
                    'mime' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'size' => filesize($absolute),
                    'sha256' => hash_file('sha256', $absolute),
                    'meta' => ['extension' => 'docx', 'source' => 'seeded sample'],
                    'extracted_skills' => $analyzer->skillsIn($text),
                ]
            );
        }
    }

    /**
     * Demo admin plus one item in each admin queue: a company waiting for its
     * DTI check, and a TESDA certificate waiting for its registry check. The
     * certificate number is invented, so the honest outcome in a demo is
     * "not found in the registry" - which shows how a fake certificate is caught.
     */
    private function seedVerificationQueue(): void
    {
        User::updateOrCreate(['email' => 'admin@skillbridge.ph'], [
            'name' => 'SkillBridge Admin', 'first_name' => 'SkillBridge', 'surname' => 'Admin',
            'role' => 'admin', 'password' => Hash::make('password123'),
        ])->forceFill(['email_verified_at' => now()])->save();

        $brightBuild = $this->makeEmployer('hr@brightbuild.ph', 'Rafael Mendoza', [
            'company_name' => 'BrightBuild Construction',
            'industry' => 'Construction',
            'company_size' => '11-50',
            'location_city' => 'Davao City',
            'location_region' => 'Davao Region',
            'recruiter_name' => 'Rafael Mendoza',
            'recruiter_position' => 'HR Officer',
            'recruiter_contact' => 'hr@brightbuild.ph',
            'registration_type' => 'DTI',
            'registration_number' => 'DEMO-1234567',
            'verification_status' => 'pending',
            'verification_note' => null,
            'reviewed_by' => null,
            'reviewed_at' => null,
            'email_verified' => false,
        ]);
        // A sample permit, then the same automatic pre-check a real submission gets (Fig. 5, step 530).
        Storage::disk('local')->put('permits/demo-brightbuild-permit.pdf', $this->pdf([
            'SAMPLE DOCUMENT - seeded demo data',
            'Certificate of Business Name Registration',
            'Business Name: BRIGHTBUILD CONSTRUCTION',
            'Business Name No.: DEMO-1234567',
        ]));
        $brightBuild->update(['business_permit_path' => 'permits/demo-brightbuild-permit.pdf']);
        $brightBuild->update(['precheck' => app(\App\Services\CompanyPreCheck::class)->run($brightBuild), 'precheck_at' => now()]);

        $bianca = User::where('email', 'bianca.uy@skillbridge.ph')->first()?->applicantProfile;
        if (! $bianca || ! class_exists(ZipArchive::class)) {
            return;
        }
        Storage::disk('local')->makeDirectory('credentials');
        $path = 'credentials/bianca-uy-tesda-nc2.docx';
        $absolute = Storage::disk('local')->path($path);
        $zip = new ZipArchive();
        $zip->open($absolute, ZipArchive::CREATE | ZipArchive::OVERWRITE);
        $zip->addFromString('word/document.xml', '<w:document><w:body><w:p><w:r><w:t>'
            .'National Certificate II - Barista. Holder: Bianca Uy. Certificate No. 1234 5678 9012 3456 (demo).'
            .'</w:t></w:r></w:p></w:body></w:document>');
        $zip->close();

        Credential::updateOrCreate(
            ['applicant_profile_id' => $bianca->id, 'original_name' => 'bianca-uy-tesda-nc2.docx'],
            [
                'type' => 'certificate', 'title' => 'TESDA Barista NC II', 'path' => $path,
                'mime' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'size' => filesize($absolute), 'sha256' => hash_file('sha256', $absolute),
                'meta' => ['extension' => 'docx', 'source' => 'seeded sample'],
                'registry' => 'tesda', 'registry_number' => '1234567890123456',
                'registry_qualification' => 'Barista NC II', 'registry_status' => 'pending',
                'registry_note' => null, 'registry_checked_by' => null, 'registry_checked_at' => null,
            ]
        );
    }

    private function makeApplicant(string $name, string $email, string $headline, array $skillNames, array $desiredRoles): ApplicantProfile
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
        $user->forceFill(['email_verified_at' => $user->email_verified_at ?? now()])->save(); // seeded: no inbox to confirm

        $profile = ApplicantProfile::updateOrCreate(
            ['user_id' => $user->id],
            [
                'headline' => $headline,
                'location' => 'Davao City, Philippines',
                'experience_level' => 'Entry',
                'desired_roles' => $desiredRoles,
            ]
        );

        $this->claimSkills($profile, $skillNames);

        return $profile;
    }
}
