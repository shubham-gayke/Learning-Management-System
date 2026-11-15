import http from 'http';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import env from './config/env.js';
import connectDB from './config/db.js';
import routes from './routes/index.js';
import errorHandler from './middleware/errorHandler.js';
import User from './models/User.js';
import Batch from './models/Batch.js';
import Lecture from './models/Lecture.js';

async function runTests() {
  console.log('🧪 Starting LMS Verification & Automated Test Suite...\n');

  await connectDB();

  // Clean test users & test lectures if any
  await User.deleteMany({ email: { $in: ['teststudent1@example.com', 'teststudent2@example.com'] } });
  await Lecture.deleteMany({ title: 'Test Stream Security Lecture' });

  const app = express();
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api', routes);
  app.use(errorHandler);

  const server = http.createServer(app);
  const testPort = 5055;
  await new Promise((res) => server.listen(testPort, res));

  const baseUrl = `http://localhost:${testPort}/api`;

  let cookieHeader = '';

  // 1. Test Student Registration
  console.log('1. Testing Student Registration...');
  const regRes = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: 'Rahul',
      lastName: 'Sharma',
      email: 'teststudent1@example.com',
      password: 'Password@123',
      confirmPassword: 'Password@123',
    }),
  });

  const regData = await regRes.json();
  if (regRes.status !== 201 || !regData.success) {
    throw new Error(`Registration failed: ${JSON.stringify(regData)}`);
  }
  const rawCookie = regRes.headers.get('set-cookie');
  cookieHeader = rawCookie ? rawCookie.split(';')[0] : '';
  console.log('   ✅ Student registered successfully. Auth cookie issued.');

  // 2. Test Fetching Batches
  console.log('2. Fetching available batches...');
  const batchRes = await fetch(`${baseUrl}/batches`, {
    headers: { Cookie: cookieHeader },
  });
  const batchData = await batchRes.json();
  const batches = batchData.data?.batches || [];
  if (batches.length < 2) {
    throw new Error('Expected at least 2 seeded batches');
  }
  console.log(`   ✅ Batches fetched. Total available: ${batches.length} (${batches.map(b => b.name).join(', ')})`);

  // 3. Test First Batch Selection (Free)
  console.log('3. Testing First Batch Selection (Free selection)...');
  const batch1 = batches[0];
  const batch2 = batches[1];

  const selRes1 = await fetch(`${baseUrl}/student/batch`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ batchId: batch1._id }),
  });
  const selData1 = await selRes1.json();
  if (selRes1.status !== 200 || selData1.data?.user?.batchChangesUsed !== 0) {
    throw new Error(`First selection should have batchChangesUsed = 0: ${JSON.stringify(selData1)}`);
  }
  console.log(`   ✅ First batch (${batch1.name}) selected. batchChangesUsed = 0.`);

  // 4. Test Second Batch Selection (One change used)
  console.log('4. Testing Second Batch Selection (Using allowed 1 change)...');
  const selRes2 = await fetch(`${baseUrl}/student/batch`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ batchId: batch2._id }),
  });
  const selData2 = await selRes2.json();
  if (selRes2.status !== 200 || selData2.data?.user?.batchChangesUsed !== 1) {
    throw new Error(`Second selection should have batchChangesUsed = 1: ${JSON.stringify(selData2)}`);
  }
  console.log(`   ✅ Batch changed to (${batch2.name}). batchChangesUsed = 1.`);

  // 5. Test Third Batch Selection (Should be REJECTED with 403 Forbidden)
  console.log('5. Testing Third Batch Selection (Should be locked forever with 403)...');
  const selRes3 = await fetch(`${baseUrl}/student/batch`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookieHeader,
    },
    body: JSON.stringify({ batchId: batch1._id }),
  });
  const selData3 = await selRes3.json();
  if (selRes3.status !== 403) {
    throw new Error(`Expected status 403, got ${selRes3.status}: ${JSON.stringify(selData3)}`);
  }
  console.log(`   ✅ Server correctly rejected third batch change with 403: "${selData3.message}"`);

  // 6. Test Stream Route Authorization (Cross-Batch Isolation)
  console.log('6. Testing Stream Cross-Batch Security...');
  // Create a lecture in batch1 (student is in batch2)
  const restrictedLecture = await Lecture.create({
    title: 'Test Stream Security Lecture',
    batch: batch1._id,
    driveFileId: 'dummy_id_123',
    hlsPath: 'dummy_hls_uuid',
    isPublished: true,
    status: 'ready',
  });

  const streamRes = await fetch(`${baseUrl}/stream/${restrictedLecture._id}/master.m3u8`, {
    headers: { Cookie: cookieHeader },
  });
  if (streamRes.status !== 403) {
    throw new Error(`Expected 403 Forbidden for cross-batch stream access, got: ${streamRes.status}`);
  }
  console.log('   ✅ Student from another batch blocked from lecture stream with 403 Forbidden.');

  // 7. Test Trainer Login
  console.log('7. Testing Trainer Login with seeded account (Shubham Gayke)...');
  const trainerLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: env.TRAINER_EMAIL,
      password: env.TRAINER_PASSWORD,
    }),
  });
  const trainerData = await trainerLoginRes.json();
  if (trainerLoginRes.status !== 200 || trainerData.data?.user?.role !== 'trainer') {
    throw new Error(`Trainer login failed: ${JSON.stringify(trainerData)}`);
  }
  console.log(`   ✅ Trainer logged in successfully: ${trainerData.data?.user?.firstName} ${trainerData.data?.user?.lastName} (role: ${trainerData.data?.user?.role})`);

  // Cleanup
  await User.deleteMany({ email: 'teststudent1@example.com' });
  await Lecture.deleteOne({ _id: restrictedLecture._id });
  server.close();

  console.log('\n🎉 ALL INTEGRATION TESTS PASSED PERFECTLY!\n');
  process.exit(0);
}

runTests().catch((err) => {
  console.error('\n❌ Test Suite Failed:', err);
  process.exit(1);
});
