import { Router } from 'express';
import { query } from '../config/db.js';

const router = Router();

router.get('/summary', async (req, res) => {
  try {
    const [c1, c2, c3, c4] = await Promise.all([
      query(`SELECT COUNT(*)::int as count FROM job_descriptions`),
      query(`SELECT COUNT(*)::int as count FROM datascience_jobs`),
      query(`SELECT COUNT(*)::int as count FROM jds_skill_traits`),
      query(`SELECT COUNT(*)::int as count FROM sds_personality_traits`),
    ]);

    return res.status(200).json({
      status: 'operational',
      datasets: [
        {
          name: 'Analytics Jobs',
          table: 'job_descriptions',
          recordsCount: c1.rows[0].count,
          description: 'Job postings, designations, experience, salary brackets, and required skills.',
          sourceFile: 'Analytics Jobs.csv',
          primaryEndpoints: ['/api/skillgap/jobs', '/api/skillgap/stats', '/api/skillgap/analyze/:jobId'],
        },
        {
          name: 'Data Science Jobs',
          table: 'datascience_jobs',
          recordsCount: c2.rows[0].count,
          description: 'Company-wise hiring volumes, average salaries, min/max salary ranges, and experience.',
          sourceFile: 'DataScience Jobs.csv',
          primaryEndpoints: ['/api/datascience-jobs', '/api/datascience-jobs/top-companies', '/api/datascience-jobs/salary-insights'],
        },
        {
          name: 'Junior Data Scientist Skill Traits (JDS)',
          table: 'jds_skill_traits',
          recordsCount: c3.rows[0].count,
          description: 'Candidate evaluations across 5 skill dimensions (Big Data, Maths/Stats, Coding, AI/ML, Storytelling) and salary hike outcome.',
          sourceFile: 'JDS Skill Traits.csv',
          primaryEndpoints: ['/api/traits/jds', '/api/traits/jds/predict-hike'],
        },
        {
          name: 'Senior Data Scientist Personality Traits (SDS)',
          table: 'sds_personality_traits',
          recordsCount: c4.rows[0].count,
          description: 'Big Five Personality / EPQ measurements and customer-facing senior success classification.',
          sourceFile: 'SDS Personality Traits.csv',
          primaryEndpoints: ['/api/traits/sds', '/api/traits/sds/assess-fit'],
        },
      ],
      totalIntegratedRecords:
        c1.rows[0].count + c2.rows[0].count + c3.rows[0].count + c4.rows[0].count,
    });
  } catch (err) {
    console.error('Error fetching dataset summary:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
});

export default router;
