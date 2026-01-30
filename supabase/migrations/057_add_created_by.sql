-- ============================================
-- Migration 057: Add created_by Column
-- ============================================
-- Adds created_by UUID column to core tables to track
-- who created each record. Backfills from audit_events.
-- ============================================

-- ============================================
-- 1. Add created_by column to core tables
-- ============================================

-- High priority tables (financial/critical)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE bills ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE refunds ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Medium priority tables
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE notices ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE visitors ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE meter_readings ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE exit_clearance ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Low priority tables
ALTER TABLE properties ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Additional tables
ALTER TABLE people ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE meters ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- ============================================
-- 2. Backfill created_by from audit_events
-- ============================================

-- Tenants
UPDATE tenants t
SET created_by = (
  SELECT ae.actor_id
  FROM audit_events ae
  WHERE ae.entity_type = 'tenant'
    AND ae.entity_id = t.id::text
    AND ae.action = 'insert'
  ORDER BY ae.created_at ASC
  LIMIT 1
)
WHERE t.created_by IS NULL;

-- Bills
UPDATE bills b
SET created_by = (
  SELECT ae.actor_id
  FROM audit_events ae
  WHERE ae.entity_type = 'bill'
    AND ae.entity_id = b.id::text
    AND ae.action = 'insert'
  ORDER BY ae.created_at ASC
  LIMIT 1
)
WHERE b.created_by IS NULL;

-- Payments
UPDATE payments p
SET created_by = (
  SELECT ae.actor_id
  FROM audit_events ae
  WHERE ae.entity_type = 'payment'
    AND ae.entity_id = p.id::text
    AND ae.action = 'insert'
  ORDER BY ae.created_at ASC
  LIMIT 1
)
WHERE p.created_by IS NULL;

-- Expenses
UPDATE expenses e
SET created_by = (
  SELECT ae.actor_id
  FROM audit_events ae
  WHERE ae.entity_type = 'expense'
    AND ae.entity_id = e.id::text
    AND ae.action = 'insert'
  ORDER BY ae.created_at ASC
  LIMIT 1
)
WHERE e.created_by IS NULL;

-- Refunds
UPDATE refunds r
SET created_by = (
  SELECT ae.actor_id
  FROM audit_events ae
  WHERE ae.entity_type = 'refund'
    AND ae.entity_id = r.id::text
    AND ae.action = 'insert'
  ORDER BY ae.created_at ASC
  LIMIT 1
)
WHERE r.created_by IS NULL;

-- Complaints
UPDATE complaints c
SET created_by = (
  SELECT ae.actor_id
  FROM audit_events ae
  WHERE ae.entity_type = 'complaint'
    AND ae.entity_id = c.id::text
    AND ae.action = 'insert'
  ORDER BY ae.created_at ASC
  LIMIT 1
)
WHERE c.created_by IS NULL;

-- Notices
UPDATE notices n
SET created_by = (
  SELECT ae.actor_id
  FROM audit_events ae
  WHERE ae.entity_type = 'notice'
    AND ae.entity_id = n.id::text
    AND ae.action = 'insert'
  ORDER BY ae.created_at ASC
  LIMIT 1
)
WHERE n.created_by IS NULL;

-- Visitors
UPDATE visitors v
SET created_by = (
  SELECT ae.actor_id
  FROM audit_events ae
  WHERE ae.entity_type = 'visitor'
    AND ae.entity_id = v.id::text
    AND ae.action = 'insert'
  ORDER BY ae.created_at ASC
  LIMIT 1
)
WHERE v.created_by IS NULL;

-- Meter readings
UPDATE meter_readings mr
SET created_by = (
  SELECT ae.actor_id
  FROM audit_events ae
  WHERE ae.entity_type = 'meter_reading'
    AND ae.entity_id = mr.id::text
    AND ae.action = 'insert'
  ORDER BY ae.created_at ASC
  LIMIT 1
)
WHERE mr.created_by IS NULL;

-- Exit clearance
UPDATE exit_clearance ec
SET created_by = (
  SELECT ae.actor_id
  FROM audit_events ae
  WHERE ae.entity_type = 'exit_clearance'
    AND ae.entity_id = ec.id::text
    AND ae.action = 'insert'
  ORDER BY ae.created_at ASC
  LIMIT 1
)
WHERE ec.created_by IS NULL;

-- Properties
UPDATE properties p
SET created_by = (
  SELECT ae.actor_id
  FROM audit_events ae
  WHERE ae.entity_type = 'property'
    AND ae.entity_id = p.id::text
    AND ae.action = 'insert'
  ORDER BY ae.created_at ASC
  LIMIT 1
)
WHERE p.created_by IS NULL;

-- Rooms
UPDATE rooms r
SET created_by = (
  SELECT ae.actor_id
  FROM audit_events ae
  WHERE ae.entity_type = 'room'
    AND ae.entity_id = r.id::text
    AND ae.action = 'insert'
  ORDER BY ae.created_at ASC
  LIMIT 1
)
WHERE r.created_by IS NULL;

-- People
UPDATE people p
SET created_by = (
  SELECT ae.actor_id
  FROM audit_events ae
  WHERE ae.entity_type = 'person'
    AND ae.entity_id = p.id::text
    AND ae.action = 'insert'
  ORDER BY ae.created_at ASC
  LIMIT 1
)
WHERE p.created_by IS NULL;

-- Meters
UPDATE meters m
SET created_by = (
  SELECT ae.actor_id
  FROM audit_events ae
  WHERE ae.entity_type = 'meter'
    AND ae.entity_id = m.id::text
    AND ae.action = 'insert'
  ORDER BY ae.created_at ASC
  LIMIT 1
)
WHERE m.created_by IS NULL;

-- ============================================
-- 3. Fallback: Set to owner_id for records without audit history
-- ============================================

UPDATE tenants SET created_by = owner_id WHERE created_by IS NULL;
UPDATE bills SET created_by = owner_id WHERE created_by IS NULL;
UPDATE payments SET created_by = owner_id WHERE created_by IS NULL;
UPDATE expenses SET created_by = owner_id WHERE created_by IS NULL;
UPDATE refunds SET created_by = owner_id WHERE created_by IS NULL;
UPDATE complaints SET created_by = owner_id WHERE created_by IS NULL;
UPDATE notices SET created_by = owner_id WHERE created_by IS NULL;
UPDATE visitors SET created_by = owner_id WHERE created_by IS NULL;
UPDATE meter_readings SET created_by = owner_id WHERE created_by IS NULL;
UPDATE exit_clearance SET created_by = owner_id WHERE created_by IS NULL;
UPDATE properties SET created_by = owner_id WHERE created_by IS NULL;
UPDATE rooms SET created_by = owner_id WHERE created_by IS NULL;
UPDATE people SET created_by = owner_id WHERE created_by IS NULL;
UPDATE meters SET created_by = owner_id WHERE created_by IS NULL;

-- ============================================
-- 4. Create indexes for common queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tenants_created_by ON tenants(created_by);
CREATE INDEX IF NOT EXISTS idx_bills_created_by ON bills(created_by);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON expenses(created_by);

-- ============================================
-- 5. Add comment
-- ============================================

COMMENT ON COLUMN tenants.created_by IS 'User ID who created this record';
COMMENT ON COLUMN bills.created_by IS 'User ID who created this record';
COMMENT ON COLUMN payments.created_by IS 'User ID who created this record';
COMMENT ON COLUMN expenses.created_by IS 'User ID who created this record';
