import cron from 'node-cron';
import { supabase } from '../db/supabase.js';
import { analyzePerformance } from '../services/claude.js';

// Every Sunday at 08:00 — analyze last 20 posts per business
export function startLearningLoop() {
  cron.schedule('0 8 * * 0', async () => {
    console.log('[learning-loop] running weekly analysis');
    const { data: businesses } = await supabase.from('businesses').select('id, name');
    if (!businesses) return;

    for (const biz of businesses) {
      const { data: posts } = await supabase
        .from('content_posts')
        .select('platform, type, content, performance, ab_winner')
        .eq('business_id', biz.id)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(20);

      if (!posts || posts.length < 3) continue;

      try {
        const learnings = await analyzePerformance(posts as Record<string, unknown>[]);

        const { data: currentProfile } = await supabase
          .from('businesses')
          .select('business_profile')
          .eq('id', biz.id)
          .single();

        await supabase.from('businesses').update({
          business_profile: {
            ...(currentProfile?.business_profile || {}),
            learnings,
            learnings_updated_at: new Date().toISOString(),
          },
        }).eq('id', biz.id);

        console.log(`[learning-loop] updated learnings for ${biz.name}`);
      } catch (err) {
        console.error(`[learning-loop] error for ${biz.name}:`, err);
      }
    }
  });

  console.log('[learning-loop] scheduled — runs every Sunday 08:00');
}

// A/B test resolver — runs daily at midnight
export function startABResolver() {
  cron.schedule('0 0 * * *', async () => {
    const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

    const { data: pairs } = await supabase
      .from('content_posts')
      .select('id, ab_variant, performance, business_id')
      .eq('status', 'published')
      .is('ab_winner', null)
      .lte('created_at', cutoff);

    if (!pairs) return;

    // Group by business + date to find A/B pairs
    const map = new Map<string, typeof pairs>();
    for (const p of pairs) {
      const key = `${p.business_id}_${p.ab_variant}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }

    // Simple resolver: higher reach wins
    for (const [, group] of map) {
      const sorted = group.sort(
        (a, b) => ((b.performance as Record<string, number>)?.reach || 0) -
                  ((a.performance as Record<string, number>)?.reach || 0)
      );
      if (sorted[0]) {
        await supabase.from('content_posts').update({ ab_winner: true }).eq('id', sorted[0].id);
      }
    }
  });
}
