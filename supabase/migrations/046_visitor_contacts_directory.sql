-- Migration 046: Visitor Contacts Directory
-- Normalize visitor data to support returning visitors
-- Separate visitor contacts (people) from visitor entries (visits)

-- ============================================
-- 1. Create visitor_contacts table (Visitor Directory)
-- ============================================
CREATE TABLE IF NOT EXISTS visitor_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Info
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,

  -- Visitor Type & Classification
  visitor_type visitor_type NOT NULL DEFAULT 'general',

  -- Service Provider Details
  company_name TEXT,
  service_type TEXT,

  -- Identification
  id_type TEXT,
  id_number TEXT,

  -- Additional Info
  notes TEXT,
  photo_url TEXT,

  -- Tracking
  is_frequent BOOLEAN DEFAULT FALSE,
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,
  visit_count INTEGER DEFAULT 0,
  last_visit_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Add visitor_contact_id to visitors table
-- ============================================
ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS visitor_contact_id UUID REFERENCES visitor_contacts(id);

-- ============================================
-- 3. Create indexes for visitor_contacts
-- ============================================
CREATE INDEX IF NOT EXISTS idx_visitor_contacts_owner_id ON visitor_contacts(owner_id);
CREATE INDEX IF NOT EXISTS idx_visitor_contacts_phone ON visitor_contacts(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visitor_contacts_name ON visitor_contacts(name);
CREATE INDEX IF NOT EXISTS idx_visitor_contacts_visitor_type ON visitor_contacts(visitor_type);
CREATE INDEX IF NOT EXISTS idx_visitor_contacts_is_frequent ON visitor_contacts(is_frequent) WHERE is_frequent = TRUE;
CREATE INDEX IF NOT EXISTS idx_visitor_contacts_company ON visitor_contacts(company_name) WHERE company_name IS NOT NULL;

-- Index for visitors table
CREATE INDEX IF NOT EXISTS idx_visitors_visitor_contact_id ON visitors(visitor_contact_id) WHERE visitor_contact_id IS NOT NULL;

-- ============================================
-- 4. RLS Policies for visitor_contacts
-- ============================================
ALTER TABLE visitor_contacts ENABLE ROW LEVEL SECURITY;

-- Owner can do everything with their contacts
CREATE POLICY "Owners can manage their visitor contacts"
  ON visitor_contacts
  FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

-- Platform admins can view all contacts
CREATE POLICY "Platform admins can view all visitor contacts"
  ON visitor_contacts
  FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- ============================================
-- 5. Function to update visit_count and last_visit_at
-- ============================================
CREATE OR REPLACE FUNCTION update_visitor_contact_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if visitor_contact_id is set
  IF NEW.visitor_contact_id IS NOT NULL THEN
    UPDATE visitor_contacts
    SET
      visit_count = visit_count + 1,
      last_visit_at = NEW.check_in_time,
      updated_at = NOW()
    WHERE id = NEW.visitor_contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for new visits
DROP TRIGGER IF EXISTS trigger_update_visitor_contact_stats ON visitors;
CREATE TRIGGER trigger_update_visitor_contact_stats
  AFTER INSERT ON visitors
  FOR EACH ROW
  EXECUTE FUNCTION update_visitor_contact_stats();

-- ============================================
-- 6. Function to search visitor contacts
-- ============================================
CREATE OR REPLACE FUNCTION search_visitor_contacts(
  p_owner_id UUID,
  p_search_term TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  visitor_type visitor_type,
  company_name TEXT,
  service_type TEXT,
  visit_count INTEGER,
  last_visit_at TIMESTAMPTZ,
  is_frequent BOOLEAN,
  is_blocked BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    vc.id,
    vc.name,
    vc.phone,
    vc.visitor_type,
    vc.company_name,
    vc.service_type,
    vc.visit_count,
    vc.last_visit_at,
    vc.is_frequent,
    vc.is_blocked
  FROM visitor_contacts vc
  WHERE vc.owner_id = p_owner_id
    AND (
      vc.name ILIKE '%' || p_search_term || '%'
      OR vc.phone ILIKE '%' || p_search_term || '%'
      OR vc.company_name ILIKE '%' || p_search_term || '%'
    )
  ORDER BY
    vc.is_frequent DESC,
    vc.visit_count DESC,
    vc.last_visit_at DESC NULLS LAST
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Migrate existing visitor data to contacts
-- ============================================
-- Create contacts from existing unique visitors (by phone or name+type)
INSERT INTO visitor_contacts (
  owner_id,
  name,
  phone,
  visitor_type,
  company_name,
  service_type,
  id_type,
  id_number,
  notes,
  visit_count,
  last_visit_at,
  created_at
)
SELECT DISTINCT ON (v.owner_id, COALESCE(v.visitor_phone, v.visitor_name || v.visitor_type::text))
  v.owner_id,
  v.visitor_name,
  v.visitor_phone,
  v.visitor_type,
  v.company_name,
  v.service_type,
  v.id_type,
  v.id_number,
  v.notes,
  (SELECT COUNT(*) FROM visitors v2
   WHERE v2.owner_id = v.owner_id
   AND (v2.visitor_phone = v.visitor_phone OR (v2.visitor_phone IS NULL AND v2.visitor_name = v.visitor_name)))::INTEGER,
  (SELECT MAX(v3.check_in_time) FROM visitors v3
   WHERE v3.owner_id = v.owner_id
   AND (v3.visitor_phone = v.visitor_phone OR (v3.visitor_phone IS NULL AND v3.visitor_name = v.visitor_name))),
  MIN(v.created_at)
FROM visitors v
WHERE v.visitor_contact_id IS NULL
GROUP BY v.owner_id, COALESCE(v.visitor_phone, v.visitor_name || v.visitor_type::text),
         v.visitor_name, v.visitor_phone, v.visitor_type, v.company_name,
         v.service_type, v.id_type, v.id_number, v.notes
ON CONFLICT DO NOTHING;

-- Link existing visitors to their contacts
UPDATE visitors v
SET visitor_contact_id = vc.id
FROM visitor_contacts vc
WHERE v.owner_id = vc.owner_id
  AND v.visitor_contact_id IS NULL
  AND (
    (v.visitor_phone IS NOT NULL AND v.visitor_phone = vc.phone)
    OR (v.visitor_phone IS NULL AND v.visitor_name = vc.name AND v.visitor_type = vc.visitor_type)
  );

-- ============================================
-- 8. Add comments for documentation
-- ============================================
COMMENT ON TABLE visitor_contacts IS 'Visitor directory - stores unique visitor information for quick re-check-in';
COMMENT ON COLUMN visitor_contacts.visit_count IS 'Denormalized count of visits for quick display';
COMMENT ON COLUMN visitor_contacts.is_frequent IS 'Mark frequent visitors for priority display';
COMMENT ON COLUMN visitor_contacts.is_blocked IS 'Block visitors from entry';
