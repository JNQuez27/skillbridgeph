# SkillBridge PH

**A skills-based job matching platform for the Philippines.** SkillBridge PH connects
verified talent with real hiring demand by matching applicants to employer job posts
**autonomously**, based on proof-of-skill rather than resumes alone.

> Smart hiring starts with verified skills.

---

## What it does

SkillBridge PH is a two-sided platform:

- **Applicants (job seekers)** build a skills-based profile, earn verified skill badges
  (via assessments, scenarios, or portfolio review), upload their credentials, and state
  the roles they want. The system then **automatically surfaces jobs that fit them** and
  flags those matches to their account — the applicant only picks the ones truly suited to them.
- **Employers** post job offers and company assessments, and the system **automatically
  ranks matching candidates** by verified-skill fit so they can shortlist and invite quickly.

The connecting layer between both sides is the **autonomous matching engine**.

---

## Core feature — Autonomous skill matching

Matching runs automatically in both directions from a single scoring function
([`resources/js/Pages/SkillBridge/utils/matching.js`](resources/js/Pages/SkillBridge/utils/matching.js)):

| Signal | Weight | Notes |
|---|---:|---|
| Required skills matched | up to **60%** | share of a job's required skills the candidate has (verified skills preferred) |
| Preferred skills matched | up to **25%** | share of a job's preferred/nice-to-have skills |
| Location match | **10%** | candidate location overlaps the job's city/region |
| Experience level match | **5%** | candidate level equals the job's required level |

The result is a **0–100 match score**. The platform then:

- **For applicants** — flags jobs scoring **≥ 60%** to the account's **Matches** section, so
  fitting roles find the applicant instead of the applicant hunting blindly.
- **For employers** — surfaces candidates scoring **≥ 70%** per job post, ranked highest-first,
  ready to shortlist or invite.

Because both sides feed the same engine, matching is **autonomous**: as soon as an employer
posts a role or an applicant updates their verified skills/credentials, new matches appear on
the relevant accounts without any manual search.

---

## Roles & key screens

**Public dashboard** (no account required) — landing/overview with how-it-works, industries,
employer preview, testimonials, and FAQs, plus scroll animations and a section-aware nav.

**Applicant account**
- **Skills & Badges** — verified skill badges and badge pathways (assessment / scenario / portfolio).
- **Portfolio** — showcased work and case studies.
- **Matches** — jobs the engine flagged as a fit, with per-job match breakdown.
- **Assessments** — company assessments and results.
- **Credential upload** — resume/CV, certificates, and portfolio evidence.

**Employer account**
- **Job offers** — post and manage roles with required/preferred skills.
- **Assessments** — build company assessments with auto-scoring.
- **Matches** — ranked candidate recommendations per role.
- **Analytics** — hiring funnel and top skill demand.
- **Invite candidates** — reach out to top-matched applicants.

---

## Tech stack

- **Backend:** [Laravel 12](https://laravel.com) (PHP 8.2+)
- **Frontend:** [React 18](https://react.dev) via [Inertia.js](https://inertiajs.com)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com) + inline design tokens
- **Build:** [Vite 7](https://vitejs.dev)
- **Database:** SQLite (default; swappable to MySQL/PostgreSQL)
- **Fonts:** Lexend (display) + Source Sans 3 (body)
- **Palette:** professional blue `#0369A1` + verified-green `#16A34A`

---

## Project structure

```
resources/js/Pages/
├─ SkillBridge/
│  ├─ SkillBridgePage.jsx        # shared shell + top nav + profile menu
│  ├─ views/
│  │  ├─ GeneralDashboard.jsx     # public dashboard
│  │  ├─ UserProfile.jsx          # applicant account (Skills/Portfolio/Matches/Assessments)
│  │  └─ EmployerDashboard.jsx    # employer workspace
│  ├─ utils/matching.js           # ⭐ the matching engine
│  ├─ components/Icons.jsx        # line icons
│  └─ data/mockData.js            # sample data (see Project status)
└─ JobSeeker/                      # auth flow (login / signup / onboarding)
```

---

## Getting started

```bash
# 1. Install dependencies
composer install
npm install

# 2. Configure environment
cp .env.example .env
php artisan key:generate

# 3. Set up the database (SQLite by default)
touch database/database.sqlite
php artisan migrate

# 4. Run the app (Laravel + Vite)
php artisan serve      # http://localhost:8000
npm run dev            # Vite dev server (separate terminal)
```

Build for production with `npm run build`.

---

## Deployment

A [`Dockerfile`](Dockerfile) and `docker/` config are included for container deployment
(e.g. Render). Build the image and run migrations as part of the release step.

---

## Project status

The product design and the **matching engine** are implemented, along with the full
UI for the public dashboard, applicant account, employer workspace, and auth flow.

**In progress toward a fully autonomous, multi-user system:**

- [ ] Persist jobs, profiles, and matches in the Laravel database (replacing in-browser sample data)
- [ ] Real cross-account matching (employer posts → applicant accounts flagged automatically)
- [ ] Applicant credential file uploads (resume/CV, certificates) with storage
- [ ] Remove remaining hardcoded sample data in favor of real records

See [`SYSTEM_DEMO.md`](SYSTEM_DEMO.md) for a walkthrough of the current demo.

---

## License

Released under the [MIT license](https://opensource.org/licenses/MIT).
