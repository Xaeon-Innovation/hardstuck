import { desc, eq } from "drizzle-orm";
import type {
  SupportTicketPriority,
  SupportTicketStatus,
} from "@hardstuck/shared";
import { getDb } from "@/server/db";
import {
  supportTicketReplies,
  supportTickets,
  user,
} from "@/server/db/schema";

export async function createTicket(opts: {
  userId: string;
  subject: string;
  body: string;
  orderId?: string;
  saleId?: string;
  priority?: SupportTicketPriority;
}) {
  const db = getDb();
  const [ticket] = await db
    .insert(supportTickets)
    .values({
      userId: opts.userId,
      subject: opts.subject.slice(0, 200),
      orderId: opts.orderId,
      saleId: opts.saleId,
      priority: opts.priority ?? "normal",
      status: "open",
    })
    .returning();

  await db.insert(supportTicketReplies).values({
    ticketId: ticket!.id,
    authorUserId: opts.userId,
    body: opts.body.slice(0, 5000),
    isStaff: false,
  });

  return ticket!;
}

export async function listTicketsForUser(userId: string) {
  const db = getDb();
  return db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.userId, userId))
    .orderBy(desc(supportTickets.updatedAt))
    .limit(50);
}

export async function listTicketsAdmin(opts?: {
  status?: SupportTicketStatus;
}) {
  const db = getDb();
  const where = opts?.status
    ? eq(supportTickets.status, opts.status)
    : undefined;
  return db
    .select({
      ticket: supportTickets,
      userName: user.name,
      userEmail: user.email,
    })
    .from(supportTickets)
    .innerJoin(user, eq(user.id, supportTickets.userId))
    .where(where)
    .orderBy(desc(supportTickets.updatedAt))
    .limit(100);
}

export async function getTicketWithReplies(ticketId: string) {
  const db = getDb();
  const [ticket] = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, ticketId))
    .limit(1);
  if (!ticket) return null;
  const replies = await db
    .select()
    .from(supportTicketReplies)
    .where(eq(supportTicketReplies.ticketId, ticketId))
    .orderBy(supportTicketReplies.createdAt);
  return { ticket, replies };
}

export async function replyToTicket(opts: {
  ticketId: string;
  authorUserId: string;
  body: string;
  isStaff: boolean;
}) {
  const db = getDb();
  const [ticket] = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, opts.ticketId))
    .limit(1);
  if (!ticket) throw new Error("Ticket not found");
  if (!opts.isStaff && ticket.userId !== opts.authorUserId) {
    throw new Error("Forbidden");
  }

  const [reply] = await db
    .insert(supportTicketReplies)
    .values({
      ticketId: opts.ticketId,
      authorUserId: opts.authorUserId,
      body: opts.body.slice(0, 5000),
      isStaff: opts.isStaff,
    })
    .returning();

  await db
    .update(supportTickets)
    .set({
      status: opts.isStaff ? "pending" : "open",
      updatedAt: new Date(),
    })
    .where(eq(supportTickets.id, opts.ticketId));

  return reply!;
}

export async function setTicketStatus(opts: {
  ticketId: string;
  status: SupportTicketStatus;
  adminUserId: string;
}) {
  const db = getDb();
  const [row] = await db
    .update(supportTickets)
    .set({
      status: opts.status,
      assignedAdminUserId: opts.adminUserId,
      resolvedAt: opts.status === "resolved" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(supportTickets.id, opts.ticketId))
    .returning();
  return row;
}

export async function assertTicketAccess(opts: {
  ticketId: string;
  userId: string;
  role?: string;
}) {
  const db = getDb();
  const [ticket] = await db
    .select()
    .from(supportTickets)
    .where(eq(supportTickets.id, opts.ticketId))
    .limit(1);
  if (!ticket) return null;
  if (opts.role === "admin" || ticket.userId === opts.userId) return ticket;
  return null;
}
