import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { scrapeUrl, buildBusinessProfile } from '../services/scraper.js';

const router = Router();

// GET /api/businesses
router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('businesses').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST /api/businesses
router.post('/', async (req, res) => {
  const { name, url, industry, target_audience, tone, goals } = req.body;
  const { data, error } = await supabase
    .from('businesses')
    .insert({ name, url, industry, target_audience, tone, goals })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/businesses/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

// POST /api/sources/scan
router.post('/scan', async (req, res) => {
  const { business_id, url, role } = req.body;
  try {
    const scraped = await scrapeUrl(url);
    const profile = await buildBusinessProfile(scraped);

    await supabase
      .from('businesses')
      .update({
        business_profile: profile,
        last_scanned: new Date().toISOString(),
      })
      .eq('id', business_id);

    res.json({ profile, scraped });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
