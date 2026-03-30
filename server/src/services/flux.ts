const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN!;

export type AspectRatio = 'square' | 'portrait' | 'story' | 'landscape';

const DIMENSIONS: Record<AspectRatio, { width: number; height: number }> = {
  square:    { width: 1024, height: 1024 },   // Facebook 1:1
  portrait:  { width: 1024, height: 1280 },   // Instagram Feed 4:5
  story:     { width: 1080, height: 1920 },   // Story/Reel 9:16
  landscape: { width: 1280, height: 720  },   // Blog 16:9
};

async function replicatePost(url: string, body: unknown): Promise<unknown> {
  const r = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Replicate error: ${r.status} ${await r.text()}`);
  return r.json();
}

async function pollPrediction(id: string): Promise<string> {
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const r = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_API_TOKEN}` },
    });
    const data = await r.json() as { status: string; output: string | string[]; error?: string };
    if (data.status === 'succeeded') {
      return Array.isArray(data.output) ? data.output[0] : data.output;
    }
    if (data.status === 'failed') throw new Error(`Flux failed: ${data.error}`);
  }
  throw new Error('Flux timeout');
}

export async function generateImage(prompt: string, aspect: AspectRatio = 'square'): Promise<string> {
  const { width, height } = DIMENSIONS[aspect];
  const prediction = await replicatePost('https://api.replicate.com/v1/predictions', {
    version: 'black-forest-labs/flux-1.1-pro',
    input: {
      prompt,
      width,
      height,
      output_format: 'png',
      safety_tolerance: 2,
    },
  }) as { id: string };
  return pollPrediction(prediction.id);
}
