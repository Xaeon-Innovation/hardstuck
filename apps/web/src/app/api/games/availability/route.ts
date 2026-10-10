import { NextResponse } from "next/server";
import { GameSlugs, type GameSlug } from "@hardstuck/shared";
import {
  getGameAvailability,
  listGameAvailability,
} from "@/server/games/availability";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const game = url.searchParams.get("game");
  if (game) {
    if (!GameSlugs.includes(game as GameSlug)) {
      return NextResponse.json({ error: "Unknown game" }, { status: 400 });
    }
    const row = await getGameAvailability(game as GameSlug);
    return NextResponse.json({ game: row });
  }
  const games = await listGameAvailability();
  return NextResponse.json({ games });
}
