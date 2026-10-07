import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './src/routes/auth.routes.js';
import profileRoutes from './src/routes/profile.routes.js';
import pathRoutes from './src/routes/path.routes.js';
import aiRoutes from './src/routes/ai.routes.js';
import newsRoutes from './src/routes/news.routes.js';
import skillgapRoutes from './src/routes/skillgap.routes.js';
import datascienceRoutes from './src/routes/datascience.routes.js';
import traitsRoutes from './src/routes/traits.routes.js';
import datasetRoutes from './src/routes/dataset.routes.js';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend web application and local development
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
  })
);
app.options('*', cors());

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check / Root Info
app.get('/', (req, res) => {
  res.json({
    name: 'SkillBridge Backend API',
    status: 'online',
    version: '2.0.0',
    description: 'PostgreSQL-backed REST API for SkillBridge with integrated SAS Hackathon Datasets',
    datasets: {
      analytics_jobs: '/api/skillgap/jobs (15,841 jobs)',
      datascience_jobs: '/api/datascience-jobs (1,602 records)',
      jds_skill_traits: '/api/traits/jds (139 junior records)',
      sds_personality_traits: '/api/traits/sds (161 senior records)',
    },
    endpoints: [
      '/api/health',
      '/api/dataset/summary',
      '/api/skillgap/jobs',
      '/api/skillgap/stats',
      '/api/datascience-jobs',
      '/api/datascience-jobs/top-companies',
      '/api/datascience-jobs/salary-insights',
      '/api/traits/jds',
      '/api/traits/jds/predict-hike',
      '/api/traits/sds',
      '/api/traits/sds/assess-fit',
      '/api/auth',
      '/api/profile',
      '/api/path',
      '/api/ai',
      '/api/news',
    ],
  });
});

app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let dbLatencyMs = null;
  const start = Date.now();
  try {
    const { query } = await import('./src/config/db.js');
    await query('SELECT 1');
    dbStatus = 'connected';
    dbLatencyMs = Date.now() - start;
  } catch (err) {
    dbStatus = `error: ${err.message || 'unknown'}`;
  }

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: {
      status: dbStatus,
      provider: 'Supabase PostgreSQL',
      latencyMs: dbLatencyMs,
    },
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/path', pathRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/skillgap', skillgapRoutes);
app.use('/api/analytics-jobs', skillgapRoutes); // alias for explicit dataset route
app.use('/api/datascience-jobs', datascienceRoutes);
app.use('/api/traits', traitsRoutes);
app.use('/api/dataset', datasetRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    requestedUrl: req.originalUrl,
  });
});

// Central Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: status === 400 ? 'Bad Request' : 'Internal Server Error',
    message: err.message,
  });
});

// Start server if run directly (local development)
if (!process.env.VERCEL && process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SkillBridge Backend API running on http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
    console.log(`📊 Datasets Summary: http://localhost:${PORT}/api/dataset/summary`);
  });
}

export default app;
