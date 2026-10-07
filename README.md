# 🚀 SkillBridge Backend API Service (v2.0)

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.21-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791.svg)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Production-ready REST API backend for the **SkillBridge AI Skill Gap & Career Growth Platform**. Built with **Node.js**, **Express**, and **Supabase PostgreSQL**, fully integrated with the **SAS Hackathon Datasets**.

---

## 📊 Integrated Hackathon Datasets

All datasets from the hackathon problem statement have been converted into clean CSVs and imported into Supabase PostgreSQL:

| Dataset | Source File | Table Name | Total Records | Key Attributes |
|---|---|---|---|---|
| **Analytics Jobs** | `Analytics Jobs.csv` | `job_descriptions` | **15,841** | `s_no`, `title`, `experience`, `salary`, `location`, `required_skills (JSONB)`, `role_family` |
| **Data Science Jobs** | `DataScience Jobs.csv` | `datascience_jobs` | **1,602** | `reference_no`, `company_name`, `job_title`, `min_experience`, `avg_salary`, `min_salary`, `max_salary`, `num_of_jobs` |
| **Junior Data Scientist Traits** | `JDS Skill Traits.csv` | `jds_skill_traits` | **139** | `big_data_skills`, `maths_stats_skills`, `coding_skills`, `ai_and_ml_skills`, `dashboard_and_storytelling_skills`, `salary_hike_high_or_low` |
| **Senior Data Scientist Traits** | `SDS Personality Traits.csv` | `sds_personality_traits` | **161** | `neuroticism`, `extraversion`, `openness_to_experience`, `agreeableness`, `conscientiousness`, `success_classification_high_low` |

---

## 🏛 Architecture Overview

```
backend/
├── data/
│   ├── Analytics_Jobs.csv        # 15,841 analytics job records
│   ├── DataScience_Jobs.csv      # 1,602 company & salary records
│   ├── JDS_Skill_Traits.csv      # 139 Junior Data Scientist evaluations
│   └── SDS_Personality_Traits.csv# 161 Senior Data Scientist Big 5 traits
├── src/
│   ├── config/
│   │   └── db.js                 # PostgreSQL connection pool with SSL
│   ├── controllers/
│   │   ├── auth.controller.js        # User auth, registration, demo login, streak
│   │   ├── profile.controller.js     # User profiles, skills, XP
│   │   ├── path.controller.js        # Career path commitments & milestone tasks
│   │   ├── ai.controller.js          # AI career assistant proxy & technical fallback
│   │   ├── news.controller.js        # Tech industry intelligence & news
│   │   ├── skillgap.controller.js    # Analytics Jobs, stats, & skill gap engine
│   │   ├── datascience.controller.js # Data Science company hiring & salary insights
│   │   └── traits.controller.js      # JDS hike prediction & SDS leadership assessment
│   └── routes/
│       ├── auth.routes.js            # /api/auth
│       ├── profile.routes.js         # /api/profile
│       ├── path.routes.js            # /api/path
│       ├── ai.routes.js              # /api/ai and /api/ai/chat
│       ├── news.routes.js            # /api/news
│       ├── skillgap.routes.js        # /api/skillgap
│       ├── datascience.routes.js     # /api/datascience-jobs
│       ├── traits.routes.js          # /api/traits
│       └── dataset.routes.js         # /api/dataset
├── scripts/
│   ├── init-db.js                # Schema migration for all 4 dataset tables
│   ├── import-all-datasets.js    # Fast streaming CSV importer for all 4 datasets
│   ├── import-jobs.js            # Entry point for npm run import-jobs
│   ├── test-api.js               # Controller & database direct test suite
│   └── test-http.js              # Live Express HTTP endpoints test suite
├── .env.example
├── .env.local
├── package.json
└── server.js
```

---

## 🔌 API Endpoints Reference

### 1. Dataset & System Overview
- **`GET /api/dataset/summary`**
  - Returns real-time database counts and verification for all 4 integrated datasets.
- **`GET /api/health`**
  - Returns backend health and database connectivity status.

### 2. Analytics Jobs & Skill Gap Analysis
- **`GET /api/skillgap/jobs`**
  - Paginated search across **15,841 jobs**.
  - Query parameters: `?search=`, `?role_family=`, `?location=`, `?salary=`, `?experience=`, `?page=`, `?limit=`
- **`GET /api/skillgap/stats`**
  - Aggregated metrics across jobs: role family distribution, salary brackets, top locations.
- **`GET /api/skillgap/jobs/:id`**
  - Single job details by ID, s_no, or job_id.
- **`GET /api/skillgap/analyze/:jobId`**
  - Performs skill gap analysis against the target job (requires `x-user-id` header).
  - Returns `readinessScore` (0–100%), matched skills, and priority-ranked skill gap suggestions.
- **`GET /api/skillgap/analyze-all`**
  - Ranks all available jobs by readiness score for the authenticated user.

### 3. Data Science Jobs & Company Salary Benchmarks
- **`GET /api/datascience-jobs`**
  - Lists and filters **1,602 company job postings**.
  - Query parameters: `?company=`, `?search=`, `?min_experience=`, `?min_salary=`, `?sort=`, `?page=`, `?limit=`
- **`GET /api/datascience-jobs/top-companies`**
  - Aggregates top hiring employers by volume of openings (`num_of_jobs`) and highest salary packages.
- **`GET /api/datascience-jobs/salary-insights`**
  - Salary analytics and experience tier benchmarks (Entry, Mid, Senior, Lead).
- **`GET /api/datascience-jobs/:id`**
  - Single job detail by ID or reference_no.

### 4. Junior & Senior Data Scientist Trait Intelligence
- **`GET /api/traits/jds`**
  - Benchmark statistics across 139 Junior Data Scientists.
- **`POST /api/traits/jds/predict-hike`**
  - Evaluates 5 skill ratings: `{ big_data_skills, maths_stats_skills, coding_skills, ai_and_ml_skills, dashboard_and_storytelling_skills }` (1–5 scale).
  - Returns `predictedOutcome` ("High Salary Hike"), `hikeProbabilityPct`, benchmark comparisons, and top gap recommendations.
- **`GET /api/traits/sds`**
  - Benchmark statistics across 161 Senior Data Scientists.
- **`POST /api/traits/sds/assess-fit`**
  - Evaluates Big Five personality traits: `{ neuroticism, extraversion, openness_to_experience, agreeableness, conscientiousness }`.
  - Returns `predictedSuccess`, `successProbabilityPct`, `leadershipArchetype`, and coaching advice.

### 5. Authentication & Profile
- **`POST /api/auth/demo`** – Instant demo login (`user@skillbridge.io`)
- **`POST /api/auth/login`** – User login with JWT/session
- **`POST /api/auth/register`** – User registration
- **`GET /api/profile`** – Fetch user profile & skill inventory
- **`POST /api/profile`** – Update target role, skills, XP, and streak

---

## 💻 Commands

```bash
# 1. Install dependencies
npm install

# 2. Initialize database tables
npm run init-db

# 3. Import all 4 datasets (17,743 total records)
npm run import-jobs

# 4. Run test suites
npm test           # Controller & DB test suite
npm run test:http  # Live HTTP server test suite

# 5. Start dev server
npm run dev
```

---

## 📄 License
MIT License.
