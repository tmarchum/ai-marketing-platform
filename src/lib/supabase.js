import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://dzhmubtgfjqqyzrvkufd.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6aG11YnRnZmpxcXl6cnZrdWZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4NTUsImV4cCI6MjA5MDYxNzg1NX0.zJfprlKxKZJcEVeyySa0YYklFtHE3o-ulKzAd3PszSM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper: fetch with auth token
export async function authFetch(url, options = {}) {
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
