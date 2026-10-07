import { query } from '../config/db.js';

/**
 * GET /api/datascience-jobs
 * Lists and searches Data Science jobs by company, title, salary, or experience.
 * Supports: ?company=&search=&min_experience=&min_salary=&page=&limit=&sort=
 */
export async function getDataScienceJobs(req, res) {
  const company   = (req.query.company || '').trim();
  const search    = (req.query.search  || '').trim();
  const minExp    = req.query.min_experience !== undefined && req.query.min_experience !== ''
                      ? parseFloat(req.query.min_experience) : null;
  const minSalary = req.query.min_salary !== undefined && req.query.min_salary !== ''
                      ? parseFloat(req.query.min_salary) : null;
  const sort      = (req.query.sort || 'num_of_jobs_desc').trim();
  const page      = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit     = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
  const offset    = (page - 1) * limit;

  try {
    const conditions = [];
    const params = [];

    if (company) {
      params.push(`%${company}%`);
      conditions.push(`company_name ILIKE $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(job_title ILIKE $${params.length} OR company_name ILIKE $${params.length})`);
    }
    if (minExp !== null && !isNaN(minExp)) {
      params.push(minExp);
      conditions.push(`min_experience <= $${params.length}`);
    }
    if (minSalary !== null && !isNaN(minSalary)) {
      params.push(minSalary);
      conditions.push(`avg_salary_lakhs >= $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderBy = 'num_of_jobs DESC, avg_salary_lakhs DESC';
    if (sort === 'salary_desc') orderBy = 'avg_salary_lakhs DESC';
    else if (sort === 'salary_asc') orderBy = 'avg_salary_lakhs ASC';
    else if (sort === 'experience_asc') orderBy = 'min_experience ASC';
    else if (sort === 'company_asc') orderBy = 'company_name ASC';

    // Count
    const countRes = await query(`SELECT COUNT(*)::int as count FROM datascience_jobs ${whereClause}`, params);
    const totalCount = countRes.rows[0].count;

    params.push(limit);
    params.push(offset);
    const result = await query(
      `SELECT id, reference_no, company_name, job_title, min_experience,
              avg_salary, min_salary, max_salary, avg_salary_lakhs, min_salary_lakhs, max_salary_lakhs,
              num_of_jobs, created_at
       FROM datascience_jobs
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    return res.status(200).json({
      total: totalCount,
      count: result.rows.length,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      jobs: result.rows,
    });
  } catch (err) {
    console.error('Error in getDataScienceJobs:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

/**
 * GET /api/datascience-jobs/top-companies
 * Aggregates companies by hiring volume (num_of_jobs) and salary offerings.
 */
export async function getTopCompanies(req, res) {
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '20', 10)));
  try {
    const result = await query(
      `SELECT company_name,
              SUM(num_of_jobs)::int as total_openings,
              ROUND(AVG(avg_salary_lakhs), 2) as average_salary_lakhs,
              MAX(max_salary_lakhs) as top_salary_lakhs,
              COUNT(*)::int as role_variants
       FROM datascience_jobs
       GROUP BY company_name
       ORDER BY total_openings DESC
       LIMIT $1`,
      [limit]
    );

    return res.status(200).json({
      totalCompanies: result.rows.length,
      companies: result.rows,
    });
  } catch (err) {
    console.error('Error in getTopCompanies:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

/**
 * GET /api/datascience-jobs/salary-insights
 * Aggregates salary trends and benchmarks by experience level and role.
 */
export async function getSalaryInsights(req, res) {
  try {
    const [overall, byExp, byRole] = await Promise.all([
      query(`
        SELECT ROUND(AVG(avg_salary_lakhs), 2) as overall_avg_salary_lakhs,
               MIN(min_salary_lakhs) as absolute_min_salary_lakhs,
               MAX(max_salary_lakhs) as absolute_max_salary_lakhs,
               SUM(num_of_jobs)::int as total_job_postings
        FROM datascience_jobs
      `),
      query(`
        SELECT 
          CASE 
            WHEN min_experience <= 2 THEN 'Entry-Level (0-2 yrs)'
            WHEN min_experience <= 5 THEN 'Mid-Level (3-5 yrs)'
            WHEN min_experience <= 8 THEN 'Senior (6-8 yrs)'
            ELSE 'Leadership & Principal (9+ yrs)'
          END as experience_tier,
          ROUND(AVG(avg_salary_lakhs), 2) as avg_salary_lakhs,
          ROUND(AVG(min_salary_lakhs), 2) as avg_min_salary_lakhs,
          ROUND(AVG(max_salary_lakhs), 2) as avg_max_salary_lakhs,
          SUM(num_of_jobs)::int as total_openings,
          COUNT(*)::int as role_count
        FROM datascience_jobs
        GROUP BY experience_tier
        ORDER BY avg_salary_lakhs ASC
      `),
      query(`
        SELECT job_title,
               COUNT(*)::int as record_count,
               SUM(num_of_jobs)::int as total_openings,
               ROUND(AVG(avg_salary_lakhs), 2) as avg_salary_lakhs,
               MIN(min_salary_lakhs) as min_salary_lakhs,
               MAX(max_salary_lakhs) as max_salary_lakhs,
               ROUND(AVG(min_experience), 1) as avg_min_exp
        FROM datascience_jobs
        GROUP BY job_title
        ORDER BY avg_salary_lakhs DESC
      `),
    ]);

    return res.status(200).json({
      overview: overall.rows[0],
      experienceBenchmarks: byExp.rows,
      roleBenchmarks: byRole.rows,
    });
  } catch (err) {
    console.error('Error in getSalaryInsights:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

/**
 * GET /api/datascience-jobs/roles
 * Returns benchmark analytics across the 20 available dataset jobs in the platform.
 */
export async function getRoleBenchmarks(req, res) {
  try {
    const dsStats = await query(`
      SELECT job_title,
             COUNT(*)::int as companies_count,
             SUM(num_of_jobs)::int as total_openings,
             ROUND(AVG(avg_salary_lakhs), 2) as avg_salary_lakhs,
             MIN(min_salary_lakhs) as min_salary_lakhs,
             MAX(max_salary_lakhs) as max_salary_lakhs,
             ROUND(AVG(min_experience), 1) as avg_min_exp
      FROM datascience_jobs
      GROUP BY job_title
      ORDER BY avg_salary_lakhs DESC
    `);

    const analyticsStats = await query(`
      SELECT role_family,
             COUNT(*)::int as total_jobs,
             ROUND(AVG(salary_min_lakhs), 1) as avg_min_lakhs,
             ROUND(AVG(salary_max_lakhs), 1) as avg_max_lakhs
      FROM job_descriptions
      GROUP BY role_family
      ORDER BY total_jobs DESC
    `);

    return res.status(200).json({
      status: 'success',
      totalAvailableRoles: 20,
      dataScienceRoles: dsStats.rows,
      analyticsRoleFamilies: analyticsStats.rows,
    });
  } catch (err) {
    console.error('Error in getRoleBenchmarks:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

/**
 * GET /api/datascience-jobs/:id
 * Single job detail.
 */
export async function getDataScienceJobById(req, res) {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT id, reference_no, company_name, job_title, min_experience,
              avg_salary, min_salary, max_salary, avg_salary_lakhs, min_salary_lakhs, max_salary_lakhs,
              num_of_jobs, created_at
       FROM datascience_jobs
       WHERE id::text = $1 OR reference_no::text = $1
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Job with ID ${id} not found.` });
    }

    return res.status(200).json({ job: result.rows[0] });
  } catch (err) {
    console.error('Error in getDataScienceJobById:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}
