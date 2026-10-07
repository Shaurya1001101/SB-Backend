import { query } from '../config/db.js';

/**
 * GET /api/skillgap/jobs
 * Returns job descriptions from the Analytics Jobs dataset (15,841 jobs).
 * Supports filters: ?role_family=&search=&location=&salary=&experience=&page=&limit=
 */
export async function getJobDescriptions(req, res) {
  const roleFilter   = (req.query.role_family || '').trim();
  const search       = (req.query.search      || '').trim();
  const location     = (req.query.location    || '').trim();
  const salary       = (req.query.salary      || '').trim();
  const experience   = (req.query.experience  || '').trim();
  const page         = Math.max(1, parseInt(req.query.page || '1', 10));
  const limit        = Math.min(200, Math.max(1, parseInt(req.query.limit || '50', 10)));
  const offset       = (page - 1) * limit;

  try {
    const conditions = [`job_status = 'Open'`];
    const params     = [];

    if (roleFilter) {
      params.push(roleFilter);
      conditions.push(`role_family = $${params.length}`);
    }
    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(title ILIKE $${params.length} OR company ILIKE $${params.length} OR key_skills_raw ILIKE $${params.length})`);
    }
    if (location) {
      params.push(`%${location}%`);
      conditions.push(`location ILIKE $${params.length}`);
    }
    if (salary) {
      params.push(`%${salary}%`);
      conditions.push(`salary ILIKE $${params.length}`);
    }
    if (experience) {
      params.push(`%${experience}%`);
      conditions.push(`experience ILIKE $${params.length}`);
    }

    const whereClause = conditions.join(' AND ');

    // Count total matching
    const countRes = await query(`SELECT COUNT(*)::int as count FROM job_descriptions WHERE ${whereClause}`, params);
    const totalCount = countRes.rows[0].count;

    // Fetch page items
    params.push(limit);
    params.push(offset);
    const result = await query(
      `SELECT id, s_no, job_id, title, company, location, experience, min_exp_years, max_exp_years,
              salary, salary_min_lakhs, salary_max_lakhs, job_type, department, description,
              key_skills_raw, required_skills, apply_link, role_family, skills_source, scraped_date, created_at
       FROM job_descriptions
       WHERE ${whereClause}
       ORDER BY id ASC
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
    console.error('Error fetching job descriptions:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

/**
 * GET /api/skillgap/jobs/:id
 * Fetches a single job description by id, s_no, or job_id.
 */
export async function getJobById(req, res) {
  const { id } = req.params;
  try {
    const result = await query(
      `SELECT id, s_no, job_id, title, company, location, experience, min_exp_years, max_exp_years,
              salary, salary_min_lakhs, salary_max_lakhs, job_type, department, description,
              key_skills_raw, required_skills, apply_link, role_family, skills_source, scraped_date, created_at
       FROM job_descriptions
       WHERE id::text = $1 OR job_id = $1 OR s_no::text = $1
       LIMIT 1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: `Job with ID ${id} not found.` });
    }

    return res.status(200).json({ job: result.rows[0] });
  } catch (err) {
    console.error('Error in getJobById:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

/**
 * GET /api/skillgap/stats
 * Aggregated analytics across the 15,841 jobs dataset.
 */
export async function getAnalyticsStats(req, res) {
  try {
    const [totalRes, roleRes, salaryRes, expRes, locRes, desigRes] = await Promise.all([
      query(`SELECT COUNT(*)::int as total_jobs FROM job_descriptions`),
      query(`SELECT role_family, COUNT(*)::int as count FROM job_descriptions GROUP BY role_family ORDER BY count DESC LIMIT 10`),
      query(`SELECT salary, COUNT(*)::int as count FROM job_descriptions WHERE salary IS NOT NULL AND salary != '' GROUP BY salary ORDER BY count DESC LIMIT 10`),
      query(`SELECT experience, COUNT(*)::int as count FROM job_descriptions WHERE experience IS NOT NULL AND experience != '' GROUP BY experience ORDER BY count DESC LIMIT 10`),
      query(`SELECT location, COUNT(*)::int as count FROM job_descriptions WHERE location IS NOT NULL AND location != '' GROUP BY location ORDER BY count DESC LIMIT 10`),
      query(`SELECT title, COUNT(*)::int as count FROM job_descriptions GROUP BY title ORDER BY count DESC LIMIT 15`),
    ]);

    return res.status(200).json({
      totalJobs: totalRes.rows[0]?.total_jobs || 0,
      roleDistribution: roleRes.rows,
      salaryDistribution: salaryRes.rows,
      experienceDistribution: expRes.rows,
      topLocations: locRes.rows,
      topDesignations: desigRes.rows,
    });
  } catch (err) {
    console.error('Error in getAnalyticsStats:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

/**
 * POST /api/skillgap/jobs
 * Creates a new custom job description.
 */
export async function createJobDescription(req, res) {
  const { title, department, description, required_skills, company, location, apply_link, role_family, salary, experience } = req.body || {};

  if (!title || !required_skills || !Array.isArray(required_skills)) {
    return res.status(400).json({
      error: 'title and required_skills (array) are required.',
      example: {
        title: 'Lead Data Scientist',
        department: 'Data Science & AI',
        description: 'Designs deep learning architectures and statistical models.',
        company: 'SkillBridge Labs',
        location: 'Bengaluru',
        role_family: 'data-science',
        required_skills: [
          { skill: 'Python', weight: 10, category: 'tech' },
          { skill: 'PyTorch', weight: 9, category: 'ml' },
          { skill: 'SQL', weight: 8, category: 'tech' },
        ],
      },
    });
  }

  try {
    const formattedSkills = required_skills
      .map(s => {
        if (typeof s === 'string') {
          return { skill: s.trim(), weight: 7, category: 'tech' };
        }
        return {
          skill: (s?.skill || s?.name || '').trim(),
          weight: Number(s?.weight) || 7,
          category: s?.category || 'tech',
        };
      })
      .filter(s => s.skill.length > 0);

    const result = await query(
      `INSERT INTO job_descriptions (
        title, department, description, required_skills, company, location, apply_link, role_family, salary, experience
      )
      VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)
      RETURNING id, job_id, title, department, company, role_family`,
      [
        title.trim(),
        department || 'Analytics',
        description || '',
        JSON.stringify(formattedSkills),
        company || 'Analytics Enterprise',
        location || 'India',
        apply_link || null,
        role_family || 'analytics',
        salary || null,
        experience || null,
      ]
    );

    return res.status(201).json({
      success: true,
      job: result.rows[0],
      message: `Job description for "${title}" created successfully.`,
    });
  } catch (err) {
    console.error('Error creating job description:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

/**
 * GET /api/skillgap/analyze/:jobId
 * Analyzes the skill gap between a user's skills and the target job.
 * Requires: x-user-id header or ?userId=
 */
export async function analyzeSkillGap(req, res) {
  const { jobId } = req.params;
  const userId = req.headers['x-user-id'] || req.query.userId;

  if (!jobId || !userId) {
    return res.status(400).json({ error: 'jobId (URL param) and x-user-id (header or query) are required.' });
  }

  try {
    const jobRes = await query(
      `SELECT id, s_no, job_id, title, company, location, experience, salary, department, description,
              required_skills, apply_link, role_family
       FROM job_descriptions 
       WHERE id::text = $1 OR job_id = $1 OR s_no::text = $1
       LIMIT 1`,
      [jobId]
    );

    if (jobRes.rows.length === 0) {
      return res.status(404).json({ error: `No job description found with id ${jobId}.` });
    }

    const job = jobRes.rows[0];
    const rawRequiredSkills = Array.isArray(job.required_skills) ? job.required_skills : [];

    // Fetch employee skills from user_profiles
    const profileRes = await query(
      'SELECT skills_json, target_role FROM user_profiles WHERE user_id = $1',
      [userId]
    );

    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: `No profile found for user ${userId}.` });
    }

    const skillsJson     = profileRes.rows[0].skills_json || {};
    const employeeSkills = new Set(
      (skillsJson.all || []).map(s => String(s).toLowerCase().trim())
    );

    // Skill Gap Analysis
    const gaps           = [];
    const matched        = [];
    const requiredSkills = [];

    for (const req_skill of rawRequiredSkills) {
      const skillName = typeof req_skill === 'string'
        ? req_skill.trim()
        : (req_skill?.skill || req_skill?.name || '').trim();
      if (!skillName) continue;

      const weight   = typeof req_skill === 'object' && req_skill?.weight ? Number(req_skill.weight) : 7;
      const category = typeof req_skill === 'object' && req_skill?.category ? req_skill.category : 'tech';
      const normalizedItem = { skill: skillName, category, weight };
      requiredSkills.push(normalizedItem);

      const isOwned = employeeSkills.has(skillName.toLowerCase().trim());
      if (isOwned) matched.push(normalizedItem);
      else         gaps.push(normalizedItem);
    }

    gaps.sort((a, b) => b.weight - a.weight);

    const totalWeight    = requiredSkills.reduce((sum, s) => sum + (s.weight || 7), 0);
    const matchedWeight  = matched.reduce((sum, s) => sum + s.weight, 0);
    const readinessScore = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;

    const suggestions = gaps.map(g => {
      let priority, suggestion;
      if (g.weight >= 8) {
        priority   = 'Critical';
        suggestion = `"${g.skill}" is fundamental for "${job.title}". Prioritize immediate study or project building.`;
      } else if (g.weight >= 6) {
        priority   = 'High';
        suggestion = `"${g.skill}" is important for this position. Build intermediate working proficiency.`;
      } else {
        priority   = 'Medium';
        suggestion = `"${g.skill}" is a secondary skill. Add to your secondary roadmap.`;
      }
      return { skill: g.skill, category: g.category, weight: g.weight, priority, suggestion };
    });

    return res.status(200).json({
      jobId:         job.id,
      jobCode:       job.job_id || `AJ-${job.s_no}`,
      s_no:          job.s_no,
      jobTitle:      job.title,
      company:       job.company,
      location:      job.location,
      experience:    job.experience,
      salary:        job.salary,
      department:    job.department,
      applyLink:     job.apply_link,
      roleFamily:    job.role_family,
      readinessScore,
      summary:       `You match ${matched.length} of ${requiredSkills.length} required skills (${readinessScore}% readiness).`,
      matchedSkills: matched,
      skillGaps:     suggestions,
      totalRequired: requiredSkills.length,
      totalMatched:  matched.length,
      totalMissing:  gaps.length,
    });
  } catch (err) {
    console.error('Error in analyzeSkillGap:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

/**
 * GET /api/skillgap/analyze-all
 * Ranks all jobs by readiness score for the authenticated user.
 */
export async function analyzeAllJobs(req, res) {
  const userId     = req.headers['x-user-id'] || req.query.userId || req.params.userId;
  const roleFilter = (req.query.role_family || '').trim();
  const limit      = Math.min(100, Math.max(1, parseInt(req.query.limit || '50', 10)));

  if (!userId) {
    return res.status(400).json({ error: 'x-user-id header or userId query param is required.' });
  }

  try {
    let jobQuery = `SELECT id, s_no, job_id, title, company, location, experience, salary, department, required_skills, role_family, apply_link
                    FROM job_descriptions WHERE job_status = 'Open'`;
    const params = [];
    if (roleFilter) {
      params.push(roleFilter);
      jobQuery += ` AND role_family = $${params.length}`;
    }
    jobQuery += ` ORDER BY id ASC LIMIT 500`;

    const [jobsRes, profileRes] = await Promise.all([
      query(jobQuery, params),
      query('SELECT skills_json, target_role FROM user_profiles WHERE user_id = $1', [userId]),
    ]);

    if (profileRes.rows.length === 0) {
      return res.status(404).json({ error: `No profile found for user ${userId}.` });
    }

    const skillsJson     = profileRes.rows[0].skills_json || {};
    const targetRole     = profileRes.rows[0].target_role || '';
    const employeeSkills = new Set(
      (skillsJson.all || []).map(s => String(s).toLowerCase().trim())
    );

    const jobResults = jobsRes.rows.map(job => {
      const rawRequiredSkills = Array.isArray(job.required_skills) ? job.required_skills : [];
      let totalWeight   = 0;
      let matchedWeight = 0;
      let missingCount  = 0;
      const topMissing  = [];

      for (const rs of rawRequiredSkills) {
        const skillName = typeof rs === 'string'
          ? rs.trim()
          : (rs?.skill || rs?.name || '').trim();
        if (!skillName) continue;

        const weight = typeof rs === 'object' && rs?.weight ? Number(rs.weight) : 7;
        totalWeight += weight;

        if (employeeSkills.has(skillName.toLowerCase().trim())) {
          matchedWeight += weight;
        } else {
          missingCount++;
          if (topMissing.length < 3) topMissing.push(skillName);
        }
      }

      const readinessScore = totalWeight > 0 ? Math.round((matchedWeight / totalWeight) * 100) : 0;

      return {
        jobId:            job.id,
        jobCode:          job.job_id || `AJ-${job.s_no}`,
        title:            job.title,
        company:          job.company,
        location:         job.location,
        experience:       job.experience,
        salary:           job.salary,
        department:       job.department,
        roleFamily:       job.role_family,
        applyLink:        job.apply_link,
        readinessScore,
        totalRequired:    rawRequiredSkills.length,
        totalMissing:     missingCount,
        topMissingSkills: topMissing,
      };
    });

    jobResults.sort((a, b) => b.readinessScore - a.readinessScore);
    const topMatches = jobResults.slice(0, limit);

    return res.status(200).json({
      userId,
      targetRole,
      totalAnalyzed: jobResults.length,
      returnedMatches: topMatches.length,
      jobMatches: topMatches,
      message: `Ranked top ${topMatches.length} job matches for your skill set.`,
    });
  } catch (err) {
    console.error('Error in analyzeAllJobs:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}
