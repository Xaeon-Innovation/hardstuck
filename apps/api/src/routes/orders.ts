import { Router, Response } from 'express';
import {
  createOrderSchema,
  priceQuoteSchema,
  payOrderSchema,
  DEFAULT_CURRENCY,
} from '@hardstuck/shared';
import { Order } from '../models/Order';
import { OrderQueue } from '../models/OrderQueue';
import { PaymentTransaction } from '../models/Payment';
import { Game } from '../models/Game';
import { Rank } from '../models/Rank';
import { Service } from '../models/Service';
import { calculatePriceQuote } from '../services/pricing';
import { createIntention } from '../services/paymob';
import { authenticate, AuthedRequest, requireRoles } from '../middleware/auth';
import { validateBody } from '../middleware/validate';
import { Types } from 'mongoose';

const router = Router();

function nextOrderNumber(): string {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const rand = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  return `ORD-${y}${m}${day}-${rand}`;
}

router.get('/catalog/games', async (_req, res: Response) => {
  const games = await Game.find({ active: true }).lean();
  res.json({ games });
});

router.get('/catalog/games/:gameId/ranks', async (req, res: Response) => {
  const ranks = await Rank.find({ gameId: req.params.gameId })
    .sort({ rankOrder: 1 })
    .lean();
  res.json({ ranks });
});

router.get('/catalog/games/:gameId/services', async (req, res: Response) => {
  const services = await Service.find({ gameId: req.params.gameId }).lean();
  res.json({ services });
});

router.post(
  '/quote',
  validateBody(priceQuoteSchema),
  async (req, res: Response) => {
    try {
      const quote = await calculatePriceQuote(req.body);
      res.json({ quote });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Quote failed',
      });
    }
  }
);

router.post(
  '/',
  authenticate,
  requireRoles('client', 'admin'),
  validateBody(createOrderSchema),
  async (req: AuthedRequest, res: Response) => {
    try {
      const quote = await calculatePriceQuote(req.body);
      const order = await Order.create({
        orderNumber: nextOrderNumber(),
        clientId: new Types.ObjectId(req.user!.userId),
        gameId: req.body.gameId,
        serviceId: req.body.serviceId,
        startRankId: req.body.startRankId,
        endRankId: req.body.endRankId,
        startRankName: quote.startRankName,
        endRankName: quote.endRankName,
        basePrice: quote.basePrice.toFixed(2),
        serviceMultiplier: quote.serviceMultiplier,
        additionalFees: '0',
        totalPrice: quote.totalPrice.toFixed(2),
        currency: quote.currency,
        platformCommission: quote.platformCommission.toFixed(2),
        boosterEarnings: quote.boosterEarnings.toFixed(2),
        status: 'draft',
        paymentStatus: 'pending',
        clientNotes: req.body.clientNotes,
      });
      res.status(201).json({ order });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Create order failed',
      });
    }
  }
);

router.get(
  '/mine',
  authenticate,
  async (req: AuthedRequest, res: Response) => {
    const orders = await Order.find({ clientId: req.user!.userId })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ orders });
  }
);

/** Booster queue shell — list waiting orders (must be before /:id). */
router.get(
  '/queue/waiting',
  authenticate,
  requireRoles('booster', 'admin'),
  async (_req, res: Response) => {
    const queue = await OrderQueue.find({ status: 'waiting' })
      .sort({ priority: -1, position: 1 })
      .populate('orderId')
      .lean();
    res.json({ queue });
  }
);

router.get(
  '/:id',
  authenticate,
  async (req: AuthedRequest, res: Response) => {
    const order = await Order.findById(req.params.id).lean();
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }
    const isOwner = order.clientId.toString() === req.user!.userId;
    const isStaff = ['admin', 'mod'].includes(req.user!.role);
    if (!isOwner && !isStaff) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    res.json({ order });
  }
);

router.post(
  '/:id/pay',
  authenticate,
  requireRoles('client', 'admin'),
  validateBody(payOrderSchema),
  async (req: AuthedRequest, res: Response) => {
    try {
      const order = await Order.findById(req.params.id);
      if (!order) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }
      if (order.clientId.toString() !== req.user!.userId && req.user!.role !== 'admin') {
        res.status(403).json({ error: 'Forbidden' });
        return;
      }
      if (!['draft', 'submitted'].includes(order.status)) {
        res.status(400).json({ error: 'Order is not payable' });
        return;
      }

      const currency = (
        req.body.currency ??
        order.currency ??
        DEFAULT_CURRENCY
      ).toUpperCase();
      const amount = Number(order.totalPrice.toString());
      const amountCents = Math.round(amount * 100);

      const intention = await createIntention({
        amountCents,
        currency,
        orderId: order._id.toString(),
        specialReference: order.orderNumber,
        customer: {
          firstName: req.body.firstName ?? 'Customer',
          lastName: req.body.lastName ?? 'User',
          email: req.user!.email,
          phone: req.body.phone ?? '0000000000',
        },
        items: [
          {
            name: `Boost ${order.startRankName} → ${order.endRankName}`,
            amount: amountCents,
            quantity: 1,
          },
        ],
      });

      order.status = 'submitted';
      order.submittedAt = new Date();
      order.currency = currency;
      order.paymobIntentionId = intention.id;
      await order.save();

      await PaymentTransaction.create({
        orderId: order._id,
        paymobIntentionId: intention.id,
        amount: amount.toFixed(2),
        currency,
        status: 'pending',
      });

      res.json({
        orderId: order._id,
        orderNumber: order.orderNumber,
        currency,
        clientSecret: intention.clientSecret,
        checkoutUrl: intention.checkoutUrl,
      });
    } catch (err) {
      res.status(400).json({
        error: err instanceof Error ? err.message : 'Payment init failed',
      });
    }
  }
);

export default router;
