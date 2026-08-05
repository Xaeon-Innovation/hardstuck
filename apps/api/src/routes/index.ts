import { Router } from 'express';
import authRoutes from './auth';
import orderRoutes from './orders';
import paymentRoutes from './payments';
import adminRoutes from './admin';

const router = Router();

router.use('/auth', authRoutes);
router.use('/orders', orderRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);

export default router;
