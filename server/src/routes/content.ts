import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { generatePosts } from '../services/claude.js';
import { rawCall } from '../services/claude.js';

const router = Router();

// POST /api/content/generate
router.post('/generate', async (req, res) => {
  const { business_id, platforms, count = 2 } = req.body;

  try {
    const { data: biz } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', business_id)
      .single();
    if (!biz) return res.status(404).json({ error: 'Business not found' });

    const posts = await generatePosts(
      biz.name,
      biz.business_profile || {},
      platforms,
      count
    );

    // Save both A/B variants
    const rows = posts.flatMap(p => [
      { ...p, business_id, ab_variant: 'A', status: 'draft', hashtags: p.hashtags },
      { ...p, business_id, ab_variant: 'B', status: 'draft', hashtags: p.hashtags,
        content: p.content + '\n\n' + (p.cta || '') },
    ]);

    const { data, error } = await supabase.from('content_posts').insert(rows).select();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// GET /api/content/:business_id
router.get('/:business_id', async (req, res) => {
  const { data, error } = await supabase
    .from('content_posts')
    .select('*')
    .eq('business_id', req.params.business_id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/content/:id/approve
router.put('/:id/approve', async (req, res) => {
  const { data, error } = await supabase
    .from('content_posts')
    .update({ status: 'approved' })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/content/claude — proxy Claude call from frontend
router.post('/claude', async (req, res) => {
  const { prompt, maxTokens = 800 } = req.body;
  try {
    const text = await rawCall(prompt, maxTokens);
    res.json({ text });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
