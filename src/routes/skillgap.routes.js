import { Router } from 'express';
import {
  getJobDescriptions,
  getJobById,
  getAnalyticsStats,
  createJobDescription,
  analyzeSkillGap,
  analyzeAllJobs,
} from '../controllers/skillgap.controller.js';

const router = Router();

// ── Job Description Routes (Analytics Jobs dataset) ────────────────────────
// GET  /api/skillgap/jobs               – paginated list with search & filters
// GET  /api/skillgap/stats              – aggregate statistics on 15,841 jobs
// GET  /api/skillgap/jobs/:id           – single job details
// POST /api/skillgap/jobs               – create custom job description
router.get('/jobs',        getJobDescriptions);
router.get('/stats',       getAnalyticsStats);
router.get('/jobs/:id',    getJobById);
router.post('/jobs',       createJobDescription);

// ── Skill Gap Analysis Routes ─────────────────────────────────────────────
// GET /api/skillgap/analyze/:jobId      – gap for user vs one job (x-user-id header or query)
// GET /api/skillgap/analyze-all         – ranked gap for user vs jobs (x-user-id header)
// GET /api/skillgap/analyze-all/:userId – legacy URL param support
router.get('/analyze/:jobId',       analyzeSkillGap);
router.get('/analyze-all',          analyzeAllJobs);
router.get('/analyze-all/:userId',  analyzeAllJobs);

export default router;
