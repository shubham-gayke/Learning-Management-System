/**
 * seed.js — Seed the trainer account and default batches.
 *
 * Usage:
 *   node src/seed.js
 *   npm run seed
 */

import env from './config/env.js';
import connectDB from './config/db.js';
import mongoose from 'mongoose';
import User from './models/User.js';
import Batch from './models/Batch.js';

const BATCH_NAMES = ['B-26', 'B-27', 'B-28', 'B-29', 'B-30', 'B-31'];

async function seed() {
  await connectDB();

  // ── 1. Seed Trainer ──────────────────────────────────────────────
  if (!env.TRAINER_EMAIL || !env.TRAINER_PASSWORD) {
    console.warn(
      '⚠️  TRAINER_EMAIL and TRAINER_PASSWORD are not set. Skipping trainer seed.'
    );
  } else {
    const passwordHash = await User.hashPassword(env.TRAINER_PASSWORD);

    const trainer = await User.findOneAndUpdate(
      { email: env.TRAINER_EMAIL.toLowerCase() },
      {
        firstName: env.TRAINER_FIRST_NAME,
        lastName: env.TRAINER_LAST_NAME,
        email: env.TRAINER_EMAIL.toLowerCase(),
        passwordHash,
        role: 'trainer',
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    console.log(`✅ Trainer seeded: ${trainer.firstName} ${trainer.lastName} (${trainer.email})`);

    // ── 2. Seed Batches ────────────────────────────────────────────
    for (const name of BATCH_NAMES) {
      const batch = await Batch.findOneAndUpdate(
        { name },
        { name, trainer: trainer._id },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      console.log(`  📦 Batch seeded: ${batch.name}`);
    }
  }

  console.log('\n🌱 Seeding complete.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
