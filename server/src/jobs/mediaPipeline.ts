import { mediaPipelineQueue } from './queues.js';
import { supabase } from '../db/supabase.js';
import { buildImagePrompt, buildMotionPrompt } from '../services/claude.js';
import { generateImage } from '../services/flux.js';
import { imageToVideo } from '../services/runway.js';

function updateStatus(postId: string, stage: string, status: string) {
  return supabase
    .from('content_posts')
    .update({ pipeline_status: { stage, status, updatedAt: new Date().toISOString() } })
    .eq('id', postId);
}

async function uploadUrlToSupabase(url: string, path: string): Promise<string> {
  const r = await fetch(url);
  const buffer = Buffer.from(await r.arrayBuffer());
  const { data, error } = await supabase.storage
    .from('media')
    .upload(path, buffer, { upsert: true, contentType: 'image/png' });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('media').getPublicUrl(path);
  return publicUrl;
}

mediaPipelineQueue.process(async (job) => {
  const { post_id } = job.data as { post_id: string };

  const { data: post } = await supabase
    .from('content_posts')
    .select('*')
    .eq('id', post_id)
    .single();
  if (!post) throw new Error('Post not found');

  const { data: biz } = await supabase
    .from('businesses')
    .select('name')
    .eq('id', post.business_id)
    .single();

  // Stage 1 — Claude image prompt
  await updateStatus(post_id, 'image_prompt', 'running');
  const imagePrompt = post.image_prompt || await buildImagePrompt(post.content, biz?.name || '');

  // Stage 2 — Flux image
  await updateStatus(post_id, 'flux', 'running');
  const fluxUrl = await generateImage(imagePrompt);
  const imageUrl = await uploadUrlToSupabase(fluxUrl, `images/${post_id}.png`);
  await supabase.from('content_posts').update({ image_url: imageUrl }).eq('id', post_id);

  // Stage 3 — Claude motion prompt
  await updateStatus(post_id, 'motion_prompt', 'running');
  const motionPrompt = post.motion_prompt || await buildMotionPrompt(imagePrompt);

  // Stage 4 — Runway video
  await updateStatus(post_id, 'runway', 'running');
  const videoUrl = await imageToVideo(imageUrl, motionPrompt);
  await supabase.from('content_posts').update({ video_url: videoUrl }).eq('id', post_id);

  // Done
  await supabase.from('content_posts')
    .update({ pipeline_status: { stage: 'done', status: 'completed' }, status: 'approved' })
    .eq('id', post_id);

  return { post_id, imageUrl, videoUrl };
});

mediaPipelineQueue.on('failed', async (job, err) => {
  await supabase.from('content_posts')
    .update({ pipeline_status: { stage: 'error', status: 'failed', error: err.message } })
    .eq('id', job.data.post_id);
});
