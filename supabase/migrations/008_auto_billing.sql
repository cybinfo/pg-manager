-- Auto Billing Settings
-- Adds configuration for automated monthly bill generation

-- Add auto_billing_settings to owner_config
ALTER TABLE owner_config ADD COLUMN IF NOT EXISTS auto_billing_settings JSONB DEFAULT '{
  "enabled": false,
  "billing_day": 1,
  "due_day_offset": 10,
  "include_pending_charges": true,
  "auto_send_notification": true,
  "last_generated_month": null
}'::jsonb;

-- Add bill generation tracking
ALTER TABLE bills ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT FALSE;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS generated_at TIMESTAMPTZ;

-- Create bill_generation_log for tracking cron runs
CREATE TABLE IF NOT EXISTS bill_generation_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    for_month TEXT NOT NULL, -- "January 2025"
    bills_generated INTEGER DEFAULT 0,
    bills_failed INTEGER DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    error_details JSONB,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- Index for bill generation log
CREATE INDEX IF NOT EXISTS idx_bill_generation_log_owner ON bill_generation_log(owner_id);
CREATE INDEX IF NOT EXISTS idx_bill_generation_log_month ON bill_generation_log(for_month);

-- RLS for bill generation log
ALTER TABLE bill_generation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their bill generation logs" ON bill_generation_log
    FOR ALL USING (owner_id = auth.uid());

-- Function to get next bill number for auto-generation
CREATE OR REPLACE FUNCTION get_next_bill_number(p_owner_id UUID)
RETURNS TEXT AS $$
DECLARE
    bill_count INTEGER;
    current_year INTEGER;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);

    SELECT COUNT(*) + 1 INTO bill_count
    FROM bills
    WHERE owner_id = p_owner_id
    AND EXTRACT(YEAR FROM bill_date) = current_year;

    RETURN 'INV-' || current_year || '-' || LPAD(bill_count::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
