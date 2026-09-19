import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __hardstuckDb?: Db };

function createDb(): Db {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const client = postgres(connectionString, { max: 10 });
  return drizzle(client, { schema });
}

/** Lazy DB accessor — avoids import-time crash during `next build` without env. */
export function getDb(): Db {
  if (!globalForDb.__hardstuckDb) {
    globalForDb.__hardstuckDb = createDb();
  }
  return globalForDb.__hardstuckDb;
}

/** @deprecated Prefer getDb() for clearer failure mode */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});
