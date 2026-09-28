type LiveConnection = {
  enqueue: (chunk: Uint8Array) => void;
  close: () => void;
};

const globalChat = globalThis as unknown as {
  __orderChatLive?: Map<string, Set<LiveConnection>>;
};

function byOrder(): Map<string, Set<LiveConnection>> {
  if (!globalChat.__orderChatLive) {
    globalChat.__orderChatLive = new Map();
  }
  return globalChat.__orderChatLive;
}

function encodeSse(data: unknown, event?: string): Uint8Array {
  let body = "";
  if (event) body += `event: ${event}\n`;
  body += `data: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(body);
}

export function registerOrderChatConnection(
  orderId: string,
  conn: LiveConnection,
): () => void {
  const map = byOrder();
  let set = map.get(orderId);
  if (!set) {
    set = new Set();
    map.set(orderId, set);
  }
  set.add(conn);
  return () => {
    set!.delete(conn);
    if (set!.size === 0) map.delete(orderId);
  };
}

export function publishOrderChatUpdate(
  orderId: string,
  payload: { type: "message.new"; messageId: string },
) {
  const set = byOrder().get(orderId);
  if (!set?.size) return;
  const chunk = encodeSse(payload, "chat");
  for (const conn of set) {
    try {
      conn.enqueue(chunk);
    } catch {
      conn.close();
      set.delete(conn);
    }
  }
}

export function orderChatHeartbeat(): Uint8Array {
  return encodeSse({ type: "ping" }, "ping");
}
