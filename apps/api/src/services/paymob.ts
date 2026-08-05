import crypto from 'crypto';
import { env } from '../config/env';

export interface CreateIntentionInput {
  amountCents: number;
  currency: string;
  orderId: string;
  specialReference: string;
  customer: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  items?: Array<{ name: string; amount: number; quantity: number; description?: string }>;
}

export interface IntentionResult {
  id: string;
  clientSecret: string;
  checkoutUrl: string;
}

type PaymobTransactionObj = {
  amount_cents: number | string;
  created_at: string;
  currency: string;
  error_occured: boolean | string;
  has_parent_transaction: boolean | string;
  id: number | string;
  integration_id: number | string;
  is_3d_secure: boolean | string;
  is_auth: boolean | string;
  is_capture: boolean | string;
  is_refunded: boolean | string;
  is_standalone_payment: boolean | string;
  is_voided: boolean | string;
  order: { id: number | string; merchant_order_id?: string };
  owner: number | string;
  pending: boolean | string;
  source_data?: { pan?: string; sub_type?: string; type?: string };
  success: boolean | string;
};

function assertCurrencySupported(currency: string): void {
  const upper = currency.toUpperCase();
  if (!env.paymob.supportedCurrencies.includes(upper)) {
    throw new Error(`Unsupported currency: ${currency}`);
  }
}

export function buildCheckoutUrl(clientSecret: string): string {
  const publicKey = env.paymob.publicKey || 'pk_test_placeholder';
  return `${env.paymob.baseUrl}/unifiedcheckout/?publicKey=${encodeURIComponent(publicKey)}&clientSecret=${encodeURIComponent(clientSecret)}`;
}

export async function createIntention(
  input: CreateIntentionInput
): Promise<IntentionResult> {
  assertCurrencySupported(input.currency);

  const payload = {
    amount: input.amountCents,
    currency: input.currency.toUpperCase(),
    payment_methods: [env.paymob.integrationIdCard || 'card'],
    items: (input.items ?? []).map((i) => ({
      name: i.name,
      amount: i.amount,
      quantity: i.quantity,
      description: i.description ?? i.name,
    })),
    billing_data: {
      apartment: 'NA',
      floor: 'NA',
      street: 'NA',
      building: 'NA',
      shipping_method: 'NA',
      postal_code: 'NA',
      city: 'NA',
      state: 'NA',
      country: 'USA',
      email: input.customer.email,
      first_name: input.customer.firstName,
      last_name: input.customer.lastName,
      phone_number: input.customer.phone,
    },
    customer: {
      first_name: input.customer.firstName,
      last_name: input.customer.lastName,
      email: input.customer.email,
    },
    special_reference: input.specialReference,
    notification_url: `${env.apiUrl}/api/payments/paymob/webhook`,
    redirection_url: `${env.webUrl}/payment/complete`,
  };

  // Without real keys, return a deterministic stub so local flows work.
  if (!env.paymob.secretKey || env.paymob.secretKey.includes('xxx')) {
    const stubSecret = `stub_cs_${input.specialReference}`;
    return {
      id: `stub_intention_${input.orderId}`,
      clientSecret: stubSecret,
      checkoutUrl: buildCheckoutUrl(stubSecret),
    };
  }

  const response = await fetch(`${env.paymob.baseUrl}/v1/intention/`, {
    method: 'POST',
    headers: {
      Authorization: `Token ${env.paymob.secretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Paymob intention failed (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    id: string;
    client_secret: string;
  };

  return {
    id: String(data.id),
    clientSecret: data.client_secret,
    checkoutUrl: buildCheckoutUrl(data.client_secret),
  };
}

export function verifyTransactionPostHmac(
  obj: PaymobTransactionObj,
  receivedHmac: string
): boolean {
  if (!env.paymob.hmacSecret) {
    // Dev mode: accept when HMAC secret not configured
    return env.nodeEnv === 'development';
  }

  const fields = [
    obj.amount_cents,
    obj.created_at,
    obj.currency,
    obj.error_occured,
    obj.has_parent_transaction,
    obj.id,
    obj.integration_id,
    obj.is_3d_secure,
    obj.is_auth,
    obj.is_capture,
    obj.is_refunded,
    obj.is_standalone_payment,
    obj.is_voided,
    obj.order.id,
    obj.owner,
    obj.pending,
    obj.source_data?.pan ?? '',
    obj.source_data?.sub_type ?? '',
    obj.source_data?.type ?? '',
    obj.success,
  ];

  const computed = crypto
    .createHmac('sha512', env.paymob.hmacSecret)
    .update(fields.map(String).join(''))
    .digest('hex');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(computed),
      Buffer.from(String(receivedHmac))
    );
  } catch {
    return false;
  }
}

/** Stub: refund via Paymob Transaction API (to be implemented with live keys). */
export async function refundTransaction(
  transactionId: string,
  amountCents: number
): Promise<{ ok: boolean; stub: boolean }> {
  if (!env.paymob.secretKey || env.paymob.secretKey.includes('xxx')) {
    return { ok: true, stub: true };
  }
  // Placeholder for live refund call
  void transactionId;
  void amountCents;
  return { ok: true, stub: false };
}

/** Stub: void authorized transaction. */
export async function voidTransaction(
  transactionId: string
): Promise<{ ok: boolean; stub: boolean }> {
  if (!env.paymob.secretKey || env.paymob.secretKey.includes('xxx')) {
    return { ok: true, stub: true };
  }
  void transactionId;
  return { ok: true, stub: false };
}
