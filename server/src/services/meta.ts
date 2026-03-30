const META_BASE = 'https://graph.facebook.com/v19.0';

function token() {
  return process.env.META_ACCESS_TOKEN!;
}

// ── Facebook ─────────────────────────────────────────────────────────

export async function publishFacebookVideo(
  videoUrl: string,
  description: string,
  scheduledAt?: Date
): Promise<string> {
  const pageId = process.env.META_PAGE_ID!;
  const body: Record<string, unknown> = {
    file_url: videoUrl,
    description,
    published: !scheduledAt,
    access_token: token(),
  };
  if (scheduledAt) body.scheduled_publish_time = Math.floor(scheduledAt.getTime() / 1000);

  const r = await fetch(`${META_BASE}/${pageId}/videos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`Meta video error: ${r.status} ${await r.text()}`);
  const data = await r.json() as { id: string };
  return data.id;
}

// ── Instagram Reel ────────────────────────────────────────────────────

export async function publishInstagramReel(
  videoUrl: string,
  caption: string,
  scheduledAt?: Date
): Promise<string> {
  const igId = process.env.META_IG_USER_ID!;

  // Step 1 — create container
  const createBody: Record<string, unknown> = {
    media_type: 'REELS',
    video_url: videoUrl,
    caption,
    access_token: token(),
  };
  if (scheduledAt) {
    createBody.scheduled_publish_time = Math.floor(scheduledAt.getTime() / 1000);
    createBody.status = 'SCHEDULED';
  }

  const r1 = await fetch(`${META_BASE}/${igId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createBody),
  });
  if (!r1.ok) throw new Error(`IG create container error: ${r1.status} ${await r1.text()}`);
  const { id: containerId } = await r1.json() as { id: string };

  // Step 2 — poll until FINISHED
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 4000));
    const r2 = await fetch(
      `${META_BASE}/${containerId}?fields=status_code&access_token=${token()}`
    );
    const { status_code } = await r2.json() as { status_code: string };
    if (status_code === 'FINISHED') break;
    if (status_code === 'ERROR') throw new Error('IG container processing error');
  }

  // Step 3 — publish
  if (!scheduledAt) {
    const r3 = await fetch(`${META_BASE}/${igId}/media_publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ creation_id: containerId, access_token: token() }),
    });
    if (!r3.ok) throw new Error(`IG publish error: ${r3.status} ${await r3.text()}`);
    const { id } = await r3.json() as { id: string };
    return id;
  }
  return containerId;
}

// ── Insights ──────────────────────────────────────────────────────────

export async function getPostInsights(postId: string): Promise<Record<string, number>> {
  const metrics = 'reach,impressions,engagement_rate_by_impressions_unique,link_clicks';
  const r = await fetch(
    `${META_BASE}/${postId}/insights?metric=${metrics}&access_token=${token()}`
  );
  if (!r.ok) return {};
  const { data } = await r.json() as { data: { name: string; values: { value: number }[] }[] };
  return Object.fromEntries(data.map(m => [m.name, m.values[0]?.value ?? 0]));
}
