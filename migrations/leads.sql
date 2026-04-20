-- Lead capture from landing pages
CREATE TABLE IF NOT EXISTS leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  business_name text,
  name text NOT NULL,
  phone text,
  email text,
  message text,
  source text DEFAULT 'landing_page',
  utm_source text,
  utm_medium text,
  status text DEFAULT 'new',  -- new | contacted | converted | closed
  notes text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS leads_business_idx ON leads(business_id);
CREATE INDEX IF NOT EXISTS leads_created_idx ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);

-- Landing page config stored on businesses table
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS landing_page jsonb DEFAULT '{}';
