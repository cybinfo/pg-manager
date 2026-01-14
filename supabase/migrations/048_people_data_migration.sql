-- Migration 048: Migrate existing data to People table
-- Creates person records from tenants, staff, and visitor_contacts
-- Links existing records to their person entries

-- ============================================
-- Disable triggers during migration
-- ============================================
ALTER TABLE people DISABLE TRIGGER USER;
ALTER TABLE person_roles DISABLE TRIGGER USER;
ALTER TABLE tenants DISABLE TRIGGER USER;
ALTER TABLE staff_members DISABLE TRIGGER USER;
ALTER TABLE visitor_contacts DISABLE TRIGGER USER;

-- ============================================
-- 1. Migrate Tenants to People
-- ============================================
-- Create person records from tenants (using phone as primary dedup key)
INSERT INTO people (
  owner_id,
  name,
  phone,
  email,
  photo_url,
  permanent_address,
  company_name,
  blood_group,
  tags,
  source,
  source_id,
  created_at
)
SELECT DISTINCT ON (t.owner_id, COALESCE(t.phone, t.email, t.name))
  t.owner_id,
  t.name,
  t.phone,
  t.email,
  COALESCE(t.profile_photo, t.photo_url),
  t.custom_fields->>'permanent_address',
  t.custom_fields->>'company_name',
  t.custom_fields->>'blood_group',
  ARRAY['tenant']::TEXT[],
  'tenant',
  t.id,
  t.created_at
FROM tenants t
WHERE t.person_id IS NULL
ORDER BY t.owner_id, COALESCE(t.phone, t.email, t.name), t.created_at ASC
ON CONFLICT DO NOTHING;

-- Link tenants to their person records
UPDATE tenants t
SET person_id = p.id
FROM people p
WHERE t.owner_id = p.owner_id
  AND t.person_id IS NULL
  AND p.source = 'tenant'
  AND (
    (t.phone IS NOT NULL AND t.phone = p.phone)
    OR (t.phone IS NULL AND t.email IS NOT NULL AND t.email = p.email)
    OR (t.phone IS NULL AND t.email IS NULL AND t.name = p.name)
  );

-- Create person_roles for tenants
INSERT INTO person_roles (person_id, owner_id, role_type, reference_table, reference_id, is_active, started_at)
SELECT
  t.person_id,
  t.owner_id,
  'tenant',
  'tenants',
  t.id,
  t.status = 'active',
  t.check_in_date
FROM tenants t
WHERE t.person_id IS NOT NULL
ON CONFLICT (person_id, role_type, reference_id) DO NOTHING;

-- ============================================
-- 2. Migrate Staff to People
-- ============================================
-- First check if person already exists (by phone/email from tenant migration)
-- Then create new person records for staff not already in people

-- Update existing people with staff tag if they match
UPDATE people p
SET tags = ARRAY(SELECT DISTINCT unnest(tags || ARRAY['staff']::TEXT[])),
    updated_at = NOW()
FROM staff_members s
WHERE p.owner_id = s.owner_id
  AND s.person_id IS NULL
  AND (
    (s.phone IS NOT NULL AND s.phone = p.phone)
    OR (s.email IS NOT NULL AND s.email = p.email)
  );

-- Link staff to existing people
UPDATE staff_members s
SET person_id = p.id
FROM people p
WHERE s.owner_id = p.owner_id
  AND s.person_id IS NULL
  AND (
    (s.phone IS NOT NULL AND s.phone = p.phone)
    OR (s.phone IS NULL AND s.email IS NOT NULL AND s.email = p.email)
  );

-- Create new person records for staff not yet in people
INSERT INTO people (
  owner_id,
  name,
  phone,
  email,
  tags,
  source,
  source_id,
  created_at
)
SELECT
  s.owner_id,
  s.name,
  s.phone,
  s.email,
  ARRAY['staff']::TEXT[],
  'staff',
  s.id,
  s.created_at
FROM staff_members s
WHERE s.person_id IS NULL
ON CONFLICT DO NOTHING;

-- Link remaining staff to their new person records
UPDATE staff_members s
SET person_id = p.id
FROM people p
WHERE s.owner_id = p.owner_id
  AND s.person_id IS NULL
  AND p.source = 'staff'
  AND p.source_id = s.id;

-- Create person_roles for staff
INSERT INTO person_roles (person_id, owner_id, role_type, reference_table, reference_id, is_active, started_at)
SELECT
  s.person_id,
  s.owner_id,
  'staff',
  'staff_members',
  s.id,
  s.is_active,
  s.created_at
FROM staff_members s
WHERE s.person_id IS NOT NULL
ON CONFLICT (person_id, role_type, reference_id) DO NOTHING;

-- ============================================
-- 3. Migrate Visitor Contacts to People
-- ============================================
-- Update existing people with visitor tag if they match
UPDATE people p
SET tags = ARRAY(SELECT DISTINCT unnest(tags || ARRAY['visitor']::TEXT[])),
    updated_at = NOW()
FROM visitor_contacts vc
WHERE p.owner_id = vc.owner_id
  AND vc.person_id IS NULL
  AND (
    (vc.phone IS NOT NULL AND vc.phone = p.phone)
    OR (vc.email IS NOT NULL AND vc.email = p.email)
  );

-- Link visitor_contacts to existing people
UPDATE visitor_contacts vc
SET person_id = p.id
FROM people p
WHERE vc.owner_id = p.owner_id
  AND vc.person_id IS NULL
  AND (
    (vc.phone IS NOT NULL AND vc.phone = p.phone)
    OR (vc.phone IS NULL AND vc.email IS NOT NULL AND vc.email = p.email)
  );

-- Create new person records for visitor_contacts not yet in people
INSERT INTO people (
  owner_id,
  name,
  phone,
  email,
  photo_url,
  company_name,
  tags,
  is_blocked,
  blocked_reason,
  source,
  source_id,
  created_at
)
SELECT
  vc.owner_id,
  vc.name,
  vc.phone,
  vc.email,
  vc.photo_url,
  vc.company_name,
  CASE
    WHEN vc.visitor_type = 'service_provider' THEN ARRAY['visitor', 'service_provider']::TEXT[]
    ELSE ARRAY['visitor']::TEXT[]
  END,
  vc.is_blocked,
  vc.blocked_reason,
  'visitor',
  vc.id,
  vc.created_at
FROM visitor_contacts vc
WHERE vc.person_id IS NULL
ON CONFLICT DO NOTHING;

-- Link remaining visitor_contacts to their new person records
UPDATE visitor_contacts vc
SET person_id = p.id
FROM people p
WHERE vc.owner_id = p.owner_id
  AND vc.person_id IS NULL
  AND p.source = 'visitor'
  AND p.source_id = vc.id;

-- Create person_roles for visitors
INSERT INTO person_roles (person_id, owner_id, role_type, reference_table, reference_id, is_active, started_at)
SELECT
  vc.person_id,
  vc.owner_id,
  CASE WHEN vc.visitor_type = 'service_provider' THEN 'service_provider' ELSE 'visitor' END,
  'visitor_contacts',
  vc.id,
  NOT vc.is_blocked,
  vc.created_at
FROM visitor_contacts vc
WHERE vc.person_id IS NOT NULL
ON CONFLICT (person_id, role_type, reference_id) DO NOTHING;

-- ============================================
-- 4. Re-enable triggers
-- ============================================
ALTER TABLE people ENABLE TRIGGER USER;
ALTER TABLE person_roles ENABLE TRIGGER USER;
ALTER TABLE tenants ENABLE TRIGGER USER;
ALTER TABLE staff_members ENABLE TRIGGER USER;
ALTER TABLE visitor_contacts ENABLE TRIGGER USER;

-- ============================================
-- 5. Log migration summary
-- ============================================
DO $$
DECLARE
  v_people_count INTEGER;
  v_linked_tenants INTEGER;
  v_linked_staff INTEGER;
  v_linked_visitors INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_people_count FROM people;
  SELECT COUNT(*) INTO v_linked_tenants FROM tenants WHERE person_id IS NOT NULL;
  SELECT COUNT(*) INTO v_linked_staff FROM staff_members WHERE person_id IS NOT NULL;
  SELECT COUNT(*) INTO v_linked_visitors FROM visitor_contacts WHERE person_id IS NOT NULL;

  RAISE NOTICE 'Migration Summary:';
  RAISE NOTICE '  Total People Records: %', v_people_count;
  RAISE NOTICE '  Linked Tenants: %', v_linked_tenants;
  RAISE NOTICE '  Linked Staff: %', v_linked_staff;
  RAISE NOTICE '  Linked Visitor Contacts: %', v_linked_visitors;
END $$;
