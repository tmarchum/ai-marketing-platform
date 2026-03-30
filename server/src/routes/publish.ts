import { Router } from 'express';
import { supabase } from '../db/supabase.js';
import { publishFacebookVideo, publishInstagramReel } from '../services/meta.js';
import { publishPost as publishWordPress } from '../services/wordpress.js';

const router = Router();

// POST /api/publish/:id
router.post('/:id', async (req, res) => {
  const { data: post, error } = await supabase
    .from('content_posts')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error || !post) return res.status(404).json({ error: 'Post not found' });

  try {
    let publishedId = '';
    const videoUrl = post.video_url || post.ugc_video_url;
    const caption = `${post.content}\n\n${post.hashtags.map((h: string) => `#${h}`).join(' ')}`;

    if (post.platform === 'פייסבוק' && videoUrl) {
      publishedId = await publishFacebookVideo(videoUrl, caption);
    } else if (post.platform === 'אינסטגרם' && videoUrl) {
      publishedId = await publishInstagramReel(videoUrl, caption);
    } else if (post.platform === 'בלוג SEO') {
      publishedId = await publishWordPress(post.content.split('\n')[0], post.content);
    }

    await supabase
      .from('content_posts')
      .update({ status: 'published', pipeline_status: { ...post.pipeline_status, meta_id: publishedId } })
      .eq('id', req.params.id);

    res.json({ published: true, id: publishedId });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
