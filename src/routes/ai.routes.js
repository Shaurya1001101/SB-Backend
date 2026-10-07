import { Router } from 'express';
import { chatAI } from '../controllers/ai.controller.js';

const router = Router();

router.post('/', chatAI);
router.post('/chat', chatAI);

export default router;
