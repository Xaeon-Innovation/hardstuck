import { NextResponse } from "next/server";
import type {
  SupportTicketStatus,
} from "@hardstuck/shared";
import { requireSession } from "@/server/auth/session";
import {
  getTicketWithReplies,
  listTicketsAdmin,
  replyToTicket,
  setTicketStatus,
} from "@/server/support/tickets";

async function requireAdmin() {
  const session = await requireSession();
  if (!session?.user) return null;
  if ((session.user as { role?: string }).role !== "admin") return null;
  return session;
}

export async function GET(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (id) {
    const detail = await getTicketWithReplies(id);
    if (!detail) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(detail);
  }
  const status = url.searchParams.get("status") as SupportTicketStatus | null;
  const tickets = await listTicketsAdmin({
    status: status ?? undefined,
  });
  return NextResponse.json({ tickets });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  try {
    if (body?.action === "reply") {
      const reply = await replyToTicket({
        ticketId: String(body.ticketId),
        authorUserId: session.user.id,
        body: String(body.body ?? ""),
        isStaff: true,
      });
      return NextResponse.json({ reply });
    }
    if (body?.action === "set_status") {
      const ticket = await setTicketStatus({
        ticketId: String(body.ticketId),
        status: body.status as SupportTicketStatus,
        adminUserId: session.user.id,
      });
      return NextResponse.json({ ticket });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
