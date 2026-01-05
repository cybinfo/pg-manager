-- Migration: Visitor Multi-Day Stay Support
-- Description: Add support for multi-day visitor stays with per-night charges and optional bill creation
-- ============================================

-- Add new columns for multi-day support
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS num_nights INTEGER DEFAULT 1;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS charge_per_night DECIMAL(10, 2);
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS expected_checkout_date DATE;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES bills(id) ON DELETE SET NULL;

-- Add comment for clarity
COMMENT ON COLUMN visitors.num_nights IS 'Number of nights for overnight stay (1 for single night)';
COMMENT ON COLUMN visitors.charge_per_night IS 'Per-night charge rate for overnight stays';
COMMENT ON COLUMN visitors.expected_checkout_date IS 'Expected checkout date for multi-day stays';
COMMENT ON COLUMN visitors.bill_id IS 'Optional bill created for visitor charges';

-- Update overnight_charge to be calculated field or total
COMMENT ON COLUMN visitors.overnight_charge IS 'Total overnight charge (num_nights * charge_per_night or custom amount)';

-- Create index for checkout tracking
CREATE INDEX IF NOT EXISTS idx_visitors_expected_checkout ON visitors(expected_checkout_date) WHERE expected_checkout_date IS NOT NULL;
