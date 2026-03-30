import fs from 'fs';
import path from 'path';
import os from 'os';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
// Hebrew-capable voice — Rachel or custom
const DEFAULT_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL';

export async function textToSpeech(text: string, voiceId = DEFAULT_VOICE_ID): Promise<string> {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
      Accept: 'audio/mpeg',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.8 },
    }),
  });

  if (!r.ok) throw new Error(`ElevenLabs error: ${r.status} ${await r.text()}`);

  const buffer = Buffer.from(await r.arrayBuffer());
  const tmpPath = path.join(os.tmpdir(), `ugc_audio_${Date.now()}.mp3`);
  fs.writeFileSync(tmpPath, buffer);
  return tmpPath;
}
