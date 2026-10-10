type Entry = { at: number; value: unknown };

const store = new Map<string, Entry>();
const TTL_MS = 10 * 60 * 1000;

export function cacheGet<T>(key: string): T | null {
  const hit = store.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > TTL_MS) {
    store.delete(key);
    return null;
  }
  return hit.value as T;
}

export function cacheSet(key: string, value: unknown) {
  store.set(key, { at: Date.now(), value });
}

export function cacheKey(parts: (string | undefined)[]) {
  return parts.map((p) => (p ?? "").toLowerCase().trim()).join("|");
}
