import { Router } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

// ── Key testing ───────────────────────────────────────────────────

const KEY_TESTERS: Record<string, (val: string) => Promise<void>> = {
  ANTHROPIC_API_KEY: async (val) => {
    const r = await fetch('https://api.anthropic.com/v1/models', {
      headers: { 'x-api-key': val, 'anthropic-version': '2023-06-01' },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  },
  REPLICATE_API_TOKEN: async (val) => {
    const r = await fetch('https://api.replicate.com/v1/account', {
      headers: { Authorization: `Bearer ${val}` },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  },
  RUNWAYML_API_SECRET: async (val) => {
    const r = await fetch('https://api.dev.runwayml.com/v1/models', {
      headers: { Authorization: `Bearer ${val}`, 'X-Runway-Version': '2024-11-06' },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  },
  ELEVENLABS_API_KEY: async (val) => {
    const r = await fetch('https://api.elevenlabs.io/v1/user', {
      headers: { 'xi-api-key': val },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  },
  DID_API_KEY: async (val) => {
    const r = await fetch('https://api.d-id.com/credits', {
      headers: { Authorization: `Basic ${Buffer.from(`${val}:`).toString('base64')}` },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  },
  META_ACCESS_TOKEN: async (val) => {
    const r = await fetch(`https://graph.facebook.com/v19.0/me?access_token=${val}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
  },
  SUPABASE_URL: async (val) => {
    if (!val.startsWith('https://')) throw new Error('Must start with https://');
  },
  SUPABASE_SERVICE_KEY: async (val) => {
    if (!val.startsWith('eyJ')) throw new Error('Invalid Supabase key format');
  },
};

// POST /api/admin/test-key
router.post('/test-key', async (req, res) => {
  const { keyId, value } = req.body as { keyId: string; value: string };
  if (!value) return res.json({ ok: false, error: 'ריק' });

  const tester = KEY_TESTERS[keyId];
  if (!tester) return res.json({ ok: true }); // no tester — assume ok

  try {
    await tester(value);
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false, error: (err as Error).message });
  }
});

// ── Users (Supabase Auth) ─────────────────────────────────────────

// GET /api/admin/users
router.get('/users', async (_req, res) => {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) return res.status(500).json({ error: error.message });
  res.json(
    data.users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.user_metadata?.role || 'viewer',
      created_at: u.created_at,
      last_sign_in: u.last_sign_in_at,
    }))
  );
});

// POST /api/admin/users/invite
router.post('/users/invite', async (req, res) => {
  const { email, role } = req.body as { email: string; role: string };
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    data: { role },
  });
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.user.id, email });
});

// DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  const { error } = await supabase.auth.admin.deleteUser(req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ deleted: true });
});

export default router;
