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

app.delete('/api/content/:id', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  let query = sb.from('content_posts').delete().eq('id', req.params.id);
  if (req.userId) query = query.eq('user_id', req.userId);
  const { error } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
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

app.post('/api/content/claude', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'ANTHROPIC_API_KEY');
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

app.post('/api/replicate/predictions', async (req: any, res) => {
  const sb = getSupabase();
  const token = await getUserKey(sb, req.userId, 'REPLICATE_API_TOKEN');
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

app.get('/api/replicate/predictions/:id', async (req: any, res) => {
  const sb = getSupabase();
  const token = await getUserKey(sb, req.userId, 'REPLICATE_API_TOKEN');
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

app.post('/api/runway/image-to-video', async (req: any, res) => {
  const sb = getSupabase();
  const token = await getUserKey(sb, req.userId, 'RUNWAYML_API_SECRET');
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

app.get('/api/runway/tasks/:id', async (req: any, res) => {
  const sb = getSupabase();
  const token = await getUserKey(sb, req.userId, 'RUNWAYML_API_SECRET');
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

app.post('/api/elevenlabs/tts', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'ELEVENLABS_API_KEY');
  if (!apiKey) return res.status(503).json({ error: 'ELEVENLABS_API_KEY not set' });
  try {
    const { text, voiceId, languageCode } = req.body;
    const voice = voiceId || 'EXAVITQu4vr4xnSDxMaL'; // Sarah - default voice
    const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'xi-api-key': apiKey },
      body: JSON.stringify({
        text: text || '',
        model_id: 'eleven_multilingual_v2',
        language_code: languageCode || 'he',
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

app.post('/api/did/talks', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'DID_API_KEY');
  if (!apiKey) return res.status(503).json({ error: 'DID_API_KEY not set' });
  try {
    const authHeader = `Basic ${apiKey}`;
    let body = req.body;

    // If audio_url is a base64 data URL, upload to D-ID first
    if (body.script?.audio_url?.startsWith('data:')) {
      const matches = body.script.audio_url.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const [, contentType, b64] = matches;
        const audioBuffer = Buffer.from(b64, 'base64');
        const formData = new FormData();
        formData.append('audio', new Blob([audioBuffer], { type: contentType }), 'audio.mp3');
        const uploadRes = await fetch('https://api.d-id.com/audios', {
          method: 'POST',
          headers: { Authorization: authHeader },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) {
          body = { ...body, script: { ...body.script, audio_url: uploadData.url } };
        } else if (uploadData.error || uploadData.kind) {
          return res.json(uploadData); // Forward D-ID error
        }
      }
    }

    const r = await fetch('https://api.d-id.com/talks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/did/talks/:id', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'DID_API_KEY');
  if (!apiKey) return res.status(503).json({ error: 'DID_API_KEY not set' });
  try {
    const authHeader = `Basic ${apiKey}`;
    const r = await fetch(`https://api.d-id.com/talks/${req.params.id}`, {
      headers: { Authorization: authHeader },
    });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// D-ID Clips API — presenters with movement and backgrounds
app.post('/api/did/clips', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'DID_API_KEY');
  if (!apiKey) return res.status(503).json({ error: 'DID_API_KEY not set' });
  try {
    const authHeader = `Basic ${apiKey}`;
    let body = req.body;

    // If audio_url is a base64 data URL, upload to D-ID first
    if (body.script?.audio_url?.startsWith('data:')) {
      const matches = body.script.audio_url.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        const [, contentType, b64] = matches;
        const audioBuffer = Buffer.from(b64, 'base64');
        const formData = new FormData();
        formData.append('audio', new Blob([audioBuffer], { type: contentType }), 'audio.mp3');
        const uploadRes = await fetch('https://api.d-id.com/audios', {
          method: 'POST',
          headers: { Authorization: authHeader },
          body: formData,
        });
        const uploadData = await uploadRes.json();
        if (uploadData.url) {
          body = { ...body, script: { ...body.script, audio_url: uploadData.url } };
        } else if (uploadData.error || uploadData.kind) {
          return res.json(uploadData);
        }
      }
    }

    const r = await fetch('https://api.d-id.com/clips', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: authHeader },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/did/clips/:id', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'DID_API_KEY');
  if (!apiKey) return res.status(503).json({ error: 'DID_API_KEY not set' });
  try {
    const authHeader = `Basic ${apiKey}`;
    const r = await fetch(`https://api.d-id.com/clips/${req.params.id}`, {
      headers: { Authorization: authHeader },
    });
    const data = await r.json();
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// BYOK — per-user API key management
// ══════════════════════════════════════════════════════════════

// Helper: get a user's API key (falls back to env var)
async function getUserKey(sb: any, userId: string | null, keyName: string): Promise<string | null> {
  if (userId && sb) {
    const { data } = await sb.from('user_api_keys').select('key_value').eq('user_id', userId).eq('key_name', keyName).maybeSingle();
    if (data?.key_value) return data.key_value;
  }
  // Fallback to env vars
  return process.env[keyName] || null;
}

// Get all keys for current user (names + masked values)
app.get('/api/admin/keys', async (req: any, res) => {
  if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });
  const sb = getSupabase();
  if (!sb) return res.json({ keys: {} });
  const { data } = await sb.from('user_api_keys').select('key_name, key_value, updated_at').eq('user_id', req.userId);
  const keys: Record<string, { masked: string; updatedAt: string }> = {};
  for (const row of (data || [])) {
    const v = row.key_value;
    keys[row.key_name] = {
      masked: v.length > 8 ? v.slice(0, 4) + '•'.repeat(Math.min(v.length - 8, 20)) + v.slice(-4) : '••••••••',
      updatedAt: row.updated_at,
    };
  }
  res.json({ keys });
});

// Save/update a key
app.put('/api/admin/keys/:keyName', async (req: any, res) => {
  if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const { value } = req.body;
  if (!value) {
    // Delete key
    await sb.from('user_api_keys').delete().eq('user_id', req.userId).eq('key_name', req.params.keyName);
    return res.json({ ok: true, deleted: true });
  }
  const { error } = await sb.from('user_api_keys').upsert({
    user_id: req.userId,
    key_name: req.params.keyName,
    key_value: value,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,key_name' });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Test a key
app.post('/api/admin/test-key', async (req: any, res) => {
  if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });
  const sb = getSupabase();
  const { keyId, value } = req.body;
  // Use provided value, or fetch from DB
  const keyValue = value || (sb ? (await getUserKey(sb, req.userId, keyId)) : null);
  if (!keyValue) return res.json({ ok: false, error: 'ריק' });
  const testers: Record<string, (v: string) => Promise<void>> = {
    ANTHROPIC_API_KEY: async (v) => { const r = await fetch('https://api.anthropic.com/v1/models', { headers: { 'x-api-key': v, 'anthropic-version': '2023-06-01' } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); },
    REPLICATE_API_TOKEN: async (v) => { const r = await fetch('https://api.replicate.com/v1/account', { headers: { Authorization: `Bearer ${v}` } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); },
    ELEVENLABS_API_KEY: async (v) => { const r = await fetch('https://api.elevenlabs.io/v1/user', { headers: { 'xi-api-key': v } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); },
    DID_API_KEY: async (v) => { const r = await fetch('https://api.d-id.com/credits', { headers: { Authorization: `Basic ${v}` } }); if (!r.ok) throw new Error(`HTTP ${r.status}`); },
    META_ACCESS_TOKEN: async (v) => { const r = await fetch(`https://graph.facebook.com/v25.0/me?access_token=${v}`); if (!r.ok) throw new Error(`HTTP ${r.status}`); },
  };
  const tester = testers[keyId];
  if (!tester) return res.json({ ok: true });
  try { await tester(keyValue); res.json({ ok: true }); }
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

// ══════════════════════════════════════════════════════════════
// FACEBOOK OAUTH — connect pages via official flow
// ══════════════════════════════════════════════════════════════

const FB_APP_ID = process.env.FB_APP_ID || '';
const FB_APP_SECRET = process.env.FB_APP_SECRET || '';
const PROD_URL = 'https://dashboard-steel-delta-52.vercel.app';

// Step 1: Redirect user to Facebook login dialog
app.get('/api/auth/facebook', (req: any, res) => {
  if (!FB_APP_ID) return res.status(503).json({ error: 'FB_APP_ID not configured' });
  const redirectUri = `${PROD_URL}/api/auth/facebook/callback`;
  const scopes = 'pages_manage_posts,pages_read_engagement,pages_show_list,pages_read_user_content';
  // Pass user_id in state so we know who to assign tokens to
  const state = req.userId || 'anon';
  const fbUrl = `https://www.facebook.com/v25.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes}&state=${state}&response_type=code`;
  res.redirect(fbUrl);
});

// Step 2: Handle callback from Facebook
app.get('/api/auth/facebook/callback', async (req, res) => {
  const { code, error: fbError, state } = req.query;
  if (fbError || !code) {
    return res.redirect(`${PROD_URL}/#fb-error=${encodeURIComponent(fbError as string || 'no_code')}`);
  }
  if (!FB_APP_ID || !FB_APP_SECRET) {
    return res.redirect(`${PROD_URL}/#fb-error=app_not_configured`);
  }

  try {
    const redirectUri = `${PROD_URL}/api/auth/facebook/callback`;

    // Exchange code for user access token
    const tokenResp = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&redirect_uri=${encodeURIComponent(redirectUri)}&code=${code}`
    );
    const tokenData: any = await tokenResp.json();
    if (tokenData.error) throw new Error(tokenData.error.message);
    const userToken = tokenData.access_token;

    // Exchange for long-lived token (60 days)
    const longResp = await fetch(
      `https://graph.facebook.com/v25.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${FB_APP_ID}&client_secret=${FB_APP_SECRET}&fb_exchange_token=${userToken}`
    );
    const longData: any = await longResp.json();
    const longToken = longData.access_token || userToken;

    // Get user's pages with page access tokens
    const pagesResp = await fetch(
      `https://graph.facebook.com/v25.0/me/accounts?fields=id,name,access_token,category&access_token=${longToken}`
    );
    const pagesData: any = await pagesResp.json();
    if (pagesData.error) throw new Error(pagesData.error.message);
    const pages = (pagesData.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      token: p.access_token,
      category: p.category,
    }));

    // Store pages in Supabase for this user
    const userId = state as string;
    const sb = getSupabase();
    if (sb && userId && userId !== 'anon') {
      // Save FB pages to a new table or update businesses
      // For now, store in a fb_pages helper table or directly match to businesses
      for (const page of pages) {
        // Check if there's a business matching this page name
        const { data: biz } = await sb.from('businesses')
          .select('id, social')
          .eq('user_id', userId)
          .ilike('name', `%${page.name}%`)
          .maybeSingle();

        if (biz) {
          // Auto-match: update business with FB page token
          const social = biz.social || {};
          social.facebook = {
            ...(social.facebook || {}),
            connected: true,
            pageId: page.id,
            pageName: page.name,
            tokens: {
              ...(social.facebook?.tokens || {}),
              META_ACCESS_TOKEN: page.token,
              META_PAGE_ID: page.id,
            }
          };
          await sb.from('businesses').update({ social }).eq('id', biz.id);
        }
      }
    }

    // Redirect back to app with pages data in hash
    const pagesB64 = btoa(JSON.stringify({ type: 'fb-oauth', pages }));
    res.redirect(`${PROD_URL}/#fb-pages=${pagesB64}`);
  } catch (err: any) {
    res.redirect(`${PROD_URL}/#fb-error=${encodeURIComponent(err.message)}`);
  }
});

// Step 3: Manual page-to-business assignment
app.post('/api/auth/facebook/assign', async (req: any, res) => {
  if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const { businessId, pageId, pageName, pageToken } = req.body;
  if (!businessId || !pageToken) return res.status(400).json({ error: 'Missing businessId or pageToken' });

  // Verify business belongs to user
  const { data: biz } = await sb.from('businesses')
    .select('id, social')
    .eq('id', businessId)
    .eq('user_id', req.userId)
    .maybeSingle();
  if (!biz) return res.status(404).json({ error: 'Business not found' });

  const social = biz.social || {};
  social.facebook = {
    ...(social.facebook || {}),
    connected: true,
    pageId,
    pageName,
    tokens: {
      ...(social.facebook?.tokens || {}),
      META_ACCESS_TOKEN: pageToken,
      META_PAGE_ID: pageId,
    }
  };
  const { error } = await sb.from('businesses').update({ social }).eq('id', biz.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, social });
});

// Get connected FB pages for current user (from last OAuth)
app.get('/api/auth/facebook/pages', async (req: any, res) => {
  if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });

  // Return businesses that have FB connected
  const { data } = await sb.from('businesses')
    .select('id, name, social')
    .eq('user_id', req.userId);

  const connected = (data || [])
    .filter((b: any) => b.social?.facebook?.connected)
    .map((b: any) => ({
      businessId: b.id,
      businessName: b.name,
      pageId: b.social.facebook.pageId,
      pageName: b.social.facebook.pageName,
    }));
  res.json({ connected });
});

// ══════════════════════════════════════════════════════════════
// SUPER ADMIN — platform management (admin only)
// ══════════════════════════════════════════════════════════════

async function requireAdmin(req: any, res: any, next: any) {
  if (!req.userId) return res.status(401).json({ error: 'Not authenticated' });
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const { data } = await sb.from('user_profiles').select('is_admin').eq('id', req.userId).maybeSingle();
  if (!data?.is_admin) return res.status(403).json({ error: 'Admin only' });
  next();
}

// Check if current user is admin
app.get('/api/superadmin/me', async (req: any, res) => {
  if (!req.userId) return res.json({ isAdmin: false });
  const sb = getSupabase();
  if (!sb) return res.json({ isAdmin: false });
  const { data } = await sb.from('user_profiles').select('is_admin').eq('id', req.userId).maybeSingle();
  res.json({ isAdmin: !!data?.is_admin });
});

// Get all users with stats
app.get('/api/superadmin/users', requireAdmin, async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });

  // Get all user profiles
  const { data: profiles } = await sb.from('user_profiles').select('*').order('created_at', { ascending: false });

  // Get business counts per user
  const { data: bizCounts } = await sb.from('businesses').select('user_id');
  const bizMap: Record<string, number> = {};
  for (const b of (bizCounts || [])) {
    if (b.user_id) bizMap[b.user_id] = (bizMap[b.user_id] || 0) + 1;
  }

  // Get post counts per user
  const { data: postCounts } = await sb.from('content_posts').select('user_id');
  const postMap: Record<string, number> = {};
  for (const p of (postCounts || [])) {
    if (p.user_id) postMap[p.user_id] = (postMap[p.user_id] || 0) + 1;
  }

  // Get last login from auth.users
  const { data: authUsers } = await sb.auth.admin.listUsers();
  const loginMap: Record<string, string> = {};
  for (const u of (authUsers?.users || [])) {
    loginMap[u.id] = u.last_sign_in_at || '';
  }

  const users = (profiles || []).map((p: any) => ({
    id: p.id,
    email: p.email,
    plan: p.plan,
    isAdmin: p.is_admin,
    createdAt: p.created_at,
    businesses: bizMap[p.id] || 0,
    posts: postMap[p.id] || 0,
    lastLogin: loginMap[p.id] || null,
  }));

  res.json(users);
});

// Update user plan
app.put('/api/superadmin/users/:id/plan', requireAdmin, async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const { plan } = req.body;
  if (!['free', 'pro'].includes(plan)) return res.status(400).json({ error: 'Invalid plan' });
  const { error } = await sb.from('user_profiles').update({ plan, updated_at: new Date().toISOString() }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Get platform config
app.get('/api/superadmin/config', requireAdmin, async (_req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const { data, error } = await sb.from('platform_config').select('*').eq('id', 'default').maybeSingle();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Update platform config
app.put('/api/superadmin/config', requireAdmin, async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const allowed = ['free_max_businesses', 'free_max_posts_month', 'free_features', 'pro_price_ils', 'pro_features', 'pro_max_businesses', 'pro_max_posts_month'];
  const updates: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
  const { data, error } = await sb.from('platform_config').update(updates).eq('id', 'default').select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── Catch-all for unknown API routes ──
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
