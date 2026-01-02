-- ============================================
-- Migration 028: Tenant Food Options
-- ============================================
-- Add food/meal preference tracking for tenants
-- ============================================

-- Add food settings to owner_config
ALTER TABLE owner_config
ADD COLUMN IF NOT EXISTS food_settings JSONB DEFAULT '{
  "enabled": false,
  "meals": {
    "breakfast": { "enabled": true, "default_rate": 50 },
    "lunch": { "enabled": true, "default_rate": 80 },
    "dinner": { "enabled": true, "default_rate": 80 },
    "snacks": { "enabled": false, "default_rate": 30 }
  },
  "billing_frequency": "monthly"
}'::jsonb;

-- Add food preferences to tenants table
ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS food_preferences JSONB DEFAULT '{
  "opted_in": false,
  "meals": {
    "breakfast": false,
    "lunch": false,
    "dinner": false,
    "snacks": false
  },
  "start_date": null,
  "notes": null
}'::jsonb;

-- Create food_logs table to track daily meal consumption
CREATE TABLE IF NOT EXISTS food_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

    -- Log details
    log_date DATE NOT NULL,
    meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks')),
    consumed BOOLEAN DEFAULT TRUE,
    rate DECIMAL(10,2) NOT NULL,

    -- Notes
    notes TEXT,

    -- Billing reference
    charge_id UUID REFERENCES charges(id) ON DELETE SET NULL,
    billed BOOLEAN DEFAULT FALSE,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: one log per tenant per meal per day
    UNIQUE(tenant_id, log_date, meal_type)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_food_logs_tenant ON food_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_date ON food_logs(log_date);
CREATE INDEX IF NOT EXISTS idx_food_logs_workspace ON food_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_food_logs_unbilled ON food_logs(tenant_id) WHERE billed = FALSE;

-- Enable RLS
ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Owners can manage food logs"
ON food_logs FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Staff can view food logs"
ON food_logs FOR SELECT
TO authenticated
USING (
    workspace_id IN (
        SELECT workspace_id FROM user_contexts
        WHERE user_id = auth.uid()
        AND context_type = 'staff'
    )
);

CREATE POLICY "Tenants can view own food logs"
ON food_logs FOR SELECT
TO authenticated
USING (
    tenant_id IN (
        SELECT id FROM tenants WHERE user_id = auth.uid()
    )
);

-- Updated at trigger
CREATE TRIGGER update_food_logs_updated_at
    BEFORE UPDATE ON food_logs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to get food charges for billing period
CREATE OR REPLACE FUNCTION calculate_food_charges(
    p_tenant_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE (
    meal_type TEXT,
    total_meals INT,
    rate DECIMAL,
    total_amount DECIMAL
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        fl.meal_type,
        COUNT(*)::INT as total_meals,
        fl.rate,
        SUM(fl.rate) as total_amount
    FROM food_logs fl
    WHERE fl.tenant_id = p_tenant_id
      AND fl.log_date >= p_start_date
      AND fl.log_date <= p_end_date
      AND fl.consumed = TRUE
      AND fl.billed = FALSE
    GROUP BY fl.meal_type, fl.rate;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_food_charges(UUID, DATE, DATE) TO authenticated;

-- Add 'food' charge type if not exists
INSERT INTO charge_types (owner_id, name, code, category, calculation_method, calculation_config, is_refundable, apply_late_fee, is_system, display_order)
SELECT
    o.id,
    'Food',
    'food',
    'recurring',
    'custom',
    '{"source": "food_logs"}'::jsonb,
    false,
    false,
    true,
    7
FROM owners o
WHERE NOT EXISTS (
    SELECT 1 FROM charge_types ct WHERE ct.owner_id = o.id AND ct.code = 'food'
);

-- ============================================
-- Done
-- ============================================
