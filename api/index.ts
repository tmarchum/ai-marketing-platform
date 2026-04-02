// Vercel Serverless Function — wraps Express app as a single catch-all handler
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();

// ── Supabase ──
function getSupabase() {
  const url = process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_KEY || '';
  if (!url || !key) return null;
  return createClient(url, key);
}

// ── Middleware ──
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ── Health ──
app.get('/api/health', (_req, res) => {
  const sb = getSupabase();
  res.json({ ok: true, ts: new Date().toISOString(), supabase: Boolean(sb) });
});

// ══════════════════════════════════════════════════════════════
// BUSINESSES
// ══════════════════════════════════════════════════════════════

app.get('/api/businesses', async (_req, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);
  const { data, error } = await sb.from('businesses').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

app.post('/api/businesses', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const row: Record<string, any> = {};
  const fields = ['name','url','industry','target_audience','tone','goals','icon','color','description','social','scan_result','full_scan_data','competitor_analysis','competitors','schedule','business_profile'];
  for (const f of fields) if (req.body[f] !== undefined) row[f] = req.body[f];
  const { data, error } = await sb.from('businesses').insert(row).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/businesses/:id', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const updates = { ...req.body };
  delete updates.id; delete updates.created_at;
  const { data, error } = await sb.from('businesses').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/businesses/sync', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const { businesses: items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'businesses array required' });
  const results = [];
  for (const item of items) {
    const row: Record<string, any> = {
      name: item.name, url: item.url || null, icon: item.icon || null,
      color: item.color || null, description: item.description || null,
      social: item.social || {}, scan_result: item.scanResult || null,
      full_scan_data: item.fullScanData || null,
      competitor_analysis: item.competitorAnalysis || null,
      business_profile: item.businessProfile || null,
    };
    const { data: existing } = await sb.from('businesses').select('id').eq('name', item.name).maybeSingle();
    if (existing) {
      const { data } = await sb.from('businesses').update(row).eq('id', existing.id).select().single();
      if (data) results.push(data);
    } else {
      const { data } = await sb.from('businesses').insert(row).select().single();
      if (data) results.push(data);
    }
  }
  res.json(results);
});

// ══════════════════════════════════════════════════════════════
// CONTENT / POSTS
// ══════════════════════════════════════════════════════════════

app.get('/api/content', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);
  let query = sb.from('content_posts').select('*').order('created_at', { ascending: false });
  if (req.query.business_id) query = query.eq('business_id', req.query.business_id as string);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

app.post('/api/content', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const row: Record<string, any> = {
    platform: req.body.platform || 'פייסבוק',
    type: req.body.type || 'פוסט קצר',
    content: req.body.content || '',
  };
  const optFields = ['business_id','business_name','hashtags','status','fb_post_id','published_at','date_label','media','ugc','image_url','video_url','ugc_video_url','image_prompt','motion_prompt','ugc_script','scheduled_at','ab_variant'];
  for (const f of optFields) if (req.body[f]) row[f] = req.body[f];
  const { data, error } = await sb.from('content_posts').insert(row).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/content/:id', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const updates = { ...req.body }; delete updates.id; delete updates.created_at;
  const { data, error } = await sb.from('content_posts').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post('/api/content/sync', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const { posts: items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'posts array required' });
  const results = [];
  for (const item of items) {
    let status = 'draft';
    if (item.published) status = 'published';
    else if (item.approved) status = 'approved';
    const row: Record<string, any> = {
      business_name: item.business || null, platform: item.platform || 'פייסבוק',
      type: item.type || 'פוסט קצר', content: item.content || '',
      hashtags: item.hashtags || [], status, fb_post_id: item.fbPostId || null,
      published_at: item.publishedAt || null, date_label: item.date || null,
      media: item.media || null, ugc: item.ugc || null,
    };
    const { data } = await sb.from('content_posts').insert(row).select().single();
    if (data) results.push(data);
  }
  res.json(results);
});

// ══════════════════════════════════════════════════════════════
// CLAUDE PROXY
// ══════════════════════════════════════════════════════════════

app.post('/api/content/claude', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });
  const { prompt, maxTokens = 800 } = req.body;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    res.json({ text: d.content?.[0]?.text || '' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// REPLICATE PROXY — image generation with Flux
// ══════════════════════════════════════════════════════════════

app.post('/api/replicate/predictions', async (req, res) => {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return res.status(503).json({ error: 'REPLICATE_API_TOKEN not set' });
  try {
    const { model, input } = req.body;
    const modelPath = model || 'black-forest-labs/flux-1.1-pro';
    const r = await fetch(`https://api.replicate.com/v1/models/${modelPath}/predictions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ input: input || {} }),
    });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/replicate/predictions/:id', async (req, res) => {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) return res.status(503).json({ error: 'REPLICATE_API_TOKEN not set' });
  try {
    const r = await fetch(`https://api.replicate.com/v1/predictions/${req.params.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// RUNWAY ML PROXY — video generation
// ══════════════════════════════════════════════════════════════

app.post('/api/runway/image-to-video', async (req, res) => {
  const token = process.env.RUNWAYML_API_SECRET;
  if (!token) return res.status(503).json({ error: 'RUNWAYML_API_SECRET not set' });
  try {
    const r = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Runway-Version': '2024-11-06' },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/runway/tasks/:id', async (req, res) => {
  const token = process.env.RUNWAYML_API_SECRET;
  if (!token) return res.status(503).json({ error: 'RUNWAYML_API_SECRET not set' });
  try {
    const r = await fetch(`https://api.dev.runwayml.com/v1/tasks/${req.params.id}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-Runway-Version': '2024-11-06' },
    });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// ADMIN — key testing
// ══════════════════════════════════════════════════════════════

app.post('/api/admin/test-key', async (req, res) => {
  const { keyId, value } = req.body;
  if (!value) return res.json({ ok: false, error: 'ריק' });
  const testers: Record<string, (v: string) => Promise<void>> = {
    ANTHROPIC_API_KEY: async (v) => { const r = await fetch('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': v, 'anthropic-version': '2023-06-01' } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); },
    REPLICATE_API_TOKEN: async (v) => { const r = await fetch('https://api.replicate.com/v1/account', { headers: { Authorization: `Bearer ${v}` } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); },
    ELEVENLABS_API_KEY: async (v) => { const r = await fetch('https://api.elevenlabs.io/v1/user', { headers: { 'xi-api-key': v } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); },
  };
  const tester = testers[keyId];
  if (!tester) return res.json({ ok: true });
  try { await tester(value); res.json({ ok: true }); }
  catch (err: any) { res.json({ ok: false, error: err.message }); }
});

// ── Catch-all for unknown API routes ──
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
