import { randomUUID } from "crypto";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentEvent,
  PaymentPort,
} from "./port";

/**
 * Soft-launch / local adapter: no PSP. Admin or simulate-success marks paid.
 * Never use in production without replacing createCheckout flow.
 */
export class ManualPaymentAdapter implements PaymentPort {
  readonly provider = "manual" as const;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const providerPaymentId = `manual_${randomUUID()}`;
    const url = new URL(input.successUrl);
    url.searchParams.set("orderId", input.orderId);
    url.searchParams.set("manualPaymentId", providerPaymentId);
    return {
      checkoutUrl: url.toString(),
      providerPaymentId,
    };
  }

  async handleWebhook(): Promise<PaymentEvent | null> {
    return null;
  }

  async refund(): Promise<void> {
    // No-op for manual; ledger/refund state is admin-driven in Phase 3
  }
}
