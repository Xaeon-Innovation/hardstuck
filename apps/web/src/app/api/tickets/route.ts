import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/session";
import {
  assertTicketAccess,
  createTicket,
  getTicketWithReplies,
  listTicketsForUser,
  replyToTicket,
} from "@/server/support/tickets";
import {
  rateLimit,
  rateLimitResponse,
} from "@/server/security/rate-limit";

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  const role = (session.user as { role?: string }).role;
  if (id) {
    const allowed = await assertTicketAccess({
      ticketId: id,
      userId: session.user.id,
      role,
    });
    if (!allowed) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const detail = await getTicketWithReplies(id);
    return NextResponse.json(detail);
  }
  const tickets = await listTicketsForUser(session.user.id);
  return NextResponse.json({ tickets });
}

export async function POST(req: Request) {
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const limited = rateLimit({
    key: `tickets:${session.user.id}`,
    limit: 10,
    windowMs: 60_000,
  });
  if (!limited.ok) return rateLimitResponse(limited.retryAfterSec);

  const body = await req.json().catch(() => null);
  try {
    if (body?.action === "create") {
      const ticket = await createTicket({
        userId: session.user.id,
        subject: String(body.subject ?? "Help"),
        body: String(body.body ?? ""),
        orderId: body.orderId ? String(body.orderId) : undefined,
        saleId: body.saleId ? String(body.saleId) : undefined,
      });
      return NextResponse.json({ ticket });
    }
    if (body?.action === "reply") {
      const role = (session.user as { role?: string }).role;
      const allowed = await assertTicketAccess({
        ticketId: String(body.ticketId),
        userId: session.user.id,
        role,
      });
      if (!allowed) {
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }
      const reply = await replyToTicket({
        ticketId: String(body.ticketId),
        authorUserId: session.user.id,
        body: String(body.body ?? ""),
        isStaff: role === "admin",
      });
      return NextResponse.json({ reply });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
