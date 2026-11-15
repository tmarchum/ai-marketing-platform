import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dzhmubtgfjqqyzrvkufd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6aG11YnRnZmpxcXl6cnZrdWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4NTUsImV4cCI6MjA5MDYxNzg1NX0.zJfprlKxKZJcEVeyySa0YYklFtHE3o-ulKzAd3PszSM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper: fetch with auth token
// Some networks/content filters answer "Access Denied" to API paths that end in
// an id (/api/owner/posts/<uuid>), which broke every save. Ids travel in the
// query string instead ("/~" placeholder + __p=<id>); the server puts them back.
const UUID_SEG = /\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?=\/|\?|$)/gi;
function hideIds(url) {
  if (typeof url !== 'string' || !url.startsWith('/api/')) return url;
  const ids = [];
  const u = url.replace(UUID_SEG, (_, id) => { ids.push(id); return '/~'; });
  return ids.length ? u + (u.includes('?') ? '&' : '?') + ids.map(i => '__p=' + i).join('&') : url;
}

export async function authFetch(url, options = {}) {
  url = hideIds(url);
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.body && !options.headers?.['Content-Type'] ? { 'Content-Type': 'application/json' } : {}),
    },
  });
}
