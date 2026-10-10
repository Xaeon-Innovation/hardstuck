/**
 * Create one approved, online test booster covering all games.
 *
 *   pnpm exec tsx --env-file=.env scripts/seed-test-booster.ts
 */
import { eq } from "drizzle-orm";
import { GameSlugs } from "@hardstuck/shared";
import { auth } from "../src/server/auth";
import { getDb } from "../src/server/db";
import { boosterProfiles, user } from "../src/server/db/schema";

const EMAIL = "test-booster@hardstuck.local";
const PASSWORD = "BoosterPass123!";
const NAME = "Test Booster";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(user)
    .where(eq(user.email, EMAIL))
    .limit(1);

  let userId = existing?.id;
  if (existing) {
    await db
      .update(user)
      .set({ role: "booster", name: NAME, updatedAt: new Date() })
      .where(eq(user.id, existing.id));
    console.log(`Updated existing user → booster: ${EMAIL}`);
  } else {
    const result = await auth.api.signUpEmail({
      body: {
        email: EMAIL,
        password: PASSWORD,
        name: NAME,
        role: "booster",
      },
    });
    if (!result?.user) throw new Error("signUpEmail failed");
    userId = result.user.id;
    await db
      .update(user)
      .set({ role: "booster", emailVerified: true, updatedAt: new Date() })
      .where(eq(user.id, userId));
    console.log(`Created booster: ${EMAIL}`);
  }

  const games = [...GameSlugs];
  const [profile] = await db
    .select()
    .from(boosterProfiles)
    .where(eq(boosterProfiles.userId, userId!))
    .limit(1);

  if (profile) {
    await db
      .update(boosterProfiles)
      .set({
        status: "approved",
        games,
        queueOnline: true,
        updatedAt: new Date(),
      })
      .where(eq(boosterProfiles.userId, userId!));
  } else {
    await db.insert(boosterProfiles).values({
      userId: userId!,
      status: "approved",
      games,
      queueOnline: true,
      invitedByCode: "TEST",
    });
  }

  console.log("");
  console.log("=== Test booster ready ===");
  console.log(`Email:    ${EMAIL}`);
  console.log(`Password: ${PASSWORD}`);
  console.log(`Games:    ${games.join(", ")}`);
  console.log("Status:   approved + online");
  console.log("");
  console.log("Refresh /boost — games should show open for matched-pool.");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
