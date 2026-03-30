import fs from 'fs';
import path from 'path';
import os from 'os';
import { ugcPipelineQueue } from './queues.js';
import { supabase } from '../db/supabase.js';
import { writeUGCScript } from '../services/claude.js';
import { textToSpeech } from '../services/elevenlabs.js';
import { createTalk, uploadAudioAndGetUrl } from '../services/did.js';

function updateStatus(postId: string, stage: string) {
  return supabase
    .from('content_posts')
    .update({ pipeline_status: { stage, status: 'running', updatedAt: new Date().toISOString() } })
    .eq('id', postId);
}

ugcPipelineQueue.process(async (job) => {
  const { post_id, avatar_image_url } = job.data as { post_id: string; avatar_image_url: string };

  const { data: post } = await supabase
    .from('content_posts')
    .select('*')
    .eq('id', post_id)
    .single();
  if (!post) throw new Error('Post not found');

  const { data: biz } = await supabase
    .from('businesses')
    .select('name, business_profile')
    .eq('id', post.business_id)
    .single();

  // Stage 1 — write UGC script
  await updateStatus(post_id, 'script');
  const script = post.ugc_script || await writeUGCScript(
    biz?.name || '',
    'דמות AI, 28, אמא צעירה, חמה',
    biz?.business_profile || {}
  );
  await supabase.from('content_posts').update({ ugc_script: script }).eq('id', post_id);

  // Stage 2 — ElevenLabs TTS
  await updateStatus(post_id, 'tts');
  const audioPath = await textToSpeech(script);

  // Stage 3 — Upload audio to D-ID, create talk
  await updateStatus(post_id, 'did');
  const audioUrl = await uploadAudioAndGetUrl(audioPath);
  const ugcVideoUrl = await createTalk(avatar_image_url, audioUrl);

  // Cleanup temp file
  try { fs.unlinkSync(audioPath); } catch { /* ignore */ }

  // Save to content_posts
  await supabase.from('content_posts')
    .update({
      ugc_video_url: ugcVideoUrl,
      pipeline_status: { stage: 'done', status: 'completed' },
    })
    .eq('id', post_id);

  // Save to ugc_videos table
  await supabase.from('ugc_videos').insert({
    business_id: post.business_id,
    avatar_image_url,
    script,
    audio_url: audioUrl,
    final_video_url: ugcVideoUrl,
  });

  return { post_id, ugcVideoUrl };
});

ugcPipelineQueue.on('failed', async (job, err) => {
  await supabase.from('content_posts')
    .update({ pipeline_status: { stage: 'error', status: 'failed', error: err.message } })
    .eq('id', job.data.post_id);
});
