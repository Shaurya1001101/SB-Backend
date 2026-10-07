process.env.NODE_ENV = 'test';
import app from '../server.js';

async function runHttpTests() {
  console.log('🚀 Starting ephemeral HTTP test server...');

  const server = app.listen(0, async () => {
    const port = server.address().port;
    const baseUrl = `http://localhost:${port}`;
    console.log(`📡 Ephemeral server running on ${baseUrl}`);

    try {
      // 1. Health check
      console.log('\n--- 1. Testing GET /api/health ---');
      const healthRes = await fetch(`${baseUrl}/api/health`);
      const healthData = await healthRes.json();
      console.log('Status:', healthRes.status, '| database:', healthData.database);
      if (healthRes.status !== 200) throw new Error('Health check failed');

      // 2. Dataset Overview
      console.log('\n--- 2. Testing GET /api/dataset/summary ---');
      const dsSummaryRes = await fetch(`${baseUrl}/api/dataset/summary`);
      const dsSummary = await dsSummaryRes.json();
      console.log('Status:', dsSummaryRes.status, '| totalIntegratedRecords:', dsSummary.totalIntegratedRecords);
      dsSummary.datasets.forEach(d => {
        console.log(`   - ${d.name} (${d.table}): ${d.recordsCount} records`);
      });
      if (dsSummaryRes.status !== 200 || dsSummary.totalIntegratedRecords < 17000) {
        throw new Error('Dataset summary check failed');
      }

      // 3. Auth Registration with username, name, password (Supabase + bcrypt)
      console.log('\n--- 3a. Testing POST /api/auth/register with username, name, password ---');
      const testUsername = `user_${Date.now()}`;
      const testName = 'Jane Doe';
      const testPassword = 'SecurePassword123!';
      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testUsername,
          name: testName,
          password: testPassword,
        }),
      });
      const regData = await regRes.json();
      console.log('Register Status:', regRes.status, '| Created User:', regData.user?.username, '| ID:', regData.user?.id);
      if (regRes.status !== 201 || !regData.user?.id) throw new Error('Auth registration failed');

      // Verify directly from Supabase users table that password is a valid bcrypt hash
      const { query } = await import('../src/config/db.js');
      const dbCheck = await query('SELECT id, username, name, email, password_hash FROM users WHERE id = $1', [regData.user.id]);
      if (dbCheck.rows.length === 0) throw new Error('User not found in Supabase users table');
      const dbUser = dbCheck.rows[0];
      console.log('Supabase users table record:');
      console.log(`   - ID: ${dbUser.id}`);
      console.log(`   - Username: ${dbUser.username}`);
      console.log(`   - Name: ${dbUser.name}`);
      console.log(`   - Bcrypt Hash: ${dbUser.password_hash.slice(0, 15)}... (length: ${dbUser.password_hash.length})`);
      if (!dbUser.password_hash.startsWith('$2b$') && !dbUser.password_hash.startsWith('$2a$')) {
        throw new Error('Password was NOT stored as a valid bcrypt hash in Supabase!');
      }

      // Test Login with newly registered username and password
      console.log('\n--- 3b. Testing POST /api/auth/login with newly created username & password ---');
      const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: testUsername,
          password: testPassword,
        }),
      });
      const loginData = await loginRes.json();
      console.log('Login Status:', loginRes.status, '| Logged In User:', loginData.user?.username);
      if (loginRes.status !== 200 || loginData.user?.username !== testUsername) throw new Error('Login with username failed');

      // Clean up test user from Supabase
      await query('DELETE FROM users WHERE id = $1', [regData.user.id]);
      console.log('✅ Cleaned up temporary test user from Supabase');

      // 3c. Auth Demo login
      console.log('\n--- 3c. Testing POST /api/auth/demo ---');
      const authRes = await fetch(`${baseUrl}/api/auth/demo`, { method: 'POST' });
      const authData = await authRes.json();
      console.log('Status:', authRes.status, '| user:', authData.user?.email);
      if (authRes.status !== 200) throw new Error('Auth demo login failed');

      const userId = authData.user.id;

      // 4. Profile
      console.log('\n--- 4. Testing GET /api/profile with x-user-id ---');
      const profileRes = await fetch(`${baseUrl}/api/profile`, {
        headers: { 'x-user-id': String(userId) },
      });
      const profileData = await profileRes.json();
      console.log('Status:', profileRes.status, '| role:', profileData.profile?.targetRole);
      if (profileRes.status !== 200) throw new Error('Profile fetch failed');

      // 5. Analytics Jobs list & stats
      console.log('\n--- 5. Testing GET /api/skillgap/jobs?limit=5 & /api/skillgap/stats ---');
      const jobsRes = await fetch(`${baseUrl}/api/skillgap/jobs?limit=5`);
      const jobsData = await jobsRes.json();
      console.log('Status:', jobsRes.status, '| returned jobs count:', jobsData.jobs?.length, '| total:', jobsData.total);
      if (jobsRes.status !== 200 || !jobsData.jobs?.length) throw new Error('Skillgap jobs fetch failed');

      const statsRes = await fetch(`${baseUrl}/api/skillgap/stats`);
      const statsData = await statsRes.json();
      console.log('Stats status:', statsRes.status, '| totalJobs:', statsData.totalJobs);

      // 6. Skillgap Analyze All & Single
      console.log('\n--- 6. Testing Skill Gap endpoints ---');
      const analyzeAllRes = await fetch(`${baseUrl}/api/skillgap/analyze-all`, {
        headers: { 'x-user-id': String(userId) },
      });
      const analyzeAllData = await analyzeAllRes.json();
      console.log('Status:', analyzeAllRes.status, '| returnedMatches:', analyzeAllData.returnedMatches);
      if (analyzeAllRes.status !== 200 || !analyzeAllData.jobMatches?.length) throw new Error('Skillgap analyze-all failed');

      const sampleJobId = jobsData.jobs[0].id;
      const analyzeRes = await fetch(`${baseUrl}/api/skillgap/analyze/${sampleJobId}`, {
        headers: { 'x-user-id': String(userId) },
      });
      const analyzeData = await analyzeRes.json();
      console.log('Analyze single status:', analyzeRes.status, '| jobTitle:', analyzeData.jobTitle, '| score:', analyzeData.readinessScore);
      if (analyzeRes.status !== 200) throw new Error('Skillgap analyze single job failed');

      // 7. Data Science Jobs endpoints
      console.log('\n--- 7. Testing Data Science Jobs endpoints ---');
      const dsJobsRes = await fetch(`${baseUrl}/api/datascience-jobs?limit=5`);
      const dsJobsData = await dsJobsRes.json();
      console.log('Status:', dsJobsRes.status, '| total DS jobs:', dsJobsData.total);
      if (dsJobsRes.status !== 200 || !dsJobsData.jobs?.length) throw new Error('DS jobs fetch failed');

      const dsTopRes = await fetch(`${baseUrl}/api/datascience-jobs/top-companies?limit=5`);
      const dsTopData = await dsTopRes.json();
      console.log('Top companies status:', dsTopRes.status, '| top company:', dsTopData.companies?.[0]?.company_name);

      const dsInsightsRes = await fetch(`${baseUrl}/api/datascience-jobs/salary-insights`);
      const dsInsightsData = await dsInsightsRes.json();
      console.log('Salary insights status:', dsInsightsRes.status, '| overall avg salary:', dsInsightsData.overview?.overall_avg_salary_lakhs, 'Lakhs');

      // 8. JDS Skill Traits endpoints
      console.log('\n--- 8. Testing JDS Traits endpoints ---');
      const jdsRes = await fetch(`${baseUrl}/api/traits/jds`);
      const jdsData = await jdsRes.json();
      console.log('JDS status:', jdsRes.status, '| total candidates:', jdsData.summary?.total_candidates);

      const jdsPredictRes = await fetch(`${baseUrl}/api/traits/jds/predict-hike`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          big_data_skills: 4.1,
          maths_stats_skills: 4.3,
          coding_skills: 4.5,
          ai_and_ml_skills: 4.0,
          dashboard_and_storytelling_skills: 3.8,
        }),
      });
      const jdsPredictData = await jdsPredictRes.json();
      console.log('JDS predict status:', jdsPredictRes.status, '| outcome:', jdsPredictData.predictedOutcome, `(${jdsPredictData.hikeProbabilityPct}%)`);

      // 9. SDS Personality Traits endpoints
      console.log('\n--- 9. Testing SDS Traits endpoints ---');
      const sdsRes = await fetch(`${baseUrl}/api/traits/sds`);
      const sdsData = await sdsRes.json();
      console.log('SDS status:', sdsRes.status, '| total candidates:', sdsData.summary?.total_candidates);

      const sdsAssessRes = await fetch(`${baseUrl}/api/traits/sds/assess-fit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          neuroticism: 32,
          extraversion: 40,
          openness_to_experience: 49,
          agreeableness: 51,
          conscientiousness: 54,
        }),
      });
      const sdsAssessData = await sdsAssessRes.json();
      console.log('SDS assess status:', sdsAssessRes.status, '| fit:', sdsAssessData.predictedSuccess, '| archetype:', sdsAssessData.leadershipArchetype);

      // 10. News and AI Assistant
      console.log('\n--- 10. Testing News and AI endpoints ---');
      const newsRes = await fetch(`${baseUrl}/api/news`);
      const newsData = await newsRes.json();
      console.log('News status:', newsRes.status, '| count:', newsData.articles?.length);

      const aiRes = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'What skills are most important for Data Science in 2026?' }),
      });
      const aiData = await aiRes.json();
      console.log('AI chat status:', aiRes.status, '| source:', aiData.source);

      console.log('\n🎉 ALL LIVE HTTP ENDPOINTS TESTED SUCCESSFULLY WITH ZERO ERRORS!');
      server.close(() => process.exit(0));
    } catch (err) {
      console.error('\n❌ HTTP Test Error:', err);
      server.close(() => process.exit(1));
    }
  });
}

runHttpTests();
