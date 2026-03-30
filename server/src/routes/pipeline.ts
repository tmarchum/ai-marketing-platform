import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { mediaPipelineQueue, ugcPipelineQueue } from '../jobs/queues.js';

const router = Router();

// POST /api/pipeline/media
router.post('/media', async (req, res) => {
  const { post_id } = req.body;
  try {
    const job = await mediaPipelineQueue.add({ post_id }, { attempts: 3, backoff: 5000 });
    res.json({ job_id: job.id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// POST /api/pipeline/ugc
router.post('/ugc', async (req, res) => {
  const { post_id, avatar_image_url } = req.body;
  try {
    const job = await ugcPipelineQueue.add(
      { post_id, avatar_image_url },
      { attempts: 3, backoff: 5000 }
    );
    res.json({ job_id: job.id });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/pipeline/:id/status
router.get('/:id/status', async (req, res) => {
  const { data, error } = await supabase
    .from('content_posts')
    .select('pipeline_status, status')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

export default router;
