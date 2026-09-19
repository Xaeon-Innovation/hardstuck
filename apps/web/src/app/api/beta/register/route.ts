import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/server/auth";
import { isClosedBeta } from "@/server/env";
import {
  assertClientInviteAvailable,
  redeemClientInvite,
} from "@/server/beta/client-invites";
import {
  clientIp,
  rateLimit,
  rateLimitResponse,
} from "@/server/security/rate-limit";

const schema = z.object({
  name: z.string().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(12).max(128),
  inviteCode: z.string().min(4).max(32).optional(),
  riskAccepted: z.literal(true),
});

export async function POST(req: Request) {
  const ip = clientIp(req);
  const limited = rateLimit({
    key: `register:${ip}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid registration" }, { status: 400 });
  }

  const closed = isClosedBeta();
  if (closed) {
    if (!parsed.data.inviteCode) {
      return NextResponse.json(
        { error: "Invite code required for closed beta" },
        { status: 400 },
      );
    }
    try {
      await assertClientInviteAvailable(parsed.data.inviteCode);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Invalid invite" },
        { status: 400 },
      );
    }
  }

  try {
    const result = await auth.api.signUpEmail({
      body: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        // additionalFields
        role: "client",
      } as {
        name: string;
        email: string;
        password: string;
        role: string;
      },
    });

    if (!result?.user) {
      return NextResponse.json({ error: "Sign up failed" }, { status: 400 });
    }

    if (closed && parsed.data.inviteCode) {
      try {
        await redeemClientInvite({
          userId: result.user.id,
          code: parsed.data.inviteCode,
        });
      } catch {
        // User created but invite race — still allow login; admin can audit
        console.warn("[beta] invite redeem race after signup", result.user.id);
      }
    }

    return NextResponse.json({ ok: true, userId: result.user.id });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sign up failed";
    const safe =
      msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exist")
        ? "Email already registered"
        : "Sign up failed";
    return NextResponse.json({ error: safe }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({ closedBeta: isClosedBeta() });
}
