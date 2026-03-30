-- AI Marketing Platform — Supabase Schema v3.0

-- businesses
create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  name text not null,
  url text,
  industry text,
  target_audience text,
  tone text check (tone in ('professional','casual','playful','inspiring')) default 'casual',
  goals jsonb default '{}',
  sources jsonb[] default '{}',
  competitors jsonb[] default '{}',
  schedule jsonb default '{}',
  business_profile jsonb default '{}',
  avatar_id text,
  last_scanned timestamptz,
  created_at timestamptz default now()
);

-- content_posts
create table if not exists content_posts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses on delete cascade,
  platform text not null,
  type text not null,
  content text not null,
  hashtags text[] default '{}',
  image_prompt text,
  motion_prompt text,
  ugc_script text,
  image_url text,
  video_url text,
  ugc_video_url text,
  pipeline_status jsonb default '{}',
  status text check (status in ('draft','approved','scheduled','published')) default 'draft',
  scheduled_at timestamptz,
  performance jsonb default '{}',
  ab_variant char(1),
  ab_winner boolean default false,
  created_at timestamptz default now()
);

-- ugc_videos
create table if not exists ugc_videos (
  id uuid primary key default gen_random_uuid(),
  business_id uuid references businesses on delete cascade,
  avatar_image_url text,
  script text,
  audio_url text,
  did_talk_id text,
  final_video_url text,
  meta_reel_id text,
  performance jsonb default '{}',
  created_at timestamptz default now()
);

-- Realtime
alter publication supabase_realtime add table content_posts;
