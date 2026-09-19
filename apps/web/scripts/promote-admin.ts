/**
 * Promote an existing user to admin by email.
 * Usage: pnpm --filter @hardstuck/web exec tsx scripts/promote-admin.ts admin@example.com
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { user } from "../src/server/db/schema";

async function main() {
  const email = process.argv[2] ?? process.env.SEED_ADMIN_EMAIL;
  if (!email) {
    console.error("Pass email as argv or set SEED_ADMIN_EMAIL");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client);
  const [row] = await db
    .update(user)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(user.email, email))
    .returning();

  if (!row) {
    console.error("No user with email", email, "— register first, then re-run.");
    await client.end();
    process.exit(1);
  }
  console.log("Promoted to admin:", row.email, row.id);
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
