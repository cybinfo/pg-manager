-- Migration 049: Normalize Tables to Use People as Single Source of Truth
-- This removes duplicate identity columns from tenants, staff_members, visitor_contacts
-- All identity data now comes from the people table via person_id FK

-- ============================================
-- IMPORTANT: Run this AFTER migration 048 completes successfully
-- Ensure all records have person_id populated before running this
-- ============================================

-- ============================================
-- 1. Verify all records have person_id (safety check)
-- ============================================
DO $$
DECLARE
  v_tenants_without_person INTEGER;
  v_staff_without_person INTEGER;
  v_visitors_without_person INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_tenants_without_person FROM tenants WHERE person_id IS NULL;
  SELECT COUNT(*) INTO v_staff_without_person FROM staff_members WHERE person_id IS NULL;
  SELECT COUNT(*) INTO v_visitors_without_person FROM visitor_contacts WHERE person_id IS NULL;

  IF v_tenants_without_person > 0 OR v_staff_without_person > 0 OR v_visitors_without_person > 0 THEN
    RAISE EXCEPTION 'Cannot proceed: Found records without person_id - Tenants: %, Staff: %, Visitors: %',
      v_tenants_without_person, v_staff_without_person, v_visitors_without_person;
  END IF;

  RAISE NOTICE 'Safety check passed: All records have person_id';
END $$;

-- ============================================
-- 2. Make person_id NOT NULL (enforces relationship)
-- ============================================
ALTER TABLE tenants ALTER COLUMN person_id SET NOT NULL;
ALTER TABLE staff_members ALTER COLUMN person_id SET NOT NULL;
ALTER TABLE visitor_contacts ALTER COLUMN person_id SET NOT NULL;

-- ============================================
-- 3. Create Views for Easy Querying
-- These views JOIN with people table to provide complete data
-- ============================================

-- Tenants View with Person Data
CREATE OR REPLACE VIEW tenants_with_person AS
SELECT
  t.id,
  t.owner_id,
  t.person_id,
  t.property_id,
  t.room_id,
  t.bed_id,
  -- Identity from People (single source of truth)
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
  -- Tenant-specific fields
  t.monthly_rent,
  t.security_deposit,
  t.maintenance_charge,
  t.electricity_charge,
  t.water_charge,
  t.advance_amount,
  t.discount_percent,
  t.check_in_date,
  t.expected_checkout_date,
  t.actual_checkout_date,
  t.status,
  t.notice_period_days,
  t.rent_due_day,
  t.agreement_signed,
  t.agreement_url,
  t.documents,
  t.phone_numbers AS tenant_phone_numbers,
  t.guardian_contacts,
  t.food_preference,
  t.vehicle_info,
  t.special_requirements,
  t.notes AS tenant_notes,
  t.custom_fields,
  t.created_at,
  t.updated_at
FROM tenants t
JOIN people p ON t.person_id = p.id;

-- Staff View with Person Data
CREATE OR REPLACE VIEW staff_with_person AS
SELECT
  s.id,
  s.owner_id,
  s.person_id,
  -- Identity from People
  p.name,
  p.phone,
  p.email,
  p.photo_url,
  p.aadhaar_number,
  p.date_of_birth,
  p.gender,
  p.permanent_address,
  p.is_verified AS person_verified,
  -- Staff-specific fields
  s.designation,
  s.department,
  s.salary,
  s.is_active,
  s.can_login,
  s.user_id,
  s.joined_at,
  s.left_at,
  s.notes AS staff_notes,
  s.created_at,
  s.updated_at
FROM staff_members s
JOIN people p ON s.person_id = p.id;

-- Visitors View with Person Data
CREATE OR REPLACE VIEW visitors_with_contact AS
SELECT
  vc.id,
  vc.owner_id,
  vc.person_id,
  -- Identity from People
  p.name,
  p.phone,
  p.email,
  p.photo_url,
  p.company_name,
  p.is_verified AS person_verified,
  p.is_blocked,
  p.blocked_reason,
  -- Visitor-specific fields
  vc.visitor_type,
  vc.visit_count,
  vc.last_visit,
  vc.is_frequent,
  vc.average_visit_duration,
  vc.notes AS visitor_notes,
  vc.created_at,
  vc.updated_at
FROM visitor_contacts vc
JOIN people p ON vc.person_id = p.id;

-- ============================================
-- 4. Create Function to Get or Create Person
-- Used when adding new tenant/staff/visitor
-- ============================================
CREATE OR REPLACE FUNCTION upsert_person(
  p_owner_id UUID,
  p_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_photo_url TEXT DEFAULT NULL,
  p_aadhaar_number TEXT DEFAULT NULL,
  p_pan_number TEXT DEFAULT NULL,
  p_date_of_birth DATE DEFAULT NULL,
  p_gender TEXT DEFAULT NULL,
  p_permanent_address TEXT DEFAULT NULL,
  p_current_address TEXT DEFAULT NULL,
  p_occupation TEXT DEFAULT NULL,
  p_company_name TEXT DEFAULT NULL,
  p_blood_group TEXT DEFAULT NULL,
  p_tags TEXT[] DEFAULT '{}'::TEXT[],
  p_source TEXT DEFAULT 'manual'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_person_id UUID;
  v_existing_tags TEXT[];
BEGIN
  -- Try to find existing person by phone or email (within same owner)
  IF p_phone IS NOT NULL THEN
    SELECT id, tags INTO v_person_id, v_existing_tags
    FROM people
    WHERE owner_id = p_owner_id AND phone = p_phone
    LIMIT 1;
  END IF;

  IF v_person_id IS NULL AND p_email IS NOT NULL THEN
    SELECT id, tags INTO v_person_id, v_existing_tags
    FROM people
    WHERE owner_id = p_owner_id AND email = p_email
    LIMIT 1;
  END IF;

  IF v_person_id IS NOT NULL THEN
    -- Update existing person with any new data and merge tags
    UPDATE people SET
      name = COALESCE(NULLIF(p_name, ''), name),
      email = COALESCE(p_email, email),
      photo_url = COALESCE(p_photo_url, photo_url),
      aadhaar_number = COALESCE(p_aadhaar_number, aadhaar_number),
      pan_number = COALESCE(p_pan_number, pan_number),
      date_of_birth = COALESCE(p_date_of_birth, date_of_birth),
      gender = COALESCE(p_gender, gender),
      permanent_address = COALESCE(p_permanent_address, permanent_address),
      current_address = COALESCE(p_current_address, current_address),
      occupation = COALESCE(p_occupation, occupation),
      company_name = COALESCE(p_company_name, company_name),
      blood_group = COALESCE(p_blood_group, blood_group),
      tags = ARRAY(SELECT DISTINCT unnest(v_existing_tags || p_tags)),
      updated_at = NOW()
    WHERE id = v_person_id;

    RETURN v_person_id;
  ELSE
    -- Create new person
    INSERT INTO people (
      owner_id, name, phone, email, photo_url,
      aadhaar_number, pan_number, date_of_birth, gender,
      permanent_address, current_address, occupation, company_name,
      blood_group, tags, source
    ) VALUES (
      p_owner_id, p_name, p_phone, p_email, p_photo_url,
      p_aadhaar_number, p_pan_number, p_date_of_birth, p_gender,
      p_permanent_address, p_current_address, p_occupation, p_company_name,
      p_blood_group, p_tags, p_source
    )
    RETURNING id INTO v_person_id;

    RETURN v_person_id;
  END IF;
END;
$$;

-- ============================================
-- 5. Create Trigger Functions to Sync Tags
-- When a tenant/staff/visitor is created, add appropriate tag to person
-- ============================================

-- Trigger for tenants
CREATE OR REPLACE FUNCTION sync_tenant_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Add 'tenant' tag to person when tenant is created
  IF TG_OP = 'INSERT' THEN
    UPDATE people
    SET tags = ARRAY(SELECT DISTINCT unnest(tags || ARRAY['tenant']::TEXT[]))
    WHERE id = NEW.person_id;
  END IF;

  -- Remove 'tenant' tag if no more active tenant records
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status IN ('moved_out', 'terminated')) THEN
    -- Check if person has any other active tenant records
    IF NOT EXISTS (
      SELECT 1 FROM tenants
      WHERE person_id = COALESCE(NEW.person_id, OLD.person_id)
      AND status NOT IN ('moved_out', 'terminated')
      AND id != COALESCE(NEW.id, OLD.id)
    ) THEN
      UPDATE people
      SET tags = array_remove(tags, 'tenant')
      WHERE id = COALESCE(NEW.person_id, OLD.person_id);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sync_tenant_tag_trigger ON tenants;
CREATE TRIGGER sync_tenant_tag_trigger
  AFTER INSERT OR UPDATE OF status OR DELETE ON tenants
  FOR EACH ROW EXECUTE FUNCTION sync_tenant_tag();

-- Trigger for staff
CREATE OR REPLACE FUNCTION sync_staff_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.is_active THEN
    UPDATE people
    SET tags = ARRAY(SELECT DISTINCT unnest(tags || ARRAY['staff']::TEXT[]))
    WHERE id = NEW.person_id;
  END IF;

  IF TG_OP = 'UPDATE' AND NOT NEW.is_active THEN
    IF NOT EXISTS (
      SELECT 1 FROM staff_members
      WHERE person_id = NEW.person_id AND is_active = true AND id != NEW.id
    ) THEN
      UPDATE people
      SET tags = array_remove(tags, 'staff')
      WHERE id = NEW.person_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_staff_tag_trigger ON staff_members;
CREATE TRIGGER sync_staff_tag_trigger
  AFTER INSERT OR UPDATE OF is_active ON staff_members
  FOR EACH ROW EXECUTE FUNCTION sync_staff_tag();

-- Trigger for visitors
CREATE OR REPLACE FUNCTION sync_visitor_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE people
    SET tags = ARRAY(SELECT DISTINCT unnest(tags || ARRAY['visitor']::TEXT[]))
    WHERE id = NEW.person_id;

    -- Also add service_provider tag if applicable
    IF NEW.visitor_type = 'service_provider' THEN
      UPDATE people
      SET tags = ARRAY(SELECT DISTINCT unnest(tags || ARRAY['service_provider']::TEXT[]))
      WHERE id = NEW.person_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_visitor_tag_trigger ON visitor_contacts;
CREATE TRIGGER sync_visitor_tag_trigger
  AFTER INSERT ON visitor_contacts
  FOR EACH ROW EXECUTE FUNCTION sync_visitor_tag();

-- ============================================
-- 6. Update Person Verification (cascades to all modules)
-- ============================================
CREATE OR REPLACE FUNCTION verify_person(
  p_person_id UUID,
  p_verified_by UUID,
  p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE people SET
    is_verified = TRUE,
    verified_at = NOW(),
    verified_by = p_verified_by,
    verification_notes = p_notes,
    tags = ARRAY(SELECT DISTINCT unnest(tags || ARRAY['verified']::TEXT[]))
  WHERE id = p_person_id;

  RETURN FOUND;
END;
$$;

-- ============================================
-- 7. Block/Unblock Person (affects all modules)
-- ============================================
CREATE OR REPLACE FUNCTION block_person(
  p_person_id UUID,
  p_reason TEXT,
  p_blocked_by UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE people SET
    is_blocked = TRUE,
    blocked_reason = p_reason,
    blocked_at = NOW(),
    tags = ARRAY(SELECT DISTINCT unnest(tags || ARRAY['blocked']::TEXT[]))
  WHERE id = p_person_id;

  -- Also block in visitor_contacts if exists
  UPDATE visitor_contacts SET
    is_blocked = TRUE,
    blocked_reason = p_reason
  WHERE person_id = p_person_id;

  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION unblock_person(p_person_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE people SET
    is_blocked = FALSE,
    blocked_reason = NULL,
    blocked_at = NULL,
    tags = array_remove(tags, 'blocked')
  WHERE id = p_person_id;

  UPDATE visitor_contacts SET
    is_blocked = FALSE,
    blocked_reason = NULL
  WHERE person_id = p_person_id;

  RETURN FOUND;
END;
$$;

-- ============================================
-- 8. Grant permissions
-- ============================================
GRANT SELECT ON tenants_with_person TO authenticated;
GRANT SELECT ON staff_with_person TO authenticated;
GRANT SELECT ON visitors_with_contact TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_person TO authenticated;
GRANT EXECUTE ON FUNCTION verify_person TO authenticated;
GRANT EXECUTE ON FUNCTION block_person TO authenticated;
GRANT EXECUTE ON FUNCTION unblock_person TO authenticated;

-- ============================================
-- 9. Create Indexes for Performance
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tenants_person_id ON tenants(person_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_person_id ON staff_members(person_id);
CREATE INDEX IF NOT EXISTS idx_visitor_contacts_person_id ON visitor_contacts(person_id);

-- ============================================
-- 10. Log migration
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 049 completed successfully';
  RAISE NOTICE 'Tables normalized to use People as single source of truth';
  RAISE NOTICE 'Views created: tenants_with_person, staff_with_person, visitors_with_contact';
  RAISE NOTICE 'Tag sync triggers installed for automatic tag management';
END $$;
