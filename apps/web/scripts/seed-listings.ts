/**
 * Seed curated account listings (founder showcase inventory).
 * Usage: pnpm exec tsx --env-file=../../.env scripts/seed-listings.ts
 */
import { eq } from "drizzle-orm";
import { getDb } from "../src/server/db";
import {
  accountListings,
  sellerProfiles,
  user,
} from "../src/server/db/schema";

const SEED = [
  {
    game: "lol",
    title: "Emerald EUW — clean MMR",
    summary: "Fresh emerald climb account. Email changeable. No bans.",
    rankLabel: "Emerald II",
    skinsSummary: "12 skins · 2 prestige",
    server: "euw",
    priceUsdCents: 8900,
    featured: true,
  },
  {
    game: "valorant",
    title: "Immortal 2 NA",
    summary: "High immortal with knife + select agent contract skins.",
    rankLabel: "Immortal 2",
    skinsSummary: "Reaver vandal · Prime phantom",
    server: "na",
    priceUsdCents: 14900,
    featured: true,
  },
  {
    game: "overwatch",
    title: "GM Support EU",
    summary: "Grandmaster Support role with gold weapons unlocked.",
    rankLabel: "Grandmaster 3 Support",
    skinsSummary: "3 gold weapons",
    server: "eu",
    priceUsdCents: 7200,
    featured: false,
  },
  {
    game: "marvel_rivals",
    title: "Celestial PC — multi-Lord",
    summary: "Celestial ladder with 4 Lord heroes.",
    rankLabel: "Celestial 2",
    skinsSummary: "4 Lords · battle pass complete",
    server: "pc",
    priceUsdCents: 6500,
    featured: true,
  },
  {
    game: "apex",
    title: "Diamond PC — pred history",
    summary: "Diamond with previous Master badge and 4K on Wraith.",
    rankLabel: "Diamond II",
    skinsSummary: "Heirloom · 4K badge",
    server: "pc",
    priceUsdCents: 11000,
    featured: false,
  },
] as const;

async function main() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set");
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@hardstuck.local";
  const db = getDb();
  const [admin] = await db
    .select()
    .from(user)
    .where(eq(user.email, email))
    .limit(1);
  if (!admin) {
    throw new Error(`Admin ${email} not found — run pnpm seed:admin first`);
  }

  await db
    .insert(sellerProfiles)
    .values({
      userId: admin.id,
      status: "approved",
      idStatus: "verified",
      reviewedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: sellerProfiles.userId,
      set: {
        status: "approved",
        idStatus: "verified",
        updatedAt: new Date(),
      },
    });

  for (const row of SEED) {
    const [existing] = await db
      .select()
      .from(accountListings)
      .where(eq(accountListings.title, row.title))
      .limit(1);
    if (existing) {
      console.log(`Skip existing: ${row.title}`);
      continue;
    }
    await db.insert(accountListings).values({
      sellerUserId: admin.id,
      ...row,
      status: "listed",
    });
    console.log(`Listed: ${row.title}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
