import { Polar } from "@polar-sh/sdk";
import type {
  CreateCheckoutInput,
  CreateCheckoutResult,
  PaymentEvent,
  PaymentPort,
} from "./port";

function getClient() {
  const token = process.env.POLAR_ACCESS_TOKEN;
  if (!token) {
    throw new Error(
      "POLAR_ACCESS_TOKEN missing. Create an org access token after Polar AUP approval.",
    );
  }
  const server =
    process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production";
  return new Polar({ accessToken: token, server });
}

/**
 * Requires a Polar product with **custom** pricing.
 * Set POLAR_PRODUCT_ID in env. Checkout passes `amount` in USD cents + metadata.orderId.
 */
export class PolarPaymentAdapter implements PaymentPort {
  readonly provider = "polar" as const;

  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const productId = process.env.POLAR_PRODUCT_ID;
    if (!productId) {
      throw new Error(
        "POLAR_PRODUCT_ID missing. Create a custom-price product in Polar dashboard.",
      );
    }

    const polar = getClient();
    const checkout = await polar.checkouts.create({
      products: [productId],
      amount: input.amountUsdCents,
      customerEmail: input.customerEmail,
      successUrl: input.successUrl.includes("{CHECKOUT_ID}")
        ? input.successUrl
        : `${input.successUrl}${input.successUrl.includes("?") ? "&" : "?"}checkout_id={CHECKOUT_ID}`,
      metadata: {
        orderId: input.orderId,
      },
      externalCustomerId: input.orderId.slice(0, 64),
    });

    if (!checkout.url) {
      throw new Error("Polar checkout created without URL");
    }

    return {
      checkoutUrl: checkout.url,
      providerPaymentId: checkout.id,
    };
  }

  async handleWebhook(
    rawBody: string,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<PaymentEvent | null> {
    // Webhook validation is handled by @polar-sh/nextjs Webhooks() route.
    // This method remains for PaymentPort completeness / tests.
    void headers;
    try {
      const parsed = JSON.parse(rawBody) as {
        type?: string;
        data?: {
          id?: string;
          metadata?: { orderId?: string };
          amount?: number;
          checkout_id?: string;
        };
      };
      if (parsed.type === "order.paid" && parsed.data?.metadata?.orderId) {
        return {
          type: "payment.succeeded",
          orderId: parsed.data.metadata.orderId,
          providerPaymentId:
            parsed.data.checkout_id ?? parsed.data.id ?? "unknown",
          amountUsdCents: parsed.data.amount ?? 0,
          rawEventId: parsed.data.id ?? rawBody.slice(0, 64),
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  async refund(providerPaymentId: string, amountUsdCents?: number): Promise<void> {
    const polar = getClient();
    // Polar refunds are created against an order id in newer APIs.
    // Soft-launch: attempt orders refund if method exists; otherwise throw clear error.
    const client = polar as unknown as {
      refunds?: {
        create: (body: {
          orderId: string;
          amount?: number;
        }) => Promise<unknown>;
      };
    };
    if (!client.refunds?.create) {
      throw new Error(
        "Polar refund API not available on this SDK build — refund manually in Polar dashboard / admin ledger.",
      );
    }
    await client.refunds.create({
      orderId: providerPaymentId,
      amount: amountUsdCents,
    });
  }
}
