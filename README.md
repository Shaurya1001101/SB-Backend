# 🚀 SkillBridge Backend API Service

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![Express.js](https://img.shields.io/badge/Express-4.21-blue.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791.svg)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Production-ready REST API backend for the **SkillBridge AI Skill Gap & Career Growth Platform**. Built with **Node.js**, **Express**, and **Supabase PostgreSQL**.

---

## 📑 Table of Contents
1. [Architecture Overview](#-architecture-overview)
2. [Database Schema](#-database-schema)
3. [API Endpoints](#-api-endpoints)
4. [Environment Setup](#-environment-setup)
5. [Getting Started (Local Development)](#-getting-started-local-development)
6. [Deployment to Vercel](#-deployment-to-vercel)
7. [GitHub Upload Instructions](#-github-upload-instructions)

---

## 🏛 Architecture Overview

```
backend/
├── src/
│   ├── config/
│   │   └── db.js            # PostgreSQL connection pool with SSL
│   ├── controllers/
│   │   ├── auth.controller.js     # User registration, login, demo login, streak logic
│   │   ├── profile.controller.js  # User profile, skill taxonomy, XP tracking
│   │   ├── path.controller.js     # Career path commitment & milestone task toggling
│   │   ├── ai.controller.js       # Live AI career mentor proxy & domain fallback
│   │   └── news.controller.js     # Real-time tech industry intelligence & trends
│   └── routes/
│       ├── auth.routes.js         # /api/auth routes
│       ├── profile.routes.js      # /api/profile routes
│       ├── path.routes.js         # /api/path routes
│       ├── ai.routes.js           # /api/ai routes
│       └── news.routes.js         # /api/news routes
├── scripts/
│   ├── init-db.js           # Automated schema migration & seed script
│   └── test-api.js          # Direct health & controller integration test suite
├── .env.example             # Safe template for environment variables
├── .env.local               # Local credentials (git-ignored)
├── package.json             # Dependencies and npm scripts
├── server.js                # Express app entry point
└── vercel.json              # Vercel serverless deployment configuration
```

---

## 🗄 Database Schema

The backend connects to **Supabase PostgreSQL** with automated connection pooling and SSL support.

| Table | Purpose | Primary Key | Key Columns |
|---|---|---|---|
| `users` | User credentials & identity | `id (SERIAL)` | `email`, `password_hash`, `name`, `role`, `created_at` |
| `user_profiles` | User skills, target role, XP & streak | `user_id (FK)` | `target_role`, `skills_json (JSONB)`, `xp`, `streak`, `last_active_date` |
| `committed_paths` | Active learning roadmap | `user_id (FK)` | `role_key`, `pacing_key`, `completed_task_ids (JSONB)`, `tasks_schedule_json` |
| `daily_submissions`| Daily challenge problem attempts | `id (SERIAL)` | `user_id (FK)`, `problem_id`, `solved_date`, `xp_awarded` |

---

## 🔌 API Endpoints

### 1. System Health
- **`GET /api/health`**
  - Returns backend operational status, server timestamp, and database configuration state.

### 2. Authentication
- **`POST /api/auth/login`**
  - Body: `{ "email": "...", "password": "..." }`
- **`POST /api/auth/register`**
  - Body: `{ "name": "...", "email": "...", "password": "..." }`
- **`POST /api/auth/demo`**
  - Body: `{}` (Returns demo account `user@skillbridge.io`)
- **`POST /api/auth`**
  - Unified action router: `{ "action": "login" | "register" | "demo" }`

### 3. User Profile & Skills
- **`GET /api/profile`**
  - Header: `x-user-id: <id>` or Query: `?userId=<id>`
- **`POST /api/profile`**
  - Header: `x-user-id: <id>`
  - Body: `{ "targetRole": "ml-engineer", "skills": { ... }, "xp": 100, "streak": 5 }`

### 4. Learning Path / Roadmap
- **`POST /api/path`**
  - Header: `x-user-id: <id>`
  - Body: `{ "roleKey": "frontend-developer", "pacingKey": "accelerated" }`
- **`PATCH /api/path`**
  - Header: `x-user-id: <id>`
  - Body: `{ "taskId": "task-2", "isCompleted": true, "xpAwarded": 25 }`

### 5. AI Career Mentor & News
- **`POST /api/ai`**
  - Body: `{ "message": "How do I transition to ML?", "userContext": { ... } }`
- **`GET /api/news`**
  - Returns live curated tech & career news intelligence.

---

## ⚙️ Environment Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```
2. Open `.env.local` and configure your credentials:
   ```ini
   PORT=5000
   DATABASE_URL="postgresql://postgres.[YOUR_PROJECT_ID]:[YOUR_PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres"
   VITE_AI_KEY="" # Optional OpenAI API Key
   ```
   > **Note**: For Supabase, use the **Connection Pooler URL (Port 6543)** to ensure IPv4 compatibility across all hosting providers and networks.

---

## 💻 Getting Started (Local Development)

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Database Migration & Seeding
```bash
npm run init-db
```

### 3. Verify System Health & Endpoints
```bash
npm test
```

### 4. Start the Express Server
```bash
# Production start
npm start

# Development mode with hot-reloading
npm run dev
```
The server will start at `http://localhost:5000`.

---

## ☁️ Deployment to Vercel

This repository includes a preconfigured `vercel.json` file.

1. Install the Vercel CLI:
   ```bash
   npm i -g vercel
   ```
2. Deploy the backend:
   ```bash
   vercel
   ```
3. Set your environment variable in your Vercel Project Settings:
   - `DATABASE_URL`: Your Supabase pooler connection string.

---

## 📤 GitHub Upload Instructions

To upload this backend folder to GitHub as its own repository:

```bash
# 1. Navigate to the backend directory
cd backend

# 2. Initialize a git repository
git init

# 3. Add all backend files (.env.local is automatically protected by .gitignore)
git add .

# 4. Commit your changes
git commit -m "feat: Initial commit for SkillBridge backend API service"

# 5. Link to your GitHub repository
git branch -M main
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_BACKEND_REPO_NAME>.git

# 6. Push to GitHub
git push -u origin main
```

---

## 📄 License
This project is open-source under the [MIT License](LICENSE).
