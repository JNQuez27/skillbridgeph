# WPR 09 — Operational Check: Lab Results

**System:** SkillBridge PH
**Activity:** Internal Validation — stress testing and performance log analysis
**Setting:** Controlled lab environment (single workstation, isolated, no external traffic)
**Date of run:** 2026-09-25
**Prepared from:** live measurements only. Every figure below was produced by a
command listed in §3 and can be reproduced. No value in this document is
estimated or assumed.

---

## 1. Objective

Establish whether SkillBridge PH functions correctly and acceptably under load,
identify the dominant performance cost, and record any defects surfaced by the
run. The system under test is the running application, not a mock.

## 2. Environment under test

Captured at run time, not assumed:

| Property | Value |
|---|---|
| CPU | 12th Gen Intel Core i5-12500H, 16 logical cores |
| RAM | 23.7 GB |
| OS | Windows |
| PHP | 8.2.12 |
| Framework | Laravel 12.56.0 |
| Node | v22.14.0 |
| Web server | `php artisan serve` (PHP built-in dev server) |
| Database | **SQLite** — `database/database.sqlite` (156 KB) |
| APP_ENV / APP_DEBUG | `local` / `true` |

> **Material note.** The `.env` in the tested build points at SQLite, *not* the
> Neon PostgreSQL instance configured earlier in development. Results below
> describe the SQLite build. `APP_ENV=local` with `APP_DEBUG=true` is a
> development configuration; absolute latencies are therefore not production
> figures. This is recorded as limitation L1 (§7).

**Dataset at time of test**

| Table | Rows |
|---|---:|
| users | 15 |
| applicant_profiles | 11 |
| employer_profiles | 4 |
| job_posts | 7 |
| applicant_skills | 51 |
| applications | 17 |
| company_assessments | 5 |
| credentials | 3 |

## 3. Method and sources

Three harnesses were written for this check and committed to the repository, so
the results are re-runnable rather than one-off:

| Harness | File | Command |
|---|---|---|
| Internal hot paths | `tools/lab_stress.php` | `php tools/lab_stress.php 5` |
| Scale / stress curve | `tools/lab_scale.php` | `php tools/lab_scale.php` |
| HTTP latency & concurrency | `tools/lab_http.sh` | `bash tools/lab_http.sh http://localhost:8000 20 20` |

Supporting evidence:

- Application log: `storage/logs/laravel.log`
- Code under measurement: `app/Services/MatchService.php`,
  `app/Services/CandidateReview.php`, `app/Http/Controllers/DashboardController.php`
- Architecture map: `ARCHITECTURE.md` (regenerate via `php tools/map.php`)

The scale harness seeds synthetic applicants prefixed `labtest-` and deletes
them in a `finally` block, so a failed run cannot leave test data behind.
Cleanup was verified after the run (§4.2).

---

## 4. Results

### 4.1 Internal hot paths — `php tools/lab_stress.php 5`

Dataset: 7 open jobs, 11 applicants, 51 skills. 5 repeats.

| # | Operation | min | median | mean | max | Notes |
|---|---|---:|---:|---:|---:|---|
| 1 | `MatchService::score()` (CPU only) | — | — | — | — | 20,000 scores in 1.52 s = **13,166 scores/sec**, 76.0 µs each |
| 2 | `matchesForApplicant()` per applicant | 0.79 | 1.08 | 1.19 | 6.17 ms | 55 calls |
| 3 | `candidatesForJob()` per job | 2.01 | 2.33 | 2.66 | 10.39 ms | 35 calls |
| 4 | Employer dashboard workload | 20.54 | 21.95 | 21.85 | 23.22 ms | **48 queries per run** |
| 5 | `syncFlaggedMatches()` all applicants | 8.44 | 9.03 | 9.59 | 12.18 ms | autonomous flagging |

Peak memory: **24.0 MB**.

### 4.2 Scale / stress curve — `php tools/lab_scale.php`

Applicant pool grown synthetically; jobs held constant at 7.

| Applicants | Jobs | `candidatesForJob` (ms) | Employer workload (ms) | Queries |
|---:|---:|---:|---:|---:|
| 11 | 7 | 2.34 | 21.91 | 48 |
| 61 | 7 | 7.80 | 67.08 | 78 |
| 211 | 7 | 86.70 | 724.04 | 166 |
| 511 | 7 | 211.50 | 1,873.09 | 341 |

Cleanup verified: *"removed 500 synthetic applicants; remaining applicants: 11"*.
Peak memory 30.0 MB.

**Growth is super-linear.** A **46.5×** increase in applicants (11 → 511)
produced a **90.4×** increase in per-job cost (2.34 → 211.50 ms) and an
**85.5×** increase in the full employer dashboard workload
(21.91 → 1,873.09 ms). At 511 applicants the employer dashboard spends
**~1.9 seconds** in matching alone, before rendering.

### 4.3 HTTP latency — `bash tools/lab_http.sh ... 20 20`

Sequential, n = 20 per endpoint, best observed run:

| Endpoint | min | median | p95 | max | HTTP |
|---|---:|---:|---:|---:|---|
| `GET /` (public dashboard) | 305.5 | 320.5 | 345.8 | 361.2 ms | 200 |
| `GET /login` | 319.1 | 332.9 | 525.3 | 540.3 ms | 200 |
| `GET /dashboard` (applicant) | 356.1 | 368.3 | 387.1 | 389.5 ms | 200 |
| `GET /dashboard` (employer) | 368.7 | 376.3 | 394.9 | 409.8 ms | 200 |

No non-200 responses were observed on any sequential run.

### 4.4 Concurrency — 20 parallel requests, heaviest path

| Metric | Value |
|---|---|
| Requests | 20 |
| HTTP 200 | 20 |
| Errors | **0** |
| Wall time | 3.79 s |
| Throughput | 5.3 req/s |
| Latency min / median / max | 369.4 / 1,925.8 / 3,290.3 ms |

**Correctness held under concurrency — zero errors, zero failed requests.**
Latency degraded sharply: median rose from 376 ms (sequential) to 1,926 ms, and
worst case to 3,290 ms.

### 4.5 Log analysis — `storage/logs/laravel.log` (88 KB)

| Level | Count |
|---|---:|
| EMERGENCY / ALERT / CRITICAL | 0 |
| ERROR | 7 |
| WARNING | 0 |

All 7 ERROR entries are dated **2026-09-24, 20:33–20:34**, and are the same
defect: `Target class [DatabaseSeeder] does not exist` — raised when
`db:seed` was invoked while the seeder class was absent. The seeder has since
been restored; the class now exists and seeding succeeds.

**Entries dated 2026-09-25 (the entire test window): 0.** The stress, scale, and
HTTP runs produced no errors, warnings, or exceptions.

### 4.6 Measurement variance (control check)

Two consecutive baseline runs, identical configuration, n = 15:

| Run | `/dashboard` (employer) median |
|---|---:|
| 1 | 376.5 ms |
| 2 | 652.4 ms |

Run-to-run spread of ~73% on an unchanged system. A separate trial with
`config:cache` + `route:cache` enabled fell inside this band, so **no claim is
made about the effect of config/route caching** — this environment cannot
resolve differences of that size. Only large effects (§4.2, ~90×) are
conclusive here. Caches were cleared after the trial.

---

## 5. Findings

**F1 — Employer dashboard cost grows super-linearly with the applicant pool.**
Evidence: §4.2. Root cause in `app/Services/MatchService.php`:
`candidatesForJob()` executes `ApplicantProfile::with(['skills','user'])->get()`
— a full load of every applicant — and it is invoked **once per job**. With 7
jobs and 511 applicants that is 7 full-table loads and ~3,577 profile
hydrations plus scoring per dashboard render.

**F2 — Per-candidate query fan-out (N+1).**
Evidence: query count rose 48 → 341 as the pool grew (§4.2).
`CandidateReview::for()` issues a `Credential::whereIn(...)->exists()` duplicate
check for each candidate, and `DashboardController::signalsFor()` calls
`loadMissing()` per applicant. Both scale with the number of candidates
returned, not with a constant.

**F3 — The test web server is single-threaded.**
Evidence: §4.4. `php artisan serve` (PHP's built-in server) processes one
request at a time, so 20 concurrent requests queue. Throughput of 5.3 req/s is a
property of the dev server, **not** of the application code, and should not be
read as a production capacity figure.

**F4 — The tested build is not production-configured.**
Evidence: §2. `APP_ENV=local`, `APP_DEBUG=true`, SQLite single-file database.
Debug mode collects additional diagnostics on every request.

**F5 — No functional defects surfaced.**
Evidence: §4.3, §4.4, §4.5. All endpoints returned 200, concurrency produced
zero errors, and no log entries were generated during the test window.

---

## 6. Recommendations

| ID | Action | Addresses | Rationale |
|---|---|---|---|
| R1 | Load the applicant pool **once** per dashboard render and score all jobs against that in-memory set, instead of re-querying inside `candidatesForJob()` per job | F1 | Removes the repeated full-table load; the dominant cost |
| R2 | Pre-filter candidates in SQL by skill overlap before scoring, rather than scoring every applicant | F1 | Scoring is 76 µs each (§4.1 #1) — the cost is volume, not the algorithm |
| R3 | Batch the duplicate-hash check into one query per render instead of one per candidate | F2 | Collapses the N+1 fan-out |
| R4 | Re-test on the deployment target (PHP-FPM/nginx per `Dockerfile`, PostgreSQL) before quoting any capacity number | F3, F4 | Current figures reflect a single-threaded dev server + SQLite |
| R5 | Re-run §4.2 after R1–R3 and compare the curve | F1, F2 | The 46.5× → 90.4× relationship is the regression test |

Priority: **R1 and R3 first** — they target the measured bottleneck directly and
require no infrastructure change.

---

## 7. Limitations

- **L1** — Development configuration (SQLite, `APP_DEBUG=true`, dev server).
  Absolute latencies are not production figures.
- **L2** — High run-to-run variance (§4.6) on a shared desktop OS. Only
  order-of-magnitude effects are treated as conclusive.
- **L3** — Synthetic applicants in §4.2 carry 4 verified skills each drawn from a
  fixed pool; a real population would have a wider skill distribution. The shape
  of the curve is valid; exact millisecond values would differ.
- **L4** — Concurrency tested to 20 parallel requests on one host only.
- **L5** — Neon PostgreSQL was not exercised in this run (§2).

---

## 8. Operational check verdict

| Criterion | Result |
|---|---|
| Core flows reachable and returning 200 | **Pass** (§4.3) |
| Correct behaviour under 20× concurrency | **Pass** — 0 errors (§4.4) |
| Errors/exceptions during test window | **Pass** — 0 entries (§4.5) |
| Memory stability under 46× data growth | **Pass** — 24.0 → 30.0 MB peak (§4.1, §4.2) |
| Performance headroom at scale | **Attention required** — F1, F2 (§4.2) |

**Overall: operational, with a scaling defect identified and localised.**
The system is functionally correct and stable under the load applied. It is fit
for demonstration and pilot use at the current data volume. Before production
scale-out, R1–R3 should be applied and §4.2 re-run, because the employer
dashboard reaches ~1.9 s of matching work at 511 applicants and the trend is
super-linear.

---

## 9. Reproduction

```bash
# 1. start the system
php artisan serve --port=8000

# 2. internal hot paths (5 repeats)
php tools/lab_stress.php 5

# 3. scale curve (seeds and removes synthetic applicants)
php tools/lab_scale.php

# 4. HTTP latency + concurrency (20 samples, 20 parallel)
bash tools/lab_http.sh http://localhost:8000 20 20

# 5. log analysis
grep -cE "\.(ERROR|CRITICAL|ALERT|EMERGENCY):" storage/logs/laravel.log
```
