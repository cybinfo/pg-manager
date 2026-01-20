-- Migration 054: Add person_id to visitors table
-- Links visit records directly to people for person-centric architecture

-- ============================================
-- 0. Disable audit triggers for migration
-- ============================================
ALTER TABLE visitors DISABLE TRIGGER USER;

-- ============================================
-- 1. Add person_id column to visitors table
-- ============================================
ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES people(id);

-- ============================================
-- 2. Create index for efficient querying
-- ============================================
CREATE INDEX IF NOT EXISTS idx_visitors_person_id ON visitors(person_id) WHERE person_id IS NOT NULL;

-- ============================================
-- 3. Backfill person_id from visitor_contacts where possible
-- ============================================
UPDATE visitors v
SET person_id = vc.person_id
FROM visitor_contacts vc
WHERE v.visitor_contact_id = vc.id
  AND v.person_id IS NULL
  AND vc.person_id IS NOT NULL;

-- ============================================
-- 3.5 Re-enable audit triggers
-- ============================================
ALTER TABLE visitors ENABLE TRIGGER USER;

-- ============================================
-- 4. Add comment for documentation
-- ============================================
COMMENT ON COLUMN visitors.person_id IS 'Direct link to person record for person-centric architecture';

-- ============================================
-- 5. Log migration
-- ============================================
DO $$
BEGIN
  RAISE NOTICE 'Migration 054 completed: Added person_id to visitors table';
END $$;
