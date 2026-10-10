import { NextResponse } from "next/server";
import { UserRoles, type UserRole } from "@hardstuck/shared";
import { requireSession } from "@/server/auth/session";
import {
  listAuditLog,
  listUsers,
  setUserRole,
  setUserSuspended,
} from "@/server/admin/access";

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
  const users = await listUsers({
    q: url.searchParams.get("q") ?? undefined,
    role: url.searchParams.get("role") ?? undefined,
  });
  const audit = await listAuditLog(30);
  return NextResponse.json({ users, audit });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  try {
    if (body?.action === "set_role") {
      const role = String(body.role ?? "");
      if (!UserRoles.includes(role as UserRole)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
      await setUserRole({
        actorUserId: session.user.id,
        targetUserId: String(body.userId),
        role: role as UserRole,
      });
      return NextResponse.json({ ok: true });
    }
    if (body?.action === "suspend" || body?.action === "unsuspend") {
      await setUserSuspended({
        actorUserId: session.user.id,
        targetUserId: String(body.userId),
        suspended: body.action === "suspend",
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
