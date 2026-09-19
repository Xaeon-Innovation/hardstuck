import type { PaymentPort } from "./port";
import { ManualPaymentAdapter } from "./manual";
import { PolarPaymentAdapter } from "./polar";

export function getPaymentPort(): PaymentPort {
  const provider = (process.env.PAYMENT_PROVIDER ?? "manual").toLowerCase();

  switch (provider) {
    case "polar":
      return new PolarPaymentAdapter();
    case "manual":
      return new ManualPaymentAdapter();
    case "stripe":
      throw new Error(
        "Stripe adapter is Phase 7 (after US entity). Use polar or manual until then.",
      );
    default:
      throw new Error(`Unknown PAYMENT_PROVIDER: ${provider}`);
  }
}

export type { PaymentPort, PaymentEvent, CreateCheckoutInput } from "./port";
