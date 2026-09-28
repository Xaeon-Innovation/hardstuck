import { requireSession } from "@/server/auth/session";
import { GameSlugs } from "@hardstuck/shared";
import {
  heartbeatChunk,
  registerAdminLiveConnection,
  registerBoosterLiveConnection,
} from "@/server/notifications/booster-live";
import { getBoosterProfile } from "@/server/trust/service";
import { canUseBoosterDesk, isAdmin } from "@/lib/roles";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await requireSession();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const role = (session.user as { role?: string }).role;
  if (!canUseBoosterDesk(role)) {
    return new Response("Forbidden", { status: 403 });
  }

  const admin = isAdmin(role);
  const profile = admin ? null : await getBoosterProfile(session.user.id);
  if (!admin && profile?.status !== "approved") {
    return new Response("Booster not verified", { status: 403 });
  }

  const connectedGames = admin ? [...GameSlugs] : (profile?.games ?? []);

  let unregister: (() => void) | null = null;
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const conn = {
        enqueue(chunk: Uint8Array) {
          controller.enqueue(chunk);
        },
        close() {
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        },
      };

      unregister = admin
        ? registerAdminLiveConnection(conn)
        : registerBoosterLiveConnection(session.user.id, conn);
      controller.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify({ type: "connected", games: connectedGames, admin })}\n\n`,
        ),
      );

      pingTimer = setInterval(() => {
        try {
          controller.enqueue(heartbeatChunk());
        } catch {
          if (pingTimer) clearInterval(pingTimer);
          unregister?.();
        }
      }, 25_000);
    },
    cancel() {
      if (pingTimer) clearInterval(pingTimer);
      unregister?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
