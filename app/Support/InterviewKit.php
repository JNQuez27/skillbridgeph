<?php

namespace App\Support;

use App\Models\JobPost;

/**
 * A structured interview for a role: every candidate gets the same questions,
 * and every answer is scored 1-5 against written anchors. Structured interviews
 * are among the strongest predictors of job performance (Sackett et al., 2022),
 * and the format follows the U.S. OPM Structured Interview Guide.
 *
 * Questions are paraphrased from legitimate hiring sources, named per question:
 *  - Jobstreet PH: ph.jobstreet.com/career-advice/article/the-20-most-common-job-interview-questions
 *  - LinkedIn: business.linkedin.com/hire/resources/interviewing-talent/behavioral-interview-questions-important-soft-skills
 *  - Workable / Monster role guides (barista, receptionist); CareerFoundry (web developer)
 *  - Fusion CX careers (BPO, Philippines): careers.fusioncx.com/10-interview-questions-you-must-prepare-for-bpo-jobs-in-the-philippines/
 *  - The Muse (retail): themuse.com/advice/retail-interview-questions-answers-examples
 */
class InterviewKit
{
    /** Asked in every interview: why this person, and how they solve problems. */
    private const GENERAL = [
        [
            'competency' => 'Motivation & fit',
            'question' => 'Walk me through your work or study background and what made you apply for this role.',
            'anchors' => [
                1 => 'Vague or rehearsed; cannot connect their background to this role.',
                3 => 'Clear summary; gives a general reason for applying.',
                5 => 'Concise story that links specific experience to the duties of this role and our company.',
            ],
            'source' => 'Jobstreet PH',
        ],
        [
            'competency' => 'Problem solving',
            'question' => 'Tell me about a problem you solved at work, in school, or as a volunteer. What did you do, and what was the result?',
            'anchors' => [
                1 => 'No real example, or describes what "we" did with no personal role.',
                3 => 'Real example with their own actions; result stated loosely.',
                5 => 'Specific situation, their own actions step by step, and a concrete result (STAR).',
            ],
            'source' => 'Jobstreet PH',
        ],
    ];

    /** Soft skills hiring managers screen for most (LinkedIn survey of ~1,300 managers). */
    private const BEHAVIORAL = [
        [
            'competency' => 'Adaptability',
            'question' => 'Tell me about a time you had to learn something new quickly or adjust to a big change. How did you handle it?',
            'anchors' => [
                1 => 'Avoided or resisted the change; no learning described.',
                3 => 'Adapted when required; describes what they did.',
                5 => 'Took initiative to learn, asked for help where needed, and reflects on what they learned.',
            ],
            'source' => 'LinkedIn',
        ],
        [
            'competency' => 'Collaboration',
            'question' => 'Describe a time you disagreed with a coworker or classmate. How did you work it out?',
            'anchors' => [
                1 => 'Blames the other person, or avoided the issue entirely.',
                3 => 'Resolved it, mostly by going along or escalating.',
                5 => 'Listened to the other side, discussed it directly and respectfully, and kept the work moving.',
            ],
            'source' => 'LinkedIn',
        ],
        [
            'competency' => 'Accountability',
            'question' => 'Tell me about a mistake you made at work or school. What happened next?',
            'anchors' => [
                1 => 'Cannot name a mistake, or shifts the blame.',
                3 => 'Owns the mistake and fixed it.',
                5 => 'Owns it, fixed it, told the people affected, and changed how they work to prevent it.',
            ],
            'source' => 'LinkedIn',
        ],
    ];

    /** Questions specific to the kind of work. */
    private const ROLE = [
        'food_service' => [
            [
                'competency' => 'Working under pressure',
                'question' => 'The line is long and a customer places a complicated order. Walk me through what you do.',
                'anchors' => [
                    1 => 'Rushes and skips standards, or ignores the waiting line.',
                    3 => 'Takes orders in turn and works steadily.',
                    5 => 'Acknowledges waiting customers, keeps quality and hygiene, and coordinates with teammates.',
                ],
                'source' => 'Workable (barista interview guide)',
            ],
            [
                'competency' => 'Customer service',
                'question' => 'A customer says you made the wrong order, but you are sure you made what they asked for. What do you do?',
                'anchors' => [
                    1 => 'Argues to prove they were right.',
                    3 => 'Remakes it but with visible frustration, or needs a manager to step in.',
                    5 => 'Apologizes, remakes it promptly and politely, and checks the order back next time.',
                ],
                'source' => 'Workable (barista interview guide)',
            ],
            [
                'competency' => 'Food safety & hygiene',
                'question' => 'What do you do to keep food and drinks safe during a shift, and what would you do if you felt sick before work?',
                'anchors' => [
                    1 => 'Cannot name basic hygiene practices.',
                    3 => 'Mentions handwashing and a clean station.',
                    5 => 'Handwashing, clean station, FIFO stock rotation, safe temperatures, and stays home and informs the supervisor when sick.',
                ],
                'source' => 'FDA Philippines food-handler advisory; Code on Sanitation (PD 856)',
            ],
        ],
        'clinic_front_desk' => [
            [
                'competency' => 'Patient service',
                'question' => 'A patient is upset about a long wait and raises their voice at the desk. How do you respond?',
                'anchors' => [
                    1 => 'Responds defensively or ignores the patient.',
                    3 => 'Stays calm and apologizes.',
                    5 => 'Stays calm, acknowledges the concern, gives an honest wait estimate, and alerts staff if the patient looks unwell.',
                ],
                'source' => 'Monster (receptionist interview guide)',
            ],
            [
                'competency' => 'Confidentiality',
                'question' => 'Someone calls asking for a family member\'s test results. What do you do?',
                'anchors' => [
                    1 => 'Shares the information.',
                    3 => 'Declines, but cannot explain why or what to do next.',
                    5 => 'Declines politely, explains health data is confidential under the Data Privacy Act, and follows clinic policy for authorized release.',
                ],
                'source' => 'Data Privacy Act of 2012 (RA 10173)',
            ],
            [
                'competency' => 'Organization',
                'question' => 'How do you keep several doctors\' schedules accurate, and what do you do when two patients are booked in the same slot?',
                'anchors' => [
                    1 => 'No system; would let the patients sort it out.',
                    3 => 'Uses the scheduling system; would rebook one patient.',
                    5 => 'Confirms identity and bookings with two identifiers, catches conflicts early, and offers both patients fair options.',
                ],
                'source' => 'Monster (receptionist interview guide); WHO patient identification',
            ],
        ],
        'web_developer' => [
            [
                'competency' => 'Communication',
                'question' => 'Explain what an API is to someone on our team who is not technical.',
                'anchors' => [
                    1 => 'Uses jargon only, or cannot explain it.',
                    3 => 'Correct explanation that is still somewhat technical.',
                    5 => 'Plain-language explanation with a good everyday analogy, and checks for understanding.',
                ],
                'source' => 'CareerFoundry (web developer interview questions)',
            ],
            [
                'competency' => 'Technical judgment',
                'question' => 'Why must a form be validated on the server even if it is already validated in the browser?',
                'anchors' => [
                    1 => 'Does not know, or says browser validation is enough.',
                    3 => 'Knows server validation is needed, but not why.',
                    5 => 'Explains browser checks can be bypassed, so the server must enforce the rules (OWASP).',
                ],
                'source' => 'CareerFoundry; OWASP',
            ],
            [
                'competency' => 'Learning',
                'question' => 'What is something technical you learned recently, and how did you learn it?',
                'anchors' => [
                    1 => 'Cannot name anything recent.',
                    3 => 'Names a topic and a resource.',
                    5 => 'Names a topic, how they practiced it (project, docs, tutorial), and how they applied it.',
                ],
                'source' => 'Career Karma (junior web developer interview questions)',
            ],
        ],
        'bpo' => [
            [
                'competency' => 'Handling difficult customers',
                'question' => 'A caller is angry and raising their voice about a problem that is not your fault. Walk me through how you handle the call.',
                'anchors' => [
                    1 => 'Gets defensive, argues, or ends the call.',
                    3 => 'Stays polite and follows the script, but does not calm the caller or resolve much.',
                    5 => 'Lets the caller finish, acknowledges the frustration, stays calm, takes ownership of the next steps, and confirms the resolution.',
                ],
                'source' => 'Fusion CX (BPO careers, Philippines)',
            ],
            [
                'competency' => 'Resolution & escalation',
                'question' => 'How do you make sure a customer\'s issue is solved on the first contact, and what do you do when you cannot solve it yourself?',
                'anchors' => [
                    1 => 'Transfers or ends the call without a plan.',
                    3 => 'Tries to solve it and escalates when stuck.',
                    5 => 'Asks clarifying questions, checks the knowledge base, confirms the fix with the customer, and escalates with full notes so the customer does not repeat themselves (first-call resolution, CSAT).',
                ],
                'source' => 'Fusion CX (BPO careers, Philippines)',
            ],
            [
                'competency' => 'Voice & clarity (mock call)',
                'question' => 'As if I were a customer on the phone, explain how to reset my account password.',
                'anchors' => [
                    1 => 'Unclear, rushed, or full of jargon.',
                    3 => 'Correct steps, but hard to follow or flat in tone.',
                    5 => 'Clear step-by-step guidance in a friendly tone, checks understanding along the way, and confirms it worked.',
                ],
                'source' => 'Fusion CX (BPO careers, Philippines)',
            ],
        ],
        'retail' => [
            [
                'competency' => 'Handling difficult customers',
                'question' => 'A customer wants to return an item, but it is outside the store\'s return policy and they are getting upset. What do you do?',
                'anchors' => [
                    1 => 'Argues, or breaks the policy to make them leave.',
                    3 => 'Explains the policy politely but offers nothing else.',
                    5 => 'Stays calm, explains the policy clearly, offers a workable alternative such as an exchange, and involves a supervisor when needed.',
                ],
                'source' => 'The Muse (retail interview questions)',
            ],
            [
                'competency' => 'Selling (short demo)',
                'question' => 'Show me how you would help a customer who walks in looking for a gift but is not sure what to buy.',
                'anchors' => [
                    1 => 'Pushes the most expensive item without asking anything.',
                    3 => 'Greets the customer and suggests items.',
                    5 => 'Greets warmly, asks questions to understand the need and budget, suggests suitable options, and lets the customer decide.',
                ],
                'source' => 'The Muse (retail interview questions)',
            ],
            [
                'competency' => 'Product knowledge & honesty',
                'question' => 'A customer asks you about a product you know nothing about. What do you say and do?',
                'anchors' => [
                    1 => 'Guesses or makes up an answer.',
                    3 => 'Admits they do not know and points to someone else.',
                    5 => 'Admits it honestly, finds the right answer (label, system, or a colleague), returns to the customer, and learns the product for next time.',
                ],
                'source' => 'The Muse (retail interview questions)',
            ],
        ],
        'general' => [
            [
                'competency' => 'Prioritization',
                'question' => 'Describe a time you had several urgent tasks at once. How did you decide what to do first?',
                'anchors' => [
                    1 => 'No method; did whatever came first.',
                    3 => 'Prioritized by deadline.',
                    5 => 'Weighed urgency and impact, communicated trade-offs, and asked for help when needed.',
                ],
                'source' => 'Jobstreet PH; LinkedIn',
            ],
            [
                'competency' => 'Initiative',
                'question' => 'Tell me about a time something went wrong and your supervisor was not available. What did you do?',
                'anchors' => [
                    1 => 'Waited and did nothing.',
                    3 => 'Handled it within their own task.',
                    5 => 'Used sound judgment, kept others informed, and reported back afterwards.',
                ],
                'source' => 'LinkedIn',
            ],
            [
                'competency' => 'Customer focus',
                'question' => 'Tell me about a time you helped a customer, client, or classmate who was unhappy. What did you do?',
                'anchors' => [
                    1 => 'No example, or blamed the other person.',
                    3 => 'Solved the immediate issue.',
                    5 => 'Listened, solved the issue, and followed up to make sure they were satisfied.',
                ],
                'source' => 'LinkedIn',
            ],
        ],
    ];

    /**
     * Questions interviewers must not ask in the Philippines. Shown beside every
     * kit so the interview itself stays lawful.
     */
    public const DO_NOT_ASK = [
        'Age or date of birth (RA 10911, Anti-Age Discrimination in Employment Act)',
        'Pregnancy, plans to have children, or marital status (Jobstreet PH; RA 9710 Magna Carta of Women)',
        'Religion, ethnicity, or dialect',
        'Sexual orientation or relationships',
        'Who they vote for',
        'Disability, unless about whether they can do the job\'s essential tasks',
    ];

    /** Which role questions fit this job, judged from its title, skills, and industry. */
    public static function roleFor(JobPost $job): string
    {
        $text = mb_strtolower(implode(' ', array_merge(
            [$job->title, $job->employerProfile?->industry],
            $job->required_skills ?? []
        )));

        return match (true) {
            (bool) preg_match('/barista|cafe|coffee|food|beverage|restaurant|service crew|kitchen|cook/', $text) => 'food_service',
            (bool) preg_match('/clinic|patient|front desk|receptionist|health|medical|hospital/', $text) => 'clinic_front_desk',
            (bool) preg_match('/developer|react|laravel|wordpress|webflow|javascript|php|css|software|web/', $text) => 'web_developer',
            (bool) preg_match('/\bbpo\b|call cent|contact cent|customer service representative|\bcsr\b|customer support|technical support|chat support|telesales/', $text) => 'bpo',
            (bool) preg_match('/retail|sales associate|sales clerk|cashier|merchandis|store/', $text) => 'retail',
            default => 'general',
        };
    }

    /** @return array<int, array{competency:string, question:string, anchors:array, source:string}> */
    public static function forJob(JobPost $job): array
    {
        return array_merge(self::GENERAL, self::BEHAVIORAL, self::ROLE[self::roleFor($job)]);
    }
}
