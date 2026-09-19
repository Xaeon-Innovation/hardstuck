/**
 * PaymentPort — swap Polar ↔ Stripe without rewriting Orders/Ledger.
 * See docs/adr/0003-payment-port-polar-first.md
 */

export type CreateCheckoutInput = {
  orderId: string;
  amountUsdCents: number;
  currency: "USD" | "EUR";
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
};

export type CreateCheckoutResult = {
  checkoutUrl: string;
  providerPaymentId: string;
};

export type PaymentEvent =
  | {
      type: "payment.succeeded";
      orderId: string;
      providerPaymentId: string;
      amountUsdCents: number;
      rawEventId: string;
    }
  | {
      type: "payment.failed";
      orderId: string;
      providerPaymentId: string;
      rawEventId: string;
    }
  | {
      type: "payment.refunded";
      orderId: string;
      providerPaymentId: string;
      amountUsdCents?: number;
      rawEventId: string;
    };

export interface PaymentPort {
  readonly provider: "polar" | "stripe" | "manual";
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
  handleWebhook(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<PaymentEvent | null>;
  refund(providerPaymentId: string, amountUsdCents?: number): Promise<void>;
}
