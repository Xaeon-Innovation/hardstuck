export type AppRole = "client" | "booster" | "admin";

export function isAdmin(role?: string | null): boolean {
  return role === "admin";
}

export function isBooster(role?: string | null): boolean {
  return role === "booster";
}

/** Booster desk, payouts API, live offers stream. */
export function canUseBoosterDesk(role?: string | null): boolean {
  return role === "booster" || role === "admin";
}

/** Admin console routes. */
export function canUseAdminConsole(role?: string | null): boolean {
  return role === "admin";
}

/** Full visibility (all games, all orders in feeds). */
export function hasPlatformWideAccess(role?: string | null): boolean {
  return role === "admin";
}
