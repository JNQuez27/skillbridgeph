# SkillBridge PH

**A skills-based job matching platform for the Philippines.** SkillBridge PH ranks
applicants by **verified proof of skill** — assessments, reviewed work samples and
official registry checks — instead of what a resume claims.

> Smart hiring starts with verified skills.

**Live demo:** https://skillbridgeph.onrender.com (free Render instance — the first visit
after a quiet period can take up to a minute to wake up).

---

## What it does

| Role | What they can do |
|---|---|
| **Guest** | Browse open jobs from verified companies (`/jobs`); verify a shared badge link (`/verify/{id}`). |
| **Applicant** | Set up a profile in 3 steps, declare skills (saved as *pending*), take assessments and practical tasks to earn verified badges, link portfolio work samples to skills, browse and filter jobs with a per-job score breakdown, apply, accept or decline invitations, and track each application. |
| **Employer** | Submit DTI/SEC registration for verification, post jobs with per-skill weights and minimum levels, attach an assessment, see candidates ranked by proof, invite the top ten in one click, score practical tasks with a rubric, run structured interviews, and read hiring analytics. |
| **Admin** | Approve or reject companies and TESDA/PRC certificates against the official registries, and moderate company assessments (suspend / reinstate with a reason). |

The system follows the 21 figures of the SkillBridge PH patent drawing set; each figure
has its own feature test in [`tests/Feature`](tests/Feature) (`Figure2RolesTest` …
`Figure21MobileTest`).

---

## How a skill becomes proof

1. **Sign up** — choose Job seeker or Employer; the account works right away (no email confirmation step).
2. **Declare skills** — every declared skill starts as **Pending**; the Skills tab
   recommends assessments that can verify them.
3. **Earn the badge** — one of:
   - **Company assessment** — timed, shuffled questions scored on the server; optional
     **practical task** with a work file, scored by the employer's **rubric**.
     3 attempts, a 24-hour cooldown after a fail, then the skill is marked *Unverified*.
   - **Evidence review** — an employer the applicant applied to confirms the skill from
     an uploaded file.
   - **Registry check** — an admin confirms a TESDA certificate or PRC license.
4. **Badge** — every verified badge gets a unique ID (`SB-XXXX-XXXX`), is linked to the
   assessment result that earned it, and can be shared through a public verification link
   that stays **off** until its holder turns it on.

Employers are verified too: a company submits its DTI/SEC number and permit, an automatic
pre-check flags mismatches, and an **admin always makes the final decision**. Only verified
companies can post jobs or issue badges.

---

## The matching engine

[`app/Services/MatchService.php`](app/Services/MatchService.php) scores every applicant
against every open job in five steps:

| Unit | What it does |
|---|---|
| **Preference filter** | Hides jobs outside the applicant's chosen work setups / job types (empty = any). |
| **Skill alignment** | Which required and preferred skills the applicant holds. |
| **Proficiency** | Only a verified badge has a proven level, so only it can meet an employer's minimum level. |
| **Verification weighting** | Verified skill **100%** · claimed + linked work sample **80%** · bare claim **60%**. |
| **Score combiner** | Required skills up to **60**, preferred up to **25**, location **10**, experience **5** → 0–100. |

Each skill also carries the employer's weight (1–5). Outputs: the match percentage, the
employer's ranked list (with a dashed **top-ten** line), the one-click **invite top 10**, and
the applicant's job feed. Every job card shows "How this score was computed".

Also included: in-app and email notifications for application changes, a structured
interview kit per job, employer analytics (hiring funnel and skill gap), and a phone layout
with a bottom navigation bar, badge wallet and job feed.

---

## Tech stack

- **Backend:** [Laravel 12](https://laravel.com) (PHP 8.2+)
- **Frontend:** [React 18](https://react.dev) via [Inertia.js](https://inertiajs.com)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com) + inline design tokens
  ([`styles/ui.js`](resources/js/Pages/SkillBridge/styles/ui.js))
- **Build:** [Vite 7](https://vitejs.dev)
- **Database:** PostgreSQL (Docker / Render); SQLite for quick local development
- **Email:** [Brevo](https://www.brevo.com) HTTPS API (`MAIL_MAILER=brevo`); `log` locally
- **Fonts:** Lexend (display) + Source Sans 3 (body)
- **Palette:** orange `#ECA406` (buttons, badges, logo, footer) with bold black `#1A1A1A` text; no blue, green or brown

---

## Project structure

```
app/
├─ Services/
│  ├─ MatchService.php        # matching engine (5 units)
│  ├─ CandidateReview.php     # Green / Amber / Red checks per candidate
│  ├─ CompanyPreCheck.php     # automatic DTI/SEC permit pre-check
│  └─ CredentialAnalyzer.php  # reads uploaded files, finds skills and duplicates
├─ Http/Controllers/          # dashboard, jobs, applications, pipeline, assessments, admin, auth
├─ Notifications/             # application status, task scored, invitation answered, moderation
├─ Support/InterviewKit.php   # structured interview questions per job
└─ Models/                    # User, ApplicantProfile, ApplicantSkill, JobPost, Application, ...

resources/js/Pages/
├─ SkillBridge/
│  ├─ SkillBridgePage.jsx     # shared shell: top nav, bell, phone bottom nav
│  ├─ views/                  # GeneralDashboard, PublicJobs, UserProfile, EmployerDashboard, AdminDashboard
│  ├─ components/             # SkillBar, VideoRecorder, RegistryStatus, PreCheckList, Icons
│  └─ styles/                 # design tokens + global CSS
├─ JobSeeker/                 # sign up, login (job seeker / employer), password reset, onboarding
├─ Employer/                  # employer onboarding
└─ VerifyBadge.jsx            # public badge verification page

tests/Feature/                # 130+ feature tests, one file per patent figure
```

---

## Getting started (local)

```bash
composer install
npm install

cp .env.example .env
php artisan key:generate

php artisan migrate --seed   # SQLite by default; --seed loads the demo data

php artisan serve            # http://localhost:8000
npm run dev                  # Vite dev server (separate terminal)
```

Run the tests with `php artisan test`. Build assets for production with `npm run build`.

**Demo accounts** (locally the password is `password123`):
`admin@skillbridge.ph` · `employer@skillbridge.ph` · `cleo.ramos@skillbridge.ph` · `demo@skillbridge.ph`.
On the live site they use the `DEMO_PASSWORD` set on Render instead.

To create a real admin: `php artisan admin:create you@example.com`.

---

## Running with Docker

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).
[`docker-compose.yml`](docker-compose.yml) runs **app** (Nginx + PHP-FPM, port 8080) and
**db** (PostgreSQL 16, port 5432).

```bash
docker compose up -d --build                                # app at http://localhost:8080
docker compose exec app php artisan migrate:fresh --seed --force
docker compose exec app chown -R www-data:www-data storage bootstrap/cache
docker compose down        # stop, keep data
docker compose down -v     # stop and DELETE the database and uploads
```

Run the `chown` after seeding: the seed runs as root, and the web server must be able to
write uploads into the same folders.

---

## Deployment (Render)

[`render.yaml`](render.yaml) describes the service: a Docker web service plus PostgreSQL,
connected through `DB_URL`. Migrations run on every start; with `SEED_DEMO=true` the demo
data is loaded **only into an empty database** and **never** with a missing
`DEMO_PASSWORD` in production.

Secrets to set on Render: `APP_KEY` (`php artisan key:generate --show --no-ansi`),
`DEMO_PASSWORD`, `BREVO_API_KEY` and `MAIL_FROM_ADDRESS` (a sender verified in Brevo).

Free-plan limits worth knowing:

- Outbound **SMTP is blocked**, which is why email goes through Brevo's HTTPS API.
- No persistent disk: **uploaded files are lost on every restart or redeploy**
  (database records stay). Use a paid instance with a disk on `/var/www/storage/app`.
- The free PostgreSQL database expires after 30 days unless upgraded.

---

## License

Released under the [MIT license](https://opensource.org/licenses/MIT).
