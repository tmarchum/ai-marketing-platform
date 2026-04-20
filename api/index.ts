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
  const fields = ['name','url','industry','target_audience','tone','goals','icon','color','description','social','scan_result','full_scan_data','competitor_analysis','competitors','schedule','business_profile','visual_identity','whatsapp_number'];
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
  // Fallback: env var
  if (process.env[keyName]) return process.env[keyName] as string;
  // Fallback 2: grab ANY user's key (for cron endpoints without auth)
  if (sb) {
    const { data } = await sb.from('user_api_keys').select('key_value').eq('key_name', keyName).limit(1).maybeSingle();
    if (data?.key_value) return data.key_value;
  }
  return null;
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
// CONTENT CALENDAR — Generate monthly content plans
// ══════════════════════════════════════════════════════════════

// Israeli holidays + cultural events by month (Gregorian dates — approx for 2025-2026)
const ISRAELI_EVENTS: Record<number, { date: string; name: string; vibe: string }[]> = {
  1: [
    { date: '01-01', name: 'ראש השנה האזרחית', vibe: 'התחלה חדשה, סיכום, החלטות' },
    { date: '01-15', name: 'ט"ו בשבט (בערך)', vibe: 'טבע, צמיחה, ירוק' },
  ],
  2: [
    { date: '02-14', name: 'ולנטיינס', vibe: 'אהבה, זוגות, מתנות' },
  ],
  3: [
    { date: '03-08', name: 'יום האישה הבינלאומי', vibe: 'חיזוק נשים, העצמה' },
    { date: '03-20', name: 'פורים (משתנה)', vibe: 'מסיבה, תחפושות, כיף משפחתי' },
  ],
  4: [
    { date: '04-14', name: 'פסח (משתנה)', vibe: 'משפחה, חופש, מסורת, חוצות' },
    { date: '04-22', name: 'יום השואה (משתנה)', vibe: 'זיכרון, רצינות' },
    { date: '04-30', name: 'יום הזיכרון + יום העצמאות (משתנה)', vibe: 'גאווה לאומית, חגיגה' },
  ],
  5: [
    { date: '05-01', name: 'חג העצמאות (לעיתים)', vibe: 'מסיבה לאומית, קולנוע ציבורי, חוצות' },
    { date: '05-10', name: 'ל"ג בעומר (משתנה)', vibe: 'מדורות, חוץ, קבוצות' },
    { date: '05-25', name: 'שבועות (משתנה)', vibe: 'מסורת, מוצרי חלב, משפחה' },
  ],
  6: [
    { date: '06-01', name: 'תחילת עונת החתונות', vibe: 'חתונות, אירועים, קיץ' },
    { date: '06-20', name: 'סוף שנה"ל — חופש גדול מתחיל', vibe: 'ילדים חופשיים, מחפשים פעילות' },
  ],
  7: [
    { date: '07-01', name: 'חופש גדול בעיצומו', vibe: 'פעילות משפחתית, חוץ, מים' },
  ],
  8: [
    { date: '08-15', name: 'ט"ו באב (משתנה)', vibe: 'אהבה, זוגות, חתונות' },
    { date: '08-30', name: 'ערב חזרה ללימודים', vibe: 'סיום חופש, מסיבות סיום' },
  ],
  9: [
    { date: '09-01', name: 'חזרה ללימודים', vibe: 'שגרה, חזרה למסגרת' },
    { date: '09-20', name: 'ראש השנה העברי (משתנה)', vibe: 'התחלות, משפחה, תפילות' },
    { date: '09-30', name: 'יום כיפור (משתנה)', vibe: 'רצינות, מחשבה, צום' },
  ],
  10: [
    { date: '10-05', name: 'סוכות (משתנה)', vibe: 'חוץ, משפחה, מסורת, שמחה' },
    { date: '10-13', name: 'שמחת תורה (משתנה)', vibe: 'ריקודים, שמחה' },
    { date: '10-31', name: 'ליל כל הקדושים', vibe: 'תחפושות, ילדים, כיף' },
  ],
  11: [
    { date: '11-11', name: 'יום הרווקים / Black Friday', vibe: 'דילים, הזדמנויות, קניות' },
    { date: '11-27', name: 'Black Friday', vibe: 'מכירות, דילים, הרצה' },
  ],
  12: [
    { date: '12-15', name: 'חנוכה (משתנה)', vibe: 'אור, נרות, משפחה, סופגניות' },
    { date: '12-25', name: 'כריסמס', vibe: 'חגיגה כללית, אווירה חורפית' },
    { date: '12-31', name: 'סילבסטר', vibe: 'מסיבה, סיכום שנה, התחלות' },
  ],
};

// Fetch Israel trending topics (unofficial — scrapes Google Trends RSS)
async function fetchIsraelTrends(): Promise<string[]> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch('https://trends.google.com/trending/rss?geo=IL', {
      signal: ctrl.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 MarketingBot/1.0' },
    });
    clearTimeout(timer);
    if (!r.ok) return [];
    const xml = await r.text();
    // Parse <title> entries inside <item>
    const titles: string[] = [];
    const itemRegex = /<item>[\s\S]*?<title><!\[CDATA\[(.*?)\]\]><\/title>/g;
    let match;
    while ((match = itemRegex.exec(xml)) && titles.length < 10) {
      const t = match[1].trim();
      if (t) titles.push(t);
    }
    return titles;
  } catch { return []; }
}

app.post('/api/calendars/generate', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  try {
    const { business_id, year, month, posts_count = 10 } = req.body;
    if (!business_id) return res.status(400).json({ error: 'business_id required' });

    // Get business
    const { data: biz, error: bizErr } = await sb.from('businesses').select('*').eq('id', business_id).single();
    if (bizErr || !biz) return res.status(404).json({ error: 'Business not found' });

    // Get Claude key
    const { data: keys } = await sb.from('user_api_keys').select('key_name, key_value').limit(20);
    const keyMap: Record<string, string> = {};
    for (const k of (keys || [])) keyMap[k.key_name] = k.key_value;
    const claudeKey = keyMap.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';
    if (!claudeKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });

    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || (new Date().getMonth() + 1); // 1-12

    // Get recent posts for this business (to avoid repetition)
    const { data: recentPosts } = await sb
      .from('content_posts')
      .select('content, created_at')
      .eq('business_name', biz.name)
      .order('created_at', { ascending: false })
      .limit(20);

    // Get events for the month
    const events = ISRAELI_EVENTS[targetMonth] || [];

    // Build prompt
    const viContext = biz.visual_identity ? `\nזהות ויזואלית: ${biz.visual_identity.slice(0, 500)}` : '';
    const toneContext = biz.tone ? `\nטון: ${biz.tone}` : '';
    const audienceContext = biz.target_audience ? `\nקהל יעד: ${biz.target_audience}` : '';
    const scanAnalysis = biz.scan_result && Object.keys(biz.scan_result).length > 0
      ? `\nתובנות ממותג: ${JSON.stringify(biz.scan_result).slice(0, 800)}`
      : '';
    // Knowledge Base — business documents (mentions prices, services, FAQs, etc.)
    const kbContent = await getBizKnowledgeBase(sb, business_id, 15_000);
    const kbContext = kbContent ? `\n\n📚 ידע על העסק (מסמכים שהועלו — השתמש בפרטים קונקרטיים מתוכם!):${kbContent}` : '';
    const recentTitles = recentPosts?.length
      ? recentPosts.slice(0, 10).map(p => `- ${(p.content || '').split('\n')[0].slice(0, 80)}`).join('\n')
      : '(אין היסטוריה)';
    const eventsText = events.length
      ? events.map(e => `- ${e.date}: ${e.name} (${e.vibe})`).join('\n')
      : '(אין אירועים מיוחדים)';

    // Fetch Israel trending topics for timely content
    const trends = await fetchIsraelTrends();
    const trendsText = trends.length
      ? '\n\n🔥 טרנדים חמים בישראל היום (שקול לשלב פוסט אחד שמתייחס באופן יצירתי לאחד מהם, אם רלוונטי לעסק):\n' + trends.slice(0, 8).map(t => `- ${t}`).join('\n')
      : '';

    const prompt = `אתה מתכנן תוכן לעסק "${biz.name}". תאריך עברי: ${targetMonth}/${targetYear}.

פרטי העסק:
- שם: ${biz.name}
- תיאור: ${biz.description || 'N/A'}
- אתר: ${biz.url || 'N/A'}${toneContext}${audienceContext}${viContext}${scanAnalysis}${kbContext}

פוסטים אחרונים (אל תחזור על אותו נושא!):
${recentTitles}

אירועים בחודש ${targetMonth}:
${eventsText}${trendsText}

צור לוח תוכן חודשי עם ${posts_count} פוסטים מגוונים. כלול סוגים שונים:
- 📢 הצגת שירות/מוצר (לא יותר מ-2)
- 📚 תוכן חינוכי/טיפים
- 💬 עדויות או סיפורים
- 🎬 אחורי הקלעים
- ❓ שאלה לקהילה / אינטראקציה
- 🎉 קישור לאירוע/חג אם רלוונטי
- 💡 תובנה/מחשבה
- 🌟 הישג/מעמד חדש

לכל פוסט בחר media_type בהתאם לנושא:
- "video" — לכ-20-30% מהפוסטים, במיוחד ל: אחורי הקלעים, תהליך, דמו, אירועים חיים, תנועה/אקשן. סרטונים קצרים 8 שניות, אנכיים.
- "image" — ברירת מחדל, לתוכן סטטי (ציטוטים, הצגה, עדויות, חגים, טיפים ויזואליים).

⚠️ חשוב מאוד — visual_concept חייב להיות **סצנה קונקרטית של ${biz.name}** עם אנשים/אובייקטים אמיתיים!
- ❌ לא: "סמל שאלה עם כדורים מחוברים", "אייקונים מופשטים", "רקע גיאומטרי", "גרפיקה מטאפורית"
- ✅ כן: "מנחה חידון מחזיק מיקרופון מול קהל של 50 אנשים בבימה מוארת", "מסך גדול עם שאלות חידון, קבוצות שחקנים מקפיצים ידיים", "עובדים יושבים סביב שולחן לונג עם טאבלטים, צוחקים על תשובה"
- כל visual_concept חייב להזכיר: מי (אנשים אמיתיים), איפה (מקום מזוהה), מה עושים (פעולה קונקרטית), תאורה/mood.

החזר JSON בלבד, ללא שום טקסט לפני או אחרי:
{"posts":[{"day":1,"theme":"theme short","type":"תוכן חינוכי","media_type":"image","angle":"הזווית/הנקודה","caption_short":"משפט פתיחה מושך","hook":"הוק ראשון","visual_concept":"סצנה קונקרטית — מי, איפה, מה עושים","rationale":"למה עכשיו"}, ...]}

day — מספר היום בחודש (1-28). שמור על מרווחים הגיוניים (לא 2 פוסטים באותו יום). השתמש בימי שני-חמישי יותר מימי שישי-שבת.`;

    const raw = await callClaude(prompt, claudeKey, 4000);
    let calendar: any = { posts: [] };
    try {
      let clean = raw.replace(/```json\n?|```/g, '').trim();
      const firstBrace = clean.indexOf('{');
      const lastBrace = clean.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        clean = clean.slice(firstBrace, lastBrace + 1);
      }
      calendar = JSON.parse(clean);
    } catch (e: any) {
      return res.status(500).json({ error: 'Claude returned invalid JSON', details: e.message, raw: raw.slice(0, 500) });
    }

    // Enrich posts with actual dates
    const enrichedPosts = (calendar.posts || []).map((p: any) => {
      const day = Math.min(Math.max(1, Number(p.day) || 1), 28);
      const date = new Date(targetYear, targetMonth - 1, day, 10, 0, 0);
      return { ...p, date: date.toISOString(), day };
    });

    res.json({
      business: { id: biz.id, name: biz.name, color: biz.color },
      year: targetYear,
      month: targetMonth,
      events,
      trends,
      posts: enrichedPosts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create actual posts from approved calendar
app.post('/api/calendars/approve', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  try {
    const { business_id, posts: calendarPosts } = req.body;
    if (!business_id || !Array.isArray(calendarPosts)) {
      return res.status(400).json({ error: 'business_id and posts array required' });
    }

    const { data: biz } = await sb.from('businesses').select('*').eq('id', business_id).single();
    if (!biz) return res.status(404).json({ error: 'Business not found' });

    // Get Claude key for expanding posts
    const { data: keys } = await sb.from('user_api_keys').select('key_name, key_value').limit(20);
    const keyMap: Record<string, string> = {};
    for (const k of (keys || [])) keyMap[k.key_name] = k.key_value;
    const claudeKey = keyMap.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY || '';

    // Get KB context once
    const kbContent = claudeKey ? await getBizKnowledgeBase(sb, business_id, 10_000) : '';
    // Build cached business context (10 calls × same biz = 90% savings)
    const cachedSystem = buildBusinessContext(biz, kbContent);

    // Determine scheduling: prefer business schedule slots if enabled
    const schedule = biz.schedule || {};
    const slotDays: number[] = schedule.days || [];
    const slotTimes: string[] = schedule.times || [];
    const useBizSlots = schedule.enabled && slotDays.length > 0 && slotTimes.length > 0;

    // Get already-taken slots (existing scheduled posts for this biz)
    const { data: existingScheduled } = await sb
      .from('content_posts')
      .select('scheduled_at')
      .eq('business_name', biz.name)
      .not('scheduled_at', 'is', null)
      .is('published_at', null);
    const takenSlots = new Set((existingScheduled || []).map((p: any) => new Date(p.scheduled_at).toISOString()));

    const created: any[] = [];
    for (const cp of calendarPosts) {
      let scheduledAt = cp.date;
      if (useBizSlots) {
        // Snap to next business slot ≥ desired date
        const desired = new Date(cp.date);
        for (let d = 0; d < 60; d++) {
          const day = new Date(desired); day.setDate(day.getDate() + d);
          if (!slotDays.includes(day.getDay())) continue;
          for (const t of slotTimes) {
            const [h, m] = t.split(':').map(Number);
            const slot = new Date(day); slot.setHours(h, m, 0, 0);
            if (slot < new Date()) continue;
            if (takenSlots.has(slot.toISOString())) continue;
            scheduledAt = slot.toISOString();
            takenSlots.add(scheduledAt);
            d = 999; break;
          }
        }
      }

      // Expand calendar brief into FULL post via Claude
      let content = '';
      let hashtags: string[] = [];
      if (claudeKey) {
        try {
          const expandPrompt = `Write a Facebook post in HEBREW based on this brief (stay ON-THEME):

TOPIC (must stay faithful to this!): ${cp.theme}
POST TYPE: ${cp.type}
HOOK (use as inspiration, feel free to rephrase): "${cp.hook}"
ANGLE/POINT: ${cp.angle || ''}
GOAL: ${cp.rationale || ''}

🚫 FORBIDDEN:
- Changing the topic. If topic is "Independence Day" — post MUST be about Independence Day.
- Inventing facts/prices/services not in the knowledge base above.
- First person singular ("אני").

✅ REQUIRED:
- First person plural ("אנחנו") — see guidelines above.
- 3-6 lines, structured: strong opening → content → CTA/question.
- Use real info from the business knowledge base where relevant.
- Max 2 emojis.

Return ONLY JSON: {"content": "full post text in Hebrew", "hashtags": ["#tag1", "#tag2", "#tag3"]}`;
          const raw = await callClaudeWithCache(cachedSystem, expandPrompt, claudeKey, 800);
          let clean = raw.replace(/```json\n?|```/g, '').trim();
          const fb = clean.indexOf('{'); const lb = clean.lastIndexOf('}');
          if (fb >= 0 && lb > fb) clean = clean.slice(fb, lb + 1);
          const parsed = JSON.parse(clean);
          content = (parsed.content || '').trim();
          hashtags = Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 5) : [];
        } catch {}
      }

      // Fallback if Claude expansion fails
      if (!content) {
        content = [cp.hook || cp.caption_short, '', cp.angle || ''].filter(Boolean).join('\n');
      }

      const row: any = {
        platform: 'פייסבוק',
        type: cp.type || 'פוסט קצר',
        content,
        hashtags: hashtags.length > 0 ? hashtags : null,
        business_id: biz.id,
        business_name: biz.name,
        scheduled_at: scheduledAt,
        status: 'draft',
        image_prompt: cp.visual_concept || null,
        motion_prompt: cp.media_type === 'video' ? (cp.visual_concept || null) : null,
        performance: {
          calendar_meta: { theme: cp.theme, rationale: cp.rationale, type: cp.type, media_type: cp.media_type || 'image' }
        },
      };
      if (req.userId) row.user_id = req.userId;
      const { data: newPost, error } = await sb.from('content_posts').insert(row).select().single();
      if (error) { created.push({ error: error.message, theme: cp.theme }); continue; }
      created.push({ id: newPost.id, theme: cp.theme, scheduled_at: scheduledAt });
    }

    res.json({ message: `Created ${created.filter(c => !c.error).length} posts`, created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// AUTO MEDIA GEN — Generate image for a specific post
// ══════════════════════════════════════════════════════════════

app.post('/api/posts/:id/generate-media', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  try {
    const postId = req.params.id;
    // Get post + business
    const { data: post, error: postErr } = await sb.from('content_posts').select('*').eq('id', postId).single();
    if (postErr || !post) return res.status(404).json({ error: 'Post not found' });

    const { data: biz } = await sb.from('businesses').select('*').eq('name', post.business_name).single();

    // Skip if already has media
    if (post.image_url || post.video_url) {
      return res.json({ ok: true, skipped: true, reason: 'already has media', url: post.image_url || post.video_url });
    }

    const claudeKey = await getUserKey(sb, req.userId, 'ANTHROPIC_API_KEY');
    const geminiKey = await getUserKey(sb, req.userId, 'GEMINI_API_KEY');
    if (!geminiKey) return res.status(503).json({ error: 'GEMINI_API_KEY not set' });

    // 1. Enhance prompt with Claude (using visual identity)
    const topic = post.image_prompt || (post.content || '').slice(0, 300);
    const vi = biz?.visual_identity || '';
    const bizDescription = biz?.description || '';
    const bizName = biz?.name || '';
    const enhancedPrompt = claudeKey
      ? await (async () => {
          const claudeMessage = `You are directing a REALISTIC, PHOTOJOURNALISTIC image for a Facebook post.

BUSINESS: ${bizName} — ${bizDescription}

BRAND LOOK (style guide only — colors/mood/aesthetic):
"""
${vi || 'Warm, professional photography.'}
"""

POST TOPIC / VISUAL BRIEF:
"""
${topic}
"""

⚠️ CRITICAL RULES:
1. Generate a PHOTOREALISTIC scene showing ACTUAL people performing ACTUAL activities related to ${bizName}.
2. ❌ FORBIDDEN: abstract concepts, symbolic imagery, floating spheres, icons, geometric shapes, question marks as objects, infographic-style layouts, 3D renders of metaphors, glowing orbs, hexagonal grids.
3. ✅ REQUIRED: Describe a SPECIFIC scene like a photographer would — who is in frame, what they're doing, where (real location), lighting, mood, camera angle.
4. If the topic is abstract ("community question", "insights"), invent a REAL SCENE that captures the feeling — e.g. "group of 40 people sitting in a circle at a corporate event, smiling and raising hands" NOT "floating question mark with connected spheres".
5. Match brand mood/colors but AVOID brand metaphors.
6. NO text, NO typography, NO logos.
7. Single paragraph, 70-120 words, in English.

Output ONLY the image prompt description (no explanations):`;
          try { return (await callClaude(claudeMessage, claudeKey, 600)).trim(); }
          catch { return topic; }
        })()
      : topic;

    // 2. Generate N image variants via Gemini (default 3)
    const numVariants = Math.min(Math.max(Number(req.query.variants || req.body?.variants || 3), 1), 4);
    const TIMEOUT = 50_000;

    async function generateOne(seed: number): Promise<{ base64: string | null; contentType: string; error: string }> {
      let lastError = '';
      // Add slight variation to prompt for diversity
      const promptWithSeed = seed > 0 ? `${enhancedPrompt}\n\n(variation ${seed + 1}: slightly different angle/composition)` : enhancedPrompt;
      const models = ['gemini-3-pro-image-preview', 'gemini-2.5-flash-image'];
      for (const model of models) {
        try {
          const ac = new AbortController();
          const timer = setTimeout(() => ac.abort(), TIMEOUT);
          const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ac.signal,
            body: JSON.stringify({
              contents: [{ parts: [{ text: promptWithSeed }] }],
              generationConfig: { responseModalities: ['IMAGE'] },
            }),
          });
          clearTimeout(timer);
          const d = await r.json();
          if (d.error) { lastError = `${model}: ${d.error.message}`; continue; }
          const parts = d.candidates?.[0]?.content?.parts || [];
          const imgPart = parts.find((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
          if (imgPart) return { base64: imgPart.inlineData.data, contentType: imgPart.inlineData.mimeType, error: '' };
          lastError = `${model}: no image`;
        } catch (err: any) {
          lastError = `${model}: ${err.name === 'AbortError' ? 'timeout' : err.message}`;
        }
      }
      // Fallback: Imagen
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), TIMEOUT);
        const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${geminiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ac.signal,
          body: JSON.stringify({
            instances: [{ prompt: promptWithSeed }],
            parameters: { sampleCount: 1, aspectRatio: '1:1' },
          }),
        });
        clearTimeout(timer);
        const d = await r.json();
        const bytes = d.predictions?.[0]?.bytesBase64Encoded;
        if (bytes) return { base64: bytes, contentType: 'image/png', error: '' };
        lastError += ` | imagen: ${d.error?.message || 'no image'}`;
      } catch (err: any) { lastError += ` | imagen: ${err.message}`; }
      return { base64: null, contentType: 'image/png', error: lastError };
    }

    // Generate in parallel
    const results = await Promise.all(
      Array.from({ length: numVariants }, (_, i) => generateOne(i))
    );
    const successful = results.filter(r => r.base64);
    if (successful.length === 0) {
      return res.status(500).json({ error: 'All variants failed', details: results[0]?.error });
    }

    // Upload all successful variants to Storage
    await sb.storage.createBucket('media', { public: true }).catch(() => {});
    const uploaded: string[] = [];
    for (let i = 0; i < successful.length; i++) {
      const r = successful[i];
      const buffer = Buffer.from(r.base64!, 'base64');
      const ext = r.contentType.includes('jpeg') || r.contentType.includes('jpg') ? 'jpg' : 'png';
      const fileName = `media/${post.user_id || 'anon'}/${Date.now()}-${postId}-v${i + 1}.${ext}`;
      const { error: upErr } = await sb.storage.from('media').upload(fileName, buffer, { contentType: r.contentType, upsert: true });
      if (upErr) continue;
      const { data: urlData } = sb.storage.from('media').getPublicUrl(fileName);
      uploaded.push(urlData.publicUrl);
    }

    if (uploaded.length === 0) {
      return res.status(500).json({ error: 'All uploads failed' });
    }

    // Save: first as primary, rest in image_variants
    await sb.from('content_posts').update({
      image_url: uploaded[0],
      image_prompt: enhancedPrompt,
      image_variants: uploaded,
    }).eq('id', postId);

    res.json({
      ok: true,
      url: uploaded[0],
      variants: uploaded,
      count: uploaded.length,
      prompt: enhancedPrompt,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate video for a specific post (Veo)
app.post('/api/posts/:id/generate-video', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  try {
    const postId = req.params.id;
    const { data: post, error: postErr } = await sb.from('content_posts').select('*').eq('id', postId).single();
    if (postErr || !post) return res.status(404).json({ error: 'Post not found' });
    const { data: biz } = await sb.from('businesses').select('*').eq('name', post.business_name).single();

    if (post.video_url) return res.json({ ok: true, skipped: true, url: post.video_url });

    const claudeKey = await getUserKey(sb, req.userId, 'ANTHROPIC_API_KEY');
    const geminiKey = await getUserKey(sb, req.userId, 'GEMINI_API_KEY');
    if (!geminiKey) return res.status(503).json({ error: 'GEMINI_API_KEY not set' });

    const topic = post.motion_prompt || post.image_prompt || (post.content || '').slice(0, 200);
    const vi = biz?.visual_identity || '';

    // Enhance prompt for video (describes motion + scene)
    let enhancedPrompt = topic;
    if (claudeKey) {
      try {
        const bizNameV = biz?.name || '';
        const bizDescV = biz?.description || '';
        const claudeMessage = `Direct a REALISTIC 8-second vertical 9:16 Veo video for a Facebook post.

BUSINESS: ${bizNameV} — ${bizDescV}

BRAND LOOK (style guide):
"""
${vi || 'Warm, professional cinematography.'}
"""

VIDEO TOPIC / BRIEF:
"""
${topic}
"""

⚠️ CRITICAL RULES:
1. PHOTOREALISTIC scene with REAL PEOPLE performing REAL activities related to ${bizNameV}.
2. ❌ FORBIDDEN: abstract visuals, floating symbols, icons, geometric animations, metaphorical shapes, 3D renders of concepts.
3. ✅ REQUIRED: Specific people in specific location, one clear action that unfolds over 8 seconds, natural camera movement (slow push-in / handheld / static / slow pan), realistic lighting.
4. If topic is abstract, invent a REAL SCENE — e.g. "camera slowly pushes in on a host with microphone standing before a cheering crowd, hands raising in the air" NOT "abstract question mark floating with glowing orbs".
5. NO text overlays, NO typography.
6. 60-120 words, single paragraph, English.

Output ONLY the video prompt:`;
        enhancedPrompt = (await callClaude(claudeMessage, claudeKey, 600)).trim();
      } catch {}
    }

    const aspectRatio = '9:16';
    const durationSeconds = 8;
    const veoModels = ['veo-3.1-generate-preview', 'veo-3.1-lite-generate-preview', 'veo-3.0-generate-001'];

    let videoUrl: string | null = null;
    let lastError = '';
    const TIMEOUT = 55_000;

    for (const model of veoModels) {
      if (videoUrl) break;
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), TIMEOUT);
        // Submit generation
        const startR = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:predictLongRunning?key=${geminiKey}`,
          {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            signal: ac.signal,
            body: JSON.stringify({
              instances: [{ prompt: enhancedPrompt }],
              parameters: { aspectRatio, durationSeconds, sampleCount: 1 },
            }),
          }
        );
        clearTimeout(timer);
        const startD = await startR.json();
        if (startD.error) { lastError = `${model} start: ${startD.error.message}`; continue; }
        const opName = startD.name;
        if (!opName) { lastError = `${model}: no operation`; continue; }

        // Poll for completion
        const pollDeadline = Date.now() + 250_000; // ~4 min budget
        while (Date.now() < pollDeadline) {
          await new Promise(r => setTimeout(r, 5000));
          const pR = await fetch(`https://generativelanguage.googleapis.com/v1beta/${opName}?key=${geminiKey}`);
          const pD = await pR.json();
          if (pD.error) { lastError = `${model} poll: ${pD.error.message}`; break; }
          if (pD.done) {
            const video = pD.response?.generateVideoResponse?.generatedSamples?.[0]?.video;
            const videoUri = video?.uri;
            if (videoUri) {
              // Download video → upload to storage
              const vR = await fetch(`${videoUri}&key=${geminiKey}`);
              const buffer = Buffer.from(await vR.arrayBuffer());
              const fileName = `media/${post.user_id || 'anon'}/${Date.now()}-${postId}.mp4`;
              await sb.storage.createBucket('media', { public: true }).catch(() => {});
              const { error: upErr } = await sb.storage.from('media').upload(fileName, buffer, { contentType: 'video/mp4', upsert: true });
              if (upErr) { lastError = `${model} upload: ${upErr.message}`; break; }
              const { data: urlData } = sb.storage.from('media').getPublicUrl(fileName);
              videoUrl = urlData.publicUrl;
            } else {
              lastError = `${model}: no video in response`;
            }
            break;
          }
        }
      } catch (err: any) {
        lastError = `${model}: ${err.name === 'AbortError' ? 'timeout' : err.message}`;
      }
    }

    if (!videoUrl) return res.status(500).json({ error: 'Video generation failed', details: lastError });

    await sb.from('content_posts').update({
      video_url: videoUrl,
      motion_prompt: enhancedPrompt,
    }).eq('id', postId);

    res.json({ ok: true, url: videoUrl, prompt: enhancedPrompt });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// KNOWLEDGE BASE — Per-business documents
// ══════════════════════════════════════════════════════════════

// Upload a text document (or extract from PDF base64)
app.post('/api/documents', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  try {
    const { business_id, title, content, file_type, category, pdf_base64 } = req.body;
    if (!business_id || !title) return res.status(400).json({ error: 'business_id and title required' });

    let finalContent = content || '';
    let finalType = file_type || 'text';

    // PDF extraction
    if (pdf_base64) {
      try {
        const pdfParse = (await import('pdf-parse')).default;
        const buf = Buffer.from(pdf_base64.replace(/^data:[^;]+;base64,/, ''), 'base64');
        const parsed = await pdfParse(buf);
        finalContent = parsed.text || '';
        finalType = 'pdf';
      } catch (e: any) {
        return res.status(400).json({ error: 'PDF extraction failed: ' + e.message });
      }
    }

    if (!finalContent || finalContent.length < 10) {
      return res.status(400).json({ error: 'Content is empty or too short' });
    }

    // Cap content at 60K chars to avoid blowing up prompts
    const truncated = finalContent.slice(0, 60_000);

    const row: any = {
      business_id,
      title,
      content: truncated,
      file_type: finalType,
      size_bytes: Buffer.byteLength(truncated, 'utf8'),
      category: category || null,
    };
    if (req.userId) row.user_id = req.userId;

    const { data, error } = await sb.from('business_documents').insert(row).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true, document: { id: data.id, title: data.title, size_bytes: data.size_bytes, file_type: data.file_type } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List documents for a business
app.get('/api/documents', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);
  const { business_id } = req.query;
  if (!business_id) return res.status(400).json({ error: 'business_id required' });
  const { data } = await sb
    .from('business_documents')
    .select('id, title, file_type, size_bytes, category, created_at')
    .eq('business_id', business_id)
    .order('created_at', { ascending: false });
  res.json(data || []);
});

// Delete a document
app.delete('/api/documents/:id', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const { error } = await sb.from('business_documents').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
});

// Helper: get KB context for a business (to include in prompts)
async function getBizKnowledgeBase(sb: any, businessId: string, maxChars = 20000): Promise<string> {
  const { data: docs } = await sb
    .from('business_documents')
    .select('title, content, category')
    .eq('business_id', businessId)
    .order('created_at', { ascending: false });
  if (!docs?.length) return '';
  let combined = '';
  for (const d of docs) {
    const chunk = `\n---\n📄 ${d.title}${d.category ? ` [${d.category}]` : ''}:\n${d.content}\n`;
    if ((combined + chunk).length > maxChars) break;
    combined += chunk;
  }
  return combined;
}

// ══════════════════════════════════════════════════════════════
// CRON — Weekly summary email report
// ══════════════════════════════════════════════════════════════

async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  // Option 1: Gmail SMTP (simpler for end users — just needs App Password)
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPass) {
    try {
      const nodemailer = (await import('nodemailer')).default;
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user: gmailUser, pass: gmailPass },
      });
      await transporter.sendMail({
        from: `"Marketing AI" <${gmailUser}>`,
        to, subject, html,
      });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: 'Gmail: ' + e.message };
    }
  }

  // Option 2: Resend (fallback)
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    try {
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: process.env.RESEND_FROM || 'Marketing AI <onboarding@resend.dev>',
          to: [to], subject, html,
        }),
      });
      const d = await r.json();
      if (r.ok && d.id) return { ok: true };
      return { ok: false, error: d.message || `HTTP ${r.status}` };
    } catch (e: any) { return { ok: false, error: e.message }; }
  }

  return { ok: false, error: 'No email provider configured (need GMAIL_USER+GMAIL_APP_PASSWORD or RESEND_API_KEY)' };
}

app.get('/api/cron/weekly-report', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  try {
    const testOnly = req.query.test === '1';
    const toEmail = req.query.to || process.env.REPORT_EMAIL || '';
    if (!toEmail) return res.status(400).json({ error: 'REPORT_EMAIL not set (or provide ?to=)' });

    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const weekAgoIso = weekAgo.toISOString();

    // Aggregate data
    const { data: businesses } = await sb.from('businesses').select('id, name, color, icon, schedule');
    const bizList = businesses || [];

    const { data: published } = await sb
      .from('content_posts')
      .select('id, business_name, content, published_at, fb_post_id, image_url, video_url')
      .gte('published_at', weekAgoIso)
      .order('published_at', { ascending: false });

    const { data: scheduled } = await sb
      .from('content_posts')
      .select('id, business_name, content, scheduled_at')
      .not('scheduled_at', 'is', null)
      .is('published_at', null)
      .gte('scheduled_at', new Date().toISOString())
      .lte('scheduled_at', new Date(Date.now() + 7 * 86400000).toISOString());

    const { data: attention } = await sb
      .from('comment_replies')
      .select('id, business_name, commenter_name, original_text, sentiment_label, created_at, fb_post_id')
      .eq('needs_attention', true)
      .gte('created_at', weekAgoIso);

    const { data: replied } = await sb
      .from('comment_replies')
      .select('id, business_name')
      .eq('status', 'replied')
      .gte('created_at', weekAgoIso);

    // Metrics from post_metrics table
    const postIds = (published || []).map(p => p.fb_post_id).filter(Boolean);
    let totalLikes = 0, totalComments = 0, totalShares = 0;
    if (postIds.length > 0) {
      const { data: metrics } = await sb
        .from('post_metrics')
        .select('post_id, likes, comments, shares, date')
        .in('post_id', postIds)
        .gte('date', weekAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });
      // Sum the most recent metric per post
      const seen = new Set<string>();
      for (const m of (metrics || [])) {
        if (seen.has(m.post_id)) continue;
        seen.add(m.post_id);
        totalLikes += m.likes || 0;
        totalComments += m.comments || 0;
        totalShares += m.shares || 0;
      }
    }

    // Top post
    const topPost = (published || [])[0];

    // AI insights — Claude analyzes the week's data and gives 3 actionable recommendations
    let aiInsights: any[] = [];
    const claudeKeyReport = await getUserKey(sb, null, 'ANTHROPIC_API_KEY');
    if (claudeKeyReport && (published?.length || 0) + (replied?.length || 0) > 0) {
      try {
        const analysisData = {
          published_count: published?.length || 0,
          scheduled_count: scheduled?.length || 0,
          replied_count: replied?.length || 0,
          attention_count: attention?.length || 0,
          total_engagement: totalLikes + totalComments + totalShares,
          top_post_text: (topPost?.content || '').slice(0, 200),
          businesses: bizList.map((b: any) => ({
            name: b.name,
            published: (published || []).filter(p => p.business_name === b.name).length,
            has_schedule: !!b.schedule?.enabled,
            has_auto_reply: !!b.schedule?.auto_reply_enabled,
          })),
          attention_samples: (attention || []).slice(0, 3).map(a => ({
            biz: a.business_name, sentiment: a.sentiment_label, text: (a.original_text || '').slice(0, 100),
          })),
        };
        const insightPrompt = `אתה יועץ שיווק מנוסה. קיבלת את נתוני השבוע האחרון של פלטפורמת שיווק לעסקים. הפק 3 תובנות פעילות (actionable) בעברית:

נתונים:
${JSON.stringify(analysisData, null, 2)}

לכל תובנה:
1. כותרת קצרה (3-5 מילים) — מתחילה באימוג'י
2. הסבר של 2-3 שורות
3. פעולה קונקרטית להמשך ("מומלץ ש...")

החזר JSON בלבד: {"insights": [{"emoji_title":"💡 כותרת","analysis":"ההסבר","action":"הפעולה"}, ...]}`;
        const raw = await callClaude(insightPrompt, claudeKeyReport, 1000);
        let clean = raw.replace(/```json\n?|```/g, '').trim();
        const fb = clean.indexOf('{'); const lb = clean.lastIndexOf('}');
        if (fb >= 0 && lb > fb) clean = clean.slice(fb, lb + 1);
        const parsed = JSON.parse(clean);
        aiInsights = Array.isArray(parsed.insights) ? parsed.insights.slice(0, 3) : [];
      } catch {}
    }

    // Build HTML
    const bizSummary = bizList.map((b: any) => {
      const bizPubs = (published || []).filter(p => p.business_name === b.name);
      const bizAttn = (attention || []).filter(a => a.business_name === b.name);
      return { name: b.name, icon: b.icon || '🏢', color: b.color || '#3B82F6', published: bizPubs.length, attention: bizAttn.length };
    });

    const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>דוח שבועי</title>
</head>
<body style="font-family: -apple-system, 'Segoe UI', Arial, sans-serif; background:#f5f5f7; margin:0; padding:20px; color:#1d1d1f;">
<div style="max-width:640px; margin:0 auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 1px 3px rgba(0,0,0,0.1);">
  <div style="background:linear-gradient(135deg,#8B5CF6,#3B82F6); padding:32px 28px; color:#fff;">
    <h1 style="margin:0 0 6px; font-size:22px; font-weight:700;">📊 הדוח השבועי שלך</h1>
    <div style="opacity:0.9; font-size:13px;">${new Date(weekAgo).toLocaleDateString('he-IL',{day:'numeric',month:'short'})} — ${new Date().toLocaleDateString('he-IL',{day:'numeric',month:'short'})}</div>
  </div>

  <div style="padding:24px 28px;">
    <!-- Stats grid -->
    <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:10px; margin-bottom:24px;">
      <div style="background:#f5f3ff; border-radius:10px; padding:14px;">
        <div style="color:#8B5CF6; font-size:24px; font-weight:700;">${published?.length || 0}</div>
        <div style="color:#666; font-size:12px;">📡 פוסטים שפורסמו</div>
      </div>
      <div style="background:#eff6ff; border-radius:10px; padding:14px;">
        <div style="color:#3B82F6; font-size:24px; font-weight:700;">${scheduled?.length || 0}</div>
        <div style="color:#666; font-size:12px;">⏰ מתוזמנים לשבוע הבא</div>
      </div>
      <div style="background:#ecfdf5; border-radius:10px; padding:14px;">
        <div style="color:#10B981; font-size:24px; font-weight:700;">${replied?.length || 0}</div>
        <div style="color:#666; font-size:12px;">💬 מענים אוטומטיים</div>
      </div>
      <div style="background:${attention?.length ? '#fef2f2' : '#f9fafb'}; border-radius:10px; padding:14px;">
        <div style="color:${attention?.length ? '#EF4444' : '#666'}; font-size:24px; font-weight:700;">${attention?.length || 0}</div>
        <div style="color:#666; font-size:12px;">🚨 דורש התייחסות</div>
      </div>
    </div>

    <!-- Engagement -->
    ${(totalLikes + totalComments + totalShares > 0) ? `
    <div style="background:#f9fafb; border-radius:10px; padding:16px; margin-bottom:20px;">
      <div style="font-size:13px; font-weight:600; margin-bottom:10px; color:#333;">💥 מעורבות השבוע</div>
      <div style="display:flex; gap:16px; flex-wrap:wrap;">
        <div style="flex:1; min-width:80px;"><div style="color:#1877F2; font-size:18px; font-weight:700;">👍 ${totalLikes}</div><div style="color:#666; font-size:10px;">לייקים</div></div>
        <div style="flex:1; min-width:80px;"><div style="color:#10B981; font-size:18px; font-weight:700;">💬 ${totalComments}</div><div style="color:#666; font-size:10px;">תגובות</div></div>
        <div style="flex:1; min-width:80px;"><div style="color:#F59E0B; font-size:18px; font-weight:700;">🔄 ${totalShares}</div><div style="color:#666; font-size:10px;">שיתופים</div></div>
      </div>
    </div>` : ''}

    <!-- AI Insights -->
    ${aiInsights.length > 0 ? `
    <div style="background:linear-gradient(135deg,#8B5CF608,#3B82F608); border:1px solid #8B5CF633; border-radius:12px; padding:18px; margin-bottom:20px;">
      <div style="color:#8B5CF6; font-size:14px; font-weight:700; margin-bottom:12px;">🧠 תובנות השבוע מ-Claude</div>
      ${aiInsights.map(ins => `
        <div style="background:#fff; border-radius:10px; padding:12px; margin-bottom:8px; box-shadow:0 1px 2px rgba(0,0,0,0.04);">
          <div style="font-size:13px; font-weight:700; color:#1d1d1f; margin-bottom:6px; direction:rtl;">${ins.emoji_title || '💡 תובנה'}</div>
          <div style="font-size:12px; color:#444; line-height:1.5; margin-bottom:8px; direction:rtl;">${ins.analysis || ''}</div>
          <div style="font-size:12px; color:#8B5CF6; font-weight:600; direction:rtl; padding-top:6px; border-top:1px solid #f0f0f0;">👉 ${ins.action || ''}</div>
        </div>
      `).join('')}
    </div>` : ''}

    <!-- Attention needed -->
    ${attention?.length ? `
    <div style="background:#fef2f2; border:2px solid #fecaca; border-radius:10px; padding:16px; margin-bottom:20px;">
      <div style="color:#EF4444; font-size:14px; font-weight:700; margin-bottom:10px;">🚨 ${attention.length} תגובות דורשות את תשומת ליבך</div>
      ${attention.slice(0, 5).map(a => `
        <div style="background:#fff; border-radius:8px; padding:10px 12px; margin-bottom:6px;">
          <div style="font-size:11px; color:#666; margin-bottom:3px;">${a.business_name} · ${a.commenter_name || 'משתמש'} · <span style="color:#EF4444;">${a.sentiment_label}</span></div>
          <div style="font-size:13px; direction:rtl;">${(a.original_text || '').slice(0, 120)}</div>
          ${a.fb_post_id ? `<a href="https://facebook.com/${a.fb_post_id}" style="color:#1877F2; font-size:11px; text-decoration:none;">צפה בפייסבוק ↗</a>` : ''}
        </div>
      `).join('')}
    </div>` : ''}

    <!-- Businesses -->
    <div style="margin-bottom:20px;">
      <div style="font-size:13px; font-weight:600; margin-bottom:10px; color:#333;">🏢 לפי עסק</div>
      ${bizSummary.map(b => `
        <div style="background:#f9fafb; border-right:4px solid ${b.color}; border-radius:8px; padding:10px 12px; margin-bottom:6px; display:flex; justify-content:space-between; align-items:center;">
          <div style="font-size:13px; font-weight:600;">${b.icon} ${b.name}</div>
          <div style="font-size:11px; color:#666;">${b.published} פוסטים${b.attention ? ` · <span style="color:#EF4444;">${b.attention} התראות</span>` : ''}</div>
        </div>
      `).join('')}
    </div>

    <!-- Top post -->
    ${topPost ? `
    <div style="margin-bottom:20px;">
      <div style="font-size:13px; font-weight:600; margin-bottom:10px; color:#333;">⭐ פוסט אחרון שפורסם</div>
      <div style="background:#f9fafb; border-radius:10px; padding:14px; display:flex; gap:12px;">
        ${topPost.image_url ? `<img src="${topPost.image_url}" style="width:80px; height:80px; object-fit:cover; border-radius:8px; flex-shrink:0;">` : ''}
        <div style="flex:1; min-width:0;">
          <div style="font-size:11px; color:#666; margin-bottom:4px;">${topPost.business_name} · ${new Date(topPost.published_at).toLocaleString('he-IL',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</div>
          <div style="font-size:13px; direction:rtl; line-height:1.5;">${(topPost.content || '').split('\n')[0].slice(0, 150)}</div>
          ${topPost.fb_post_id ? `<a href="https://facebook.com/${topPost.fb_post_id}" style="color:#1877F2; font-size:11px; text-decoration:none; display:inline-block; margin-top:6px;">צפה בפייסבוק ↗</a>` : ''}
        </div>
      </div>
    </div>` : ''}

    <div style="text-align:center; padding-top:20px; border-top:1px solid #eee;">
      <a href="https://dashboard-steel-delta-52.vercel.app" style="display:inline-block; background:linear-gradient(135deg,#8B5CF6,#3B82F6); color:#fff; padding:12px 24px; border-radius:10px; text-decoration:none; font-weight:600; font-size:13px;">פתח את הדשבורד ←</a>
    </div>
  </div>

  <div style="background:#f5f5f7; padding:16px 28px; font-size:11px; color:#999; text-align:center;">
    🤖 דוח אוטומטי שנוצר על ידי Claude · כל יום ראשון בבוקר
  </div>
</div>
</body>
</html>`;

    if (testOnly) {
      return res.json({ preview: true, to: toEmail, html_length: html.length, stats: { published: published?.length || 0, scheduled: scheduled?.length || 0, replied: replied?.length || 0, attention: attention?.length || 0 } });
    }

    const sendResult = await sendEmail(toEmail, `📊 דוח שבועי — ${new Date().toLocaleDateString('he-IL')}`, html);
    if (!sendResult.ok) return res.status(500).json({ error: sendResult.error });

    res.json({ ok: true, sent_to: toEmail, stats: { published: published?.length || 0, scheduled: scheduled?.length || 0, replied: replied?.length || 0, attention: attention?.length || 0 } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate YouTube Shorts metadata (title, description, tags) for a post
app.post('/api/posts/:id/youtube-export', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  try {
    const { data: post } = await sb.from('content_posts').select('*').eq('id', req.params.id).single();
    if (!post) return res.status(404).json({ error: 'Post not found' });
    if (!post.video_url) return res.status(400).json({ error: 'Post has no video to export' });

    const claudeKey = await getUserKey(sb, req.userId, 'ANTHROPIC_API_KEY');
    if (!claudeKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });

    const prompt = `Create YouTube Shorts metadata in HEBREW for this Facebook post. YT Shorts rules:
- Title: under 100 chars, punchy, uses trending words
- Description: first 2 lines visible in feed — hook + CTA. Can be longer.
- Tags: 5-10 short Hebrew/English keywords (no #)

Post content:
"""
${post.content}
"""

Business: ${post.business_name}

Return ONLY JSON:
{"title": "...", "description": "...", "tags": ["tag1","tag2",...]}`;

    const raw = await callClaude(prompt, claudeKey, 600);
    let parsed: any = {};
    try {
      let clean = raw.replace(/```json\n?|```/g, '').trim();
      const fb = clean.indexOf('{'); const lb = clean.lastIndexOf('}');
      if (fb >= 0 && lb > fb) clean = clean.slice(fb, lb + 1);
      parsed = JSON.parse(clean);
    } catch { parsed = { title: (post.content || '').split('\n')[0].slice(0, 95), description: post.content, tags: [] }; }

    res.json({
      ok: true,
      video_url: post.video_url,
      title: parsed.title,
      description: parsed.description,
      tags: parsed.tags || [],
      upload_url: 'https://youtube.com/upload',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Generate alternate text version of a post (A/B test variant)
app.post('/api/posts/:id/regenerate-content', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  try {
    const { data: post } = await sb.from('content_posts').select('*').eq('id', req.params.id).single();
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const { data: biz } = await sb.from('businesses').select('*').eq('name', post.business_name).single();
    const claudeKey = await getUserKey(sb, req.userId, 'ANTHROPIC_API_KEY');
    if (!claudeKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });

    const kbContent = await getBizKnowledgeBase(sb, biz?.id || '', 5000);
    const cachedSystem = buildBusinessContext(biz || {}, kbContent);

    const calendarMeta = post.performance?.calendar_meta || {};
    const variantPrompt = `Write an ALTERNATE VERSION of a Hebrew Facebook post — completely different angle and tone than the current version.

CURRENT VERSION:
"""
${post.content || ''}
"""

TOPIC: ${calendarMeta.theme || 'same as current'}

🎯 Goal: A/B test — create a version that uses a DIFFERENT approach:
- If current uses a question hook → try a story/statement opening
- If current is long → try concise punchy version (or vice versa)
- If current is formal → try more casual/playful (or vice versa)
- Different hook, different angle, different CTA phrasing

Return ONLY JSON: {"content": "alternate version in Hebrew", "hashtags": ["#tag1", "#tag2", "#tag3"], "angle_note": "1-line English note about what's different"}`;

    const raw = await callClaudeWithCache(cachedSystem, variantPrompt, claudeKey, 800);
    let parsed: any = {};
    try {
      let clean = raw.replace(/```json\n?|```/g, '').trim();
      const fb = clean.indexOf('{'); const lb = clean.lastIndexOf('}');
      if (fb >= 0 && lb > fb) clean = clean.slice(fb, lb + 1);
      parsed = JSON.parse(clean);
    } catch (e: any) {
      return res.status(500).json({ error: 'Claude JSON parse failed', raw: raw.slice(0, 200) });
    }

    // Store current content as a variant, promote new one
    const existingVariants = Array.isArray(post.content_variants) ? post.content_variants : [];
    const variants = [
      ...existingVariants,
      { content: post.content, hashtags: post.hashtags, created_at: post.created_at, label: 'previous' }
    ].slice(-3); // keep last 3 only

    await sb.from('content_posts').update({
      content: parsed.content,
      hashtags: parsed.hashtags || post.hashtags,
      content_variants: variants,
      performance: { ...(post.performance || {}), alternate_angle_note: parsed.angle_note || '' },
    }).eq('id', req.params.id);

    res.json({ ok: true, content: parsed.content, hashtags: parsed.hashtags, angle_note: parsed.angle_note, previous_variants_count: variants.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Select a previous content variant as the current content
app.post('/api/posts/:id/use-variant', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  try {
    const { content, hashtags } = req.body;
    if (!content) return res.status(400).json({ error: 'content required' });

    const { data: post } = await sb.from('content_posts').select('content, hashtags, content_variants').eq('id', req.params.id).single();
    if (!post) return res.status(404).json({ error: 'Post not found' });

    // Swap: current becomes a variant, selected variant becomes current
    const existingVariants = Array.isArray(post.content_variants) ? post.content_variants : [];
    const variants = [
      ...existingVariants.filter((v: any) => v.content !== content), // remove the selected one from variants
      { content: post.content, hashtags: post.hashtags, label: 'swapped_out' }
    ].slice(-3);

    await sb.from('content_posts').update({
      content,
      hashtags: hashtags || post.hashtags,
      content_variants: variants,
    }).eq('id', req.params.id);

    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Select a different variant as the primary image
app.post('/api/posts/:id/select-variant', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  try {
    const { variant_url } = req.body;
    if (!variant_url) return res.status(400).json({ error: 'variant_url required' });
    const { error } = await sb.from('content_posts').update({ image_url: variant_url }).eq('id', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ ok: true });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Batch endpoint: find all scheduled posts missing media and return their IDs
app.get('/api/posts/pending-media', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.json({ posts: [] });
  const { data } = await sb
    .from('content_posts')
    .select('id, business_name, content, scheduled_at, image_prompt')
    .not('scheduled_at', 'is', null)
    .is('published_at', null)
    .is('image_url', null)
    .is('video_url', null)
    .order('scheduled_at', { ascending: true })
    .limit(50);
  res.json({ posts: data || [] });
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

        // Also publish to Instagram if connected
        let igPostId: string | null = null;
        const igTokens = biz?.social?.instagram?.tokens;
        if (igTokens?.META_IG_ACCOUNT_ID && mediaUrl) {
          try {
            const igAcct = igTokens.META_IG_ACCOUNT_ID;
            const igToken = igTokens.META_ACCESS_TOKEN;

            // Instagram requires 2-step: create container, then publish
            const containerBody: any = { caption: message, access_token: igToken };
            if (isVideo) {
              containerBody.media_type = 'REELS';
              containerBody.video_url = mediaUrl;
            } else {
              containerBody.image_url = mediaUrl;
            }

            const containerR = await fetch(
              `https://graph.facebook.com/v25.0/${igAcct}/media`,
              { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(containerBody) }
            );
            const containerD = await containerR.json();
            if (!containerD.error && containerD.id) {
              // For videos wait for container to be ready (polling)
              if (isVideo) {
                const deadline = Date.now() + 120_000;
                while (Date.now() < deadline) {
                  await new Promise(rs => setTimeout(rs, 3000));
                  const statusR = await fetch(`https://graph.facebook.com/v25.0/${containerD.id}?fields=status_code&access_token=${igToken}`);
                  const statusD = await statusR.json();
                  if (statusD.status_code === 'FINISHED') break;
                  if (statusD.status_code === 'ERROR') break;
                }
              }
              const publishR = await fetch(
                `https://graph.facebook.com/v25.0/${igAcct}/media_publish`,
                { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ creation_id: containerD.id, access_token: igToken }) }
              );
              const publishD = await publishR.json();
              if (!publishD.error && publishD.id) igPostId = publishD.id;
              else r.ig_error = publishD.error?.message || 'publish failed';
            } else {
              r.ig_error = containerD.error?.message || 'container failed';
            }
          } catch (e: any) { r.ig_error = e.message; }
        }

        await sb.from('content_posts').update({
          status: 'published',
          fb_post_id: fbPostId,
          published_at: now,
          performance: { ...(post.performance || {}), ig_post_id: igPostId },
        }).eq('id', post.id);
        r.ok = true;
        r.fb_post_id = fbPostId;
        if (igPostId) r.ig_post_id = igPostId;
      } catch (e: any) {
        r.error = e.message;
      }
      results.push(r);
    }

    const published = results.filter(x => x.ok).length;
    const igPublished = results.filter(x => x.ig_post_id).length;
    res.json({ message: `Published ${published}/${due.length}${igPublished ? ` (${igPublished} also on IG)` : ''}`, published, results });
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

            // 2.5. Sentiment + intent classification (one Claude call, cheap)
            let sentiment: any = { score: 0, label: 'neutral', needs_human: false, reason: '' };
            try {
              const sentPrompt = `סווג את התגובה הבאה. החזר JSON בלבד, ללא טקסט נוסף:
{"score": (-1 עד 1), "label": "positive"|"neutral"|"negative"|"complaint"|"question", "needs_human": true/false, "reason": "הסבר קצר"}

needs_human = true אם: תלונה, דרישת ריפאנד, שאלה קריטית על מחיר/זמינות, איום משפטי, תגובה שלילית חריפה, שאלה שחייבת מענה אנושי ולא אוטומטי.

תגובה: "${comment.message}"

JSON:`;
              const sentRaw = await callClaude(sentPrompt, claudeKey, 200);
              let clean = sentRaw.replace(/```json\n?|```/g, '').trim();
              const fb = clean.indexOf('{'); const lb = clean.lastIndexOf('}');
              if (fb >= 0 && lb > fb) clean = clean.slice(fb, lb + 1);
              sentiment = JSON.parse(clean);
            } catch {}

            // Skip auto-reply if sentiment analysis flags it for human
            if (sentiment.needs_human || sentiment.score < -0.3 || sentiment.label === 'complaint') {
              await sb.from('comment_replies').insert({
                fb_comment_id: comment.id,
                fb_post_id: post.id,
                business_name: biz.name,
                commenter_name: comment.from?.name || null,
                commenter_id: comment.from?.id || null,
                original_text: comment.message,
                reply_text: null,
                status: 'pending_review',
                skip_reason: sentiment.reason || 'needs human attention',
                sentiment_score: sentiment.score,
                sentiment_label: sentiment.label,
                needs_attention: true,
              });
              r.checked++;
              continue;
            }

            // 3. Generate reply with Claude
            const bizContext = [
              biz.name ? `שם העסק: ${biz.name}` : '',
              biz.description ? `תיאור: ${biz.description}` : '',
              biz.tone ? `טון: ${biz.tone}` : '',
              biz.schedule?.auto_reply_personality ? `הנחיות מיוחדות למענה: ${biz.schedule.auto_reply_personality}` : '',
            ].filter(Boolean).join('\n');

            // KB context — for accurate answers on prices, services, etc.
            const kbForReply = await getBizKnowledgeBase(sb, biz.id, 8_000);
            const kbReplyContext = kbForReply ? `\n\n📚 מידע אמיתי על העסק (השתמש בנתונים מדויקים מכאן, אל תמציא!):${kbForReply}` : '';

            // WhatsApp CTA — for commerce/sales inquiries
            const waNumber = (biz.whatsapp_number || '').replace(/\D/g, '');
            const waContext = waNumber
              ? `\n\n💬 מספר וואטסאפ של העסק: ${waNumber}. אם השאלה כוללת בירור על מחיר/זמינות/הזמנה — כלול בסוף המענה לינק קצר לוואטסאפ בפורמט: wa.me/${waNumber} (מומלץ בטקסט "מוזמן/מוזמנת לכתוב לנו ב-wa.me/${waNumber}").`
              : '';

            const prompt = `אתה מנהל קהילה בעמוד העסק הזה. ענה לתגובה בעברית, בצורה חמה, אישית ותמציתית (עד 2 משפטים). אם השאלה כוללת בירור לגבי מחיר/זמינות — השתמש במידע מהמסמכים למטה אם יש, אחרת הצע ליצור קשר. אל תשתמש באימוג'ים מוגזמים (מקסימום 1). דבר בצורה טבעית — לא יותר מדי רשמית. אל תכלול האשטגים.

${bizContext}${kbReplyContext}${waContext}

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
                sentiment_score: sentiment.score,
                sentiment_label: sentiment.label,
                needs_attention: false,
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

// Mark a flagged comment as handled (so it stops appearing in alerts)
app.post('/api/replies/:id/handle', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const { error } = await sb.from('comment_replies').update({ needs_attention: false, status: 'handled' }).eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true });
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

// Claude call with system prompt caching (for expensive contexts like KB + visual_identity)
// Usage: cached "system" content (≥1024 tokens) is charged at 10% on subsequent calls within 5min
async function callClaudeWithCache(
  cachedSystem: string,
  userPrompt: string,
  apiKey: string,
  maxTokens = 1200
): Promise<string> {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system: [
        { type: 'text', text: cachedSystem, cache_control: { type: 'ephemeral' } }
      ],
      messages: [{ role: 'user', content: userPrompt }],
    }),
  });
  const d = await r.json();
  return d.content?.[0]?.text || '';
}

// Build a cacheable "business context" string — shared across many Claude calls per business
function buildBusinessContext(biz: any, kbContent: string = ''): string {
  return `BUSINESS PROFILE — cached context for ${biz.name}

Business name: ${biz.name}
Description: ${biz.description || 'N/A'}
URL: ${biz.url || 'N/A'}
Tone: ${biz.tone || 'warm, professional'}
Target audience: ${biz.target_audience || 'N/A'}

VISUAL IDENTITY (brand look):
"""
${biz.visual_identity || 'Professional, clean, modern brand.'}
"""

${biz.scan_result && Object.keys(biz.scan_result).length > 0 ? `BRAND INSIGHTS:\n${JSON.stringify(biz.scan_result)}\n\n` : ''}${kbContent ? `KNOWLEDGE BASE DOCUMENTS:\n${kbContent}\n\n` : ''}GUIDELINES:
- Always speak in first person plural ("אנחנו"), never singular ("אני")
- Reference real facts from the knowledge base — never invent prices/services
- Match the brand tone and visual identity
- Keep content specific and concrete, never generic`;
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
  const scopes = 'pages_manage_posts,pages_manage_engagement,pages_read_engagement,pages_show_list,pages_read_user_content,instagram_basic,instagram_content_publish,instagram_manage_insights';
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

    // Get user's pages with page access tokens + linked Instagram account
    const pagesResp = await fetch(
      `https://graph.facebook.com/v25.0/me/accounts?fields=id,name,access_token,category,instagram_business_account{id,username}&access_token=${longToken}`
    );
    const pagesData: any = await pagesResp.json();
    if (pagesData.error) throw new Error(pagesData.error.message);
    const pages = (pagesData.data || []).map((p: any) => ({
      id: p.id,
      name: p.name,
      token: p.access_token,
      category: p.category,
      instagram_id: p.instagram_business_account?.id || null,
      instagram_username: p.instagram_business_account?.username || null,
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
          // Auto-match: update business with FB page token + Instagram
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
          if (page.instagram_id) {
            social.instagram = {
              connected: true,
              accountId: page.instagram_id,
              username: page.instagram_username,
              tokens: {
                META_ACCESS_TOKEN: page.token, // same page token works for IG
                META_IG_ACCOUNT_ID: page.instagram_id,
              }
            };
          }
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
  const { businessId, pageId, pageName, pageToken, instagramId, instagramUsername } = req.body;
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
  if (instagramId) {
    social.instagram = {
      connected: true,
      accountId: instagramId,
      username: instagramUsername,
      tokens: {
        META_ACCESS_TOKEN: pageToken,
        META_IG_ACCOUNT_ID: instagramId,
      }
    };
  }
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

// ══════════════════════════════════════════════════════════════
// LANDING PAGES + LEAD CAPTURE
// ══════════════════════════════════════════════════════════════

// Public: get landing page config by slug
app.get('/api/landing/:slug', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const slug = req.params.slug.toLowerCase().replace(/[^a-z0-9-]/g, '');
  // Find business whose landing_page.slug matches
  const { data: all } = await sb.from('businesses').select('id,name,icon,color,description,landing_page');
  const biz = (all || []).find((b: any) => b.landing_page?.slug === slug);
  if (!biz || !biz.landing_page?.enabled) return res.status(404).json({ error: 'Landing page not found' });
  res.json({ id: biz.id, name: biz.name, icon: biz.icon || '🏢', color: biz.color || '#6C5CE7', description: biz.description || '', landing: biz.landing_page });
});

// Public: capture a lead
app.post('/api/leads', async (req, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const { business_id, business_name, name, phone, email, message, source, utm_source, utm_medium } = req.body;
  if (!business_id || !name) return res.status(400).json({ error: 'business_id and name required' });
  const { data, error } = await sb.from('leads').insert({
    business_id, business_name: business_name || null,
    name, phone: phone || null, email: email || null,
    message: message || null, source: source || 'landing_page',
    utm_source: utm_source || null, utm_medium: utm_medium || null,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ ok: true, id: data.id });
});

// Auth: list leads for a business
app.get('/api/leads', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.json([]);
  const { business_id } = req.query;
  if (!business_id) return res.status(400).json({ error: 'business_id required' });
  // Verify user owns this business
  let bizQ = sb.from('businesses').select('id').eq('id', business_id as string);
  if (req.userId) bizQ = bizQ.eq('user_id', req.userId);
  const { data: biz } = await bizQ.maybeSingle();
  if (!biz) return res.status(403).json({ error: 'Forbidden' });
  const { data, error } = await sb.from('leads').select('*').eq('business_id', business_id as string).order('created_at', { ascending: false }).limit(500);
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

// Auth: update lead status/notes
app.put('/api/leads/:id', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  const { status, notes } = req.body;
  const updates: any = {};
  if (status !== undefined) updates.status = status;
  if (notes !== undefined) updates.notes = notes;
  const { data, error } = await sb.from('leads').update(updates).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ══════════════════════════════════════════════════════════════
// SEO MINI-REPORT
// ══════════════════════════════════════════════════════════════

app.post('/api/seo-report/:business_id', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb) return res.status(503).json({ error: 'DB not configured' });
  try {
    let bizQ = sb.from('businesses').select('*').eq('id', req.params.business_id);
    if (req.userId) bizQ = bizQ.eq('user_id', req.userId);
    const { data: biz } = await bizQ.single();
    if (!biz) return res.status(404).json({ error: 'Business not found' });

    const claudeKey = await getUserKey(sb, req.userId, 'ANTHROPIC_API_KEY');
    if (!claudeKey) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });

    const kbContent = await getBizKnowledgeBase(sb, biz.id, 2000);
    const scanData = biz.scan_result || {};
    const competitorData = biz.competitor_analysis || '';

    const prompt = `You are a senior Israeli SEO consultant. Produce a practical Hebrew SEO mini-report for the following business.

Business: ${biz.name}
URL: ${biz.url || 'N/A'}
Industry: ${biz.industry || 'N/A'}
Description: ${biz.description || ''}
Scan summary: ${JSON.stringify(scanData).slice(0, 600)}
Knowledge base: ${kbContent.slice(0, 800)}
Competitor intel: ${typeof competitorData === 'string' ? competitorData.slice(0, 400) : JSON.stringify(competitorData).slice(0, 400)}

Return ONLY valid JSON (no markdown):
{
  "score": 65,
  "score_label": "בינוני",
  "score_color": "#F59E0B",
  "keywords": {
    "primary": ["מילה ראשית 1","מילה ראשית 2","מילה ראשית 3"],
    "long_tail": ["ביטוי ארוך 1","ביטוי ארוך 2","ביטוי ארוך 3"],
    "missing": ["הזדמנות 1","הזדמנות 2"]
  },
  "on_page": [
    {"issue":"תיאור בעיה","priority":"גבוה","fix":"מה לעשות"}
  ],
  "content_gaps": [
    {"topic":"נושא חסר","why":"למה חשוב","idea":"רעיון תוכן קונקרטי"}
  ],
  "quick_wins": ["פעולה מהירה 1","פעולה מהירה 2","פעולה מהירה 3"],
  "competitor_insight": "תובנה על המתחרים",
  "local_seo": "המלצה ספציפית ל-Local SEO"
}`;

    const raw = await callClaude(prompt, claudeKey, 1500);
    let clean = raw.replace(/```json\n?|```/g, '').trim();
    const fb = clean.indexOf('{'); const lb = clean.lastIndexOf('}');
    if (fb >= 0 && lb > fb) clean = clean.slice(fb, lb + 1);
    const report = JSON.parse(clean);

    // Cache on business
    await sb.from('businesses').update({
      scan_result: { ...(biz.scan_result || {}), seo_report: report, seo_report_at: new Date().toISOString() }
    }).eq('id', biz.id);

    res.json({ ok: true, report });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ══════════════════════════════════════════════════════════════
// GOOGLE BUSINESS PROFILE — OAuth + Publishing
// ══════════════════════════════════════════════════════════════

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GBP_REDIRECT = `${PROD_URL}/api/auth/google/callback`;

// Step 1: Start Google OAuth
app.get('/api/auth/google', (req: any, res) => {
  if (!GOOGLE_CLIENT_ID) return res.status(503).json({ error: 'GOOGLE_CLIENT_ID not configured' });
  const state = Buffer.from(JSON.stringify({ userId: req.userId || 'anon', bizId: req.query.business_id || '' })).toString('base64');
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GBP_REDIRECT,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/business.manage email profile',
    access_type: 'offline',
    prompt: 'consent',
    state,
  });
  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
});

// Step 2: Handle OAuth callback
app.get('/api/auth/google/callback', async (req, res) => {
  const { code, error: gErr, state } = req.query as any;
  if (gErr || !code) return res.redirect(`${PROD_URL}/#google-error=${encodeURIComponent(gErr || 'no_code')}`);
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return res.redirect(`${PROD_URL}/#google-error=not_configured`);

  let stateObj: any = {};
  try { stateObj = JSON.parse(Buffer.from(state as string, 'base64').toString()); } catch {}

  const sb = getSupabase();
  if (!sb) return res.redirect(`${PROD_URL}/#google-error=db_error`);
  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GBP_REDIRECT, grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json() as any;
    if (tokens.error) return res.redirect(`${PROD_URL}/#google-error=${encodeURIComponent(tokens.error)}`);

    const { access_token, refresh_token, expires_in } = tokens;
    const expires_at = new Date(Date.now() + (expires_in || 3600) * 1000).toISOString();

    const userId = stateObj.userId !== 'anon' ? stateObj.userId : null;
    if (userId) {
      await Promise.all([
        sb.from('user_api_keys').upsert({ user_id: userId, key_name: 'GOOGLE_ACCESS_TOKEN', key_value: access_token }, { onConflict: 'user_id,key_name' }),
        sb.from('user_api_keys').upsert({ user_id: userId, key_name: 'GOOGLE_TOKEN_EXPIRES_AT', key_value: expires_at }, { onConflict: 'user_id,key_name' }),
        ...(refresh_token ? [sb.from('user_api_keys').upsert({ user_id: userId, key_name: 'GOOGLE_REFRESH_TOKEN', key_value: refresh_token }, { onConflict: 'user_id,key_name' })] : []),
      ]);
    }

    // Get user profile
    const profRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', { headers: { Authorization: `Bearer ${access_token}` } });
    const profile = await profRes.json() as any;

    // List GBP accounts
    const accRes = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', { headers: { Authorization: `Bearer ${access_token}` } });
    const accData = await accRes.json() as any;
    const accounts = accData.accounts || [];

    // If bizId in state, store Google email on business social
    if (stateObj.bizId && userId) {
      const { data: biz } = await sb.from('businesses').select('social').eq('id', stateObj.bizId).maybeSingle();
      if (biz) {
        await sb.from('businesses').update({
          social: { ...(biz.social || {}), gbp: { connected: true, google_email: profile.email, account_count: accounts.length } }
        }).eq('id', stateObj.bizId);
      }
    }

    res.redirect(`${PROD_URL}/#google-connected=true&email=${encodeURIComponent(profile.email || '')}&accounts=${accounts.length}&bizId=${stateObj.bizId || ''}`);
  } catch (err: any) {
    res.redirect(`${PROD_URL}/#google-error=${encodeURIComponent(err.message)}`);
  }
});

// Helper: get valid Google access token (auto-refresh)
async function getGoogleToken(sb: any, userId: string): Promise<string | null> {
  try {
    const [{ data: atRow }, { data: rtRow }, { data: expRow }] = await Promise.all([
      sb.from('user_api_keys').select('key_value').eq('user_id', userId).eq('key_name', 'GOOGLE_ACCESS_TOKEN').maybeSingle(),
      sb.from('user_api_keys').select('key_value').eq('user_id', userId).eq('key_name', 'GOOGLE_REFRESH_TOKEN').maybeSingle(),
      sb.from('user_api_keys').select('key_value').eq('user_id', userId).eq('key_name', 'GOOGLE_TOKEN_EXPIRES_AT').maybeSingle(),
    ]);
    const accessToken = atRow?.key_value;
    const refreshToken = rtRow?.key_value;
    const expiresAt = expRow?.key_value;
    if (!accessToken) return null;
    // Valid if not expiring within 5 min
    if (expiresAt && new Date(expiresAt).getTime() > Date.now() + 300_000) return accessToken;
    if (!refreshToken || !GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return accessToken;
    // Refresh
    const r = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ refresh_token: refreshToken, client_id: GOOGLE_CLIENT_ID, client_secret: GOOGLE_CLIENT_SECRET, grant_type: 'refresh_token' }),
    });
    const t = await r.json() as any;
    if (t.access_token) {
      const newExp = new Date(Date.now() + (t.expires_in || 3600) * 1000).toISOString();
      await Promise.all([
        sb.from('user_api_keys').upsert({ user_id: userId, key_name: 'GOOGLE_ACCESS_TOKEN', key_value: t.access_token }, { onConflict: 'user_id,key_name' }),
        sb.from('user_api_keys').upsert({ user_id: userId, key_name: 'GOOGLE_TOKEN_EXPIRES_AT', key_value: newExp }, { onConflict: 'user_id,key_name' }),
      ]);
      return t.access_token;
    }
    return accessToken;
  } catch { return null; }
}

// Get GBP accounts + locations
app.get('/api/gbp/accounts', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb || !req.userId) return res.status(401).json({ error: 'Auth required' });
  const token = await getGoogleToken(sb, req.userId);
  if (!token) return res.status(400).json({ error: 'Google account not connected. Visit /api/auth/google to connect.' });
  try {
    const r = await fetch('https://mybusinessaccountmanagement.googleapis.com/v1/accounts', { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json() as any;
    if (data.error) return res.status(400).json({ error: data.error.message });
    const accounts = data.accounts || [];
    // Fetch locations for each account
    const enriched = await Promise.all(accounts.map(async (acc: any) => {
      try {
        const lr = await fetch(`https://mybusinessbusinessinformation.googleapis.com/v1/${acc.name}/locations?readMask=name,title,websiteUri`, { headers: { Authorization: `Bearer ${token}` } });
        const ld = await lr.json() as any;
        return { ...acc, locations: ld.locations || [] };
      } catch { return { ...acc, locations: [] }; }
    }));
    res.json({ accounts: enriched });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Assign GBP location to a business
app.post('/api/gbp/assign', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb || !req.userId) return res.status(401).json({ error: 'Auth required' });
  const { business_id, location_name } = req.body;
  if (!business_id || !location_name) return res.status(400).json({ error: 'business_id and location_name required' });
  const { data: biz } = await sb.from('businesses').select('social').eq('id', business_id).eq('user_id', req.userId).single();
  if (!biz) return res.status(404).json({ error: 'Business not found' });
  await sb.from('businesses').update({
    social: { ...(biz.social || {}), gbp: { ...(biz.social?.gbp || {}), location_name, connected: true } }
  }).eq('id', business_id);
  res.json({ ok: true });
});

// Get GBP reviews for a business
app.get('/api/gbp/reviews/:business_id', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb || !req.userId) return res.status(401).json({ error: 'Auth required' });
  const { data: biz } = await sb.from('businesses').select('social').eq('id', req.params.business_id).eq('user_id', req.userId).single();
  if (!biz) return res.status(404).json({ error: 'Business not found' });
  const locationName = biz.social?.gbp?.location_name;
  if (!locationName) return res.status(400).json({ error: 'GBP location not assigned to this business' });
  const token = await getGoogleToken(sb, req.userId);
  if (!token) return res.status(400).json({ error: 'Google account not connected' });
  try {
    const r = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/reviews?orderBy=updateTime%20desc&pageSize=20`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await r.json() as any;
    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json({ reviews: data.reviews || [], averageRating: data.averageRating });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Reply to a GBP review (or generate AI reply)
app.post('/api/gbp/reviews/reply', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb || !req.userId) return res.status(401).json({ error: 'Auth required' });
  const { review_name, reply_text, generate_ai } = req.body;
  if (!review_name) return res.status(400).json({ error: 'review_name required' });
  const token = await getGoogleToken(sb, req.userId);
  if (!token) return res.status(400).json({ error: 'Google account not connected' });

  let finalReply = reply_text;
  if (generate_ai && !finalReply) {
    const claudeKey = await getUserKey(sb, req.userId, 'ANTHROPIC_API_KEY');
    if (claudeKey) {
      const { review_text, star_rating, business_name } = req.body;
      const p = `Write a SHORT professional Hebrew reply (2-3 sentences max) to this Google Business Profile review.
Business: ${business_name || ''}. Rating: ${star_rating || '?'}/5. Review: "${review_text || ''}"
Rules: warm, professional, in Hebrew, no generic phrases, address the specific content, sign off naturally.
Return ONLY the reply text.`;
      finalReply = await callClaude(p, claudeKey, 200);
    }
  }
  if (!finalReply) return res.status(400).json({ error: 'reply_text required or generate_ai must be true' });

  try {
    const r = await fetch(`https://mybusiness.googleapis.com/v4/${review_name}/reply`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment: finalReply.trim() }),
    });
    const data = await r.json() as any;
    if (data.error) return res.status(400).json({ error: data.error.message });
    res.json({ ok: true, reply: finalReply });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Post to GBP local posts
app.post('/api/gbp/post/:business_id', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb || !req.userId) return res.status(401).json({ error: 'Auth required' });
  const { data: biz } = await sb.from('businesses').select('social,url').eq('id', req.params.business_id).eq('user_id', req.userId).single();
  if (!biz) return res.status(404).json({ error: 'Business not found' });
  const locationName = biz.social?.gbp?.location_name;
  if (!locationName) return res.status(400).json({ error: 'GBP location not assigned' });
  const token = await getGoogleToken(sb, req.userId);
  if (!token) return res.status(400).json({ error: 'Google account not connected' });
  const { content, post_id, cta_type = 'LEARN_MORE', cta_url, image_url } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  try {
    const postBody: any = { languageCode: 'he', summary: content.slice(0, 1500) };
    if (cta_url || biz.url) postBody.callToAction = { actionType: cta_type, url: cta_url || biz.url };
    if (image_url) postBody.media = [{ mediaFormat: 'PHOTO', sourceUrl: image_url }];
    const r = await fetch(`https://mybusiness.googleapis.com/v4/${locationName}/localPosts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(postBody),
    });
    const data = await r.json() as any;
    if (data.error) return res.status(400).json({ error: data.error.message });
    // Mark content post as GBP-posted
    if (post_id) {
      const { data: cp } = await sb.from('content_posts').select('performance').eq('id', post_id).single();
      await sb.from('content_posts').update({ performance: { ...(cp?.performance || {}), gbp_post_name: data.name, gbp_posted_at: new Date().toISOString() } }).eq('id', post_id);
    }
    res.json({ ok: true, gbp_post_name: data.name });
  } catch (err: any) { res.status(500).json({ error: err.message }); }
});

// Check Google connection status for logged-in user
app.get('/api/gbp/status', async (req: any, res) => {
  const sb = getSupabase();
  if (!sb || !req.userId) return res.json({ connected: false });
  const { data } = await sb.from('user_api_keys').select('key_value').eq('user_id', req.userId).eq('key_name', 'GOOGLE_ACCESS_TOKEN').maybeSingle();
  res.json({ connected: !!data?.key_value });
});

// ── Catch-all for unknown API routes ──
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

export default app;
