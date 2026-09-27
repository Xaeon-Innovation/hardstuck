import type { BoosterLiveOfferPayload } from "@/lib/booster-live-events";

export type { BoosterLiveOfferPayload };

type LiveConnection = {
  enqueue: (chunk: Uint8Array) => void;
  close: () => void;
};

const globalLive = globalThis as unknown as {
  __boosterLive?: Map<string, Set<LiveConnection>>;
  __adminLive?: Set<LiveConnection>;
};

function connectionsByUser(): Map<string, Set<LiveConnection>> {
  if (!globalLive.__boosterLive) {
    globalLive.__boosterLive = new Map();
  }
  return globalLive.__boosterLive;
}

function encodeSse(data: unknown, event?: string): Uint8Array {
  let body = "";
  if (event) body += `event: ${event}\n`;
  body += `data: ${JSON.stringify(data)}\n\n`;
  return new TextEncoder().encode(body);
}

export function registerBoosterLiveConnection(
  userId: string,
  conn: LiveConnection,
): () => void {
  const map = connectionsByUser();
  let set = map.get(userId);
  if (!set) {
    set = new Set();
    map.set(userId, set);
  }
  set.add(conn);
  return () => {
    set!.delete(conn);
    if (set!.size === 0) map.delete(userId);
  };
}

function adminConnections(): Set<LiveConnection> {
  if (!globalLive.__adminLive) {
    globalLive.__adminLive = new Set();
  }
  return globalLive.__adminLive;
}

export function registerAdminLiveConnection(conn: LiveConnection): () => void {
  const set = adminConnections();
  set.add(conn);
  return () => {
    set.delete(conn);
  };
}

function fanOut(chunk: Uint8Array, set: Set<LiveConnection>) {
  for (const conn of set) {
    try {
      conn.enqueue(chunk);
    } catch {
      conn.close();
      set.delete(conn);
    }
  }
}

export function publishBoosterLiveEvent(
  userId: string,
  payload: BoosterLiveOfferPayload,
) {
  const set = connectionsByUser().get(userId);
  if (!set?.size) return;
  fanOut(encodeSse(payload, "offer"), set);
}

/** Every new pool offer — admins with live stream open. */
export function publishAdminLiveOffer(payload: BoosterLiveOfferPayload) {
  const set = adminConnections();
  if (!set.size) return;
  fanOut(encodeSse(payload, "offer"), set);
}

export function heartbeatChunk(): Uint8Array {
  return encodeSse({ type: "ping", at: new Date().toISOString() }, "ping");
}
