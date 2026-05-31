-- ============================================================
-- 089_entity_unification.sql
-- Collapse properties + libraries into a single entities table.
-- All library_* module tables renamed to entity_*.
-- All property_id / library_id FKs replaced by entity_id.
-- ============================================================

BEGIN;

-- ============================================================
-- STEP 1: Create entities table
-- ============================================================
CREATE TABLE IF NOT EXISTS entities (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id         UUID REFERENCES workspaces(id),
  owner_id             UUID REFERENCES auth.users(id),
  business_id          UUID REFERENCES businesses(id),

  -- Identity
  name                 TEXT NOT NULL,
  type                 TEXT NOT NULL CHECK (type IN ('pg','library','gym','hospital','school','hotel')),
  code                 TEXT,
  description          TEXT,

  -- Location
  address              TEXT,
  city                 TEXT,
  state                TEXT,
  pincode              TEXT,

  -- Contact
  phone                TEXT,
  email                TEXT,
  manager_name         TEXT,
  manager_phone        TEXT,

  -- Operating hours
  opening_time         TIME,
  closing_time         TIME,

  -- Media
  cover_image          TEXT,
  photos               JSONB,

  -- Status
  is_active            BOOLEAN DEFAULT true,
  is_under_maintenance BOOLEAN DEFAULT false,

  -- Library-type computed stats (maintained by trigger)
  total_sections       INTEGER DEFAULT 0,
  total_seats          INTEGER DEFAULT 0,
  occupied_seats       INTEGER DEFAULT 0,

  -- Type-specific config JSONB
  -- For pg: property_config fields
  -- For library: { has_ac, has_wifi, has_lockers, has_parking, time_slots, ... }
  settings             JSONB DEFAULT '{}',

  -- PG-specific (flat for query convenience)
  tenant_features      JSONB,
  website_slug         TEXT UNIQUE,
  website_enabled      BOOLEAN DEFAULT false,
  website_config       JSONB,

  -- Audit
  created_by           UUID REFERENCES auth.users(id),
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW(),
  deleted_at           TIMESTAMPTZ,
  deleted_by           UUID REFERENCES auth.users(id)
);

-- ============================================================
-- STEP 2: Migrate properties → entities (type='pg')
-- ============================================================
INSERT INTO entities (
  id, workspace_id, owner_id, business_id,
  name, type,
  address, city, state, pincode,
  manager_name, manager_phone,
  cover_image, photos,
  is_active, is_under_maintenance,
  settings, tenant_features,
  website_slug, website_enabled, website_config,
  created_by, created_at, updated_at, deleted_at, deleted_by
)
SELECT
  p.id,
  (SELECT w.id FROM workspaces w WHERE w.owner_user_id = p.owner_id LIMIT 1),
  p.owner_id,
  p.business_id,
  p.name, 'pg',
  p.address, p.city, p.state, p.pincode,
  p.manager_name, p.manager_phone,
  p.cover_image, to_jsonb(p.photos),
  COALESCE(p.is_active, true),
  COALESCE(p.is_under_maintenance, false),
  COALESCE(p.property_config, '{}'),
  p.tenant_features,
  p.website_slug, COALESCE(p.website_enabled, false), p.website_config,
  p.created_by, p.created_at, p.updated_at, p.deleted_at, p.deleted_by
FROM properties p
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 3: Migrate libraries → entities (type='library')
-- ============================================================
INSERT INTO entities (
  id, workspace_id, owner_id, business_id,
  name, type, code,
  address, city, state, pincode,
  phone, email,
  opening_time, closing_time,
  is_active,
  total_sections, total_seats, occupied_seats,
  settings,
  created_by, created_at, updated_at, deleted_at, deleted_by
)
SELECT
  l.id,
  l.workspace_id,
  l.owner_id,
  l.business_id,
  l.name, 'library', l.code,
  l.address, l.city, l.state, l.pincode,
  l.phone, l.email,
  l.opening_time, l.closing_time,
  COALESCE(l.is_active, true),
  COALESCE(l.total_sections, 0),
  COALESCE(l.total_seats, 0),
  COALESCE(l.occupied_seats, 0),
  jsonb_build_object(
    'has_ac',                    COALESCE(l.has_ac, false),
    'has_wifi',                  COALESCE(l.has_wifi, true),
    'has_lockers',               COALESCE(l.has_lockers, true),
    'has_parking',               COALESCE(l.has_parking, false),
    'time_slots',                l.settings->'time_slots',
    'default_hours_per_month',   l.settings->'default_hours_per_month',
    'grace_period_minutes',      l.settings->'grace_period_minutes'
  ),
  l.created_by, l.created_at, l.updated_at, l.deleted_at, l.deleted_by
FROM libraries l
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STEP 4: Add entity_id to PG child tables and populate
-- (property IDs are identical to entity IDs — direct copy)
-- ============================================================

ALTER TABLE rooms           ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE CASCADE;
ALTER TABLE tenants          ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE tenant_stays     ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE bills            ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE charges          ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE payments         ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE refunds          ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE expenses         ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE daily_spend      ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE bill_payments    ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE service_payments ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE expense_budgets  ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE kitchen_wastage  ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE misc_transactions ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE visitors         ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE website_inquiries ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE exit_clearance   ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE user_roles       ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE meter_readings   ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE meters           ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE food_logs        ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);

-- room_transfers has two property FKs
ALTER TABLE room_transfers ADD COLUMN IF NOT EXISTS from_entity_id UUID REFERENCES entities(id);
ALTER TABLE room_transfers ADD COLUMN IF NOT EXISTS to_entity_id   UUID REFERENCES entities(id);

-- complaints and notices have BOTH property_id and library_id
ALTER TABLE complaints ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);
ALTER TABLE notices    ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id);

-- Populate entity_id from property_id (same UUID values)
UPDATE rooms            SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE tenants          SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE tenant_stays     SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE bills            SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE charges          SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE payments         SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE refunds          SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE expenses         SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE daily_spend      SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE bill_payments    SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE service_payments SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE expense_budgets  SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE kitchen_wastage  SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE misc_transactions SET entity_id = property_id WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE visitors         SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE website_inquiries SET entity_id = property_id WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE exit_clearance   SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE user_roles       SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE meter_readings   SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE meters           SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE food_logs        SET entity_id = property_id  WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE room_transfers   SET from_entity_id = from_property_id WHERE from_entity_id IS NULL AND from_property_id IS NOT NULL;
UPDATE room_transfers   SET to_entity_id   = to_property_id   WHERE to_entity_id   IS NULL AND to_property_id   IS NOT NULL;

-- complaints/notices: property_id first, then library_id for library-only rows
UPDATE complaints SET entity_id = property_id WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE complaints SET entity_id = library_id  WHERE entity_id IS NULL AND library_id  IS NOT NULL;
UPDATE notices    SET entity_id = property_id WHERE entity_id IS NULL AND property_id IS NOT NULL;
UPDATE notices    SET entity_id = library_id  WHERE entity_id IS NULL AND library_id  IS NOT NULL;

-- ============================================================
-- STEP 5: Drop ALL library stats functions + triggers BEFORE renaming tables.
-- Use CASCADE so every dependent trigger is removed automatically,
-- regardless of what it is named.
-- ============================================================
DROP FUNCTION IF EXISTS update_library_stats()                  CASCADE;
DROP FUNCTION IF EXISTS library_update_library_section_counts() CASCADE;
DROP FUNCTION IF EXISTS library_update_library_member_counts()  CASCADE;
DROP FUNCTION IF EXISTS library_update_library_seat_counts()    CASCADE;
DROP FUNCTION IF EXISTS library_update_library_locker_counts()  CASCADE;
DROP FUNCTION IF EXISTS get_library_stats(UUID)                 CASCADE;
DROP FUNCTION IF EXISTS calculate_library_capacity(UUID)        CASCADE;

-- Also drop any named triggers that might not have been caught by CASCADE above
DROP TRIGGER IF EXISTS update_library_stats_trigger  ON library_sections;
DROP TRIGGER IF EXISTS update_library_stats_trigger  ON library_seats;
DROP TRIGGER IF EXISTS update_library_stats_trigger  ON library_members;
DROP TRIGGER IF EXISTS update_library_stats_trigger  ON library_lockers;
DROP TRIGGER IF EXISTS update_seat_occupancy_trigger ON library_members;

-- ============================================================
-- STEP 6: Rename library_* tables to entity_*
-- Existing triggers (updated_at, audit_*) survive rename automatically.
-- ============================================================
ALTER TABLE library_sections           RENAME TO entity_sections;
ALTER TABLE library_seats              RENAME TO entity_seats;
ALTER TABLE library_members            RENAME TO entity_members;
ALTER TABLE library_memberships        RENAME TO entity_memberships;
ALTER TABLE library_attendance         RENAME TO entity_attendance;
ALTER TABLE library_lockers            RENAME TO entity_lockers;
ALTER TABLE library_locker_assignments RENAME TO entity_locker_assignments;
ALTER TABLE library_payments           RENAME TO entity_payments;
ALTER TABLE library_plans              RENAME TO entity_plans;
ALTER TABLE library_waitlist           RENAME TO entity_waitlist;
ALTER TABLE library_seat_reservations  RENAME TO entity_seat_reservations;
ALTER TABLE library_member_status_log  RENAME TO entity_member_status_log;

-- ============================================================
-- STEP 7: Add entity_id to renamed tables and populate
-- (library IDs are identical to entity IDs — direct copy)
-- ============================================================
ALTER TABLE entity_sections  ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE CASCADE;
ALTER TABLE entity_members   ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE CASCADE;
ALTER TABLE entity_lockers   ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE CASCADE;
ALTER TABLE entity_waitlist  ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES entities(id) ON DELETE CASCADE;

UPDATE entity_sections SET entity_id = library_id WHERE entity_id IS NULL AND library_id IS NOT NULL;
UPDATE entity_members  SET entity_id = library_id WHERE entity_id IS NULL AND library_id IS NOT NULL;
UPDATE entity_lockers  SET entity_id = library_id WHERE entity_id IS NULL AND library_id IS NOT NULL;
UPDATE entity_waitlist SET entity_id = library_id WHERE entity_id IS NULL AND library_id IS NOT NULL;

-- ============================================================
-- STEP 8a: Drop dependent views and policies BEFORE dropping columns
-- ============================================================

-- View references tenants.property_id
DROP VIEW IF EXISTS tenants_with_person;

-- Policy references tenants.property_id via subquery
DROP POLICY IF EXISTS "notices_tenant_view" ON notices;

-- ============================================================
-- STEP 8: Drop old FK columns
-- ============================================================

-- PG tables
ALTER TABLE rooms             DROP COLUMN IF EXISTS property_id;
ALTER TABLE tenants           DROP COLUMN IF EXISTS property_id;
ALTER TABLE tenant_stays      DROP COLUMN IF EXISTS property_id;
ALTER TABLE bills             DROP COLUMN IF EXISTS property_id;
ALTER TABLE charges           DROP COLUMN IF EXISTS property_id;
ALTER TABLE payments          DROP COLUMN IF EXISTS property_id;
ALTER TABLE refunds           DROP COLUMN IF EXISTS property_id;
ALTER TABLE expenses          DROP COLUMN IF EXISTS property_id;
ALTER TABLE daily_spend       DROP COLUMN IF EXISTS property_id;
ALTER TABLE bill_payments     DROP COLUMN IF EXISTS property_id;
ALTER TABLE service_payments  DROP COLUMN IF EXISTS property_id;
ALTER TABLE expense_budgets   DROP COLUMN IF EXISTS property_id;
ALTER TABLE kitchen_wastage   DROP COLUMN IF EXISTS property_id;
ALTER TABLE misc_transactions DROP COLUMN IF EXISTS property_id;
ALTER TABLE visitors          DROP COLUMN IF EXISTS property_id;
ALTER TABLE website_inquiries DROP COLUMN IF EXISTS property_id;
ALTER TABLE exit_clearance    DROP COLUMN IF EXISTS property_id;
ALTER TABLE user_roles        DROP COLUMN IF EXISTS property_id;
ALTER TABLE meter_readings    DROP COLUMN IF EXISTS property_id;
ALTER TABLE meters            DROP COLUMN IF EXISTS property_id;
ALTER TABLE food_logs         DROP COLUMN IF EXISTS property_id;
ALTER TABLE room_transfers    DROP COLUMN IF EXISTS from_property_id;
ALTER TABLE room_transfers    DROP COLUMN IF EXISTS to_property_id;
ALTER TABLE complaints        DROP COLUMN IF EXISTS property_id;
ALTER TABLE complaints        DROP COLUMN IF EXISTS library_id;
ALTER TABLE notices           DROP COLUMN IF EXISTS property_id;
ALTER TABLE notices           DROP COLUMN IF EXISTS library_id;

-- Library tables (now entity_*)
ALTER TABLE entity_sections DROP COLUMN IF EXISTS library_id;
ALTER TABLE entity_members  DROP COLUMN IF EXISTS library_id;
ALTER TABLE entity_lockers  DROP COLUMN IF EXISTS library_id;
ALTER TABLE entity_waitlist DROP COLUMN IF EXISTS library_id;

-- ============================================================
-- STEP 10: Drop old source tables
-- CASCADE removes any remaining FK constraints pointing to them.
-- ============================================================
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS libraries  CASCADE;

-- ============================================================
-- STEP 11: Recreate entity stats function + triggers
-- Updates total_sections / total_seats / occupied_seats on entities
-- when sections, seats, or members change.
-- ============================================================
CREATE OR REPLACE FUNCTION update_entity_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_id UUID;
BEGIN
  v_entity_id := COALESCE(NEW.entity_id, OLD.entity_id);
  IF v_entity_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE entities SET
    total_sections = (
      SELECT COUNT(*)::INTEGER
      FROM entity_sections
      WHERE entity_id = v_entity_id AND deleted_at IS NULL
    ),
    total_seats = (
      SELECT COUNT(*)::INTEGER
      FROM entity_seats es
      JOIN entity_sections esec ON esec.id = es.section_id
      WHERE esec.entity_id = v_entity_id AND es.deleted_at IS NULL
    ),
    occupied_seats = (
      SELECT COUNT(*)::INTEGER
      FROM entity_seats es
      JOIN entity_sections esec ON esec.id = es.section_id
      WHERE esec.entity_id = v_entity_id
        AND es.is_occupied = true
        AND es.deleted_at IS NULL
    ),
    updated_at = NOW()
  WHERE id = v_entity_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_entity_seat_stats()
RETURNS TRIGGER AS $$
DECLARE
  v_entity_id UUID;
BEGIN
  SELECT esec.entity_id INTO v_entity_id
  FROM entity_sections esec
  WHERE esec.id = COALESCE(NEW.section_id, OLD.section_id);

  IF v_entity_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  UPDATE entities SET
    total_seats = (
      SELECT COUNT(*)::INTEGER
      FROM entity_seats es
      JOIN entity_sections esec ON esec.id = es.section_id
      WHERE esec.entity_id = v_entity_id AND es.deleted_at IS NULL
    ),
    occupied_seats = (
      SELECT COUNT(*)::INTEGER
      FROM entity_seats es
      JOIN entity_sections esec ON esec.id = es.section_id
      WHERE esec.entity_id = v_entity_id
        AND es.is_occupied = true
        AND es.deleted_at IS NULL
    ),
    updated_at = NOW()
  WHERE id = v_entity_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER update_entity_stats_on_section
  AFTER INSERT OR UPDATE OR DELETE ON entity_sections
  FOR EACH ROW EXECUTE FUNCTION update_entity_stats();

CREATE TRIGGER update_entity_stats_on_seat
  AFTER INSERT OR UPDATE OR DELETE ON entity_seats
  FOR EACH ROW EXECUTE FUNCTION update_entity_seat_stats();

-- ============================================================
-- STEP 12: RLS on entities
-- ============================================================
ALTER TABLE entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "entities_own_data" ON entities;

CREATE POLICY "entities_own_data" ON entities
  FOR ALL
  USING  (owner_id = auth.uid() OR is_platform_admin(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR is_platform_admin(auth.uid()));

-- ============================================================
-- STEP 13: Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_entities_owner     ON entities(owner_id);
CREATE INDEX IF NOT EXISTS idx_entities_workspace  ON entities(workspace_id);
CREATE INDEX IF NOT EXISTS idx_entities_business   ON entities(business_id) WHERE business_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_entities_type       ON entities(type);
CREATE INDEX IF NOT EXISTS idx_entities_active     ON entities(is_active, deleted_at);

CREATE INDEX IF NOT EXISTS idx_rooms_entity           ON rooms(entity_id);
CREATE INDEX IF NOT EXISTS idx_tenants_entity          ON tenants(entity_id);
CREATE INDEX IF NOT EXISTS idx_bills_entity            ON bills(entity_id);
CREATE INDEX IF NOT EXISTS idx_payments_entity         ON payments(entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_sections_entity  ON entity_sections(entity_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_entity_members_entity   ON entity_members(entity_id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_entity_lockers_entity   ON entity_lockers(entity_id)  WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_entity_waitlist_entity  ON entity_waitlist(entity_id) WHERE deleted_at IS NULL;

-- ============================================================
-- STEP 14: Audit + updated_at triggers on entities
-- ============================================================
CREATE TRIGGER update_entities_updated_at
  BEFORE UPDATE ON entities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER audit_entities
  AFTER INSERT OR UPDATE OR DELETE ON entities
  FOR EACH ROW EXECUTE FUNCTION universal_audit_trigger();

-- ============================================================
-- STEP 15: Recreate dropped views and policies with entity_id
-- ============================================================

CREATE OR REPLACE VIEW tenants_with_person AS
SELECT
  t.id,
  t.owner_id,
  t.person_id,
  t.entity_id,
  t.room_id,
  t.bed_id,
  p.name,
  p.phone,
  p.email,
  p.photo_url,
  p.aadhaar_number,
  p.pan_number,
  p.date_of_birth,
  p.gender,
  p.permanent_address,
  p.current_address,
  p.occupation,
  p.company_name,
  p.emergency_contacts,
  p.blood_group,
  p.is_verified AS person_verified,
  t.monthly_rent,
  t.security_deposit,
  t.security_deposit_paid,
  t.advance_amount,
  t.advance_balance,
  t.discount_percent,
  t.discount_reason,
  t.billing_mode,
  t.billing_cycle_start_day,
  t.check_in_date,
  t.check_out_date,
  t.expected_exit_date,
  t.exit_date,
  t.status,
  t.notice_given_date,
  t.lock_in_end_date,
  t.agreement_signed,
  t.agreement_url,
  t.agreement_start_date,
  t.agreement_end_date,
  t.police_verification_status,
  t.police_verification_date,
  t.documents,
  t.phone_numbers AS tenant_phone_numbers,
  t.guardian_contacts,
  t.notes AS tenant_notes,
  t.custom_fields,
  t.is_returning,
  t.previous_tenant_id,
  t.total_stays,
  t.created_at,
  t.updated_at
FROM tenants t
JOIN people p ON t.person_id = p.id;

GRANT SELECT ON tenants_with_person TO authenticated;

CREATE POLICY "notices_tenant_view" ON notices
  FOR SELECT
  USING (
    entity_id IN (
      SELECT entity_id FROM tenants
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

COMMIT;
