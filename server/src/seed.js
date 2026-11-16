/**
 * seed.js — Seed the trainer account and default batches.
 *
 * Usage:
 *   node src/seed.js
 *   npm run seed
 */

import dns from 'node:dns';
try {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
} catch (e) {}

import env from './config/env.js';
import connectDB from './config/db.js';
import mongoose from 'mongoose';
import User from './models/User.js';
import Batch from './models/Batch.js';

const BATCH_NAMES = ['B-26', 'B-27', 'B-28', 'B-29', 'B-30', 'B-31'];

async function seed() {
  await connectDB();

  // ── 1. Seed Trainers ─────────────────────────────────────────────
  const trainersToSeed = [
    {
      firstName: env.TRAINER_FIRST_NAME || 'Shubham',
      lastName: env.TRAINER_LAST_NAME || 'Gayke',
      email: (env.TRAINER_EMAIL || 'trainer@mentoresolution.com').toLowerCase(),
      password: env.TRAINER_PASSWORD || 'Trainer@123456',
      role: 'trainer',
      allowedCategories: undefined, // full access to all lecture categories
      canUploadNotes: true,
    },
    {
      firstName: 'Shrikant',
      lastName: 'Somwanshi',
      email: 'shrikant.somwanshi@mentoresolution.com',
      password: 'Trainer@123456',
      role: 'trainer',
      allowedCategories: ['Linux Lectures', 'AWS Lectures'],
      canUploadNotes: true,
    },
    {
      firstName: 'Suraj',
      lastName: 'Bele',
      email: 'suraj.bele@mentoresolution.com',
      password: 'Trainer@123456',
      role: 'trainer',
      allowedCategories: ['DevOps Lectures'],
      canUploadNotes: false,
    },
  ];

  let primaryTrainer = null;

  for (const t of trainersToSeed) {
    const passwordHash = await User.hashPassword(t.password);
    const trainerDoc = await User.findOneAndUpdate(
      { email: t.email },
      {
        firstName: t.firstName,
        lastName: t.lastName,
        email: t.email,
        passwordHash,
        role: t.role,
        allowedCategories: t.allowedCategories,
        canUploadNotes: t.canUploadNotes,
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (!primaryTrainer) primaryTrainer = trainerDoc;
    console.log(
      `✅ Trainer seeded: ${trainerDoc.firstName} ${trainerDoc.lastName} (${trainerDoc.email}) [Categories: ${
        trainerDoc.allowedCategories?.join(', ') || 'ALL'
      }, Notes: ${trainerDoc.canUploadNotes}]`
    );
  }

  // ── 2. Seed Batches ────────────────────────────────────────────
  for (const name of BATCH_NAMES) {
    const batch = await Batch.findOneAndUpdate(
      { name },
      { name, trainer: primaryTrainer._id },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`  📦 Batch seeded: ${batch.name}`);
  }

  console.log('\n🌱 Seeding complete.');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
