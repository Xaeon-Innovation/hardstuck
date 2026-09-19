# Next.js modular monolith + PostgreSQL

We build one TypeScript modular monolith: Next.js (App Router) + PostgreSQL (Drizzle) + Redis, with Better Auth for roles. Realtime chat/events may be a small Socket sibling or hosted realtime later.

**Considered:** classic MERN (Express + React Vite + Mongo) already scaffolded in-repo; microservices; Electron for boosters.

**Why:** A 2–3 person team needs one deployable surface. Orders and money need ACID state transitions — Postgres fits; Mongo does not as the system of record. Microservices and Electron are deferred until product-market fit.

**Consequences:** The prior `apps/api` (Express/Mongo) and Vite SPA are frozen under `legacy/` as reference only. New work lands in `apps/web` (Next.js). Shared vocabulary stays in `CONTEXT.md` and `packages/shared`.
