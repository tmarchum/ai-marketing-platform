const DID_API_KEY = process.env.DID_API_KEY!;
const DID_BASE = 'https://api.d-id.com';

async function didPost(path: string, body: unknown): Promise<{ id: string }> {
  const r = await fetch(`${DID_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${DID_API_KEY}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`D-ID error: ${r.status} ${await r.text()}`);
  return r.json() as Promise<{ id: string }>;
}

async function pollTalk(id: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const r = await fetch(`${DID_BASE}/talks/${id}`, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${DID_API_KEY}:`).toString('base64')}`,
      },
    });
    const data = await r.json() as { status: string; result_url?: string; error?: string };
    if (data.status === 'done') return data.result_url!;
    if (data.status === 'error') throw new Error(`D-ID failed: ${data.error}`);
  }
  throw new Error('D-ID timeout');
}

export async function createTalk(avatarImageUrl: string, audioUrl: string): Promise<string> {
  const talk = await didPost('/talks', {
    source_url: avatarImageUrl,
    script: {
      type: 'audio',
      audio_url: audioUrl,
    },
    config: { fluent: true, stitch: true },
  });
  return pollTalk(talk.id);
}

export async function uploadAudioAndGetUrl(localPath: string): Promise<string> {
  const { createReadStream } = await import('fs');
  const FormData = (await import('form-data')).default;

  const form = new FormData();
  form.append('audio', createReadStream(localPath));

  const r = await fetch(`${DID_BASE}/audios`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${DID_API_KEY}:`).toString('base64')}`,
      ...form.getHeaders(),
    },
    // @ts-expect-error form-data stream
    body: form,
  });
  if (!r.ok) throw new Error(`D-ID audio upload error: ${r.status}`);
  const data = await r.json() as { url: string };
  return data.url;
}
