const RUNWAY_API_SECRET = process.env.RUNWAYML_API_SECRET!;
const RUNWAY_BASE = 'https://api.dev.runwayml.com/v1';

async function runwayPost(path: string, body: unknown): Promise<unknown> {
  const r = await fetch(`${RUNWAY_BASE}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RUNWAY_API_SECRET}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Runway error: ${r.status} ${await r.text()}`);
  return r.json();
}

async function pollTask(id: string): Promise<string> {
  for (let i = 0; i < 90; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const r = await fetch(`${RUNWAY_BASE}/tasks/${id}`, {
      headers: { Authorization: `Bearer ${RUNWAY_API_SECRET}`, 'X-Runway-Version': '2024-11-06' },
    });
    const data = await r.json() as { status: string; output?: string[]; error?: string };
    if (data.status === 'SUCCEEDED') return data.output![0];
    if (data.status === 'FAILED') throw new Error(`Runway failed: ${data.error}`);
  }
  throw new Error('Runway timeout');
}

export async function imageToVideo(imageUrl: string, motionPrompt: string, duration = 5): Promise<string> {
  const task = await runwayPost('/image_to_video', {
    model: 'gen3a_turbo',
    promptImage: imageUrl,
    promptText: motionPrompt,
    duration,
    ratio: '1280:768',
  }) as { id: string };
  return pollTask(task.id);
}
