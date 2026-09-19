import { NextResponse } from "next/server";
import { processOrderTimers } from "@/server/orders/jobs";

/**
 * Secure with Authorization: Bearer $CRON_SECRET
 * Call from an external cron (or `pnpm cron:orders` locally).
 */
export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await processOrderTimers();
  return NextResponse.json({ ok: true, ...result });
}

export async function GET(req: Request) {
  return POST(req);
}
