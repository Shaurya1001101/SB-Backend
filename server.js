import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './src/routes/auth.routes.js';
import profileRoutes from './src/routes/profile.routes.js';
import pathRoutes from './src/routes/path.routes.js';
import aiRoutes from './src/routes/ai.routes.js';
import newsRoutes from './src/routes/news.routes.js';

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

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check / Root Info
app.get('/', (req, res) => {
  res.json({
    name: 'SkillBridge Backend API',
    status: 'online',
    version: '1.0.0',
    description: 'PostgreSQL-backed REST API for SkillBridge AI Platform',
    endpoints: [
      '/api/health',
      '/api/auth',
      '/api/profile',
      '/api/path',
      '/api/ai',
      '/api/news',
    ],
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: process.env.DATABASE_URL ? 'configured' : 'missing',
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/path', pathRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/news', newsRoutes);

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
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 SkillBridge Backend API running on http://localhost:${PORT}`);
    console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
  });
}

export default app;
