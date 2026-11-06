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
([`app/Services/MatchService.php`](app/Services/MatchService.php)):

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
- **Database:** PostgreSQL 16 (Docker) or Neon; SQLite for quick local dev
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
│  ├─ styles/ui.js               # shared design tokens (palette + fonts)
│  └─ components/Icons.jsx        # line icons
└─ JobSeeker/                      # auth flow (login / signup / onboarding)

app/
├─ Services/MatchService.php      # ⭐ the matching engine
├─ Http/Controllers/              # dashboard, jobs, credentials, assessments, invites
└─ Models/                        # User, ApplicantProfile, JobPost, Application, ...
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

# 3. Set up the database (set DB_* in .env — Postgres/MySQL/SQLite)
php artisan migrate

# 4. Run the app (Laravel + Vite)
php artisan serve      # http://localhost:8000
npm run dev            # Vite dev server (separate terminal)
```

Build for production with `npm run build`.

---

Demo data is never loaded automatically. To load it locally: `php artisan db:seed`.

---

## Running with Docker

Requires [Docker Desktop](https://www.docker.com/products/docker-desktop/).
`docker-compose.yml` defines two services: **app** (Nginx + PHP-FPM) and **db** (PostgreSQL 16).

```bash
# Full stack - app at http://localhost:8080, database in a container
docker compose up -d --build

# Optional: load demo data
docker compose exec app php artisan db:seed --force

# Logs / stop / reset
docker compose logs -f app
docker compose down        # stop, keep data
docker compose down -v     # stop and DELETE the database and uploads
```

**Database only** - keep `php artisan serve` for development, but use the same
engine as production instead of SQLite:

```bash
docker compose up -d db
# then in .env: comment DB_CONNECTION=sqlite and uncomment the DOCKER POSTGRES block
php artisan migrate
```

Data lives in named volumes (`pgdata`, `uploads`), so it survives restarts and rebuilds.

---

## Deployment

The same [`Dockerfile`](Dockerfile) runs on any container host (Render, Railway, Fly.io,
a VPS). Set `APP_KEY` and the `DB_*` variables in the host's environment settings -
`.env` is never copied into the image. Migrations run on container start; seeders do not.

Uploaded credentials are written to `storage/app`, so the host must provide a
**persistent disk** there (or the storage driver must be switched to object storage).
Serverless platforms such as Vercel have no persistent disk and no PHP runtime, so
they cannot host this application.

---

## Project status

The system is database-backed and functional end to end.

- [x] Jobs, profiles, skills, applications, and matches persisted in the database
- [x] Real cross-account matching (employer posts → applicant accounts flagged automatically)
- [x] Credential uploads — CVs, certificates, portfolios, and hands-on demo videos
- [x] Badge verification via company assessments with real HR questions (IT / food service / healthcare)
- [x] Session auth with role-based applicant and employer dashboards

**Not yet implemented:**

- [ ] Employer assessment assignment
- [ ] Automatic TESDA registry lookup (admin uses a pre-filled link for now)

**Admin:** create one with `php artisan admin:create you@example.com`, then sign in and open `/admin`
to approve companies (DTI/SEC) and certificates (TESDA/PRC). The demo seeder adds `admin@skillbridge.ph`.

---

## License

Released under the [MIT license](https://opensource.org/licenses/MIT).
