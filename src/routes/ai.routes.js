import { Router } from 'express';
import { chatAI, getJobs, getInsights, getCourses } from '../controllers/ai.controller.js';

const router = Router();

router.post('/', chatAI);
router.post('/chat', chatAI);
router.get('/jobs', getJobs);
router.get('/insights', getInsights);
router.get('/courses', getCourses);

export default router;
