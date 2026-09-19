import { Webhooks } from "@polar-sh/nextjs";
import { fulfillOrderPayment } from "@/server/orders/fulfill-payment";

export const POST = Webhooks({
  webhookSecret: process.env.POLAR_WEBHOOK_SECRET ?? "",
  onOrderPaid: async (payload) => {
    const data = payload.data as {
      id: string;
      amount?: number;
      metadata?: Record<string, string | number | boolean>;
      checkout_id?: string;
    };

    const orderId = data.metadata?.orderId;
    if (typeof orderId !== "string") {
      console.warn("Polar order.paid without metadata.orderId", data.id);
      return;
    }

    await fulfillOrderPayment({
      orderId,
      provider: "polar",
      providerPaymentId: data.checkout_id ?? data.id,
      providerEventId: `polar_order_paid_${data.id}`,
      rawPayload: JSON.stringify(payload),
    });
  },
  onOrderRefunded: async (payload) => {
    console.info("Polar order.refunded", payload.data?.id);
    // Admin path still owns ledger refund transitions for MVP control.
  },
});
