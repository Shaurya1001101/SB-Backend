import { Router } from 'express';
import { login, register, demoLogin } from '../controllers/auth.controller.js';

const router = Router();

// RESTful endpoints
router.post('/login', login);
router.post('/register', register);
router.post('/demo', demoLogin);

// Unified action endpoint (POST /api/auth with { action })
router.post('/', (req, res) => {
  const { action } = req.body || {};
  if (action === 'demo') return demoLogin(req, res);
  if (action === 'register') return register(req, res);
  return login(req, res);
});

export default router;
