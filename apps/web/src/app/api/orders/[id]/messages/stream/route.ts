import { requireSession } from "@/server/auth/session";
import { assertOrderChatAccess } from "@/server/chat/service";
import {
  orderChatHeartbeat,
  registerOrderChatConnection,
} from "@/server/notifications/order-chat-live";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { id: orderId } = await ctx.params;
  const session = await requireSession();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    await assertOrderChatAccess({
      orderId,
      userId: session.user.id,
      role: (session.user as { role?: string }).role,
    });
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

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
            /* closed */
          }
        },
      };
      unregister = registerOrderChatConnection(orderId, conn);
      controller.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify({ type: "connected", orderId })}\n\n`,
        ),
      );
      pingTimer = setInterval(() => {
        try {
          controller.enqueue(orderChatHeartbeat());
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
