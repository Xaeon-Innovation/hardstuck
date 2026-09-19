/**
 * Create (or promote) the seed admin from SEED_ADMIN_* env vars.
 * Usage from apps/web:
 *   pnpm exec tsx --env-file=../../.env scripts/seed-admin.ts
 */
import { eq } from "drizzle-orm";
import { auth } from "../src/server/auth";
import { getDb } from "../src/server/db";
import { user } from "../src/server/db/schema";

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@hardstuck.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "AdminPass123!";
  const name = process.env.SEED_ADMIN_NAME ?? "Admin";

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);

  if (existing) {
    await db
      .update(user)
      .set({ role: "admin", name, updatedAt: new Date() })
      .where(eq(user.id, existing.id));
    console.log(`Updated existing user to admin: ${email}`);
    console.log("Sign in with that email and the password you registered with.");
    console.log(
      "(Password is NOT reset for existing users — delete the user row or register a new email if you forgot it.)",
    );
    return;
  }

  const result = await auth.api.signUpEmail({
    body: {
      email,
      password,
      name,
      role: "admin",
    },
  });

  if (!result?.user) {
    throw new Error("signUpEmail did not return a user");
  }

  await db
    .update(user)
    .set({ role: "admin", emailVerified: true, updatedAt: new Date() })
    .where(eq(user.id, result.user.id));

  console.log(`Created admin: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
