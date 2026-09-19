import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth/session";
import {
  assertOrderChatAccess,
  listMessages,
  postMessage,
} from "@/server/chat/service";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertOrderChatAccess({
      orderId: id,
      userId: session.user.id,
      role: (session.user as { role?: string }).role,
    });
    const messages = await listMessages(id);
    return NextResponse.json({ messages });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    const status = msg === "Forbidden" ? 403 : msg === "Order not found" ? 404 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}

const postSchema = z.object({
  body: z.string().min(1).max(4000),
});

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const message = await postMessage({
      orderId: id,
      senderUserId: session.user.id,
      role: (session.user as { role?: string }).role,
      body: parsed.data.body,
    });
    return NextResponse.json({ message });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed";
    const status = msg === "Forbidden" ? 403 : 400;
    return NextResponse.json({ error: msg }, { status });
  }
}
