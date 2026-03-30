import cron from 'node-cron';
import { supabase } from '../db/supabase.js';
import { mediaPipelineQueue, ugcPipelineQueue } from './queues.js';
import { publishFacebookVideo, publishInstagramReel } from '../services/meta.js';
import { analyzePerformance } from '../services/claude.js';

// Check every 5 minutes for posts due to be published
export function startScheduler() {
  cron.schedule('*/5 * * * *', async () => {
    const now = new Date();
    const { data: posts } = await supabase
      .from('content_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now.toISOString());

    if (!posts || posts.length === 0) return;

    for (const post of posts) {
      try {
        const videoUrl = post.video_url || post.ugc_video_url;
        const caption = `${post.content}\n\n${(post.hashtags as string[]).map(h => `#${h}`).join(' ')}`;

        if (post.platform === 'פייסבוק' && videoUrl) {
          await publishFacebookVideo(videoUrl, caption);
        } else if (post.platform === 'אינסטגרם' && videoUrl) {
          await publishInstagramReel(videoUrl, caption);
        }

        await supabase
          .from('content_posts')
          .update({ status: 'published' })
          .eq('id', post.id);
      } catch (err) {
        console.error(`[scheduler] failed to publish ${post.id}:`, err);
      }
    }
  });

  console.log('[scheduler] started — checking every 5 min');
}

// Token expiry warning — daily at 9:00
export function startTokenMonitor() {
  cron.schedule('0 9 * * *', async () => {
    const expiresAt = process.env.META_TOKEN_EXPIRES_AT;
    if (!expiresAt) return;
    const daysLeft = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 86400000);
    if (daysLeft <= 7) {
      console.warn(`[token] META_ACCESS_TOKEN expires in ${daysLeft} days!`);
    }
  });
}
