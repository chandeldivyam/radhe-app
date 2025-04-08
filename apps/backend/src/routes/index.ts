import { Router } from 'express';
import authRoutes from './auth.route.js';
import healthRoutes from './health.route.js';
import userRoutes from './user.route.js';
import zeroRoutes from './zero.route.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/health', healthRoutes);
router.use('/user', userRoutes);
router.use('/zero', zeroRoutes);

export default router;
