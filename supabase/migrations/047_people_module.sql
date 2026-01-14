-- Migration 047: People Module - Central Identity Management
-- Create a unified people registry as the single source of truth
-- for all persons across tenants, staff, visitors, and future modules

-- ============================================
-- 1. Create people table (Master Identity)
-- ============================================
CREATE TABLE IF NOT EXISTS people (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- ==========================================
  -- Core Identity
  -- ==========================================
  name TEXT NOT NULL,
  phone TEXT,  -- Primary identifier in India
  email TEXT,
  photo_url TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IS NULL OR gender IN ('male', 'female', 'other')),

  -- ==========================================
  -- Secondary Phones (for multiple numbers)
  -- ==========================================
  phone_numbers JSONB DEFAULT '[]'::jsonb,
  -- [{"number": "9876543210", "type": "personal", "is_whatsapp": true}]

  -- ==========================================
  -- ID Documents (Verified Once, Used Everywhere)
  -- ==========================================
  aadhaar_number TEXT,
  pan_number TEXT,
  id_documents JSONB DEFAULT '[]'::jsonb,
  -- [
  --   {"type": "aadhaar", "number": "XXXX-XXXX-XXXX", "verified": true, "file_url": "..."},
  --   {"type": "pan", "number": "ABCDE1234F", "verified": false},
  --   {"type": "driving_license", "number": "...", "expiry": "2025-12-31"},
  --   {"type": "passport", "number": "...", "expiry": "2030-01-01"}
  -- ]

  -- ==========================================
  -- Address Information
  -- ==========================================
  permanent_address TEXT,
  permanent_city TEXT,
  permanent_state TEXT,
  permanent_pincode TEXT,
  current_address TEXT,
  current_city TEXT,

  -- ==========================================
  -- Professional/Work Info
  -- ==========================================
  occupation TEXT,
  company_name TEXT,
  designation TEXT,

  -- ==========================================
  -- Emergency Contacts
  -- ==========================================
  emergency_contacts JSONB DEFAULT '[]'::jsonb,
  -- [
  --   {"name": "Parent Name", "phone": "9876543210", "relation": "Father"},
  --   {"name": "Spouse Name", "phone": "9876543211", "relation": "Spouse", "person_id": "uuid"}
  -- ]

  -- ==========================================
  -- Classification & Tags
  -- ==========================================
  tags TEXT[] DEFAULT '{}',
  -- ['tenant', 'staff', 'visitor', 'service_provider', 'frequent', 'vip', 'blocked']

  person_type TEXT DEFAULT 'individual' CHECK (person_type IN ('individual', 'company', 'organization')),

  -- ==========================================
  -- Verification Status
  -- ==========================================
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  verification_notes TEXT,

  -- ==========================================
  -- Status & Flags
  -- ==========================================
  is_active BOOLEAN DEFAULT TRUE,
  is_blocked BOOLEAN DEFAULT FALSE,
  blocked_reason TEXT,
  blocked_at TIMESTAMPTZ,

  -- ==========================================
  -- Additional Info
  -- ==========================================
  blood_group TEXT,
  notes TEXT,
  custom_fields JSONB DEFAULT '{}'::jsonb,

  -- ==========================================
  -- Metadata
  -- ==========================================
  source TEXT, -- 'tenant', 'staff', 'visitor', 'manual', 'import'
  source_id UUID, -- Original record ID if migrated

  -- ==========================================
  -- Timestamps
  -- ==========================================
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 2. Create person_roles table (Track all roles)
-- ============================================
-- This table tracks what roles/relationships a person has
CREATE TABLE IF NOT EXISTS person_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  person_id UUID NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  role_type TEXT NOT NULL CHECK (role_type IN (
    'tenant',
    'staff',
    'visitor',
    'service_provider',
    'emergency_contact',
    'guardian',
    'reference'
  )),

  -- Reference to the specific record
  reference_table TEXT, -- 'tenants', 'staff_members', 'visitor_contacts'
  reference_id UUID,

  -- Role-specific metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure unique active role per type per person
  UNIQUE(person_id, role_type, reference_id)
);

-- ============================================
-- 3. Add person_id to existing tables
-- ============================================

-- Add to tenants
ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES people(id) ON DELETE SET NULL;

-- Add to staff_members
ALTER TABLE staff_members
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES people(id) ON DELETE SET NULL;

-- Add to visitor_contacts (already has similar structure, add link)
ALTER TABLE visitor_contacts
  ADD COLUMN IF NOT EXISTS person_id UUID REFERENCES people(id) ON DELETE SET NULL;

-- ============================================
-- 4. Create indexes for people table
-- ============================================
CREATE INDEX IF NOT EXISTS idx_people_owner_id ON people(owner_id);
CREATE INDEX IF NOT EXISTS idx_people_phone ON people(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_people_email ON people(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_people_name ON people(name);
CREATE INDEX IF NOT EXISTS idx_people_aadhaar ON people(aadhaar_number) WHERE aadhaar_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_people_pan ON people(pan_number) WHERE pan_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_people_tags ON people USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_people_is_verified ON people(is_verified) WHERE is_verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_people_is_blocked ON people(is_blocked) WHERE is_blocked = TRUE;
CREATE INDEX IF NOT EXISTS idx_people_source ON people(source, source_id) WHERE source IS NOT NULL;

-- Indexes for person_roles
CREATE INDEX IF NOT EXISTS idx_person_roles_person_id ON person_roles(person_id);
CREATE INDEX IF NOT EXISTS idx_person_roles_owner_id ON person_roles(owner_id);
CREATE INDEX IF NOT EXISTS idx_person_roles_role_type ON person_roles(role_type);
CREATE INDEX IF NOT EXISTS idx_person_roles_reference ON person_roles(reference_table, reference_id);

-- Indexes for FKs on existing tables
CREATE INDEX IF NOT EXISTS idx_tenants_person_id ON tenants(person_id) WHERE person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_members_person_id ON staff_members(person_id) WHERE person_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_visitor_contacts_person_id ON visitor_contacts(person_id) WHERE person_id IS NOT NULL;

-- ============================================
-- 5. Enable RLS on people tables
-- ============================================
ALTER TABLE people ENABLE ROW LEVEL SECURITY;
ALTER TABLE person_roles ENABLE ROW LEVEL SECURITY;

-- People policies
CREATE POLICY "Owners can manage their people"
  ON people FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Platform admins can view all people"
  ON people FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- Person roles policies
CREATE POLICY "Owners can manage person roles"
  ON person_roles FOR ALL
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Platform admins can view all person roles"
  ON person_roles FOR SELECT
  USING (is_platform_admin(auth.uid()));

-- ============================================
-- 6. Create function to search people
-- ============================================
CREATE OR REPLACE FUNCTION search_people(
  p_owner_id UUID,
  p_search_term TEXT,
  p_tags TEXT[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  tags TEXT[],
  is_verified BOOLEAN,
  is_blocked BOOLEAN,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.phone,
    p.email,
    p.photo_url,
    p.tags,
    p.is_verified,
    p.is_blocked,
    p.created_at
  FROM people p
  WHERE p.owner_id = p_owner_id
    AND p.is_active = TRUE
    AND (
      p_search_term IS NULL
      OR p.name ILIKE '%' || p_search_term || '%'
      OR p.phone ILIKE '%' || p_search_term || '%'
      OR p.email ILIKE '%' || p_search_term || '%'
      OR p.aadhaar_number ILIKE '%' || p_search_term || '%'
    )
    AND (
      p_tags IS NULL
      OR p.tags && p_tags  -- Array overlap
    )
  ORDER BY
    p.name ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Create function to find or create person
-- ============================================
CREATE OR REPLACE FUNCTION find_or_create_person(
  p_owner_id UUID,
  p_name TEXT,
  p_phone TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL,
  p_source TEXT DEFAULT 'manual',
  p_source_id UUID DEFAULT NULL,
  p_tags TEXT[] DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  v_person_id UUID;
BEGIN
  -- First try to find existing person by phone (primary identifier)
  IF p_phone IS NOT NULL THEN
    SELECT id INTO v_person_id
    FROM people
    WHERE owner_id = p_owner_id
      AND phone = p_phone
    LIMIT 1;
  END IF;

  -- If not found by phone, try email
  IF v_person_id IS NULL AND p_email IS NOT NULL THEN
    SELECT id INTO v_person_id
    FROM people
    WHERE owner_id = p_owner_id
      AND email = p_email
      AND phone IS NULL  -- Only match if phone wasn't set
    LIMIT 1;
  END IF;

  -- If still not found, create new person
  IF v_person_id IS NULL THEN
    INSERT INTO people (owner_id, name, phone, email, source, source_id, tags)
    VALUES (p_owner_id, p_name, p_phone, p_email, p_source, p_source_id, p_tags)
    RETURNING id INTO v_person_id;
  ELSE
    -- Update tags if person exists (merge tags)
    UPDATE people
    SET tags = ARRAY(SELECT DISTINCT unnest(tags || p_tags)),
        updated_at = NOW()
    WHERE id = v_person_id;
  END IF;

  RETURN v_person_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. Create function to get person 360 view
-- ============================================
CREATE OR REPLACE FUNCTION get_person_360(
  p_person_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_person RECORD;
  v_roles JSONB;
  v_tenant_history JSONB;
  v_visit_history JSONB;
  v_staff_roles JSONB;
BEGIN
  -- Get person details
  SELECT * INTO v_person
  FROM people
  WHERE id = p_person_id;

  IF v_person IS NULL THEN
    RETURN NULL;
  END IF;

  -- Get all roles
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'role_type', role_type,
      'is_active', is_active,
      'started_at', started_at,
      'ended_at', ended_at,
      'reference_table', reference_table,
      'reference_id', reference_id
    )
  ), '[]'::jsonb) INTO v_roles
  FROM person_roles
  WHERE person_id = p_person_id;

  -- Get tenant history
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'property_name', p.name,
      'room_number', r.room_number,
      'check_in_date', t.check_in_date,
      'check_out_date', t.check_out_date,
      'status', t.status,
      'monthly_rent', t.monthly_rent
    ) ORDER BY t.check_in_date DESC
  ), '[]'::jsonb) INTO v_tenant_history
  FROM tenants t
  LEFT JOIN properties p ON t.property_id = p.id
  LEFT JOIN rooms r ON t.room_id = r.id
  WHERE t.person_id = p_person_id;

  -- Get visit history
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', v.id,
      'check_in_time', v.check_in_time,
      'check_out_time', v.check_out_time,
      'visitor_type', v.visitor_type,
      'purpose', v.purpose,
      'property_name', p.name
    ) ORDER BY v.check_in_time DESC
  ), '[]'::jsonb) INTO v_visit_history
  FROM visitors v
  LEFT JOIN visitor_contacts vc ON v.visitor_contact_id = vc.id
  LEFT JOIN properties p ON v.property_id = p.id
  WHERE vc.person_id = p_person_id;

  -- Build result
  v_result := jsonb_build_object(
    'person', row_to_json(v_person)::jsonb,
    'roles', v_roles,
    'tenant_history', v_tenant_history,
    'visit_history', v_visit_history,
    'summary', jsonb_build_object(
      'total_stays', (SELECT COUNT(*) FROM tenants WHERE person_id = p_person_id),
      'total_visits', (SELECT COALESCE(SUM(vc.visit_count), 0) FROM visitor_contacts vc WHERE vc.person_id = p_person_id),
      'is_current_tenant', EXISTS(SELECT 1 FROM tenants WHERE person_id = p_person_id AND status = 'active'),
      'is_staff', EXISTS(SELECT 1 FROM staff_members WHERE person_id = p_person_id AND is_active = TRUE)
    )
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. Create trigger to update updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_people_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_people_updated_at ON people;
CREATE TRIGGER trigger_people_updated_at
  BEFORE UPDATE ON people
  FOR EACH ROW
  EXECUTE FUNCTION update_people_updated_at();

-- ============================================
-- 10. Add comments for documentation
-- ============================================
COMMENT ON TABLE people IS 'Central identity registry - single source of truth for all persons';
COMMENT ON TABLE person_roles IS 'Tracks all roles/relationships a person has in the system';
COMMENT ON COLUMN people.phone IS 'Primary identifier - most reliable in India';
COMMENT ON COLUMN people.tags IS 'Classification tags: tenant, staff, visitor, vip, blocked, etc.';
COMMENT ON COLUMN people.source IS 'Origin of record: tenant, staff, visitor, manual, import';
COMMENT ON FUNCTION find_or_create_person IS 'Find existing person by phone/email or create new one';
COMMENT ON FUNCTION get_person_360 IS 'Get complete 360-degree view of a person including all roles and history';
