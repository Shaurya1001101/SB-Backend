import {
  chatAgent,
  recommendJobs,
  searchJobs,
  analyzeSkillGap,
  generateRoadmap,
  getMarketInsights,
  getCourseRecommendations,
  extractSkills
} from '../lib/aiEngine.js';

export async function chatAI(req, res) {
  const { message, context = {} } = req.body || {};
  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Execute full grounded conversational agent with real tools
  try {
    const agentResult = chatAgent(message, {
      skills: context.userSkills?.all || context.skills || [],
      userSkills: context.userSkills,
      targetRole: context.roleName || context.targetRole || 'Machine Learning Engineer',
      city: context.city || '',
    });

    return res.status(200).json({
      reply: agentResult.reply,
      intent: agentResult.intent,
      data: agentResult.data || null,
      source: 'grounded-skillbridge-ai-agent',
    });
  } catch (err) {
    console.error('Error running AI agent:', err);
    return res.status(500).json({ error: 'Failed to process AI message', details: err.message });
  }
}

export async function getJobs(req, res) {
  try {
    const { skills = '', location = '', minYears = 0, limit = 20 } = req.query;
    const skillList = skills ? skills.split(',').map(s => s.trim()) : [];
    const jobs = recommendJobs(skillList, {
      location,
      minYears: Number(minYears),
      limit: Number(limit)
    });
    return res.status(200).json({ success: true, count: jobs.length, jobs });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getInsights(req, res) {
  try {
    const { role = '' } = req.query;
    const insights = getMarketInsights(role);
    return res.status(200).json({ success: true, insights });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getCourses(req, res) {
  try {
    const { gaps = '' } = req.query;
    const gapList = gaps ? gaps.split(',').map(s => s.trim()) : [];
    const courses = getCourseRecommendations(gapList);
    return res.status(200).json({ success: true, count: courses.length, courses });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
