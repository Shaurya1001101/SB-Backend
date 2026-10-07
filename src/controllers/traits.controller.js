import { query } from '../config/db.js';

/**
 * GET /api/traits/jds
 * Returns benchmark analytics for Junior Data Scientists (139 records).
 */
export async function getJDSStats(req, res) {
  try {
    const [overall, byHike, sample] = await Promise.all([
      query(`
        SELECT COUNT(*)::int as total_candidates,
               ROUND(AVG(big_data_skills), 2) as avg_big_data,
               ROUND(AVG(maths_stats_skills), 2) as avg_maths_stats,
               ROUND(AVG(coding_skills), 2) as avg_coding,
               ROUND(AVG(ai_and_ml_skills), 2) as avg_ai_ml,
               ROUND(AVG(dashboard_and_storytelling_skills), 2) as avg_storytelling,
               ROUND((SUM(CASE WHEN salary_hike_high_or_low = 1 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 1) as high_hike_rate_pct
        FROM jds_skill_traits
      `),
      query(`
        SELECT salary_hike_high_or_low as is_high_hike,
               COUNT(*)::int as count,
               ROUND(AVG(big_data_skills), 2) as avg_big_data,
               ROUND(AVG(maths_stats_skills), 2) as avg_maths_stats,
               ROUND(AVG(coding_skills), 2) as avg_coding,
               ROUND(AVG(ai_and_ml_skills), 2) as avg_ai_ml,
               ROUND(AVG(dashboard_and_storytelling_skills), 2) as avg_storytelling
        FROM jds_skill_traits
        GROUP BY salary_hike_high_or_low
        ORDER BY salary_hike_high_or_low DESC
      `),
      query(`SELECT * FROM jds_skill_traits ORDER BY id ASC LIMIT 10`),
    ]);

    return res.status(200).json({
      summary: overall.rows[0],
      hikeCohortComparison: byHike.rows,
      sampleRecords: sample.rows,
    });
  } catch (err) {
    console.error('Error in getJDSStats:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

/**
 * POST /api/traits/jds/predict-hike
 * Evaluates candidate skill traits and predicts salary hike probability.
 * Body: { big_data_skills, maths_stats_skills, coding_skills, ai_and_ml_skills, dashboard_and_storytelling_skills } (1-5)
 */
export async function predictJDSHike(req, res) {
  const body = req.body || {};
  let {
    big_data_skills,
    maths_stats_skills,
    coding_skills,
    ai_and_ml_skills,
    dashboard_and_storytelling_skills,
  } = body;

  // Fallback defaults or parse
  big_data_skills                   = parseFloat(big_data_skills) || 3.5;
  maths_stats_skills                = parseFloat(maths_stats_skills) || 3.8;
  coding_skills                     = parseFloat(coding_skills) || 4.0;
  ai_and_ml_skills                  = parseFloat(ai_and_ml_skills) || 3.7;
  dashboard_and_storytelling_skills = parseFloat(dashboard_and_storytelling_skills) || 3.9;

  try {
    // Fetch centroids for high hike (1) vs low hike (0)
    const centroidsRes = await query(`
      SELECT salary_hike_high_or_low,
             AVG(big_data_skills) as c_big_data,
             AVG(maths_stats_skills) as c_maths,
             AVG(coding_skills) as c_coding,
             AVG(ai_and_ml_skills) as c_ai_ml,
             AVG(dashboard_and_storytelling_skills) as c_story
      FROM jds_skill_traits
      GROUP BY salary_hike_high_or_low
    `);

    const highCentroid = centroidsRes.rows.find(r => r.salary_hike_high_or_low === 1) || {};
    const lowCentroid  = centroidsRes.rows.find(r => r.salary_hike_high_or_low === 0) || {};

    const userVec = [big_data_skills, maths_stats_skills, coding_skills, ai_and_ml_skills, dashboard_and_storytelling_skills];
    const highVec = [
      parseFloat(highCentroid.c_big_data) || 4.2,
      parseFloat(highCentroid.c_maths) || 4.1,
      parseFloat(highCentroid.c_coding) || 4.3,
      parseFloat(highCentroid.c_ai_ml) || 4.4,
      parseFloat(highCentroid.c_story) || 4.2,
    ];
    const lowVec = [
      parseFloat(lowCentroid.c_big_data) || 2.8,
      parseFloat(lowCentroid.c_maths) || 2.9,
      parseFloat(lowCentroid.c_coding) || 3.0,
      parseFloat(lowCentroid.c_ai_ml) || 2.7,
      parseFloat(lowCentroid.c_story) || 2.9,
    ];

    // Euclidean distance
    const distHigh = Math.sqrt(userVec.reduce((sum, v, i) => sum + Math.pow(v - highVec[i], 2), 0));
    const distLow  = Math.sqrt(userVec.reduce((sum, v, i) => sum + Math.pow(v - lowVec[i], 2), 0));

    // Softmax-like probability
    const simHigh = 1 / (1 + distHigh);
    const simLow  = 1 / (1 + distLow);
    const hikeProbability = Math.round((simHigh / (simHigh + simLow)) * 100);

    const labels = ['Big Data', 'Maths & Stats', 'Coding', 'AI & ML', 'Dashboard & Storytelling'];
    const comparisons = userVec.map((val, idx) => ({
      skill: labels[idx],
      userScore: val,
      highHikeBenchmark: Number(highVec[idx].toFixed(2)),
      gap: Number((highVec[idx] - val).toFixed(2)),
    }));

    // Find highest priority gap
    const biggestGap = [...comparisons].sort((a, b) => b.gap - a.gap)[0];

    return res.status(200).json({
      predictedOutcome: hikeProbability >= 50 ? 'High Salary Hike' : 'Standard Salary Hike',
      hikeProbabilityPct: hikeProbability,
      candidateScores: {
        big_data_skills,
        maths_stats_skills,
        coding_skills,
        ai_and_ml_skills,
        dashboard_and_storytelling_skills,
      },
      benchmarkComparison: comparisons,
      topRecommendation: biggestGap.gap > 0
        ? `Boost your ${biggestGap.skill} score from ${biggestGap.userScore} to ${biggestGap.highHikeBenchmark} to maximize your high salary hike probability.`
        : 'All skill dimensions exceed high-performance benchmarks! Excellent profile.',
    });
  } catch (err) {
    console.error('Error in predictJDSHike:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

/**
 * GET /api/traits/sds
 * Returns benchmark analytics for Senior Data Scientists (161 records).
 */
export async function getSDSStats(req, res) {
  try {
    const [overall, bySuccess, sample] = await Promise.all([
      query(`
        SELECT COUNT(*)::int as total_candidates,
               ROUND(AVG(neuroticism), 2) as avg_neuroticism,
               ROUND(AVG(extraversion), 2) as avg_extraversion,
               ROUND(AVG(openness_to_experience), 2) as avg_openness,
               ROUND(AVG(agreeableness), 2) as avg_agreeableness,
               ROUND(AVG(conscientiousness), 2) as avg_conscientiousness,
               ROUND((SUM(CASE WHEN success_classification_high_low = 1 THEN 1 ELSE 0 END)::numeric / COUNT(*)) * 100, 1) as high_success_rate_pct
        FROM sds_personality_traits
      `),
      query(`
        SELECT success_classification_high_low as is_high_success,
               COUNT(*)::int as count,
               ROUND(AVG(neuroticism), 2) as avg_neuroticism,
               ROUND(AVG(extraversion), 2) as avg_extraversion,
               ROUND(AVG(openness_to_experience), 2) as avg_openness,
               ROUND(AVG(agreeableness), 2) as avg_agreeableness,
               ROUND(AVG(conscientiousness), 2) as avg_conscientiousness
        FROM sds_personality_traits
        GROUP BY success_classification_high_low
        ORDER BY success_classification_high_low DESC
      `),
      query(`SELECT * FROM sds_personality_traits ORDER BY id ASC LIMIT 10`),
    ]);

    return res.status(200).json({
      summary: overall.rows[0],
      successCohortComparison: bySuccess.rows,
      sampleRecords: sample.rows,
    });
  } catch (err) {
    console.error('Error in getSDSStats:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}

/**
 * POST /api/traits/sds/assess-fit
 * Assesses senior leadership fit and success classification based on Big Five traits.
 * Body: { neuroticism, extraversion, openness_to_experience, agreeableness, conscientiousness }
 */
export async function assessSDSFit(req, res) {
  const body = req.body || {};
  let {
    neuroticism,
    extraversion,
    openness_to_experience,
    agreeableness,
    conscientiousness,
  } = body;

  neuroticism            = parseFloat(neuroticism) || 35;
  extraversion           = parseFloat(extraversion) || 45;
  openness_to_experience = parseFloat(openness_to_experience) || 48;
  agreeableness          = parseFloat(agreeableness) || 47;
  conscientiousness      = parseFloat(conscientiousness) || 52;

  try {
    const centroidsRes = await query(`
      SELECT success_classification_high_low,
             AVG(neuroticism) as c_neuro,
             AVG(extraversion) as c_extra,
             AVG(openness_to_experience) as c_open,
             AVG(agreeableness) as c_agree,
             AVG(conscientiousness) as c_consc
      FROM sds_personality_traits
      GROUP BY success_classification_high_low
    `);

    const highCentroid = centroidsRes.rows.find(r => r.success_classification_high_low === 1) || {};
    const lowCentroid  = centroidsRes.rows.find(r => r.success_classification_high_low === 0) || {};

    const userVec = [neuroticism, extraversion, openness_to_experience, agreeableness, conscientiousness];
    const highVec = [
      parseFloat(highCentroid.c_neuro) || 30,
      parseFloat(highCentroid.c_extra) || 42,
      parseFloat(highCentroid.c_open) || 45,
      parseFloat(highCentroid.c_agree) || 48,
      parseFloat(highCentroid.c_consc) || 52,
    ];
    const lowVec = [
      parseFloat(lowCentroid.c_neuro) || 48,
      parseFloat(lowCentroid.c_extra) || 35,
      parseFloat(lowCentroid.c_open) || 38,
      parseFloat(lowCentroid.c_agree) || 36,
      parseFloat(lowCentroid.c_consc) || 40,
    ];

    const distHigh = Math.sqrt(userVec.reduce((sum, v, i) => sum + Math.pow(v - highVec[i], 2), 0));
    const distLow  = Math.sqrt(userVec.reduce((sum, v, i) => sum + Math.pow(v - lowVec[i], 2), 0));

    const simHigh = 1 / (1 + distHigh);
    const simLow  = 1 / (1 + distLow);
    const successProbability = Math.round((simHigh / (simHigh + simLow)) * 100);

    // Determine leadership archetype
    let archetype = 'Strategic Technical Leader';
    if (conscientiousness >= 50 && neuroticism <= 35) {
      archetype = 'Resilient Execution Master';
    } else if (openness_to_experience >= 45 && extraversion >= 45) {
      archetype = 'Transformational Innovator & Evangelist';
    } else if (agreeableness >= 45) {
      archetype = 'Collaborative Mentor & Solutions Partner';
    }

    const traits = [
      { trait: 'Emotional Stability (Low Neuroticism)', score: 100 - neuroticism, benchmark: 100 - Number(highVec[0].toFixed(1)) },
      { trait: 'Social Engagement (Extraversion)', score: extraversion, benchmark: Number(highVec[1].toFixed(1)) },
      { trait: 'Intellectual Curiosity (Openness)', score: openness_to_experience, benchmark: Number(highVec[2].toFixed(1)) },
      { trait: 'Empathy & Collaboration (Agreeableness)', score: agreeableness, benchmark: Number(highVec[3].toFixed(1)) },
      { trait: 'Reliability & Focus (Conscientiousness)', score: conscientiousness, benchmark: Number(highVec[4].toFixed(1)) },
    ];

    return res.status(200).json({
      predictedSuccess: successProbability >= 50 ? 'High Leadership Success' : 'Moderate Success Fit',
      successProbabilityPct: successProbability,
      leadershipArchetype: archetype,
      traitProfile: traits,
      coachingAdvice: neuroticism > 40
        ? 'Practice stress regulation and proactive delegation to strengthen senior resilience.'
        : 'Personality profile aligns strongly with senior customer-facing data leadership roles.',
    });
  } catch (err) {
    console.error('Error in assessSDSFit:', err);
    return res.status(500).json({ error: 'Database error', details: err.message });
  }
}
