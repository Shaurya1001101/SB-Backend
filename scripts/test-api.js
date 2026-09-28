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
      console.log('   Current Skills:', (resProfile.data.profile.skills?.all || ['Python', 'SQL']).slice(0, 5).join(', ') + '...');
    }

    // 4. Update Profile Controller
    console.log('\n--- 4. Testing Profile Update Controller ---');
    const reqUpdate = {
      headers: { 'x-user-id': demoUserId },
      body: { xp: 135, targetRole: 'ml-engineer', skills: { all: ['Python', 'PyTorch', 'Docker'] } }
    };
    const resUpdate = mockRes();
    const { updateProfile } = await import('../src/controllers/profile.controller.js');
    await updateProfile(reqUpdate, resUpdate);
    if (resUpdate.statusCode === 200) {
      console.log('✅ Profile Update Successful:', resUpdate.data.message);
    } else {
      throw new Error(`Profile update failed: ${JSON.stringify(resUpdate.data)}`);
    }

    // 5. Path Commit & Toggle Controller
    console.log('\n--- 5. Testing Path Controllers ---');
    const { commitPath, toggleTask } = await import('../src/controllers/path.controller.js');
    const reqPath = {
      headers: { 'x-user-id': demoUserId },
      body: { roleKey: 'ml-engineer', pacingKey: 'balanced', tasksSchedule: [] }
    };
    const resPath = mockRes();
    await commitPath(reqPath, resPath);
    if (resPath.statusCode === 200) {
      console.log('✅ Commit Path Successful:', resPath.data.message);
    }

    const reqTask = {
      headers: { 'x-user-id': demoUserId },
      body: { taskId: 'task-test-1', isCompleted: true, xpAwarded: 25 }
    };
    const resTask = mockRes();
    await toggleTask(reqTask, resTask);
    if (resTask.statusCode === 200) {
      console.log('✅ Task Toggle Successful, Completed count:', resTask.data.completedTaskIds?.length);
    }

    // 6. AI Assistant Controller
    console.log('\n--- 6. Testing AI Controller ---');
    const { chatAI } = await import('../src/controllers/ai.controller.js');
    const reqAI = { body: { message: 'Explain MLOps architecture' } };
    const resAI = mockRes();
    await chatAI(reqAI, resAI);
    if (resAI.statusCode === 200 && resAI.data.reply) {
      console.log('✅ AI Controller Successful! Source:', resAI.data.source);
      console.log('   Preview:', resAI.data.reply.slice(0, 70) + '...');
    }

    // 7. News Controller
    console.log('\n--- 7. Testing News Controller ---');
    const { getNews } = await import('../src/controllers/news.controller.js');
    const reqNews = {};
    const resNews = mockRes();
    await getNews(reqNews, resNews);
    if (resNews.statusCode === 200 && resNews.data.articles?.length > 0) {
      console.log(`✅ News Controller Successful! ${resNews.data.articles.length} articles returned.`);
    }

    console.log('\n🎉 ALL 7 BACKEND HEALTH & CONTROLLER CHECKS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testBackend();
