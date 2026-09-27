import { NextResponse } from "next/server";
import { requireSession } from "@/server/auth/session";
import { getNotificationFeed } from "@/server/notifications/feed";

export async function GET(req: Request) {
  const session = await requireSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const game = url.searchParams.get("game") ?? undefined;

  const feed = await getNotificationFeed(session, {
    game: game && game !== "all" ? game : undefined,
  });

  return NextResponse.json(feed);
}
