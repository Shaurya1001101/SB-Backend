import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/profile.controller.js';

const router = Router();

router.get('/', getProfile);
router.post('/', updateProfile);

export default router;
