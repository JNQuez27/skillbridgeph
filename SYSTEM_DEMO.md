SkillBridge PH is a Laravel 12 + Inertia.js (React) web system that showcases a role-aware talent marketplace experience for jobseekers and employers. It delivers a single-page shell that switches views based on auth state and role, with onboarding, dashboards, and browse flows rendered as React pages. The demo emphasizes UI/UX and interaction patterns using mock data and localStorage state while the backend provides routing and app scaffolding. Current routes cover public entry, authentication, onboarding, and role-specific dashboards to illustrate the end-to-end user journey.

# SkillBridge PH System Demonstration

## Purpose
This document provides a concise, end-to-end walkthrough of the SkillBridge PH system for demo or presentation use. It summarizes the current UI, routes, and user flows based on the existing codebase.

## Tech Stack (Current)
- Backend: Laravel 12 with Inertia.js (React adapter)
- Frontend: React 18, Vite
- UI: Tailwind utility classes (auth/onboarding) + inline styled React views (SkillBridge)
- Data: Mock data in the frontend and browser localStorage session state

## App Entry and Routing
Routes are configured in routes/web.php:
- / -> SkillBridge/SkillBridgePage
- /login -> JobSeeker/Login
- /signup -> JobSeeker/Signup
- /forgot-password -> JobSeeker/ForgotPassword
- /onboarding -> JobSeeker/Onboarding
- /dashboard?role=jobseeker|employer -> SkillBridge/SkillBridgePage (role-aware)

SkillBridge/SkillBridgePage is the main shell that swaps views based on auth state and role.

## Roles and Core Views
### Public (Unauthenticated)
- Landing (SkillBridge Landing)
- General Dashboard (Overview)
- Browse Jobs (Features placeholder)
- Architecture View (System Design view)

### Applicant (Jobseeker)
- Applicant Dashboard (UserProfile)
  - Tabs: Skills, Portfolio, Applications, Assessments
  - Matches tab shows job recommendations based on profile data
  - Skill badges show verified vs pending status
  - Assessments grouped by company with expandable details
- Browse Jobs
  - Search and filter
  - Job cards with match % and side detail panel
- Onboarding
  - Multi-step profile completion (basic info, skills, education, experience, portfolio)

### Employer
- Employer Dashboard
  - Header banner and stats strip
  - Sidebar: Company Profile and Employer Premium
  - Tabs: Job Offers, Assessments, Candidates, Matches, Analytics
  - Modals: Post Job, Post Assessment
  - Invite Candidates: Top 10 suggested applicants, sorted by score
- Employer Validation (Signup Only)
  - After employer signup, the company profile form appears first
  - After submit, the user lands on the dashboard
  - Regular login skips this validation step

## Demo Data (Frontend)
Mock data lives in resources/js/Pages/SkillBridge/data/mockData.js and jobSeekerData.js:
- Jobs, skills, applicants, and activity timelines
- Applicant skills include verification status and method
- Employer dashboard uses mock applicants and job/assessment lists

## Demo Script (Recommended)
### 1) Landing
- Show the public landing page and the "How SkillBridge PH Works" steps
- Highlight the role split: Applicants vs Employers

### 2) Applicant Flow
- Go to /login and sign in as Applicant
- Open the Applicant Dashboard
  - Show verified badges and skill pathways
  - Open the Assessments tab and expand a company item
- Browse Jobs
  - Use search and filters
  - Open a job and show the side detail card
- Onboarding (optional)
  - Visit /onboarding and walk through steps

### 3) Employer Flow
- Go to /signup and create an Employer account
- Employer Validation appears first (company profile form)
- Submit profile, then show Employer Dashboard
  - Job Offers tab (post a job)
  - Assessments tab (post an assessment)
  - Candidates tab (status filters)
  - Analytics tab (funnel and demand)
- Invite Candidate button
  - Opens Top 10 suggestions sorted by score

## Notes and Limitations
- Auth state and session data are stored client-side (localStorage)
- The system currently uses mock data for applicants, jobs, and assessments
- Forms update local state and are intended for demo purposes

## Key Files (For Reference)
- routes/web.php
- resources/js/Pages/SkillBridge/SkillBridgePage.jsx
- resources/js/Pages/SkillBridge/views/EmployerDashboard.jsx
- resources/js/Pages/SkillBridge/views/UserProfile.jsx
- resources/js/Pages/SkillBridge/views/BrowseJobs.jsx
- resources/js/Pages/SkillBridge/views/GeneralDashboard.jsx
- resources/js/Pages/SkillBridge/views/Landing.jsx
- resources/js/Pages/JobSeeker/Login.jsx
- resources/js/Pages/JobSeeker/Signup.jsx
- resources/js/Pages/JobSeeker/Onboarding.jsx
- resources/js/Pages/SkillBridge/data/mockData.js
- resources/js/Pages/JobSeeker/data/jobSeekerData.js

## Run Notes (Optional)
- npm run dev (frontend dev server)
- php artisan serve (Laravel app)
- composer run dev (combined server + queue + Vite)
