-- Create visitors table for visitor management
CREATE TABLE IF NOT EXISTS visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  visitor_phone TEXT,
  relation TEXT,
  purpose TEXT,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  is_overnight BOOLEAN DEFAULT FALSE,
  overnight_charge DECIMAL(10, 2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_visitors_owner_id ON visitors(owner_id);
CREATE INDEX IF NOT EXISTS idx_visitors_property_id ON visitors(property_id);
CREATE INDEX IF NOT EXISTS idx_visitors_tenant_id ON visitors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitors_check_in_time ON visitors(check_in_time DESC);

-- Enable Row Level Security
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- RLS Policies for visitors
CREATE POLICY "Users can view their own visitors"
  ON visitors FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create visitors"
  ON visitors FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own visitors"
  ON visitors FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own visitors"
  ON visitors FOR DELETE
  USING (auth.uid() = owner_id);
