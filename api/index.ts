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
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

// ── Middleware ──
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ── Auth middleware — extract user from JWT ──
async function authMiddleware(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    // Allow unauthenticated for now (backwards compat) — will enforce later
    req.userId = null;
    return next();
  }
  try {
    const token = authHeader.split(' ')[1];
    const sb = getSupabase();
    if (!sb) { req.userId = null; return next(); }
    const { data: { user }, error } = await sb.auth.getUser(token);
    if (error || !user) { req.userId = null; return next(); }
    req.userId = user.id;
    req.userEmail = user.email;
  } catch {
    req.userId = null;
  }
  next();
}
app.use(authMiddleware);

// ── Health ──
app.get('/api/health', (_req, res) => {
  const sb = getSupabase();
  res.json({ ok: true, ts: new Date().toISOString(), supabase: Boolean(sb) });
});

// ══════════════════════════════════════════════════════════════
// BUSINESSES
// ══════════════════════════════════════════════════════════════

app.get('/api/businesses', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);
  let query = sb.from('businesses').select('*').order('created_at', { ascending: false });
  if (req.userId) query = query.eq('user_id', req.userId);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

app.post('/api/businesses', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const row: Record<string, any> = {};
  const fields = ['name','url','industry','target_audience','tone','goals','icon','color','description','social','scan_result','full_scan_data','competitor_analysis','competitors','schedule','business_profile'];
  for (const f of fields) if (req.body[f] !== undefined) row[f] = req.body[f];
  if (req.userId) row.user_id = req.userId;
  const { data, error } = await sb.from('businesses').insert(row).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/businesses/:id', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const updates = { ...req.body };
  delete updates.id; delete updates.created_at; delete updates.user_id;
  let query = sb.from('businesses').update(updates).eq('id', req.params.id);
  if (req.userId) query = query.eq('user_id', req.userId);
  const { data, error } = await query.select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/businesses/:id', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  // Get the business name first (posts reference by name)
  let bizQuery = sb.from('businesses').select('name').eq('id', req.params.id);
  if (req.userId) bizQuery = bizQuery.eq('user_id', req.userId);
  const { data: biz } = await bizQuery.maybeSingle();
  let delQuery = sb.from('businesses').delete().eq('id', req.params.id);
  if (req.userId) delQuery = delQuery.eq('user_id', req.userId);
  const { error } = await delQuery;
  if (error) return res.status(500).json({ error: error.message });
  // Also delete related posts by business name
  if (biz?.name) await sb.from('posts').delete().eq('business', biz.name);
  res.json({ ok: true });
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

// ── Backfill: assign orphan rows to the logged-in user ──
app.post('/api/claim-data', async (req: any, res) => {
  if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  // Assign all businesses with null user_id to this user
  const { data: biz, error: bizErr } = await sb.from('businesses').update({ user_id: req.userId }).is('user_id', null).select('id, name');
  // Assign all content_posts with null user_id to this user
  const { data: posts, error: postErr } = await sb.from('content_posts').update({ user_id: req.userId }).is('user_id', null).select('id');
  res.json({ claimed: { businesses: biz?.length || 0, posts: posts?.length || 0 }, errors: { biz: bizErr?.message, posts: postErr?.message } });
});

// ══════════════════════════════════════════════════════════════
// CONTENT / POSTS
// ══════════════════════════════════════════════════════════════

app.get('/api/content', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);
  let query = sb.from('content_posts').select('*').order('created_at', { ascending: false });
  if (req.userId) query = query.eq('user_id', req.userId);
  if (req.query.business_id) query = query.eq('business_id', req.query.business_id as string);
  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

app.post('/api/content', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const row: Record<string, any> = {
    platform: req.body.platform || 'פייסבוק',
    type: req.body.type || 'פוסט קצר',
    content: req.body.content || '',
  };
  const optFields = ['business_id','business_name','hashtags','status','fb_post_id','published_at','date_label','media','ugc','image_url','video_url','ugc_video_url','image_prompt','motion_prompt','ugc_script','scheduled_at','ab_variant'];
  for (const f of optFields) if (req.body[f]) row[f] = req.body[f];
  if (req.userId) row.user_id = req.userId;
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
// ELEVENLABS PROXY — Hebrew text-to-speech
// ══════════════════════════════════════════════════════════════

app.post('/api/elevenlabs/tts', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ELEVENLABS_API_KEY not set' });
  try {
    const { text, voiceId } = req.body;
    const voice = voiceId || 'EXAVITQu4vr4xnSDxMaL'; // Sarah - default Hebrew voice
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({
        text: text || '',
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({ message: `HTTP ${r.status}` }));
      return res.status(r.status).json({ error: err.detail?.message || err.message || `HTTP ${r.status}` });
    }
    const arrayBuf = await r.arrayBuffer();
    const base64 = Buffer.from(arrayBuf).toString('base64');
    res.json({ audioBase64: base64, contentType: r.headers.get('content-type') || 'audio/mpeg' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// D-ID PROXY — talking avatar video
// ══════════════════════════════════════════════════════════════

app.post('/api/did/talks', async (req, res) => {
  const apiKey = process.env.DID_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'DID_API_KEY not set' });
  try {
    const r = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Basic ${apiKey}` },
      body: JSON.stringify(req.body),
    });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/did/talks/:id', async (req, res) => {
  const apiKey = process.env.DID_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'DID_API_KEY not set' });
  try {
    const r = await fetch(`https://api.d-id.com/talks/${req.params.id}`, {
      headers: { Authorization: `Basic ${apiKey}` },
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

// ══════════════════════════════════════════════════════════════
// FACEBOOK METRICS — workaround without pages_read_engagement
// ══════════════════════════════════════════════════════════════

app.get('/api/fb-metrics/:pageId', async (req, res) => {
  try {
    const { pageId } = req.params;
    const accessToken = req.query.token as string;
    if (!accessToken) return res.status(400).json({ error: 'Missing token param' });

    const gf = (path: string) =>
      fetch(`https://graph.facebook.com/v25.0/${path}&access_token=${accessToken}`).then(r => r.json());

    // 1) Page info — works without pages_read_engagement
    const pageInfo = await gf(`${pageId}?fields=name,fan_count,followers_count,new_like_count,talking_about_count,were_here_count`);

    // 2) Published posts — basic fields work with pages_manage_posts
    let postsData: any = { data: [] };
    try {
      postsData = await gf(`${pageId}/published_posts?fields=id,message,created_time&limit=50`);
      if (postsData.error) postsData = { data: [] };
    } catch (_) {}

    // 2b) Try to get extra fields (full_picture etc) — may fail, that's ok
    let extraFields: Record<string,any> = {};
    try {
      const extraData = await gf(`${pageId}/published_posts?fields=id,full_picture,status_type&limit=50`);
      if (!extraData.error && extraData.data) {
        for (const p of extraData.data) extraFields[p.id] = { full_picture: p.full_picture, status_type: p.status_type };
      }
    } catch (_) {}

    // 3) Try engagement (might fail — graceful fallback)
    let engagementAvailable = false;
    let postsWithEngagement: any[] = [];
    try {
      const engData = await gf(`${pageId}/published_posts?fields=id,message,created_time,likes.summary(true),comments.summary(true),shares&limit=50`);
      if (!engData.error && engData.data) {
        engagementAvailable = true;
        postsWithEngagement = engData.data.map((p: any) => ({
          id: p.id,
          message: (p.message || '').substring(0, 120),
          created_time: p.created_time,
          full_picture: extraFields[p.id]?.full_picture || null,
          status_type: extraFields[p.id]?.status_type || null,
          permalink_url: `https://facebook.com/${p.id}`,
          likes: p.likes?.summary?.total_count || 0,
          comments: p.comments?.summary?.total_count || 0,
          shares: p.shares?.count || 0,
        }));
      }
    } catch (_) { /* engagement not available */ }

    // 4) Build response
    const posts = engagementAvailable ? postsWithEngagement : (postsData.data || []).map((p: any) => ({
      id: p.id,
      message: (p.message || '').substring(0, 120),
      created_time: p.created_time,
      full_picture: extraFields[p.id]?.full_picture || null,
      status_type: extraFields[p.id]?.status_type || null,
      permalink_url: `https://facebook.com/${p.id}`,
      likes: null,
      comments: null,
      shares: null,
    }));

    res.json({
      page: {
        id: pageInfo.id,
        name: pageInfo.name,
        fans: pageInfo.fan_count || 0,
        followers: pageInfo.followers_count || 0,
        talking_about: pageInfo.talking_about_count || 0,
      },
      posts,
      engagementAvailable,
      totalPosts: posts.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Catch-all for unknown API routes ──
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
