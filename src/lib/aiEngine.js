/**
 * SkillBridge AI Engine & Knowledge Layer
 * Ported from skill_bridge_final_chatbot (agent.py + knowledge.py)
 * 
 * Provides:
 * 1. AI Conversational Agent with dataset grounding
 * 2. Real LinkedIn India Job Dataset (623 postings) & Recommendation Engine
 * 3. Skill Gap Analysis & Phased Roadmaps
 * 4. Course & Free Resource Recommendation System
 * 5. Dataset Graph Analysis (Skill Demand, City Clusters, Experience Levels)
 */
import datasetJobs from './datasetJobs.json' with { type: 'json' };

// Canonical Aliases Mapping
export const ALIASES = {
  js: 'JavaScript',
  node: 'Node.js',
  nodejs: 'Node.js',
  ml: 'Machine Learning',
  ai: 'Artificial Intelligence',
  dl: 'Deep Learning',
  k8s: 'Kubernetes',
  gcp: 'Google Cloud',
  springboot: 'Spring Boot',
  spring: 'Spring Boot',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  rest: 'REST API',
  dsa: 'Data Structures',
  reactjs: 'React',
  ts: 'TypeScript',
  cpp: 'C++',
  github: 'Git',
  gitlab: 'Git',
  'ci/cd': 'CI/CD',
  cicd: 'CI/CD',
  py: 'Python',
  sklearn: 'Scikit-learn',
  tf: 'TensorFlow',
  nlp: 'NLP',
  cv: 'Computer Vision',
  genai: 'Generative AI',
  llms: 'LLM',
  llm: 'LLM',
};

// Learning Tiers (0 = foundations, 1 = core languages/tools, 2 = specialized/cloud)
export const TIERS = {
  Git: 0,
  HTML: 0,
  CSS: 0,
  Excel: 0,
  C: 1,
  'C++': 1,
  Python: 1,
  Java: 1,
  JavaScript: 1,
  SQL: 1,
  'Data Structures': 1,
  Algorithms: 1,
  Linux: 1,
  TypeScript: 1,
  'Machine Learning': 2,
  'Scikit-learn': 2,
  'Deep Learning': 2,
  PyTorch: 2,
  TensorFlow: 2,
  NLP: 2,
  Docker: 2,
  Kubernetes: 2,
  AWS: 2,
  Azure: 2,
  'Google Cloud': 2,
  FastAPI: 2,
  Django: 2,
  'Spring Boot': 2,
  React: 2,
  'Node.js': 2,
  PostgreSQL: 2,
  MongoDB: 2,
  'REST API': 2,
  MLOps: 2,
  'CI/CD': 2,
};

// Curated Free Courses & Certified Learning Resources
export const RESOURCES = {
  Python: {
    title: 'CS50P: Introduction to Programming with Python',
    provider: 'Harvard University / edX (Free)',
    url: 'https://cs50.harvard.edu/python/',
    duration: '6 Weeks',
    level: 'Beginner to Intermediate',
    type: 'Interactive Course',
  },
  SQL: {
    title: 'SQLBolt Interactive Lessons & Mode SQL Bootcamp',
    provider: 'SQLBolt & Mode Analytics (Free)',
    url: 'https://sqlbolt.com/',
    duration: '2 Weeks',
    level: 'Beginner to Advanced',
    type: 'Interactive Sandbox',
  },
  'Machine Learning': {
    title: 'Machine Learning Specialization',
    provider: 'Andrew Ng (DeepLearning.AI / Coursera Audit Free)',
    url: 'https://www.coursera.org/specializations/machine-learning-introduction',
    duration: '8 Weeks',
    level: 'Intermediate',
    type: 'Comprehensive Specialization',
  },
  'Deep Learning': {
    title: 'Practical Deep Learning for Coders',
    provider: 'fast.ai (Free)',
    url: 'https://course.fast.ai/',
    duration: '7 Weeks',
    level: 'Intermediate to Advanced',
    type: 'Hands-on Course',
  },
  PyTorch: {
    title: 'Deep Learning with PyTorch: A 60 Minute Blitz',
    provider: 'PyTorch.org Official Tutorials (Free)',
    url: 'https://pytorch.org/tutorials/beginner/deep_learning_60min_blitz.html',
    duration: '3 Weeks',
    level: 'Intermediate',
    type: 'Official Documentation & Labs',
  },
  TensorFlow: {
    title: 'TensorFlow Core Tutorials & Keras Foundations',
    provider: 'TensorFlow.org (Free)',
    url: 'https://www.tensorflow.org/tutorials',
    duration: '4 Weeks',
    level: 'Intermediate',
    type: 'Hands-on Labs',
  },
  Docker: {
    title: 'Docker Getting Started & Containerization Labs',
    provider: 'Docker Official / Play with Docker (Free)',
    url: 'https://docs.docker.com/get-started/',
    duration: '2 Weeks',
    level: 'All Levels',
    type: 'Official Sandbox',
  },
  Kubernetes: {
    title: 'Introduction to Kubernetes (LFS158x)',
    provider: 'Linux Foundation / edX (Free)',
    url: 'https://www.edx.org/learn/kubernetes/the-linux-foundation-introduction-to-kubernetes',
    duration: '4 Weeks',
    level: 'Intermediate',
    type: 'Cloud Native Certification Prep',
  },
  AWS: {
    title: 'AWS Cloud Practitioner Essentials',
    provider: 'AWS Skill Builder (Free Tier)',
    url: 'https://explore.skillbuilder.aws/learn/course/external/view/elearning/134/aws-cloud-practitioner-essentials',
    duration: '3 Weeks',
    level: 'Beginner to Intermediate',
    type: 'Official Cloud Training',
  },
  'Data Structures': {
    title: 'NeetCode Roadmap & Algorithms Visualizer',
    provider: 'NeetCode.io (Free)',
    url: 'https://neetcode.io/roadmap',
    duration: '8 Weeks',
    level: 'Core Foundations',
    type: 'Problem Roadmap',
  },
  Algorithms: {
    title: 'NeetCode 150 Core Algorithmic Patterns',
    provider: 'NeetCode & LeetCode (Free)',
    url: 'https://neetcode.io/practice',
    duration: '6 Weeks',
    level: 'Intermediate',
    type: 'Coding Practice',
  },
  FastAPI: {
    title: 'FastAPI High-Performance Async Microservices',
    provider: 'tiangolo / FastAPI Official (Free)',
    url: 'https://fastapi.tiangolo.com/tutorial/',
    duration: '2 Weeks',
    level: 'Intermediate',
    type: 'Interactive API Docs',
  },
  Linux: {
    title: 'Linux Journey: Practical Command Line to Kernel',
    provider: 'Linux Journey (Free)',
    url: 'https://linuxjourney.com/',
    duration: '2 Weeks',
    level: 'Beginner to Intermediate',
    type: 'Self-Paced Guide',
  },
  Git: {
    title: 'GitHub Skills: Introduction to GitHub & Git CLI',
    provider: 'GitHub Skills (Free)',
    url: 'https://skills.github.com/',
    duration: '1 Week',
    level: 'Beginner',
    type: 'Hands-on Repository Drills',
  },
  React: {
    title: 'React Official Documentation & Interactive Quickstart',
    provider: 'React.dev (Free)',
    url: 'https://react.dev/learn',
    duration: '4 Weeks',
    level: 'Beginner to Advanced',
    type: 'Official Interactive Guide',
  },
  PostgreSQL: {
    title: 'PostgreSQL Tutorial & Index Optimization Guide',
    provider: 'PostgreSQL Tutorial (Free)',
    url: 'https://www.postgresqltutorial.com/',
    duration: '2 Weeks',
    level: 'Intermediate',
    type: 'Interactive SQL Guide',
  },
  MLOps: {
    title: 'Made With ML: Production Machine Learning & MLOps',
    provider: 'Goku Mohandas / Made With ML (Free)',
    url: 'https://madewithml.com/',
    duration: '6 Weeks',
    level: 'Advanced',
    type: 'End-to-End Production Guide',
  },
  'CI/CD': {
    title: 'Automated CI/CD Workflows with GitHub Actions',
    provider: 'GitHub Skills (Free)',
    url: 'https://skills.github.com/',
    duration: '1 Week',
    level: 'Intermediate',
    type: 'Automation Labs',
  },
};

// Skill Vocabulary initialized from dataset
const ALL_JOBS = Array.isArray(datasetJobs) ? datasetJobs : [];
const RAW_VOCAB = new Set();
ALL_JOBS.forEach((j) => {
  if (Array.isArray(j.skills)) {
    j.skills.forEach((s) => RAW_VOCAB.add(s.trim()));
  }
});
Object.values(ALIASES).forEach((v) => RAW_VOCAB.add(v));
export const CANONICAL_SKILLS = Array.from(RAW_VOCAB).sort();

/**
 * Normalizes text for robust regex and token parsing
 */
function normalizeText(text) {
  if (!text) return ' ';
  const t = String(text)
    .toLowerCase()
    .replace(/(?<![a-z0-9])\.|\.(?![a-z0-9])/g, ' ')
    .replace(/[^a-z0-9+#.]+/g, ' ');
  return ` ${t} `;
}

/**
 * Extracts recognized technical skills from user text, resume, or chat message.
 */
export function extractSkills(text) {
  if (!text) return [];
  const t = normalizeText(text);
  const found = new Set();

  // 1. Direct alias resolution
  Object.entries(ALIASES).forEach(([alias, canon]) => {
    const regex = new RegExp(`\\b${alias.replace('+', '\\+')}\\b`, 'i');
    if (regex.test(t)) {
      found.add(canon);
    }
  });

  // 2. Canonical skill check
  CANONICAL_SKILLS.forEach((skill) => {
    const sLower = skill.toLowerCase();
    if (sLower === 'c') {
      if (/\bc\+\+|\bc language|\bembedded c\b/i.test(t)) found.add('C');
      return;
    }
    if (sLower.length <= 2 && !['ml', 'ai', 'dl', 'ts', 'js'].includes(sLower)) return;
    const regex = new RegExp(`\\b${sLower.replace('+', '\\+')}\\b`, 'i');
    if (regex.test(t)) {
      found.add(skill);
    }
  });

  return Array.from(found).sort();
}

/**
 * Recommends jobs from the real engineering dataset based on user skills.
 * Applies the mathematical scoring formula: 0.65 * fit + 0.35 * sim
 */
export function recommendJobs(userSkills = [], options = {}) {
  const { location = '', maxYears = null, limit = 8, minMatches = 1 } = options;

  const have = new Set(
    (Array.isArray(userSkills) ? userSkills : []).map(
      (s) => ALIASES[s.toLowerCase()] || s
    )
  );

  const locLower = location ? location.toLowerCase().trim() : '';

  const scored = [];

  ALL_JOBS.forEach((job) => {
    const jobSkills = Array.isArray(job.skills) ? job.skills : [];
    if (jobSkills.length === 0) return;

    // Filter location if requested
    if (locLower) {
      const matchLoc =
        (job.location && job.location.toLowerCase().includes(locLower)) ||
        (job.city && job.city.toLowerCase().includes(locLower));
      if (!matchLoc) return;
    }

    // Filter max years if requested
    if (maxYears !== null && job.min_years && job.min_years > Number(maxYears) + 1) {
      return;
    }

    // Calculate match
    const hit = [];
    const miss = [];

    jobSkills.forEach((s) => {
      const canon = ALIASES[s.toLowerCase()] || s;
      if (have.has(canon)) {
        hit.push(s);
      } else {
        miss.push(s);
      }
    });

    if (have.size > 0 && hit.length < Math.min(minMatches, have.size)) {
      return;
    }

    const fit = jobSkills.length > 0 ? hit.length / jobSkills.length : 0;
    const matchPercent = Math.round(fit * 100);
    const score = Number((0.65 * fit + 0.35 * Math.min(1, (hit.length / 4))).toFixed(3));

    scored.push({
      ...job,
      match_percent: matchPercent,
      you_have: hit,
      you_miss: miss,
      score,
    });
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // If no hits with strict filter, return top recent jobs
  if (scored.length === 0 && ALL_JOBS.length > 0) {
    return ALL_JOBS.slice(0, limit).map((j) => ({
      ...j,
      match_percent: 0,
      you_have: [],
      you_miss: j.skills || [],
      score: 0.1,
    }));
  }

  return scored.slice(0, limit);
}

/**
 * Searches jobs in dataset by keyword query, city/location, and experience.
 */
export function searchJobs(query = '', options = {}) {
  const { location = '', experience = '', limit = 10 } = options;
  const q = query ? query.toLowerCase().trim() : '';
  const loc = location ? location.toLowerCase().trim() : '';
  const exp = experience ? experience.toLowerCase().trim() : '';

  const results = ALL_JOBS.filter((j) => {
    if (loc) {
      const inLoc =
        (j.location && j.location.toLowerCase().includes(loc)) ||
        (j.city && j.city.toLowerCase().includes(loc));
      if (!inLoc) return false;
    }
    if (exp) {
      if (!j.experience || !j.experience.toLowerCase().includes(exp)) return false;
    }
    if (!q) return true;

    const inTitle = j.title && j.title.toLowerCase().includes(q);
    const inComp = j.company && j.company.toLowerCase().includes(q);
    const inSkills = j.skills && j.skills.some((s) => s.toLowerCase().includes(q));
    const inSnip = j.snippet && j.snippet.toLowerCase().includes(q);

    return inTitle || inComp || inSkills || inSnip;
  });

  return results.slice(0, limit);
}

/**
 * Performs data-driven Skill Gap Analysis comparing user skills to real job demands.
 */
export function analyzeSkillGap(role = 'Data Scientist', userSkills = []) {
  const rLower = (role || 'software engineer').toLowerCase();
  const haveSet = new Set(
    (userSkills || []).map((s) => (ALIASES[s.toLowerCase()] || s).toLowerCase())
  );

  // Filter jobs relevant to the role
  const matchingJobs = ALL_JOBS.filter((j) => {
    const t = (j.title || '').toLowerCase();
    return (
      t.includes(rLower) ||
      (rLower.includes('data') && (t.includes('data') || t.includes('analyst') || t.includes('analytics'))) ||
      (rLower.includes('ml') && (t.includes('machine learning') || t.includes('ai') || t.includes('ml'))) ||
      (rLower.includes('backend') && (t.includes('backend') || t.includes('software') || t.includes('python') || t.includes('java'))) ||
      (rLower.includes('devops') && (t.includes('devops') || t.includes('cloud') || t.includes('infrastructure')))
    );
  });

  const jobsConsidered = matchingJobs.length > 5 ? matchingJobs : ALL_JOBS.slice(0, 60);

  // Count demand of skills in this role
  const skillCount = {};
  jobsConsidered.forEach((j) => {
    (j.skills || []).forEach((s) => {
      skillCount[s] = (skillCount[s] || 0) + 1;
    });
  });

  const sortedSkills = Object.entries(skillCount)
    .map(([skill, count]) => ({
      skill,
      demandPercent: Math.round((count / jobsConsidered.length) * 100),
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const have = [];
  const gaps = [];

  sortedSkills.forEach((item) => {
    const canonLower = (ALIASES[item.skill.toLowerCase()] || item.skill).toLowerCase();
    if (haveSet.has(canonLower)) {
      have.push(item.skill);
    } else {
      gaps.push({
        skill: item.skill,
        demand_percent: item.demandPercent,
        tier: TIERS[item.skill] ?? 2,
        resource:
          RESOURCES[item.skill]?.title || `${item.skill} Official Documentation & Code Labs`,
        resourceObj: RESOURCES[item.skill] || null,
      });
    }
  });

  // Sort gaps by tier (foundations first) then demand percent descending
  gaps.sort((a, b) => a.tier - b.tier || b.demand_percent - a.demand_percent);

  const totalPoints = sortedSkills.reduce((acc, s) => acc + s.demandPercent, 0) || 1;
  const readyPoints = sortedSkills
    .filter((s) => haveSet.has((ALIASES[s.skill.toLowerCase()] || s.skill).toLowerCase()))
    .reduce((acc, s) => acc + s.demandPercent, 0);

  const readinessPercent = userSkills.length === 0 ? 0 : Math.round((readyPoints / totalPoints) * 100);

  return {
    role,
    jobs_analysed: jobsConsidered.length,
    readiness_percent: readinessPercent,
    have,
    gaps_in_priority_order: gaps,
  };
}

/**
 * Generates phased learning roadmap grounded in real dataset skills and free resources.
 */
export function generateRoadmap(role = 'Data Scientist', userSkills = []) {
  const gapAnalysis = analyzeSkillGap(role, userSkills);
  const gaps = gapAnalysis.gaps_in_priority_order;

  const phase1 = gaps.filter((g) => g.tier <= 1);
  const phase2 = gaps.filter((g) => g.tier === 2).slice(0, 3);
  const phase3 = gaps.filter((g) => g.tier === 2).slice(3);

  const phases = [];
  if (phase1.length > 0) {
    phases.push({
      phase: 'Phase 1 (Weeks 1-4): Foundations & Core Languages',
      learn: phase1.map((g) => ({ skill: g.skill, resource: g.resource })),
    });
  }
  if (phase2.length > 0) {
    phases.push({
      phase: 'Phase 2 (Weeks 5-8): Core Frameworks & Architecture',
      learn: phase2.map((g) => ({ skill: g.skill, resource: g.resource })),
    });
  }
  if (phase3.length > 0) {
    phases.push({
      phase: 'Phase 3 (Weeks 9-12): Cloud, MLOps & Production Scale',
      learn: phase3.map((g) => ({ skill: g.skill, resource: g.resource })),
    });
  }

  phases.push({
    phase: 'Capstone Phase: Real-World Portfolio & Job Applications',
    learn: [
      {
        skill: 'Portfolio Repositories',
        resource: 'Build 2-3 runnable projects on GitHub demonstrating target skills',
      },
      {
        skill: 'Direct Applications',
        resource: 'Apply to matching job postings via SkillBridge Job Market with verified match scores',
      },
    ],
  });

  return {
    role,
    readiness_percent: gapAnalysis.readiness_percent,
    based_on_jobs: gapAnalysis.jobs_analysed,
    phases,
  };
}

/**
 * Computes deep market insights and dataset graph distributions.
 */
export function getMarketInsights(role = '') {
  const d = ALL_JOBS;
  const total = d.length || 623;

  // 1. Skill Demand Distribution
  const skillCounts = {};
  const cityCounts = {};
  const compCounts = {};
  const expCounts = {};

  d.forEach((j) => {
    (j.skills || []).forEach((s) => {
      skillCounts[s] = (skillCounts[s] || 0) + 1;
    });
    if (j.city) cityCounts[j.city] = (cityCounts[j.city] || 0) + 1;
    if (j.company) compCounts[j.company] = (compCounts[j.company] || 0) + 1;
    if (j.experience) expCounts[j.experience] = (expCounts[j.experience] || 0) + 1;
  });

  const topSkills = Object.entries(skillCounts)
    .map(([skill, count]) => ({
      skill,
      count,
      demand_percent: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const topCities = Object.entries(cityCounts)
    .map(([city, count]) => ({
      city,
      count,
      pct: Math.round((count / total) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const topCompanies = Object.entries(compCounts)
    .map(([company, count]) => ({
      company,
      count,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    total_jobs: total,
    jobs_considered: total,
    top_skills: topSkills,
    top_cities: topCities,
    top_companies: topCompanies,
    experience_breakdown: expCounts,
    entry_friendly_jobs: d.filter(
      (j) => j.min_years <= 1 || (j.experience && j.experience.toLowerCase().includes('entry'))
    ).length,
  };
}

/**
 * Returns prioritized course recommendations for specific skill gaps.
 */
export function getCourseRecommendations(gapSkills = []) {
  const list = Array.isArray(gapSkills) ? gapSkills : [];
  const recs = [];

  list.forEach((skillName) => {
    const res = RESOURCES[skillName];
    if (res) {
      recs.push({
        skill: skillName,
        course_name: res.title,
        platform: res.provider,
        ...res,
      });
    } else {
      recs.push({
        skill: skillName,
        title: `${skillName} Practical Fundamentals & Code Labs`,
        course_name: `${skillName} Practical Fundamentals & Code Labs`,
        provider: 'SkillBridge Interactive Sandbox & Official Docs',
        platform: 'SkillBridge Interactive Sandbox & Official Docs',
        url: 'https://github.com',
        duration: '2-3 Weeks',
        level: 'All Levels',
        type: 'Interactive Sandbox',
      });
    }
  });

  return recs;
}

/**
 * Conversational AI Agent from skill_bridge_final_chatbot (agent.py)
 * Processes natural language, queries dataset tools, and replies with grounded actionable recommendations.
 */
export function chatAgent(userMessage, context = {}) {
  const msg = (userMessage || '').trim();
  const lower = msg.toLowerCase();

  // Extract skills from current message + existing context
  const existingSkills = context.userSkills?.all || context.skills || [];
  const detectedSkills = extractSkills(msg);
  const allKnownSkills = Array.from(new Set([...existingSkills, ...detectedSkills]));

  // Detect experience years
  let years = context.years ?? null;
  const yrsMatch = lower.match(/(\d+)\s*\+?\s*(?:years?|yrs?)/);
  if (yrsMatch) years = parseInt(yrsMatch[1], 10);
  if (/\b(fresher|student|no experience|entry level|beginner)\b/i.test(lower)) years = 0;

  // Detect city
  let city = context.city || '';
  const knownCities = ['bengaluru', 'bangalore', 'hyderabad', 'pune', 'mumbai', 'delhi', 'noida', 'gurugram', 'gurgaon', 'chennai', 'remote'];
  knownCities.forEach((c) => {
    if (lower.includes(c)) {
      city = c === 'bangalore' ? 'Bengaluru' : c === 'gurgaon' ? 'Gurugram' : c.charAt(0).toUpperCase() + c.slice(1);
    }
  });

  // Detect target role
  let role = context.targetRole || '';
  const roleMatch = lower.match(/(?:as an?|become an?|for an?|roadmap for|gap for|to be an?|target(?:ing)?)\s+([a-z+# /.\-]{3,40})/i);
  if (roleMatch) {
    role = roleMatch[1].trim();
  } else {
    const rolesList = [
      'machine learning engineer',
      'data scientist',
      'data engineer',
      'ai researcher',
      'mlops engineer',
      'backend developer',
      'frontend developer',
      'full stack developer',
      'devops engineer',
      'software engineer',
    ];
    rolesList.forEach((r) => {
      if (lower.includes(r)) role = r;
    });
  }

  // ─── Intent 1: Roadmap Query ───
  if (/road ?map|how to become|learn|plan|study path|career path/i.test(lower) && role) {
    const r = generateRoadmap(role, allKnownSkills);
    const phasesBody = r.phases
      .map(
        (p) =>
          `**${p.phase}**\n` +
          p.learn.map((x) => `• **${x.skill}**: [${x.resource}](${RESOURCES[x.skill]?.url || 'https://google.com'})`).join('\n')
      )
      .join('\n\n');

    return {
      reply: `Here is your customized **${role.toUpperCase()} Roadmap** grounded in **${r.based_on_jobs} real Indian job postings** (Current baseline fit: ~**${r.readiness_percent}%**):\n\n${phasesBody}\n\n💡 *Tip: Commit to this path in the **Trajectory** tab to track daily XP milestones!*`,
      intent: 'roadmap',
      toolCalls: ['roadmap'],
      data: r,
    };
  }

  // ─── Intent 2: Skill Gap Analysis ───
  if (/\bgap|ready|readiness|missing|lack|evaluate me/i.test(lower) && (role || allKnownSkills.length > 0)) {
    const targetRoleName = role || 'Data Scientist';
    const gapData = analyzeSkillGap(targetRoleName, allKnownSkills);

    const gapLines =
      gapData.gaps_in_priority_order
        .slice(0, 5)
        .map(
          (g) =>
            `• **${g.skill}** (demanded by **${g.demand_percent}%** of postings) → *Recommended:* [${g.resource}](${g.resourceObj?.url || '#'})`
        )
        .join('\n') || 'None! You cover all core skills for this role.';

    return {
      reply: `### 🎯 Skill Gap Analysis for **${targetRoleName.toUpperCase()}**\n\n• **Your Readiness:** ~**${gapData.readiness_percent}%**\n• **Skills you have:** ${gapData.have.join(', ') || 'None verified yet'}\n\n**Priority Skill Gaps (in order of market impact):**\n${gapLines}\n\n*Would you like me to recommend matching jobs or build a weekly study schedule?*`,
      intent: 'skill_gap',
      toolCalls: ['skill_gap'],
      data: gapData,
    };
  }

  // ─── Intent 3: Course Recommendations ───
  if (/course|resource|learn|tutorial|classes|certif/i.test(lower)) {
    const skillsToCover = detectedSkills.length > 0 ? detectedSkills : allKnownSkills.length > 0 ? allKnownSkills : ['Python', 'SQL', 'Docker', 'Machine Learning'];
    const courses = getCourseRecommendations(skillsToCover);

    const courseList = courses
      .map(
        (c) =>
          `• **${c.skill}**: [${c.title}](${c.url}) — *${c.provider}* (${c.duration}, ${c.level})`
      )
      .join('\n');

    return {
      reply: `### 📚 Curated Free Courses & Certified Roadmaps\n\nBased on your profile, here are top industry-verified free resources:\n\n${courseList}\n\nAll courses listed are 100% free with practical sandboxes.`,
      intent: 'course_recommendation',
      toolCalls: ['course_recommendation'],
      data: courses,
    };
  }

  // ─── Intent 4: Job Recommendations ───
  if (/recommend|suggest|job|opening|vacanc|hiring|apply|find|positions|roles/i.test(lower) && allKnownSkills.length > 0) {
    const jobs = recommendJobs(allKnownSkills, {
      location: city,
      maxYears: years,
      limit: 5,
    });

    const jobLines = jobs
      .map(
        (j, i) =>
          `${i + 1}. **${j.title}** @ **${j.company}** (${j.city || j.location})\n   • **${j.match_percent}% Match** · Have: ${j.you_have.join(', ') || 'General'}\n   • Missing: *${j.you_miss.slice(0, 3).join(', ') || 'None!'}*\n   • 🔗 [Apply on LinkedIn](${j.apply_link})`
      )
      .join('\n\n');

    return {
      reply: `### 💼 Top Jobs Matching Your Skills (${allKnownSkills.join(', ')}):\n\n${jobLines}\n\n*Click the links to apply directly on LinkedIn, or ask me for advice on closing the missing skills!*`,
      intent: 'recommend_jobs',
      toolCalls: ['recommend_jobs'],
      data: jobs,
    };
  }

  // ─── Intent 5: Market Trends & Graph Insights ───
  if (/trend|demand|market|insight|popular|hiring in|cities|top hirer/i.test(lower)) {
    const insights = getMarketInsights(role);
    const topSkillsStr = insights.top_skills
      .slice(0, 6)
      .map((s) => `**${s.skill}** (${s.demand_percent}%)`)
      .join(', ');

    const topCitiesStr = insights.top_cities
      .slice(0, 5)
      .map((c) => `**${c.city}** (${c.count} jobs)`)
      .join(', ');

    const topCompsStr = insights.top_companies
      .slice(0, 4)
      .map((c) => `**${c.company}**`)
      .join(', ');

    return {
      reply: `### 📊 Live Indian Tech Market Snapshot (${insights.jobs_considered} Job Postings)\n\n• **Highest Demanded Skills:** ${topSkillsStr}\n• **Top Hiring Tech Hubs:** ${topCitiesStr}\n• **Active Hirers:** ${topCompsStr}\n• **Fresher / Entry-Level Friendly:** **${insights.entry_friendly_jobs}** postings\n\n*Ask me to recommend specific jobs in your city or check your skill gap!*`,
      intent: 'market_insights',
      toolCalls: ['market_insights'],
      data: insights,
    };
  }

  // ─── Default Conversational Helper ───
  if (allKnownSkills.length > 0) {
    return {
      reply: `I noted your skills: **${allKnownSkills.join(', ')}**! 🚀\n\nHere are some things I can do for you right now:\n1. 💼 **"Recommend jobs for my skills"** (ranked against 620+ real LinkedIn postings)\n2. 🔍 **"Check my skill gap for ${role || 'Machine Learning Engineer'}"**\n3. 🗺️ **"Build a learning roadmap for ${role || 'Data Scientist'}"**\n4. 📚 **"Recommend free courses for my missing skills"**\n5. 📊 **"Show market trends and top hiring cities"**`,
      intent: 'profile_update',
      toolCalls: ['profile_update'],
    };
  }

  return {
    reply: `👋 Hello! I am your **SkillBridge AI Career Assistant**, grounded in a real dataset of **620+ engineering job postings across India**.\n\nTell me your **skills**, **target role**, and **city** (e.g. *"I know Python and SQL, fresher in Bengaluru — suggest jobs"*), and I will:\n• Match you to live job openings with exact match percentages\n• Analyze your skill gaps and recommend free certified courses\n• Generate a weekly milestone roadmap to get hired!`,
    intent: 'greeting',
    toolCalls: ['greeting'],
  };
}

export default {
  ALIASES,
  TIERS,
  RESOURCES,
  extractSkills,
  recommendJobs,
  searchJobs,
  analyzeSkillGap,
  generateRoadmap,
  getMarketInsights,
  getCourseRecommendations,
  chatAgent,
};
