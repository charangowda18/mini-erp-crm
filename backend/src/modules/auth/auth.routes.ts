import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authenticate } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { loginSchema } from './auth.schema';

const router = Router();
const controller = new AuthController();

// POST /api/auth/login
router.post('/login', validate(loginSchema), controller.login);

// GET /api/auth/me
router.get('/me', authenticate, controller.getProfile);

export default router;
