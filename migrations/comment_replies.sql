-- Auto-reply comment tracking
CREATE TABLE IF NOT EXISTS comment_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fb_comment_id text UNIQUE NOT NULL,
  fb_post_id text NOT NULL,
  business_name text,
  commenter_name text,
  commenter_id text,
  original_text text,
  reply_text text,
  reply_fb_id text,
  status text DEFAULT 'replied', -- replied | skipped | failed | pending_review
  skip_reason text,
  created_at timestamptz DEFAULT now(),
  user_id uuid
);

CREATE INDEX IF NOT EXISTS comment_replies_post_idx ON comment_replies(fb_post_id);
CREATE INDEX IF NOT EXISTS comment_replies_biz_idx ON comment_replies(business_name);
CREATE INDEX IF NOT EXISTS comment_replies_created_idx ON comment_replies(created_at DESC);
