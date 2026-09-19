import { Router, Response } from 'express';
import { User } from '../models/User';
import { Order } from '../models/Order';
import { Booster } from '../models/Booster';
import { PaymentTransaction } from '../models/Payment';
import { authenticate, AuthedRequest, requireRoles } from '../middleware/auth';

const router = Router();

router.use(authenticate, requireRoles('admin', 'mod'));

router.get('/overview', async (_req: AuthedRequest, res: Response) => {
  const [clients, boosters, activeOrders, revenueAgg] = await Promise.all([
    User.countDocuments({ role: 'client', deletedAt: null }),
    User.countDocuments({ role: 'booster', deletedAt: null }),
    Order.countDocuments({
      status: { $in: ['in_queue', 'in_progress'] },
    }),
    PaymentTransaction.aggregate([
      { $match: { status: 'succeeded' } },
      {
        $group: {
          _id: '$currency',
          total: { $sum: { $toDouble: '$amount' } },
        },
      },
    ]),
  ]);

  res.json({
    kpis: {
      clients,
      boosters,
      activeOrders,
      revenueByCurrency: revenueAgg,
    },
  });
});

router.get('/users', async (_req, res: Response) => {
  const users = await User.find({ deletedAt: null })
    .select('-passwordHash -twoFaSecret')
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json({ users });
});

router.get('/orders', async (_req, res: Response) => {
  const orders = await Order.find().sort({ createdAt: -1 }).limit(100).lean();
  res.json({ orders });
});

router.get('/payments', async (_req, res: Response) => {
  const payments = await PaymentTransaction.find()
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json({ payments });
});

router.get('/boosters', async (_req, res: Response) => {
  const boosters = await Booster.find()
    .populate('userId', 'username email')
    .limit(100)
    .lean();
  res.json({ boosters });
});

export default router;
