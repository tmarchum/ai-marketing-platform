import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { rawCall } from '../services/claude.js';

const router = Router();

// GET /api/content — all posts (optionally filtered by business_id)
router.get('/', async (req, res) => {
  let query = supabase
    .from('content_posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (req.query.business_id) {
    query = query.eq('business_id', req.query.business_id);
  }

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

// POST /api/content — create a post
router.post('/', async (req, res) => {
  const {
    business_id, business_name, platform, type, content, hashtags,
    status, fb_post_id, published_at, date_label, media, ugc,
    image_url, video_url, ugc_video_url, image_prompt, motion_prompt,
    ugc_script, scheduled_at, ab_variant,
  } = req.body;

  const row: Record<string, any> = {
    platform: platform || 'פייסבוק',
    type: type || 'פוסט קצר',
    content: content || '',
  };
  if (business_id) row.business_id = business_id;
  if (business_name) row.business_name = business_name;
  if (hashtags) row.hashtags = hashtags;
  if (status) row.status = status;
  if (fb_post_id) row.fb_post_id = fb_post_id;
  if (published_at) row.published_at = published_at;
  if (date_label) row.date_label = date_label;
  if (media) row.media = media;
  if (ugc) row.ugc = ugc;
  if (image_url) row.image_url = image_url;
  if (video_url) row.video_url = video_url;
  if (ugc_video_url) row.ugc_video_url = ugc_video_url;
  if (image_prompt) row.image_prompt = image_prompt;
  if (motion_prompt) row.motion_prompt = motion_prompt;
  if (ugc_script) row.ugc_script = ugc_script;
  if (scheduled_at) row.scheduled_at = scheduled_at;
  if (ab_variant) row.ab_variant = ab_variant;

  const { data, error } = await supabase
    .from('content_posts')
    .insert(row)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/content/:id — update a post
router.put('/:id', async (req, res) => {
  const updates = { ...req.body };
  delete updates.id;
  delete updates.created_at;

  const { data, error } = await supabase
    .from('content_posts')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();
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

// POST /api/content/sync — bulk upsert posts from frontend localStorage
router.post('/sync', async (req, res) => {
  const { posts: items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'posts array required' });

  const results = [];
  for (const item of items) {
    // Map frontend format to DB format
    let status = 'draft';
    if (item.published) status = 'published';
    else if (item.approved) status = 'approved';

    const row: Record<string, any> = {
      business_name: item.business || null,
      platform: item.platform || 'פייסבוק',
      type: item.type || 'פוסט קצר',
      content: item.content || '',
      hashtags: item.hashtags || [],
      status,
      fb_post_id: item.fbPostId || null,
      published_at: item.publishedAt || null,
      date_label: item.date || null,
      media: item.media || null,
      ugc: item.ugc || null,
    };

    const { data, error } = await supabase
      .from('content_posts')
      .insert(row)
      .select()
      .single();
    if (!error && data) results.push(data);
  }
  res.json(results);
});

// GET /api/content/:business_id — get posts for a specific business
router.get('/:business_id', async (req, res) => {
  const { data, error } = await supabase
    .from('content_posts')
    .select('*')
    .eq('business_id', req.params.business_id)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
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
