import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const MIGRATION_SQL = `
-- Add missing columns to businesses
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS icon text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS color text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS social jsonb DEFAULT '{}';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS scan_result jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS full_scan_data jsonb;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS competitor_analysis jsonb;

-- Add missing columns to content_posts
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS business_name text;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS fb_post_id text;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS published_at timestamptz;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS date_label text;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS media jsonb;
ALTER TABLE content_posts ADD COLUMN IF NOT EXISTS ugc jsonb;
`;

async function migrate() {
  console.log('[migrate] Running schema migration...');

  // Split and run each ALTER separately (Supabase RPC doesn't support multi-statement well)
  const statements = MIGRATION_SQL
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const sql of statements) {
    console.log('[migrate]', sql.slice(0, 60) + '...');
    const { error } = await supabase.rpc('exec_sql', { query: sql });
    if (error) {
      // Try raw REST approach
      console.log('[migrate] rpc failed, trying direct...');
      const resp = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.SUPABASE_SERVICE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_KEY!}`,
        },
        body: JSON.stringify({ query: sql }),
      });
      if (!resp.ok) {
        console.warn('[migrate] Warning:', await resp.text());
      }
    }
  }

  console.log('[migrate] Done!');
}

migrate().catch(console.error);
