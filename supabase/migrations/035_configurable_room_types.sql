-- Migration 035: Configurable Room Types and Billing Cycle Mode
-- Allows owners to define custom room types and choose billing cycle alignment

-- Add room_types JSONB column to owner_config
ALTER TABLE owner_config
ADD COLUMN IF NOT EXISTS room_types JSONB DEFAULT '[
  {"code": "single", "name": "Single", "default_rent": 8000, "default_deposit": 8000, "is_enabled": true, "display_order": 1},
  {"code": "double", "name": "Double Sharing", "default_rent": 6000, "default_deposit": 6000, "is_enabled": true, "display_order": 2},
  {"code": "triple", "name": "Triple Sharing", "default_rent": 5000, "default_deposit": 5000, "is_enabled": true, "display_order": 3},
  {"code": "dormitory", "name": "Dormitory", "default_rent": 4000, "default_deposit": 4000, "is_enabled": false, "display_order": 4}
]'::jsonb;

-- Add billing_cycle_mode column
-- 'calendar_month' = Bills are for 1st to end of month (default)
-- 'checkin_anniversary' = Bills align with tenant's check-in date
ALTER TABLE owner_config
ADD COLUMN IF NOT EXISTS billing_cycle_mode TEXT DEFAULT 'calendar_month'
CHECK (billing_cycle_mode IN ('calendar_month', 'checkin_anniversary'));

-- Update existing owner_config records that have NULL room_types
UPDATE owner_config
SET room_types = '[
  {"code": "single", "name": "Single", "default_rent": 8000, "default_deposit": 8000, "is_enabled": true, "display_order": 1},
  {"code": "double", "name": "Double Sharing", "default_rent": 6000, "default_deposit": 6000, "is_enabled": true, "display_order": 2},
  {"code": "triple", "name": "Triple Sharing", "default_rent": 5000, "default_deposit": 5000, "is_enabled": true, "display_order": 3},
  {"code": "dormitory", "name": "Dormitory", "default_rent": 4000, "default_deposit": 4000, "is_enabled": false, "display_order": 4}
]'::jsonb
WHERE room_types IS NULL;

-- Update existing records that have NULL billing_cycle_mode
UPDATE owner_config
SET billing_cycle_mode = 'calendar_month'
WHERE billing_cycle_mode IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN owner_config.room_types IS 'Custom room types with pricing defaults. Array of {code, name, default_rent, default_deposit, is_enabled, display_order}';
COMMENT ON COLUMN owner_config.billing_cycle_mode IS 'Billing cycle alignment: calendar_month (1st-30th) or checkin_anniversary (from tenant check-in date)';
