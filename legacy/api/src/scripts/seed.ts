import bcrypt from 'bcryptjs';
import { connectDb } from '../config/db';
import { env } from '../config/env';
import { User } from '../models/User';
import { Game } from '../models/Game';
import { Rank } from '../models/Rank';
import { Service } from '../models/Service';
import { PricingConfig } from '../models/PricingConfig';

const GAME_DEFS = [
  {
    name: 'League of Legends',
    code: 'lol',
    basePrice: '20',
    apiProvider: 'riot',
    minAccountAge: 30,
    ranks: [
      { name: 'Iron', division: 4, difficultyMultiplier: 1.0, rankOrder: 1 },
      { name: 'Iron', division: 3, difficultyMultiplier: 1.0, rankOrder: 2 },
      { name: 'Iron', division: 2, difficultyMultiplier: 1.0, rankOrder: 3 },
      { name: 'Iron', division: 1, difficultyMultiplier: 1.0, rankOrder: 4 },
      { name: 'Bronze', division: 4, difficultyMultiplier: 1.0, rankOrder: 5 },
      { name: 'Bronze', division: 1, difficultyMultiplier: 1.2, rankOrder: 8 },
      { name: 'Silver', division: 4, difficultyMultiplier: 1.5, rankOrder: 9 },
      { name: 'Silver', division: 1, difficultyMultiplier: 1.5, rankOrder: 12 },
      { name: 'Gold', division: 4, difficultyMultiplier: 2.0, rankOrder: 13 },
      { name: 'Gold', division: 1, difficultyMultiplier: 2.0, rankOrder: 16 },
      { name: 'Platinum', division: 4, difficultyMultiplier: 2.5, rankOrder: 17 },
      { name: 'Platinum', division: 1, difficultyMultiplier: 2.5, rankOrder: 20 },
      { name: 'Diamond', division: 4, difficultyMultiplier: 3.5, rankOrder: 21 },
      { name: 'Diamond', division: 1, difficultyMultiplier: 3.5, rankOrder: 24 },
      { name: 'Master', division: 0, difficultyMultiplier: 5.0, rankOrder: 25 },
    ],
  },
  {
    name: 'Valorant',
    code: 'valorant',
    basePrice: '22',
    apiProvider: 'riot',
    minAccountAge: 20,
    ranks: [
      { name: 'Iron', division: 1, difficultyMultiplier: 1.0, rankOrder: 1 },
      { name: 'Bronze', division: 1, difficultyMultiplier: 1.2, rankOrder: 4 },
      { name: 'Silver', division: 1, difficultyMultiplier: 1.5, rankOrder: 7 },
      { name: 'Gold', division: 1, difficultyMultiplier: 2.0, rankOrder: 10 },
      { name: 'Platinum', division: 1, difficultyMultiplier: 2.5, rankOrder: 13 },
      { name: 'Diamond', division: 1, difficultyMultiplier: 3.5, rankOrder: 16 },
      { name: 'Ascendant', division: 1, difficultyMultiplier: 4.0, rankOrder: 19 },
      { name: 'Immortal', division: 1, difficultyMultiplier: 5.0, rankOrder: 22 },
    ],
  },
  {
    name: 'Apex Legends',
    code: 'apex',
    basePrice: '10',
    apiProvider: 'ea',
    minAccountAge: 14,
    ranks: [
      { name: 'Rookie', division: 4, difficultyMultiplier: 1.0, rankOrder: 1 },
      { name: 'Bronze', division: 4, difficultyMultiplier: 1.2, rankOrder: 5 },
      { name: 'Silver', division: 4, difficultyMultiplier: 1.5, rankOrder: 9 },
      { name: 'Gold', division: 4, difficultyMultiplier: 2.0, rankOrder: 13 },
      { name: 'Platinum', division: 4, difficultyMultiplier: 2.5, rankOrder: 17 },
      { name: 'Diamond', division: 4, difficultyMultiplier: 3.5, rankOrder: 21 },
      { name: 'Master', division: 0, difficultyMultiplier: 5.0, rankOrder: 25 },
    ],
  },
];

async function seed() {
  await connectDb();
  console.log('Connected — seeding...');

  const passwordHash = await bcrypt.hash(env.seed.adminPassword, 12);
  await User.findOneAndUpdate(
    { email: env.seed.adminEmail },
    {
      username: env.seed.adminUsername,
      email: env.seed.adminEmail,
      passwordHash,
      role: 'admin',
      emailVerified: true,
    },
    { upsert: true, new: true }
  );
  console.log(`Admin: ${env.seed.adminEmail}`);

  for (const def of GAME_DEFS) {
    const game = await Game.findOneAndUpdate(
      { code: def.code },
      {
        name: def.name,
        code: def.code,
        basePrice: def.basePrice,
        apiProvider: def.apiProvider,
        minAccountAge: def.minAccountAge,
        active: true,
      },
      { upsert: true, new: true }
    );

    await Rank.deleteMany({ gameId: game._id });
    await Rank.insertMany(
      def.ranks.map((r) => ({
        gameId: game._id,
        ...r,
      }))
    );

    for (const svc of [
      {
        name: 'Solo',
        code: 'solo',
        priceMultiplier: 1.0,
        requiresDuo: false,
        description: 'Booster plays on your account',
      },
      {
        name: 'Duo',
        code: 'duo',
        priceMultiplier: 0.8,
        requiresDuo: true,
        description: 'Booster queues with you',
      },
    ]) {
      await Service.findOneAndUpdate(
        { gameId: game._id, code: svc.code },
        { gameId: game._id, ...svc },
        { upsert: true }
      );
    }

    await PricingConfig.findOneAndUpdate(
      { gameId: game._id, rankId: null, serviceId: null },
      {
        gameId: game._id,
        baseMultiplier: 1,
        adjustments: {
          queueWaitBonus: 0.1,
          lowRatingPenalty: 0.15,
          newBoosterDiscount: 0.2,
          peakHourBonus: 0.1,
        },
        lastModifiedAt: new Date(),
      },
      { upsert: true }
    );

    console.log(`Seeded game: ${def.name}`);
  }

  console.log('Seed complete');
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
