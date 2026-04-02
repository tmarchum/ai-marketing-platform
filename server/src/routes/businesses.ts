import { Router } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

// GET /api/businesses
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data ?? []);
});

// POST /api/businesses
router.post('/', async (req, res) => {
  const {
    name, url, industry, target_audience, tone, goals,
    icon, color, description, social, scan_result, full_scan_data,
    competitor_analysis, competitors, schedule, business_profile,
  } = req.body;

  const row: Record<string, any> = { name };
  if (url !== undefined) row.url = url;
  if (industry !== undefined) row.industry = industry;
  if (target_audience !== undefined) row.target_audience = target_audience;
  if (tone !== undefined) row.tone = tone;
  if (goals !== undefined) row.goals = goals;
  if (icon !== undefined) row.icon = icon;
  if (color !== undefined) row.color = color;
  if (description !== undefined) row.description = description;
  if (social !== undefined) row.social = social;
  if (scan_result !== undefined) row.scan_result = scan_result;
  if (full_scan_data !== undefined) row.full_scan_data = full_scan_data;
  if (competitor_analysis !== undefined) row.competitor_analysis = competitor_analysis;
  if (competitors !== undefined) row.competitors = competitors;
  if (schedule !== undefined) row.schedule = schedule;
  if (business_profile !== undefined) row.business_profile = business_profile;

  const { data, error } = await supabase
    .from('businesses')
    .insert(row)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// PUT /api/businesses/:id
router.put('/:id', async (req, res) => {
  const updates = { ...req.body };
  delete updates.id; // don't overwrite PK
  delete updates.created_at;

  const { data, error } = await supabase
    .from('businesses')
    .update(updates)
    .eq('id', req.params.id)
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

// POST /api/businesses/sync — bulk upsert from frontend localStorage data
router.post('/sync', async (req, res) => {
  const { businesses: items } = req.body;
  if (!Array.isArray(items)) return res.status(400).json({ error: 'businesses array required' });

  const results = [];
  for (const item of items) {
    const row: Record<string, any> = {
      name: item.name,
      url: item.url || null,
      icon: item.icon || null,
      color: item.color || null,
      description: item.description || null,
      social: item.social || {},
      scan_result: item.scanResult || null,
      full_scan_data: item.fullScanData || null,
      competitor_analysis: item.competitorAnalysis || null,
      business_profile: item.businessProfile || null,
    };

    // Try to find existing by name
    const { data: existing } = await supabase
      .from('businesses')
      .select('id')
      .eq('name', item.name)
      .maybeSingle();

    if (existing) {
      const { data, error } = await supabase
        .from('businesses')
        .update(row)
        .eq('id', existing.id)
        .select()
        .single();
      if (!error) results.push(data);
    } else {
      const { data, error } = await supabase
        .from('businesses')
        .insert(row)
        .select()
        .single();
      if (!error) results.push(data);
    }
  }
  res.json(results);
});

export default router;
