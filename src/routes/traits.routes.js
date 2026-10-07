import { Router } from 'express';
import {
  getJDSStats,
  predictJDSHike,
  getSDSStats,
  assessSDSFit,
} from '../controllers/traits.controller.js';

const router = Router();

// ── Junior Data Scientist Skills & Salary Hike Routes ─────────────────────
// GET  /api/traits/jds               – benchmark stats across junior data scientists
// POST /api/traits/jds/predict-hike  – predict salary hike probability from 5 skill scores
router.get('/jds',              getJDSStats);
router.post('/jds/predict-hike', predictJDSHike);

// ── Senior Data Scientist Personality & Success Routes ────────────────────
// GET  /api/traits/sds               – benchmark stats across senior data scientists
// POST /api/traits/sds/assess-fit    – evaluate Big Five personality fit for senior roles
router.get('/sds',              getSDSStats);
router.post('/sds/assess-fit',   assessSDSFit);

export default router;
