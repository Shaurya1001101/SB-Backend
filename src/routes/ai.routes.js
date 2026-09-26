import { Router } from 'express';
import { chatAI } from '../controllers/ai.controller.js';

const router = Router();

router.post('/', chatAI);

export default router;
