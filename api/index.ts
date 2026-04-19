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
  const fields = ['name','url','industry','target_audience','tone','goals','icon','color','description','social','scan_result','full_scan_data','competitor_analysis','competitors','schedule','business_profile','visual_identity'];
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
// CLAUDE MANAGED AGENTS — autonomous agents with sandboxed tools
// Beta: managed-agents-2026-04-01
// ══════════════════════════════════════════════════════════════

const MA_BASE = 'https://api.anthropic.com/v1';
const MA_HEADERS = (apiKey: string) => ({
  'x-api-key': apiKey,
  'anthropic-version': '2023-06-01',
  'anthropic-beta': 'managed-agents-2026-04-01',
  'content-type': 'application/json',
});

// Create agent
app.post('/api/managed-agents/agents', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'ANTHROPIC_API_KEY');
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });
  try {
    const r = await fetch(`${MA_BASE}/agents`, {
      method: 'POST',
      headers: MA_HEADERS(apiKey),
      body: JSON.stringify(req.body),
    });
    const d = await r.json();
    if (!r.ok) return res.status(r.status).json(d);
    res.json(d);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List agents
app.get('/api/managed-agents/agents', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'ANTHROPIC_API_KEY');
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });
  try {
    const r = await fetch(`${MA_BASE}/agents`, { headers: MA_HEADERS(apiKey) });
    const d = await r.json();
    res.status(r.ok ? 200 : r.status).json(d);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create environment
app.post('/api/managed-agents/environments', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'ANTHROPIC_API_KEY');
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });
  try {
    const r = await fetch(`${MA_BASE}/environments`, {
      method: 'POST',
      headers: MA_HEADERS(apiKey),
      body: JSON.stringify(req.body),
    });
    const d = await r.json();
    if (!r.ok) return res.status(r.status).json(d);
    res.json(d);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create session
app.post('/api/managed-agents/sessions', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'ANTHROPIC_API_KEY');
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });
  try {
    const r = await fetch(`${MA_BASE}/sessions`, {
      method: 'POST',
      headers: MA_HEADERS(apiKey),
      body: JSON.stringify(req.body),
    });
    const d = await r.json();
    if (!r.ok) return res.status(r.status).json(d);
    res.json(d);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Send event to session
app.post('/api/managed-agents/sessions/:id/events', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'ANTHROPIC_API_KEY');
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });
  try {
    const r = await fetch(`${MA_BASE}/sessions/${req.params.id}/events?beta=true`, {
      method: 'POST',
      headers: MA_HEADERS(apiKey),
      body: JSON.stringify(req.body),
    });
    const text = await r.text();
    res.status(r.status).type('application/json').send(text || '{}');
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Stream session events (SSE proxy)
app.get('/api/managed-agents/sessions/:id/stream', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'ANTHROPIC_API_KEY');
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });
  try {
    const upstream = await fetch(`${MA_BASE}/sessions/${req.params.id}/stream?beta=true`, {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'agent-api-2026-03-01',
        Accept: 'text/event-stream',
      },
    });
    if (!upstream.ok || !upstream.body) {
      const errText = await upstream.text();
      return res.status(upstream.status).json({ error: errText });
    }
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    const reader = (upstream.body as any).getReader();
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(decoder.decode(value, { stream: true }));
      }
    } catch {}
    res.end();
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Convenience: get session
app.get('/api/managed-agents/sessions/:id', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'ANTHROPIC_API_KEY');
  if (!apiKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });
  try {
    const r = await fetch(`${MA_BASE}/sessions/${req.params.id}`, { headers: MA_HEADERS(apiKey) });
    const d = await r.json();
    res.status(r.ok ? 200 : r.status).json(d);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// GEMINI PROXY — text generation + image generation
// ══════════════════════════════════════════════════════════════

app.post('/api/gemini/generate', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'GEMINI_API_KEY');
  if (!apiKey) return res.status(503).json({ error: 'GEMINI_API_KEY not set' });
  const { prompt, maxTokens = 800 } = req.body;
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: maxTokens },
      }),
    });
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ text });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/gemini/image', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'GEMINI_API_KEY');
  if (!apiKey) return res.status(503).json({ error: 'GEMINI_API_KEY not set' });
  const { prompt } = req.body;

  let lastError = '';
  const TIMEOUT = 45_000; // 45s per model attempt

  // Method 1: Gemini Flash with native image generation
  const geminiImageModels = ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image'];
  for (const model of geminiImageModels) {
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), TIMEOUT);
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ac.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ['IMAGE'] },
        }),
      });
      clearTimeout(timer);
      const d = await r.json();
      if (d.error) { lastError = `${model}: ${d.error.message}`; continue; }
      const parts = d.candidates?.[0]?.content?.parts || [];
      const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
      if (imgPart) {
        return res.json({ imageBase64: imgPart.inlineData.data, contentType: imgPart.inlineData.mimeType });
      }
      lastError = `${model}: No image generated — may be filtered`;
    } catch (err: any) {
      lastError = `${model}: ${err.name === 'AbortError' ? 'timeout (45s)' : err.message}`;
    }
  }

  // Method 2: Imagen 4.0 Fast (predict endpoint)
  try {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), TIMEOUT);
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ac.signal,
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: '1:1' },
      }),
    });
    clearTimeout(timer);
    const d = await r.json();
    if (!d.error) {
      const imageBytes = d.predictions?.[0]?.bytesBase64Encoded;
      if (imageBytes) return res.json({ imageBase64: imageBytes, contentType: 'image/png' });
    }
    lastError += ` | imagen-4.0-fast: ${d.error?.message || 'no image'}`;
  } catch (err: any) {
    lastError += ` | imagen-4.0-fast: ${err.name === 'AbortError' ? 'timeout (45s)' : err.message}`;
  }

  res.status(500).json({ error: lastError });
});

// ══════════════════════════════════════════════════════════════
// GEMINI VEO — Video generation
// ══════════════════════════════════════════════════════════════

app.post('/api/gemini/video', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'GEMINI_API_KEY');
  if (!apiKey) return res.status(503).json({ error: 'GEMINI_API_KEY not set' });
  const { prompt, aspectRatio = '9:16', durationSeconds = 8 } = req.body;
  // Clamp duration to supported values: 4, 6, 8
  const dur = [4, 6, 8].includes(Number(durationSeconds)) ? Number(durationSeconds) : 8;
  // Only 9:16 and 16:9 supported by Veo 3
  const ar = ['9:16', '16:9'].includes(aspectRatio) ? aspectRatio : '9:16';
  // Try Veo models in order — newer first
  const veoModels = [
    'veo-3.1-generate-preview',
    'veo-3.1-lite-generate-preview',
    'veo-3.0-generate-001',
  ];
  let lastError = '';
  for (const model of veoModels) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: { aspectRatio: ar, durationSeconds: dur },
        }),
      });
      const d = await r.json();
      if (d.error) { lastError = `${model}: ${d.error.message || JSON.stringify(d.error)}`; continue; }
      const opName = d.name;
      if (!opName) { lastError = `${model}: no operation returned`; continue; }
      return res.json({ operationName: opName, model });
    } catch (err: any) {
      lastError = `${model}: ${err.message}`;
    }
  }
  res.status(500).json({ error: lastError || 'All Veo models failed' });
});

app.get('/api/gemini/video/:operationName', async (req: any, res) => {
  const sb = getSupabase();
  const apiKey = await getUserKey(sb, req.userId, 'GEMINI_API_KEY');
  if (!apiKey) return res.status(503).json({ error: 'GEMINI_API_KEY not set' });
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/${req.params.operationName}?key=${apiKey}`);
    const d = await r.json();
    if (d.error) throw new Error(d.error.message);
    if (!d.done) return res.json({ done: false });
    const video = d.response?.generateVideoResponse?.generatedSamples?.[0]?.video;
    if (!video) return res.json({ done: true, error: 'No video generated' });

    // Download video from Google's protected URI and upload to Supabase Storage
    let publicUrl = '';
    if (video.uri) {
      const videoR = await fetch(`${video.uri}&key=${apiKey}`);
      if (!videoR.ok) throw new Error(`Failed to download video: ${videoR.status}`);
      const videoBuffer = Buffer.from(await videoR.arrayBuffer());
      const fileName = `media/${req.userId || 'anon'}/video_${Date.now()}.mp4`;
      if (sb) {
        await sb.storage.createBucket('media', { public: true }).catch(() => {});
        const { error: upErr } = await sb.storage.from('media').upload(fileName, videoBuffer, { contentType: 'video/mp4', upsert: true });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        const { data: urlData } = sb.storage.from('media').getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      }
    } else if (video.bytesBase64Encoded) {
      const videoBuffer = Buffer.from(video.bytesBase64Encoded, 'base64');
      const fileName = `media/${req.userId || 'anon'}/video_${Date.now()}.mp4`;
      if (sb) {
        await sb.storage.createBucket('media', { public: true }).catch(() => {});
        const { error: upErr } = await sb.storage.from('media').upload(fileName, videoBuffer, { contentType: 'video/mp4', upsert: true });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        const { data: urlData } = sb.storage.from('media').getPublicUrl(fileName);
        publicUrl = urlData.publicUrl;
      }
    }

    if (!publicUrl) throw new Error('Could not create public video URL');
    res.json({ done: true, videoUrl: publicUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// UPLOAD — base64 image to Supabase Storage → public URL
// ══════════════════════════════════════════════════════════════

app.post('/api/upload/image', async (req: any, res) => {
  try {
    const sb = getSupabase();
    if (!sb) return res.status(503).json({ error: 'Supabase not configured' });
    const { base64, contentType = 'image/png' } = req.body;
    if (!base64) return res.status(400).json({ error: 'base64 is required' });

    // Strip data URI prefix if present
    const raw = base64.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(raw, 'base64');
    const ext = contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'png';
    const fileName = `media/${req.userId || 'anon'}/${Date.now()}.${ext}`;

    // Ensure bucket exists (ignore error if already exists)
    await sb.storage.createBucket('media', { public: true }).catch(() => {});

    const { error: uploadErr } = await sb.storage.from('media').upload(fileName, buffer, {
      contentType,
      upsert: true
    });
    if (uploadErr) throw new Error(uploadErr.message);

    const { data: urlData } = sb.storage.from('media').getPublicUrl(fileName);
    res.json({ url: urlData.publicUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// SHORT LINKS — self-hosted URL shortener (Supabase-backed)
// ══════════════════════════════════════════════════════════════

async function ensureShortLinksTable(sb: any) {
  // Best-effort: try a simple select; if fails, we'll rely on external migration
  try {
    await sb.from('short_links').select('code').limit(1);
  } catch {}
}

function generateShortCode(len = 6): string {
  const chars = 'abcdefghijkmnpqrstuvwxyz23456789';
  let c = '';
  for (let i = 0; i < len; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

app.post('/api/shorten', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  try {
    const { url, business_id } = req.body;
    if (!url || !/^https?:\/\//i.test(url)) return res.status(400).json({ error: 'Invalid URL' });
    await ensureShortLinksTable(sb);
    // Reuse existing short link for same URL+user if present
    let existingQuery = sb.from('short_links').select('*').eq('url', url).limit(1);
    if (req.userId) existingQuery = existingQuery.eq('user_id', req.userId);
    const { data: existing } = await existingQuery;
    if (existing && existing[0]) {
      const shortUrl = `${req.protocol}://${req.get('host')}/s/${existing[0].code}`;
      return res.json({ code: existing[0].code, shortUrl });
    }
    // Create new with unique code
    let code = '';
    for (let tries = 0; tries < 5; tries++) {
      code = generateShortCode();
      const { data: existing2 } = await sb.from('short_links').select('code').eq('code', code).maybeSingle();
      if (!existing2) break;
    }
    const row: any = { code, url, clicks: 0 };
    if (req.userId) row.user_id = req.userId;
    if (business_id) row.business_id = business_id;
    const { error } = await sb.from('short_links').insert(row);
    if (error) return res.status(500).json({ error: error.message });
    const shortUrl = `${req.protocol}://${req.get('host')}/s/${code}`;
    res.json({ code, shortUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Public redirect — /s/:code → 302 to original URL
app.get('/s/:code', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).send('DB not configured');
  try {
    const { data } = await sb.from('short_links').select('url, clicks').eq('code', req.params.code).maybeSingle();
    if (!data?.url) return res.status(404).send('Not found');
    // Increment clicks (fire and forget)
    sb.from('short_links').update({ clicks: (data.clicks || 0) + 1 }).eq('code', req.params.code).then(() => {}, () => {});
    res.redirect(302, data.url);
  } catch (err: any) {
    res.status(500).send(err.message);
  }
});

// List user's short links
app.get('/api/shorten', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);
  let q = sb.from('short_links').select('*').order('created_at', { ascending: false });
  if (req.userId) q = q.eq('user_id', req.userId);
  const { data } = await q;
  res.json(data || []);
});

app.delete('/api/shorten/:code', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  let q = sb.from('short_links').delete().eq('code', req.params.code);
  if (req.userId) q = q.eq('user_id', req.userId);
  const { error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════
// AGENT PRESETS — manageable preset configs for Managed Agents
// ══════════════════════════════════════════════════════════════

app.get('/api/agent-presets', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);
  let q = sb.from('agent_presets').select('*').order('created_at', { ascending: false });
  if (req.userId) q = q.eq('user_id', req.userId);
  const { data, error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json(data || []);
});

app.post('/api/agent-presets', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const row: any = {};
  const fields = ['name','icon','description','system_prompt','default_task','agent_id'];
  for (const f of fields) if (req.body[f] !== undefined) row[f] = req.body[f];
  if (req.userId) row.user_id = req.userId;
  const { data, error } = await sb.from('agent_presets').insert(row).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.put('/api/agent-presets/:id', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const updates: any = { updated_at: new Date().toISOString() };
  const fields = ['name','icon','description','system_prompt','default_task','agent_id'];
  for (const f of fields) if (req.body[f] !== undefined) updates[f] = req.body[f];
  let q = sb.from('agent_presets').update(updates).eq('id', req.params.id);
  if (req.userId) q = q.eq('user_id', req.userId);
  const { data, error } = await q.select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/api/agent-presets/:id', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  let q = sb.from('agent_presets').delete().eq('id', req.params.id);
  if (req.userId) q = q.eq('user_id', req.userId);
  const { error } = await q;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
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
    META_ACCESS_TOKEN: async (v) => { const r = await fetch(`https://graph.facebook.com/v25.0/me?access_token=${v}`); if (!r.ok) throw new Error(`HTTP ${r.status}`); },
    GEMINI_API_KEY: async (v) => { const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${v}`); if (!r.ok) throw new Error(`HTTP ${r.status}`); },
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
// CRON — Daily metrics collection (called by Vercel Cron)
// ══════════════════════════════════════════════════════════════

app.get('/api/cron/metrics', async (req: any, res) => {
  // Optional auth: Vercel cron sends Authorization header
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  try {
    // Get all businesses with FB tokens
    const { data: businesses } = await sb.from('businesses').select('id, name, social');
    if (!businesses?.length) return res.json({ message: 'No businesses', saved: 0 });

    const today = new Date().toISOString().split('T')[0];
    let saved = 0;

    const errors: string[] = [];
    for (const biz of businesses) {
      const pageId = biz.social?.facebook?.tokens?.META_PAGE_ID;
      const accessToken = biz.social?.facebook?.tokens?.META_ACCESS_TOKEN;
      if (!pageId || !accessToken) { errors.push(`${biz.name}: no FB tokens`); continue; }

      try {
        // Try with engagement fields first
        let r = await fetch(
          `https://graph.facebook.com/v25.0/${pageId}/published_posts?fields=id,message,created_time,full_picture,permalink_url,likes.summary(true),comments.summary(true),shares&limit=50&access_token=${accessToken}`
        );
        let d = await r.json();
        // Fallback: without engagement fields
        if (d.error) {
          errors.push(`${biz.name} engagement: ${d.error.message}`);
          r = await fetch(
            `https://graph.facebook.com/v25.0/${pageId}/published_posts?fields=id,message,created_time,full_picture,permalink_url&limit=50&access_token=${accessToken}`
          );
          d = await r.json();
        }
        if (d.error || !d.data) { errors.push(`${biz.name}: ${d.error?.message || 'no data'}`); continue; }

        for (const p of d.data) {
          const row = {
            post_id: p.id,
            business_name: biz.name,
            date: today,
            likes: p.likes?.summary?.total_count ?? null,
            comments: p.comments?.summary?.total_count ?? null,
            shares: p.shares?.count ?? null,
            permalink_url: p.permalink_url || `https://facebook.com/${p.id}`,
            full_picture: p.full_picture || null,
            message: (p.message || '').substring(0, 200),
            source: 'facebook',
          };
          await sb.from('post_metrics').upsert(row, { onConflict: 'post_id,date' });
          saved++;
        }
      } catch (e: any) { errors.push(`${biz.name}: ${e.message}`); }
    }

    res.json({ message: `Metrics collected for ${today}`, saved, errors: errors.length ? errors : undefined });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// CRON — Auto-publish scheduled posts
// ══════════════════════════════════════════════════════════════

app.get('/api/cron/publish', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  try {
    const now = new Date().toISOString();
    // Get all posts scheduled for now or earlier that aren't published yet
    const { data: due, error } = await sb
      .from('content_posts')
      .select('*')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now)
      .is('published_at', null)
      .limit(20);
    if (error) return res.status(500).json({ error: error.message });
    if (!due?.length) return res.json({ message: 'No posts due', published: 0 });

    // Get businesses for FB tokens
    const { data: businesses } = await sb.from('businesses').select('*');
    const bizByName = Object.fromEntries((businesses || []).map((b: any) => [b.name, b]));

    const results: any[] = [];
    for (const post of due) {
      const r: any = { id: post.id, business: post.business_name };
      try {
        const biz = bizByName[post.business_name];
        const fbTokens = biz?.social?.facebook?.tokens;
        if (!fbTokens?.META_PAGE_ID || !fbTokens?.META_ACCESS_TOKEN) {
          r.error = 'no FB tokens';
          results.push(r);
          continue;
        }
        const pageId = fbTokens.META_PAGE_ID;
        const accessToken = fbTokens.META_ACCESS_TOKEN;
        const hashtags = (post.hashtags || []).map((h: string) => h.startsWith('#') ? h : `#${h}`).join(' ');
        const message = (post.content || '') + (hashtags ? '\n\n' + hashtags : '');
        const mediaUrl = post.video_url || post.image_url;
        const isVideo = !!post.video_url;

        let endpoint: string;
        let body: any;
        if (mediaUrl) {
          endpoint = isVideo
            ? `https://graph.facebook.com/v25.0/${pageId}/videos`
            : `https://graph.facebook.com/v25.0/${pageId}/photos`;
          body = isVideo
            ? { file_url: mediaUrl, description: message, access_token: accessToken }
            : { url: mediaUrl, message, access_token: accessToken };
        } else {
          // Text-only post
          endpoint = `https://graph.facebook.com/v25.0/${pageId}/feed`;
          body = { message, access_token: accessToken };
        }

        const fbR = await fetch(endpoint, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const fbD = await fbR.json();
        if (fbD.error) {
          r.error = fbD.error.message;
          // Mark as failed to avoid retry loop
          await sb.from('content_posts').update({ status: 'failed', performance: { publish_error: fbD.error.message, failed_at: now } }).eq('id', post.id);
          results.push(r);
          continue;
        }
        const fbPostId = fbD.post_id || fbD.id;
        await sb.from('content_posts').update({
          status: 'published',
          fb_post_id: fbPostId,
          published_at: now,
        }).eq('id', post.id);
        r.ok = true;
        r.fb_post_id = fbPostId;
      } catch (e: any) {
        r.error = e.message;
      }
      results.push(r);
    }

    const published = results.filter(x => x.ok).length;
    res.json({ message: `Published ${published}/${due.length}`, published, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// CRON — Auto-reply to comments on published posts
// ══════════════════════════════════════════════════════════════

app.get('/api/cron/replies', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  try {
    // Get Claude key
    const { data: keys } = await sb.from('user_api_keys').select('key_name, key_value').limit(20);
    const keyMap: Record<string, string> = {};
    for (const k of (keys || [])) keyMap[k.key_name] = k.key_value;
    const claudeKey = keyMap.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';
    if (!claudeKey) return res.json({ error: 'Missing ANTHROPIC key' });

    // Get businesses with auto_reply enabled
    const { data: businesses } = await sb.from('businesses').select('*');
    const eligibleBiz = (businesses || []).filter((b: any) =>
      b.schedule?.auto_reply_enabled &&
      b.social?.facebook?.tokens?.META_PAGE_ID &&
      b.social?.facebook?.tokens?.META_ACCESS_TOKEN
    );
    if (!eligibleBiz.length) return res.json({ message: 'No businesses with auto_reply enabled', replied: 0 });

    const results: any[] = [];
    let totalReplied = 0;
    const MAX_PER_RUN = 10; // safety limit

    for (const biz of eligibleBiz) {
      if (totalReplied >= MAX_PER_RUN) break;
      const r: any = { business: biz.name, replied: 0, checked: 0, errors: [] };
      const pageId = biz.social.facebook.tokens.META_PAGE_ID;
      const accessToken = biz.social.facebook.tokens.META_ACCESS_TOKEN;

      try {
        // 1. Get posts from last 7 days
        const sevenDaysAgo = Math.floor((Date.now() - 7 * 86400000) / 1000);
        const postsR = await fetch(
          `https://graph.facebook.com/v25.0/${pageId}/published_posts?fields=id,message,created_time&since=${sevenDaysAgo}&limit=30&access_token=${accessToken}`
        );
        const postsD = await postsR.json();
        if (postsD.error) { r.errors.push('posts: ' + postsD.error.message); results.push(r); continue; }
        const recentPosts = postsD.data || [];

        // 2. For each post, get comments
        for (const post of recentPosts) {
          if (totalReplied >= MAX_PER_RUN) break;
          const commentsR = await fetch(
            `https://graph.facebook.com/v25.0/${post.id}/comments?fields=id,message,from,created_time&filter=stream&order=reverse_chronological&limit=20&access_token=${accessToken}`
          );
          const commentsD = await commentsR.json();
          if (commentsD.error) { r.errors.push(`comments on ${post.id}: ${commentsD.error.message}`); continue; }

          for (const comment of (commentsD.data || [])) {
            if (totalReplied >= MAX_PER_RUN) break;
            r.checked++;

            // Skip: own comments, empty, very short
            if (!comment.message || comment.message.length < 3) continue;
            if (comment.from?.id === pageId) continue;

            // Skip: already replied (check DB)
            const { data: existing } = await sb
              .from('comment_replies')
              .select('id')
              .eq('fb_comment_id', comment.id)
              .limit(1)
              .maybeSingle();
            if (existing) continue;

            // 3. Generate reply with Claude
            const bizContext = [
              biz.name ? `שם העסק: ${biz.name}` : '',
              biz.description ? `תיאור: ${biz.description}` : '',
              biz.tone ? `טון: ${biz.tone}` : '',
              biz.schedule?.auto_reply_personality ? `הנחיות מיוחדות למענה: ${biz.schedule.auto_reply_personality}` : '',
            ].filter(Boolean).join('\n');

            const prompt = `אתה מנהל קהילה בעמוד העסק הזה. ענה לתגובה בעברית, בצורה חמה, אישית ותמציתית (עד 2 משפטים). אם השאלה כוללת בירור לגבי מחיר/זמינות — הצע ליצור קשר. אל תשתמש באימוג'ים מוגזמים (מקסימום 1). דבר בצורה טבעית — לא יותר מדי רשמית. אל תכלול האשטגים.

${bizContext}

תוכן הפוסט המקורי: "${(post.message || '').slice(0, 200)}"

התגובה של ${comment.from?.name || 'משתמש'}: "${comment.message}"

החזר רק את טקסט המענה, בלי שום טקסט נוסף:`;

            let replyText = '';
            try {
              replyText = await callClaude(prompt, claudeKey, 300);
              replyText = replyText.trim().replace(/^["']|["']$/g, '');
            } catch (e: any) {
              r.errors.push(`claude ${comment.id}: ${e.message}`);
              continue;
            }

            if (!replyText || replyText.length < 2) continue;

            // 4. Post reply to FB
            try {
              const postR = await fetch(
                `https://graph.facebook.com/v25.0/${comment.id}/comments`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message: replyText, access_token: accessToken }),
                }
              );
              const postD = await postR.json();
              if (postD.error) {
                // Save as failed so we don't retry
                await sb.from('comment_replies').insert({
                  fb_comment_id: comment.id,
                  fb_post_id: post.id,
                  business_name: biz.name,
                  commenter_name: comment.from?.name || null,
                  commenter_id: comment.from?.id || null,
                  original_text: comment.message,
                  reply_text: replyText,
                  status: 'failed',
                  skip_reason: postD.error.message,
                });
                r.errors.push(`reply ${comment.id}: ${postD.error.message}`);
                continue;
              }

              // 5. Save success
              await sb.from('comment_replies').insert({
                fb_comment_id: comment.id,
                fb_post_id: post.id,
                business_name: biz.name,
                commenter_name: comment.from?.name || null,
                commenter_id: comment.from?.id || null,
                original_text: comment.message,
                reply_text: replyText,
                reply_fb_id: postD.id,
                status: 'replied',
              });
              r.replied++;
              totalReplied++;
            } catch (e: any) {
              r.errors.push(`post ${comment.id}: ${e.message}`);
            }
          }
        }
      } catch (e: any) { r.errors.push('fatal: ' + e.message); }
      if (r.errors.length === 0) delete r.errors;
      results.push(r);
    }

    res.json({ message: `Replied to ${totalReplied} comments`, replied: totalReplied, results });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Query recent replies for dashboard display
app.get('/api/replies', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);
  let q = sb.from('comment_replies').select('*').order('created_at', { ascending: false }).limit(100);
  if (req.query.business) q = q.eq('business_name', req.query.business);
  if (req.query.days) q = q.gte('created_at', new Date(Date.now() - Number(req.query.days) * 86400000).toISOString());
  const { data } = await q;
  res.json(data || []);
});

// Delete/retract a reply (removes from FB + marks as deleted in DB)
app.delete('/api/replies/:id', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const { data: reply } = await sb.from('comment_replies').select('*').eq('id', req.params.id).single();
  if (!reply) return res.status(404).json({ error: 'Not found' });
  // Try to delete from FB (optional)
  if (reply.reply_fb_id) {
    const { data: businesses } = await sb.from('businesses').select('*').eq('name', reply.business_name).single();
    const accessToken = businesses?.social?.facebook?.tokens?.META_ACCESS_TOKEN;
    if (accessToken) {
      try {
        await fetch(`https://graph.facebook.com/v25.0/${reply.reply_fb_id}?access_token=${accessToken}`, { method: 'DELETE' });
      } catch {}
    }
  }
  await sb.from('comment_replies').update({ status: 'deleted' }).eq('id', req.params.id);
  res.json({ ok: true });
});

// GET metrics history for a post or business
app.get('/api/metrics', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);
  let q = sb.from('post_metrics').select('*').order('date', { ascending: false });
  if (req.query.post_id) q = q.eq('post_id', req.query.post_id);
  if (req.query.business) q = q.eq('business_name', req.query.business);
  if (req.query.days) q = q.gte('date', new Date(Date.now() - Number(req.query.days) * 86400000).toISOString().split('T')[0]);
  q = q.limit(500);
  const { data } = await q;
  res.json(data || []);
});

// ══════════════════════════════════════════════════════════════
// CRON — Daily business + competitor rescan
// ══════════════════════════════════════════════════════════════

// Helper: run Apify actor and wait for results
async function runApify(actorId: string, input: any, apifyToken: string): Promise<any[]> {
  const runR = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${apifyToken}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input),
  });
  const run = await runR.json();
  if (run.error || !run.data?.id) return [];
  const runId = run.data.id;
  for (let i = 0; i < 40; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const sr = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${apifyToken}`);
    const sd = await sr.json();
    if (sd.data?.status === 'SUCCEEDED') {
      const dr = await fetch(`https://api.apify.com/v2/datasets/${run.data.defaultDatasetId}/items?token=${apifyToken}&limit=30`);
      return await dr.json();
    }
    if (sd.data?.status !== 'RUNNING' && sd.data?.status !== 'READY') return [];
  }
  return [];
}

// Helper: call Claude
async function callClaude(prompt: string, apiKey: string, maxTokens = 1200): Promise<string> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: maxTokens, messages: [{ role: 'user', content: prompt }] }),
  });
  const d = await r.json();
  return d.content?.[0]?.text || '';
}

// Helper: fetch website content — try direct first, fallback to Apify for SPAs
async function fetchWebsiteContent(url: string, apifyToken?: string): Promise<string> {
  // Try direct fetch first (fast)
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarketingBot/1.0)' },
    });
    const html = await r.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (text.length > 100) return text.slice(0, 4000);
  } catch {} finally { clearTimeout(timer); }

  // Direct fetch got too little content (SPA) — use Apify headless browser
  if (apifyToken) {
    try {
      const items = await runApify('apify~website-content-crawler', {
        startUrls: [{ url }], maxCrawlPages: 3, maxCrawlDepth: 1,
        crawlerType: 'playwright:firefox',
      }, apifyToken);
      const text = items.map((i: any) => i.text || i.body || '').filter(Boolean).join('\n\n').trim();
      if (text.length > 50) return text.slice(0, 4000);
    } catch {}
  }
  return '';
}

// Helper: fetch FB posts via Meta Graph API (fast, no Apify needed)
async function fetchFBPosts(pageId: string, accessToken: string): Promise<any[]> {
  try {
    const r = await fetch(`https://graph.facebook.com/v25.0/${pageId}/posts?fields=message,created_time,shares&limit=15&access_token=${accessToken}`);
    const d = await r.json();
    if (!d.data) return [];
    return d.data.filter((p: any) => p.message).map((p: any) => ({
      text: p.message || '',
      likes: 0,
      comments: 0,
      shares: p.shares?.count || 0,
      date: p.created_time,
    }));
  } catch { return []; }
}

app.get('/api/cron/scan', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  try {
    // Pick one business: by ?name= param, or the one least recently scanned
    const bizName = req.query.name;
    let businesses: any[];
    if (bizName) {
      const { data } = await sb.from('businesses').select('*').eq('name', bizName).limit(1);
      businesses = data || [];
    } else {
      // Get all, sort by scan date (oldest first), pick first
      const { data } = await sb.from('businesses').select('*').order('visual_extracted_at', { ascending: true, nullsFirst: true }).limit(1);
      businesses = data || [];
    }
    if (!businesses.length) return res.json({ message: 'No businesses to scan', scanned: 0 });

    const biz = businesses[0];

    // Get API keys
    const { data: keys } = await sb.from('user_api_keys').select('key_name, key_value').limit(20);
    const keyMap: Record<string, string> = {};
    for (const k of (keys || [])) keyMap[k.key_name] = k.key_value;
    const claudeKey = keyMap.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';
    const apifyToken = keyMap.APIFY_API_TOKEN || process.env.APIFY_TOKEN || process.env.APIFY_API_TOKEN || '';
    if (!claudeKey) return res.json({ error: 'Missing ANTHROPIC key', scanned: 0 });

    const steps: string[] = [];
    let websiteContent = '';
    let fbPosts: any[] = [];

    // 1. Fetch website (direct first, Apify fallback for SPAs)
    if (biz.url) {
      try {
        websiteContent = await fetchWebsiteContent(biz.url.trim(), apifyToken);
        steps.push('website: ' + websiteContent.length + ' chars');
      } catch (e: any) { steps.push('website: error ' + e.message); }
    }

    // 2. Fetch FB posts via Meta Graph API (no Apify)
    const pageAccessToken = biz.social?.facebook?.tokens?.META_PAGE_ACCESS_TOKEN;
    const pageId = biz.social?.facebook?.tokens?.META_PAGE_ID;
    if (pageId && pageAccessToken) {
      try {
        fbPosts = await fetchFBPosts(pageId, pageAccessToken);
        steps.push('fb: ' + fbPosts.length + ' posts');
      } catch (e: any) { steps.push('fb: error ' + e.message); }
    } else {
      steps.push('fb: no tokens');
    }

    // 3. Claude analysis
    const websiteInfo = websiteContent ? `\nתוכן מהאתר:\n${websiteContent.slice(0, 1500)}` : '';
    const ownPostsInfo = fbPosts.length > 0 ? `\nפוסטים אחרונים:\n${fbPosts.slice(0, 5).map(p => `- "${p.text.slice(0, 80)}..."`).join('\n')}` : '';

    const raw = await callClaude(`אתה מנתח שיווקי. נתח את העסק "${biz.name}" (${biz.description || ''}).${websiteInfo}${ownPostsInfo}

החזר JSON קצר ותמציתי בלבד (ללא טקסט נוסף). כל ערך מחרוזת — עד 30 מילים. כל מערך — עד 3 פריטים.
{"tone":"טון","audience":"קהל","strengths":["1","2"],"contentIdeas":["1","2","3"],"topThemes":["1","2"],"bestHooks":["1","2"],"gaps":["1"],"recommendation":"המלצה"}`, claudeKey, 2000);
    let analysis: any = {};
    try {
      // Strip markdown fences and try parsing
      let clean = raw.replace(/```json\n?|```/g, '').trim();
      // Find first { and last } for extraction
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        clean = clean.slice(firstBrace, lastBrace + 1);
      }
      analysis = JSON.parse(clean);
      steps.push('analysis: ' + Object.keys(analysis).join(','));
    } catch (e: any) {
      steps.push('json parse error: ' + e.message);
      steps.push('raw len: ' + raw.length + ', start: ' + raw.slice(0, 120).replace(/\n/g, '\\n'));
    }

    const updateData: any = {
      scan_result: analysis,
      full_scan_data: { websiteContent: websiteContent.slice(0, 2000), fbPosts: fbPosts.slice(0, 10), analysis },
      visual_extracted_at: new Date().toISOString(),
    };

    // 4. Auto-generate visual_identity if empty
    if (!biz.visual_identity && websiteContent) {
      try {
        const viRaw = await callClaude(`You are a brand visual consultant. Write a concise VISUAL IDENTITY description in English for AI image/video generation. Include: what the product/service physically LOOKS LIKE, signature visual elements, color palette, photographic style, mood, and 3-5 specific visual motifs. Output ONLY a single paragraph of 80-150 words.

Business: ${biz.name}
Website: ${biz.url || 'N/A'}
Description: ${biz.description || 'N/A'}
Website content: ${websiteContent.slice(0, 500)}`, claudeKey, 500);
        if (viRaw.trim()) updateData.visual_identity = viRaw.trim();
        steps.push('visual_identity: generated');
      } catch (e: any) { steps.push('visual_identity: error ' + e.message); }
    }

    await sb.from('businesses').update(updateData).eq('id', biz.id);
    steps.push('saved');

    res.json({ message: 'Scan complete', business: biz.name, steps });
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
  const scopes = 'pages_manage_posts,pages_manage_engagement,pages_read_engagement,pages_show_list,pages_read_user_content';
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
