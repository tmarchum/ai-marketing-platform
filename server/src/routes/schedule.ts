import { Router } from 'express';
import { supabase } from '../db/supabase.js';

const router = Router();

// POST /api/schedule
router.post('/', async (req, res) => {
  const { business_id, days, time, frequency } = req.body;
  const schedule = { days, time, frequency };

  const { data, error } = await supabase
    .from('businesses')
    .update({ schedule })
    .eq('id', business_id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/schedule/:business_id/upcoming
router.get('/:business_id/upcoming', async (req, res) => {
  const { data, error } = await supabase
    .from('content_posts')
    .select('*')
    .eq('business_id', req.params.business_id)
    .eq('status', 'scheduled')
    .order('scheduled_at', { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

export default router;
