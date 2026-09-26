import { Router } from 'express';
import { commitPath, toggleTask } from '../controllers/path.controller.js';

const router = Router();

router.post('/', commitPath);
router.patch('/', toggleTask);

export default router;
