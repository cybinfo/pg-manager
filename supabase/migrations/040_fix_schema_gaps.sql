-- ============================================
-- Migration 040: Fix Schema Gaps
-- ============================================
-- Fixes missing columns and RLS policies identified from runtime errors:
-- 1. feature_flags column in owner_config
-- 2. total_stays column in tenants (ensure exists)
-- 3. exit_date column in tenants (ensure exists)
-- 4. audit_events INSERT policy for application layer
-- ============================================

-- ============================================
-- 1. Add feature_flags column to owner_config
-- ============================================
ALTER TABLE owner_config ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN owner_config.feature_flags IS 'Feature flags to enable/disable features per owner';

-- ============================================
-- 2. Ensure tenants table has required columns
-- ============================================

-- total_stays (for returning tenant tracking)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS total_stays INTEGER DEFAULT 1;

-- exit_date (for tenant exit tracking)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS exit_date DATE;

-- is_returning (for returning tenant identification)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_returning BOOLEAN DEFAULT FALSE;

-- previous_tenant_id (link to previous tenant record for returning tenants)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'previous_tenant_id'
  ) THEN
    ALTER TABLE tenants ADD COLUMN previous_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
  END IF;
END;
$$;

-- ============================================
-- 3. Fix audit_events RLS policy
-- ============================================
-- The current policy only allows SELECT, but application needs INSERT

-- Drop existing policies
DROP POLICY IF EXISTS audit_events_select ON audit_events;
DROP POLICY IF EXISTS audit_events_insert ON audit_events;

-- Create SELECT policy (owners can read their workspace audit events)
CREATE POLICY audit_events_select ON audit_events
  FOR SELECT
  USING (
    workspace_id = auth.uid()
    OR actor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
    )
  );

-- Create INSERT policy (owners/staff can create audit events for their workspace)
CREATE POLICY audit_events_insert ON audit_events
  FOR INSERT
  WITH CHECK (
    actor_id = auth.uid()
    OR workspace_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
    )
  );

-- ============================================
-- 4. Ensure tenant_stays table has correct structure
-- ============================================
-- The join_date column should exist from migration 007
-- Adding a check just in case

DO $$
BEGIN
  -- Ensure join_date exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_stays' AND column_name = 'join_date'
  ) THEN
    ALTER TABLE tenant_stays ADD COLUMN join_date DATE NOT NULL DEFAULT CURRENT_DATE;
  END IF;

  -- Ensure stay_number exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_stays' AND column_name = 'stay_number'
  ) THEN
    ALTER TABLE tenant_stays ADD COLUMN stay_number INTEGER DEFAULT 1;
  END IF;

  -- Ensure security_deposit exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenant_stays' AND column_name = 'security_deposit'
  ) THEN
    ALTER TABLE tenant_stays ADD COLUMN security_deposit DECIMAL(10,2) DEFAULT 0;
  END IF;
END;
$$;

-- ============================================
-- Complete
-- ============================================
COMMENT ON TABLE owner_config IS 'Owner configuration including feature flags';

DO $$
BEGIN
  RAISE NOTICE 'Migration 040 completed: Schema gaps fixed';
END;
$$;
