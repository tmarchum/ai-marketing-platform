const WP_URL = process.env.WORDPRESS_URL!;
const WP_PASS = process.env.WORDPRESS_APP_PASSWORD!;

function authHeader() {
  return `Basic ${Buffer.from(`admin:${WP_PASS}`).toString('base64')}`;
}

export async function publishPost(
  title: string,
  content: string,
  status: 'publish' | 'draft' | 'future' = 'publish',
  date?: string
): Promise<string> {
  const body: Record<string, unknown> = { title, content, status };
  if (date) body.date = date;

  const r = await fetch(`${WP_URL}/wp-json/wp/v2/posts`, {
    method: 'POST',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`WordPress error: ${r.status} ${await r.text()}`);
  const data = await r.json() as { id: number; link: string };
  return data.link;
}
