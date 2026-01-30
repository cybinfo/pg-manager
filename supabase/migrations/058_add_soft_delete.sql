-- ============================================
-- Migration 058: Add Soft Delete Columns
-- ============================================
-- Adds deleted_at and deleted_by columns to enable soft delete
-- for data recovery and audit compliance.
-- ============================================

-- ============================================
-- 1. Add soft delete columns to core tables
-- ============================================

-- High priority tables (financial/critical)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE bills ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE refunds ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Medium priority tables
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE notices ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE visitors ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE exit_clearance ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE exit_clearance ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Low priority tables
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Additional tables
ALTER TABLE people ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE people ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

ALTER TABLE meters ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE meters ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- ============================================
-- 2. Create indexes for soft delete queries
-- ============================================

-- Partial indexes for active records (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_bills_active ON bills(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_payments_active ON payments(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_expenses_active ON expenses(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_refunds_active ON refunds(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_complaints_active ON complaints(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notices_active ON notices(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_visitors_active ON visitors(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_meter_readings_active ON meter_readings(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_exit_clearance_active ON exit_clearance(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_active ON properties(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_rooms_active ON rooms(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_people_active ON people(owner_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_meters_active ON meters(owner_id) WHERE deleted_at IS NULL;

-- Indexes for deleted records (for admin recovery queries)
CREATE INDEX IF NOT EXISTS idx_tenants_deleted ON tenants(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bills_deleted ON bills(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payments_deleted ON payments(deleted_at) WHERE deleted_at IS NOT NULL;

-- ============================================
-- 3. Create soft delete helper function
-- ============================================

CREATE OR REPLACE FUNCTION soft_delete(
  p_table_name TEXT,
  p_record_id UUID,
  p_deleted_by UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_sql TEXT;
  v_affected INT;
BEGIN
  -- Build dynamic SQL for soft delete
  v_sql := format(
    'UPDATE %I SET deleted_at = NOW(), deleted_by = $1 WHERE id = $2 AND deleted_at IS NULL',
    p_table_name
  );

  EXECUTE v_sql USING p_deleted_by, p_record_id;
  GET DIAGNOSTICS v_affected = ROW_COUNT;

  RETURN v_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 4. Create restore function
-- ============================================

CREATE OR REPLACE FUNCTION restore_deleted(
  p_table_name TEXT,
  p_record_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_sql TEXT;
  v_affected INT;
BEGIN
  -- Build dynamic SQL for restore
  v_sql := format(
    'UPDATE %I SET deleted_at = NULL, deleted_by = NULL WHERE id = $1 AND deleted_at IS NOT NULL',
    p_table_name
  );

  EXECUTE v_sql USING p_record_id;
  GET DIAGNOSTICS v_affected = ROW_COUNT;

  RETURN v_affected > 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Add comments
-- ============================================

COMMENT ON COLUMN tenants.deleted_at IS 'Timestamp when record was soft deleted';
COMMENT ON COLUMN tenants.deleted_by IS 'User ID who deleted this record';
COMMENT ON COLUMN bills.deleted_at IS 'Timestamp when record was soft deleted';
COMMENT ON COLUMN bills.deleted_by IS 'User ID who deleted this record';
COMMENT ON COLUMN payments.deleted_at IS 'Timestamp when record was soft deleted';
COMMENT ON COLUMN payments.deleted_by IS 'User ID who deleted this record';
COMMENT ON COLUMN expenses.deleted_at IS 'Timestamp when record was soft deleted';
COMMENT ON COLUMN expenses.deleted_by IS 'User ID who deleted this record';

COMMENT ON FUNCTION soft_delete(TEXT, UUID, UUID) IS 'Soft deletes a record by setting deleted_at and deleted_by';
COMMENT ON FUNCTION restore_deleted(TEXT, UUID) IS 'Restores a soft-deleted record by clearing deleted_at and deleted_by';
