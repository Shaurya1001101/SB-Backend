import dotenv from 'dotenv';
import path from 'path';

// Load .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { query } from '../src/config/db.js';
import { demoLogin, login } from '../src/controllers/auth.controller.js';
import { getProfile } from '../src/controllers/profile.controller.js';

function mockRes() {
  return {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.data = payload;
      return this;
    },
  };
}

async function testBackend() {
  console.log('🧪 Running SkillBridge Backend Test Suite...');

  try {
    // 1. Database Connectivity
    console.log('\n--- 1. Testing Database Query ---');
    const dbTest = await query('SELECT NOW() as current_time, COUNT(*)::int as user_count FROM users');
    console.log('✅ Database connected! Server time:', dbTest.rows[0].current_time);
    console.log('✅ Total registered users in Supabase:', dbTest.rows[0].user_count);

    // 2. Demo Auth Controller
    console.log('\n--- 2. Testing Demo Login Controller ---');
    const reqDemo = { body: {} };
    const resDemo = mockRes();
    await demoLogin(reqDemo, resDemo);
    if (resDemo.statusCode === 200 && resDemo.data.user) {
      console.log('✅ Demo Login Successful:', resDemo.data.user.email);
      console.log('   Profile XP:', resDemo.data.profile.xp, '| Streak:', resDemo.data.profile.streak);
    } else {
      throw new Error(`Demo login failed with status ${resDemo.statusCode}: ${JSON.stringify(resDemo.data)}`);
    }

    const demoUserId = resDemo.data.user.id;

    // 3. Profile Controller
    console.log('\n--- 3. Testing Profile Controller ---');
    const reqProfile = { headers: { 'x-user-id': demoUserId }, query: {} };
    const resProfile = mockRes();
    await getProfile(reqProfile, resProfile);
    if (resProfile.statusCode === 200 && resProfile.data.profile) {
      console.log('✅ Profile Loaded Successfully:', resProfile.data.profile.targetRole);
      console.log('   Current Skills:', resProfile.data.profile.skills?.all?.slice(0, 5).join(', ') + '...');
    } else {
      throw new Error(`Profile fetch failed with status ${resProfile.statusCode}: ${JSON.stringify(resProfile.data)}`);
    }

    console.log('\n🎉 ALL BACKEND HEALTH & CONTROLLER CHECKS PASSED!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testBackend();
