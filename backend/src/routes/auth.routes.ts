import { Router } from 'express';
import { register, login, profile, logout } from '../controllers/auth.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.get('/profile', authenticateJWT as any, profile as any);
router.post('/logout', logout);

export default router;
