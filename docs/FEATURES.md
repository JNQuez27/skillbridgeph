# SkillBridge PH — Feature Status

**Generated:** 2026-09-25
**Method:** verified against the running codebase — `php artisan route:list`,
`app/Http/Controllers/`, `app/Services/`, `database/migrations/`, and the React
view files. Nothing in this document is assumed; each row names the file or
route that proves it.

---

## 1. Implemented

### 1.1 Authentication & accounts

| Feature | Status | Evidence |
|---|---|---|
| Register as applicant or employer | Done | `POST /register` → `Auth\RegisteredUserController` |
| Login / logout (Laravel session auth) | Done | `POST /login`, `POST /logout` → `Auth\AuthenticatedSessionController` |
| Two roles only: `jobseeker`, `employer` | Done | `users.role` — `add_role_and_names_to_users_table.php` |
| Role-based redirect after signup | Done | employer → `/employer/onboarding`, applicant → `/onboarding` |
| Applicant onboarding wizard | Done | `GET /onboarding` → `JobSeeker/Onboarding.jsx` |
| Employer onboarding (company details) | Done | `GET /employer/onboarding` → `Employer/Onboarding.jsx` |
| Auth user shared to every page | Done | `HandleInertiaRequests::share()` |

### 1.2 Matching engine (core feature)

| Feature | Status | Evidence |
|---|---|---|
| Skill-based scoring (required 60 / preferred 25 / location 10 / experience 5) | Done | `MatchService::score()` |
| Jobs-for-applicant matching | Done | `MatchService::matchesForApplicant()` |
| Candidates-for-job matching | Done | `MatchService::candidatesForJob()` |
| **Autonomous flagging** of fitting jobs onto applicant accounts | Done | `MatchService::syncFlaggedMatches()` |
| Applicants who applied auto-surface to the employer regardless of score | Done | `candidatesForJob()` interest merge |
| Re-match triggered on profile update, badge earned, and job post | Done | `ApplicantProfileController`, `AssessmentAttemptController`, `JobPostController` |

### 1.3 Applicant side

| Feature | Status | Evidence |
|---|---|---|
| Skills & Badges view | Done | `UserProfile.jsx` → `sectionMeta.skills` |
| Credentials & Portfolio upload (CV, certificate, portfolio, **video**) | Done | `POST /credentials` → `CredentialController@store` |
| Demo-video **challenge code** (one-time, 10-min window) | Done | `POST /credentials/challenge` |
| Delete a credential | Done | `DELETE /credentials/{credential}` |
| Job Matches — apply / save | Done | `POST /applications/{jobPost}` |
| Take assessment → **earn a verified badge** | Done | `POST /assessments/{assessment}/attempt` |
| Find Jobs — search all open roles | Done | `UserProfile.jsx` → `sectionMeta.browse` |
| Companies — browse hiring employers | Done | `UserProfile.jsx` → `sectionMeta.companies` |
| Profile settings (headline, bio, location, level, desired roles) | Done | `PUT /applicant-profile` |

### 1.4 Employer side

| Feature | Status | Evidence |
|---|---|---|
| Post a job offer | Done | `POST /job-posts` |
| Create a company assessment | Done | `POST /assessments` |
| **Applicants page** — everyone who applied or was invited | Done | `EmployerDashboard.jsx` → `sectionMeta.applicants` |
| Filter applicants: All / Applied / Invited / Hired | Done | `statusFilter` in `EmployerDashboard.jsx` |
| Candidate Matches (suggested candidates per role) | Done | `sectionMeta.matches` |
| Invite a candidate | Done | `POST /job-posts/{jobPost}/invite/{applicant}` |
| Analytics (applicants per role, top skill demand) | Done | `sectionMeta.analytics` |
| Company profile edit + verification flag | Done | `PUT /employer-profile` |
| Header stats (Roles / Applicants / Hired) | Done | `DashboardController::employerAccount()` |

### 1.5 Credential intelligence & verification

| Feature | Status | Evidence |
|---|---|---|
| Text extraction from PDF | Done | `CredentialAnalyzer::text()` (smalot/pdfparser) |
| Text extraction from DOCX | Done | `CredentialAnalyzer::docxText()` (ZipArchive, no dependency) |
| Skill extraction from document text | Done | `CredentialAnalyzer::skillsIn()` |
| **Duplicate document detection** (sha256 across accounts) | Done | `credentials.sha256` + `CandidateReview` |
| File metadata capture | Done | `CredentialAnalyzer::metadata()` |
| **Private file storage** + authorized serving | Done | `GET /credentials/{credential}/file` |
| Access rule: only applicants who applied/were invited | Done | `CredentialController::mayRead()` |
| **Green / Amber / Red verdict** with named reasons | Done | `CandidateReview::for()` |
| Guardrail: auto-approve only when Green | Done | `CandidateHireController::store()` |
| Hire via system review (auto) or manual review | Done | `POST /job-posts/{jobPost}/hire/{applicant}` |
| Audit trail (who, when, mode, verdict, docs opened) | Done | `add_candidate_review_and_private_credentials.php` |
| Review credentials **always available**, even after hiring | Done | `EmployerDashboard.jsx` review actions |

### 1.6 Data model

14 migrations. Tables: `users`, `applicant_profiles`, `applicant_skills`,
`credentials`, `employer_profiles`, `job_posts`, `applications`,
`company_assessments` (+ Laravel defaults).

### 1.6b Verification by SkillBridge admins (added 2026-10-08)

Each company and certificate is checked **once**, by an admin, against the official
registry; every employer then sees the same recorded result. Tests: `tests/Feature/VerificationTest.php`.

| Feature | Status | Evidence |
|---|---|---|
| `admin` role (never offered at signup) | Done | `php artisan admin:create`, `User::isAdmin()` |
| Admin verification queue (same shell as other dashboards) | Done | `GET /admin` → `AdminController@index`, `SkillBridge/views/AdminDashboard.jsx` |
| Company submits DTI/SEC number + permit | Done | `POST /employer-verification` |
| Only admin-approved companies post jobs and issue badges | Done | `JobPostController::store`, `AssessmentController::store` |
| Renaming an approved company sends it back to pending | Done | `EmployerProfileController::update` |
| TESDA NC / PRC license sent for a registry check | Done | `POST /credentials` (`registry`, `registryNumber`, `registryQualification`) |
| TESDA lookup link pre-filled with the account name + certificate digits | Done | `AdminController::lookupUrl` |
| PRC checked by hand (site uses reCAPTCHA; never automated) | Done | `AdminController::lookupUrl` |
| Approved certificate becomes a `registry` badge with its evidence locked | Done | `AdminController::decideCredential` |
| Rejected certificate turns the candidate Red | Done | `CandidateReview::for` |
| Badge trust tiers (Self-reported < Assessment < Employer-confirmed < Registry) | Done | `SkillBar.jsx` |
| Employer list ranked: engaged, then Green > Amber > Red, then score | Done | `DashboardController::employerAccount` |
| Assessment questions and options shuffled per attempt | Done | `CompanyAssessment::shuffledOrder/correctAnswers` |

### 1.6c Account safety and job lifecycle (added 2026-10-09)

Tests: `tests/Feature/AccountSafetyTest.php`.

| Feature | Status | Evidence |
|---|---|---|
| Privacy Notice page (RA 10173) | Done | `GET /privacy` → `Privacy.jsx` |
| Signup requires accepting the notice; time recorded | Done | `users.privacy_accepted_at` |
| Registry check requires explicit consent; time recorded | Done | `credentials.registry_consent_at` |
| Login limited to 5 tries per account + IP per minute | Done | `AuthenticatedSessionController::store` |
| Password reset (single-use, 60-minute link) | Done | `PasswordResetController`, `ResetPassword.jsx` |
| Jobs past their closing date disappear everywhere | Done | `JobPost::scopeOpen` |
| Employer closes a role as filled / cancelled | Done | `POST /job-posts/{jobPost}/close` |

### 1.6d Structured interviews and assessment content (added 2026-10-30)

Tests: `tests/Feature/InterviewKitTest.php`.

| Feature | Status | Evidence |
|---|---|---|
| Interview kit per job: 8 questions (2 general, 3 behavioral, 3 role-specific) with 1/3/5 scoring anchors and a source per question | Done | `app/Support/InterviewKit.php` |
| Role detection (food service / clinic front desk / web developer / BPO / retail / general) | Done | `InterviewKit::roleFor` |
| "Do not ask" list shown with every kit (RA 10911, RA 9710) | Done | `InterviewKit::DO_NOT_ASK` |
| Employer scores an engaged candidate 1-5 per question; questions snapshotted; stage moves to Interviewing | Done | `POST /job-posts/{jobPost}/interview/{applicant}` |
| Interview score shown on Applicants and Matches | Done | `EmployerDashboard.jsx` (`InterviewChip`) |
| Seeded assessments rewritten: job-knowledge facts from official docs/regulations + situational-judgment items; sources noted per question | Done | `DatabaseSeeder.php` |

### 1.6e Tagline proof and honest demo data (added 2026-11-03)

| Item | Evidence |
|---|---|
| End-to-end proof of "Smart hiring starts with verified skills" (admin-checked company, typed vs earned skill, ranking, Green, auto-hire guardrail); mutation-checked | `tests/Feature/TaglineProofTest.php` |
| Every demo badge earned the way the platform grants it: a passed company assessment, or an evidence review by a company the applicant applied to, for a skill its role lists. Unearned skills stay self-reported. No "Demo data" issuer remains | `database/seeders/EarnsBadges.php`, `tests/Feature/SeedProvenanceTest.php` |

### 1.6f Hands-on video that cannot be faked cheaply (added 2026-11-03)

Tests: `tests/Feature/LiveVideoTest.php` (mutation-checked).

| Protection | Stops | Evidence |
|---|---|---|
| Recorded in SkillBridge with the camera; no video file upload | Edited, spliced, pre-made files | `VideoRecorder.jsx`, `CredentialController::store` |
| 3 prompts (code, random action, second code) revealed by the server only when due; upload refused before the last prompt + 10 s, or after 15 min | Pre-made or AI-generated clips, splicing | `CredentialController::startRecording/recordingPrompts` |
| Interviewer answers "same person as the video?" and "repeated the task live?"; "different person" turns the candidate Red for that role | Stand-ins | `PipelineController::interview`, `CandidateReview` |
| A skill can be confirmed from a video only after both answers are Yes | Badges from a fake video | `PipelineController::verifySkill` |
| Not done: AI-video detection (detectors generalize poorly), signed camera capture (C2PA) is roadmap | | |

### 1.7 Tooling & documentation

| Item | Purpose | File |
|---|---|---|
| Architecture map generator | Locate any feature quickly | `tools/map.php` → `ARCHITECTURE.md` |
| Analyzer self-check (10 assertions) | Guards parsing + verdict rules | `tools/check_analyzer.php` |
| Performance harness | Internal hot paths | `tools/lab_stress.php` |
| Scale/stress harness | Scaling curve | `tools/lab_scale.php` |
| HTTP latency/concurrency harness | Endpoint timing | `tools/lab_http.sh` |
| Lab results (WPR 09) | Operational check | `docs/LAB-RESULTS-WPR09.md` |
| Seeded demo data | 4 employers, 7 jobs, 11 applicants, 5 assessments | `database/seeders/DatabaseSeeder.php` |

---

## 2. Not yet implemented

### 2.1 Confirmed gaps (verified absent)

| # | Feature | Evidence of absence | Impact |
|---|---|---|---|
| G1 | ~~Password reset~~ **Done 2026-10-09** — row kept for history: | `GET /forgot-password` exists but there is **no POST route** and the page contains no submit logic | Users cannot recover an account |
| G2 | ~~Shortlist / Interview pipeline stages~~ **Done** (`PipelineController@stage`, `shortlistGreen`) — row kept for history: | Only `saved, applied, flagged` (`ApplicationController`), `invited` (`InviteController`), `hired` (`CandidateHireController`) can be set. `shortlisted`/`interviewing` appear only in read filters | Employer jumps straight from applied to hired |
| G3 | **Assessment result history** | Passing verifies the skill but no score/date row is stored | Applicant cannot see past attempts or scores |
| G4 | **Assign an assessment to a specific applicant** | No route; assessments are visible to all applicants | Employer cannot require an assessment per candidate |
| G5 | **Notifications / messaging** | No route, no table | Invites and hires are silent — user must check the dashboard |
| G6 | **Email verification** | `Registered` event fires but no verification route or `MustVerifyEmail` | Emails are unverified |
| G7 | ~~Automated test suite~~ **Done 2026-10-08** | `php artisan test`: 25 feature tests (`CoreFlowsTest`, `TrustRulesTest`, `LandingPageTest`), mutation-checked | — |
| G8 | **Portfolio items as records** | Portfolio = uploaded credential files only; no title/URL/description entity | Cannot link live project URLs |
| G9 | **Employer-side credential search/filter** | Applicants page filters by status only | Cannot filter by verdict or skill |

### 2.2 Deliberately excluded (documented decision)

| Feature | Reason |
|---|---|
| **AI-generated content detection** | Detectors are unreliable and demonstrably flag non-native English writers, which would falsely reject Filipino applicants. The system verifies **provenance** (duplicate hashes, assessment results, challenge codes) instead. Rationale recorded in `app/Services/CredentialAnalyzer.php` |
| Automated video content analysis | Same reliability problem. Replaced by the one-time challenge code the employer checks by eye |

### 2.3 Performance work (from `docs/LAB-RESULTS-WPR09.md`)

| # | Action | Finding |
|---|---|---|
| R1 | Load the applicant pool once per render instead of per job | F1 — employer dashboard is super-linear: 46.5× applicants → 90× slower |
| R2 | Pre-filter candidates in SQL by skill overlap | F1 |
| R3 | Batch the duplicate-hash check into one query | F2 — N+1, queries grew 48 → 341 |
| R4 | Re-test on PHP-FPM/nginx + PostgreSQL | F3/F4 — dev server is single-threaded |

### 2.4 Deployment readiness

| Item | Current state |
|---|---|
| Database | **SQLite** (`database/database.sqlite`) — `.env` no longer points at Neon PostgreSQL |
| Environment | `APP_ENV=local`, `APP_DEBUG=true` |
| Container build | `Dockerfile` present: installs `pdo_pgsql`, runs migrations at boot, no baked `.env` |
| Outstanding | Set production env vars on the host, point `DB_*` at a managed database, rotate any credentials shared during development |

---

## 3. Summary

| Area | Implemented | Remaining |
|---|---|---|
| Authentication & onboarding | 7 | 2 (G1, G6) |
| Matching engine | 6 | 0 functional (3 performance items) |
| Applicant features | 9 | 2 (G3, G8) |
| Employer features | 9 | 3 (G2, G4, G9) |
| Credential verification | 12 | 0 functional |
| Platform | tooling, docs, seeders | 1 (G7 tests) |

**The core proposition is complete and working**: autonomous two-way matching,
assessment-verified skill badges, credential upload with parsing and duplicate
detection, private authorized document access, an explainable review verdict,
and audited hiring by either system approval or manual review.

**The remaining work is mostly workflow depth** (pipeline stages, notifications,
assessment history) plus **account recovery (G1)**, **test coverage (G7)**, and
the **three performance fixes** before production scale-out.
