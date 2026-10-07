import { Router } from 'express';
import {
  getDataScienceJobs,
  getRoleBenchmarks,
  getTopCompanies,
  getSalaryInsights,
  getDataScienceJobById,
} from '../controllers/datascience.controller.js';

const router = Router();

// GET /api/datascience-jobs                 – paginated jobs with company/salary/experience filters
// GET /api/datascience-jobs/roles           – dataset role benchmarks across 20 jobs
// GET /api/datascience-jobs/top-companies   – hiring volume & top salary employers
// GET /api/datascience-jobs/salary-insights – salary trends & experience tier benchmarks
// GET /api/datascience-jobs/:id             – single job details
router.get('/',                getDataScienceJobs);
router.get('/roles',           getRoleBenchmarks);
router.get('/top-companies',   getTopCompanies);
router.get('/salary-insights', getSalaryInsights);
router.get('/:id',             getDataScienceJobById);

export default router;
