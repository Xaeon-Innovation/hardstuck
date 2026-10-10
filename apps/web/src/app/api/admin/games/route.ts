import { NextResponse } from "next/server";
import { GameSlugs, type GameSlug } from "@hardstuck/shared";
import { requireSession } from "@/server/auth/session";
import {
  listGameAvailability,
  setGameForceOffline,
} from "@/server/games/availability";

async function requireAdmin() {
  const session = await requireSession();
  if (!session?.user) return null;
  if ((session.user as { role?: string }).role !== "admin") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const games = await listGameAvailability();
  return NextResponse.json({ games });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const body = await req.json().catch(() => null);
  const game = String(body?.game ?? "");
  const forceOffline = Boolean(body?.forceOffline);
  const note =
    typeof body?.note === "string" ? body.note.slice(0, 200) : undefined;
  if (!GameSlugs.includes(game as GameSlug)) {
    return NextResponse.json({ error: "Unknown game" }, { status: 400 });
  }
  const row = await setGameForceOffline({
    game,
    forceOffline,
    note,
    updatedByUserId: session.user.id,
  });
  const games = await listGameAvailability();
  return NextResponse.json({ override: row, games });
}
