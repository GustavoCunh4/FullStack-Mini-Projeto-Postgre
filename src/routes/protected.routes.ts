import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { protectedPing } from '../controllers/protected.controller';

const router = Router();

router.get('/protected', authMiddleware, protectedPing);

export default router;
