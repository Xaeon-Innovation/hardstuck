import { Router, Request, Response } from 'express';
import { Order } from '../models/Order';
import { OrderQueue } from '../models/OrderQueue';
import { PaymentTransaction } from '../models/Payment';
import { verifyTransactionPostHmac } from '../services/paymob';

const router = Router();

/**
 * Paymob transaction processed callback.
 * HMAC is passed as ?hmac= query param. Source of truth for payment status.
 */
router.post('/paymob/webhook', async (req: Request, res: Response) => {
  try {
    const obj = req.body?.obj ?? req.body;
    const receivedHmac = String(req.query.hmac ?? '');

    if (!obj || !obj.order) {
      res.status(400).json({ error: 'Invalid payload' });
      return;
    }

    if (!verifyTransactionPostHmac(obj, receivedHmac)) {
      res.status(401).json({ error: 'Invalid HMAC' });
      return;
    }

    const merchantOrderId =
      obj.order.merchant_order_id ?? obj.merchant_order_id;
    const transactionId = String(obj.id);
    const success = obj.success === true || obj.success === 'true';
    const pending = obj.pending === true || obj.pending === 'true';

    // Idempotency: skip if already recorded as succeeded
    const existing = await PaymentTransaction.findOne({
      paymobTransactionId: transactionId,
      status: 'succeeded',
    });
    if (existing) {
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    const order = await Order.findOne({
      $or: [
        { orderNumber: merchantOrderId },
        { paymobIntentionId: String(obj.order.id) },
      ],
    });

    if (!order) {
      // Acknowledge to stop retries; log for investigation
      console.warn('Paymob webhook: order not found', merchantOrderId);
      res.status(200).json({ received: true, orderFound: false });
      return;
    }

    if (success && !pending) {
      order.paymentStatus = 'succeeded';
      order.status = 'in_queue';
      order.paymobTransactionId = transactionId;
      order.paymentMethod =
        obj.source_data?.type ?? obj.source_data?.sub_type ?? 'card';
      await order.save();

      await PaymentTransaction.findOneAndUpdate(
        { orderId: order._id, status: 'pending' },
        {
          paymobTransactionId: transactionId,
          status: 'succeeded',
          paymentMethod: order.paymentMethod,
          rawWebhook: obj,
        },
        { upsert: true }
      );

      const last = await OrderQueue.findOne({ gameId: order.gameId })
        .sort({ position: -1 })
        .lean();
      const position = (last?.position ?? 0) + 1;

      await OrderQueue.findOneAndUpdate(
        { orderId: order._id },
        {
          orderId: order._id,
          gameId: order.gameId,
          priority: 0,
          position,
          status: 'waiting',
          addedToQueueAt: new Date(),
        },
        { upsert: true }
      );
    } else if (!success && !pending) {
      order.paymentStatus = 'failed';
      await order.save();
      await PaymentTransaction.findOneAndUpdate(
        { orderId: order._id },
        {
          paymobTransactionId: transactionId,
          status: 'failed',
          rawWebhook: obj,
        },
        { upsert: true }
      );
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Paymob webhook error', err);
    res.status(200).json({ received: true, error: true });
  }
});

/** Dev helper: simulate successful Paymob payment without live keys. */
router.post('/paymob/simulate-success/:orderId', async (req, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'Not found' });
    return;
  }

  const order = await Order.findById(req.params.orderId);
  if (!order) {
    res.status(404).json({ error: 'Order not found' });
    return;
  }

  const transactionId = `sim_${order._id}`;
  order.paymentStatus = 'succeeded';
  order.status = 'in_queue';
  order.paymobTransactionId = transactionId;
  order.paymentMethod = 'card';
  await order.save();

  await PaymentTransaction.findOneAndUpdate(
    { orderId: order._id },
    {
      paymobTransactionId: transactionId,
      status: 'succeeded',
      paymentMethod: 'card',
    },
    { upsert: true }
  );

  const last = await OrderQueue.findOne({ gameId: order.gameId })
    .sort({ position: -1 })
    .lean();
  await OrderQueue.findOneAndUpdate(
    { orderId: order._id },
    {
      orderId: order._id,
      gameId: order.gameId,
      priority: 0,
      position: (last?.position ?? 0) + 1,
      status: 'waiting',
      addedToQueueAt: new Date(),
    },
    { upsert: true }
  );

  res.json({ ok: true, order });
});

export default router;
