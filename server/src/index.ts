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

import './jobs/mediaPipeline.js';
import './jobs/ugcPipeline.js';
import { startScheduler, startTokenMonitor } from './jobs/scheduler.js';
import { startLearningLoop, startABResolver } from './jobs/learningLoop.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api/admin', adminRouter);
app.use('/api/businesses', businessesRouter);
app.use('/api/sources', businessesRouter);   // scan endpoint lives in businesses router
app.use('/api/content', contentRouter);
app.use('/api/pipeline', pipelineRouter);
app.use('/api/publish', publishRouter);
app.use('/api/schedule', scheduleRouter);
app.use('/api/analytics', analyticsRouter);

app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`);

  startScheduler();
  startTokenMonitor();
  startLearningLoop();
  startABResolver();
});
