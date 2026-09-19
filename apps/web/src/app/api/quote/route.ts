import { NextResponse } from "next/server";
import {
  priceQuoteSchema,
  quotePrice,
  type QuoteInput,
} from "@hardstuck/shared";
import {
  clientIp,
  rateLimit,
  rateLimitResponse,
} from "@/server/security/rate-limit";

export async function POST(req: Request) {
  const limited = rateLimit({
    key: `quote:${clientIp(req)}`,
    limit: 60,
    windowMs: 60_000,
  });
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const body = await req.json().catch(() => null);
  const parsed = priceQuoteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const eurPerUsd = Number(process.env.EUR_PER_USD ?? "0.92");
  const input = parsed.data as QuoteInput;
  const result = quotePrice({ ...input, eurPerUsd });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
