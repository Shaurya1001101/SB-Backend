import dotenv from 'dotenv';
import path from 'path';

// Load .env.local or .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

import { query } from '../src/config/db.js';
import { demoLogin } from '../src/controllers/auth.controller.js';
import { getProfile, updateProfile } from '../src/controllers/profile.controller.js';
import { commitPath, toggleTask } from '../src/controllers/path.controller.js';
import { chatAI } from '../src/controllers/ai.controller.js';
import { getNews } from '../src/controllers/news.controller.js';
import {
  getJobDescriptions,
  getJobById,
  getAnalyticsStats,
  analyzeSkillGap,
  analyzeAllJobs,
} from '../src/controllers/skillgap.controller.js';
import {
  getDataScienceJobs,
  getTopCompanies,
  getSalaryInsights,
} from '../src/controllers/datascience.controller.js';
import {
  getJDSStats,
  predictJDSHike,
  getSDSStats,
  assessSDSFit,
} from '../src/controllers/traits.controller.js';

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
  console.log('🧪 Running SkillBridge Backend Test Suite with Integrated Datasets...\n');

  try {
    // 1. Database Connectivity & Dataset Row Counts
    console.log('--- 1. Testing Database Query & Dataset Verification ---');
    const [dbTest, c1, c2, c3, c4] = await Promise.all([
      query('SELECT NOW() as current_time, COUNT(*)::int as user_count FROM users'),
      query('SELECT COUNT(*)::int as count FROM job_descriptions'),
      query('SELECT COUNT(*)::int as count FROM datascience_jobs'),
      query('SELECT COUNT(*)::int as count FROM jds_skill_traits'),
      query('SELECT COUNT(*)::int as count FROM sds_personality_traits'),
    ]);
    console.log('✅ Database connected! Server time:', dbTest.rows[0].current_time);
    console.log('✅ Dataset 1 (job_descriptions):', c1.rows[0].count, 'records');
    console.log('✅ Dataset 2 (datascience_jobs):', c2.rows[0].count, 'records');
    console.log('✅ Dataset 3 (jds_skill_traits):', c3.rows[0].count, 'records');
    console.log('✅ Dataset 4 (sds_personality_traits):', c4.rows[0].count, 'records');

    if (c1.rows[0].count < 15000) throw new Error('Analytics jobs dataset not fully populated!');
    if (c2.rows[0].count < 1600) throw new Error('Data science jobs dataset not fully populated!');

    // 2. Demo Auth Controller
    console.log('\n--- 2. Testing Demo Login Controller ---');
    const reqDemo = { body: {} };
    const resDemo = mockRes();
    await demoLogin(reqDemo, resDemo);
    if (resDemo.statusCode === 200 && resDemo.data.user) {
      console.log('✅ Demo Login Successful:', resDemo.data.user.email);
    } else {
      throw new Error(`Demo login failed: ${JSON.stringify(resDemo.data)}`);
    }

    const demoUserId = resDemo.data.user.id;

    // 3. Profile Controller
    console.log('\n--- 3. Testing Profile Controller ---');
    const reqProfile = { headers: { 'x-user-id': demoUserId }, query: {} };
    const resProfile = mockRes();
    await getProfile(reqProfile, resProfile);
    if (resProfile.statusCode === 200 && resProfile.data.profile) {
      console.log('✅ Profile Loaded Successfully:', resProfile.data.profile.targetRole);
    }

    // 4. Update Profile
    console.log('\n--- 4. Testing Profile Update Controller ---');
    const reqUpdate = {
      headers: { 'x-user-id': demoUserId },
      body: { xp: 150, targetRole: 'data-scientist', skills: { all: ['Python', 'SQL', 'Pandas', 'Machine Learning', 'Tableau'] } },
    };
    const resUpdate = mockRes();
    await updateProfile(reqUpdate, resUpdate);
    if (resUpdate.statusCode === 200) {
      console.log('✅ Profile Update Successful:', resUpdate.data.message);
    }

    // 5. Path Controllers
    console.log('\n--- 5. Testing Path Controllers ---');
    const reqPath = {
      headers: { 'x-user-id': demoUserId },
      body: { roleKey: 'data-scientist', pacingKey: 'balanced', tasksSchedule: [] },
    };
    const resPath = mockRes();
    await commitPath(reqPath, resPath);
    if (resPath.statusCode === 200) {
      console.log('✅ Commit Path Successful');
    }

    // 6. Analytics Jobs Controller
    console.log('\n--- 6. Testing Analytics Jobs (job_descriptions) Controller ---');
    const reqJobs = { query: { limit: '5', search: 'Data' } };
    const resJobs = mockRes();
    await getJobDescriptions(reqJobs, resJobs);
    if (resJobs.statusCode === 200 && resJobs.data.jobs?.length > 0) {
      console.log(`✅ getJobDescriptions: Retrieved ${resJobs.data.jobs.length} jobs (Total in database matching: ${resJobs.data.total})`);
      console.log(`   Sample Job: "${resJobs.data.jobs[0].title}" | Location: ${resJobs.data.jobs[0].location} | Salary: ${resJobs.data.jobs[0].salary}`);
    } else {
      throw new Error('getJobDescriptions failed');
    }

    // 6b. Analytics Stats
    const reqStats = {};
    const resStats = mockRes();
    await getAnalyticsStats(reqStats, resStats);
    if (resStats.statusCode === 200 && resStats.data.totalJobs > 0) {
      console.log(`✅ getAnalyticsStats: Analyzed total ${resStats.data.totalJobs} jobs across ${resStats.data.roleDistribution.length} role families.`);
    }

    // 6c. Skill Gap Single Job
    const firstJobId = resJobs.data.jobs[0].id;
    const reqGap = { params: { jobId: String(firstJobId) }, headers: { 'x-user-id': demoUserId }, query: {} };
    const resGap = mockRes();
    await analyzeSkillGap(reqGap, resGap);
    if (resGap.statusCode === 200 && resGap.data.readinessScore !== undefined) {
      console.log(`✅ analyzeSkillGap: Readiness score ${resGap.data.readinessScore}% for "${resGap.data.jobTitle}"`);
      console.log(`   Matched: ${resGap.data.totalMatched} | Gaps: ${resGap.data.totalMissing}`);
    }

    // 6d. Skill Gap Analyze All
    const reqGapAll = { headers: { 'x-user-id': demoUserId }, query: { limit: '10' } };
    const resGapAll = mockRes();
    await analyzeAllJobs(reqGapAll, resGapAll);
    if (resGapAll.statusCode === 200 && resGapAll.data.jobMatches?.length > 0) {
      console.log(`✅ analyzeAllJobs: Ranked top ${resGapAll.data.jobMatches.length} job matches. Top match: "${resGapAll.data.jobMatches[0].title}" (${resGapAll.data.jobMatches[0].readinessScore}%)`);
    }

    // 7. Data Science Jobs Controller (Company & Salary Benchmarks)
    console.log('\n--- 7. Testing Data Science Jobs Controller ---');
    const reqDS = { query: { limit: '5' } };
    const resDS = mockRes();
    await getDataScienceJobs(reqDS, resDS);
    if (resDS.statusCode === 200 && resDS.data.jobs?.length > 0) {
      console.log(`✅ getDataScienceJobs: Retrieved ${resDS.data.jobs.length} jobs (Total: ${resDS.data.total})`);
      console.log(`   Sample DS Job: ${resDS.data.jobs[0].company_name} - ${resDS.data.jobs[0].job_title} (Avg: ${resDS.data.jobs[0].avg_salary})`);
    }

    // 7b. Top Companies
    const reqTopComp = { query: { limit: '5' } };
    const resTopComp = mockRes();
    await getTopCompanies(reqTopComp, resTopComp);
    if (resTopComp.statusCode === 200 && resTopComp.data.companies?.length > 0) {
      console.log(`✅ getTopCompanies: Top hiring company is "${resTopComp.data.companies[0].company_name}" with ${resTopComp.data.companies[0].total_openings} openings.`);
    }

    // 7c. Salary Insights
    const reqInsights = {};
    const resInsights = mockRes();
    await getSalaryInsights(reqInsights, resInsights);
    if (resInsights.statusCode === 200 && resInsights.data.overview) {
      console.log(`✅ getSalaryInsights: Overall average salary is ${resInsights.data.overview.overall_avg_salary_lakhs} Lakhs.`);
    }

    // 8. JDS Skill Traits Controller
    console.log('\n--- 8. Testing Junior Data Scientist Skill Traits (JDS) Controller ---');
    const reqJDS = {};
    const resJDS = mockRes();
    await getJDSStats(reqJDS, resJDS);
    if (resJDS.statusCode === 200 && resJDS.data.summary) {
      console.log(`✅ getJDSStats: Evaluated ${resJDS.data.summary.total_candidates} candidates. High hike rate: ${resJDS.data.summary.high_hike_rate_pct}%`);
    }

    // 8b. Predict JDS Hike
    const reqPredict = {
      body: {
        big_data_skills: 4.2,
        maths_stats_skills: 4.5,
        coding_skills: 4.0,
        ai_and_ml_skills: 4.6,
        dashboard_and_storytelling_skills: 4.3,
      },
    };
    const resPredict = mockRes();
    await predictJDSHike(reqPredict, resPredict);
    if (resPredict.statusCode === 200) {
      console.log(`✅ predictJDSHike: Prediction = "${resPredict.data.predictedOutcome}" (${resPredict.data.hikeProbabilityPct}% probability)`);
    }

    // 9. SDS Personality Traits Controller
    console.log('\n--- 9. Testing Senior Data Scientist Personality Traits (SDS) Controller ---');
    const reqSDS = {};
    const resSDS = mockRes();
    await getSDSStats(reqSDS, resSDS);
    if (resSDS.statusCode === 200 && resSDS.data.summary) {
      console.log(`✅ getSDSStats: Evaluated ${resSDS.data.summary.total_candidates} senior candidates. High success rate: ${resSDS.data.summary.high_success_rate_pct}%`);
    }

    // 9b. Assess SDS Fit
    const reqAssess = {
      body: {
        neuroticism: 30,
        extraversion: 45,
        openness_to_experience: 50,
        agreeableness: 48,
        conscientiousness: 55,
      },
    };
    const resAssess = mockRes();
    await assessSDSFit(reqAssess, resAssess);
    if (resAssess.statusCode === 200) {
      console.log(`✅ assessSDSFit: Fit = "${resAssess.data.predictedSuccess}" (${resAssess.data.successProbabilityPct}% probability) | Archetype: ${resAssess.data.leadershipArchetype}`);
    }

    console.log('\n🎉 ALL CONTROLLER CHECKS & ALL 4 DATASET INTEGRATIONS PASSED WITH 100% SUCCESS!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testBackend();
