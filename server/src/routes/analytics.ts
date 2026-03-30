import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { getPostInsights } from '../services/meta.js';

const router = Router();

// GET /api/analytics/:business_id
router.get('/:business_id', async (req, res) => {
  const { data, error } = await supabase
    .from('content_posts')
    .select('id, platform, type, content, performance, status, ab_variant, ab_winner, created_at')
    .eq('business_id', req.params.business_id)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/analytics/sync — pull latest Meta Insights
router.post('/sync', async (req, res) => {
  const { business_id } = req.body;
  const { data: posts } = await supabase
    .from('content_posts')
    .select('id, pipeline_status')
    .eq('business_id', business_id)
    .eq('status', 'published');

  if (!posts) return res.json({ synced: 0 });

  let synced = 0;
  for (const post of posts) {
    const metaId = post.pipeline_status?.meta_id;
    if (!metaId) continue;
    try {
      const insights = await getPostInsights(metaId);
      await supabase
        .from('content_posts')
        .update({ performance: insights })
        .eq('id', post.id);
      synced++;
    } catch {
      // continue on error
    }
  }
  res.json({ synced });
});

export default router;
