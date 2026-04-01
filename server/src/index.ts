import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import adminRouter from './routes/admin.js';
import businessesRouter from './routes/businesses.js';
import contentRouter from './routes/content.js';
import pipelineRouter from './routes/pipeline.js';
import publishRouter from './routes/publish.js';
import scheduleRouter from './routes/schedule.js';
import analyticsRouter from './routes/analytics.js';

import { isSupabaseConfigured } from './db/supabase.js';

const app = express();
const PORT = process.env.PORT || 3001;

// CORS — allow Vite dev server (5173) and production
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3001',
    'http://localhost:3000',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/admin', adminRouter);
app.use('/api/businesses', businessesRouter);
app.use('/api/sources', businessesRouter);
app.use('/api/content', contentRouter);
app.use('/api/pipeline', pipelineRouter);
app.use('/api/publish', publishRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/analytics', analyticsRouter);

app.get('/health', (_req, res) => res.json({
  ok: true,
  ts: new Date().toISOString(),
  supabase: isSupabaseConfigured(),
  redis: Boolean(process.env.REDIS_URL),
}));

app.listen(PORT, () => {
  console.log(`\n[server] running on http://localhost:${PORT}`);
  console.log(`[server] Supabase: ${isSupabaseConfigured() ? 'configured' : 'NOT configured (DB ops will be skipped)'}`);
  console.log(`[server] Redis: ${process.env.REDIS_URL ? 'configured' : 'NOT configured (job queues disabled)'}`);
  console.log(`[server] CORS allows: ${process.env.FRONTEND_URL || 'http://localhost:5173'}\n`);

  // Only start background jobs if Supabase is available
  if (isSupabaseConfigured()) {
    import('./jobs/mediaPipeline.js').catch(() => console.warn('[server] mediaPipeline import skipped'));
    import('./jobs/ugcPipeline.js').catch(() => console.warn('[server] ugcPipeline import skipped'));
    import('./jobs/scheduler.js').then(m => { m.startScheduler(); m.startTokenMonitor(); })
      .catch(() => console.warn('[server] scheduler import skipped'));
    import('./jobs/learningLoop.js').then(m => { m.startLearningLoop(); m.startABResolver(); })
      .catch(() => console.warn('[server] learningLoop import skipped'));
  } else {
    console.log('[server] Background jobs skipped — configure Supabase to enable');
  }
});
