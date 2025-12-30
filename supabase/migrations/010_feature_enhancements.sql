-- Feature Enhancements Migration
-- Adds: room type pricing, multiple contacts, addresses, photos, documents

-- ============================================
-- 1. ROOM TYPE PRICING CONFIGURATION
-- ============================================
ALTER TABLE owner_config ADD COLUMN IF NOT EXISTS room_type_pricing JSONB DEFAULT '{
  "single": {"rent": 8000, "deposit": 16000},
  "double": {"rent": 6000, "deposit": 12000},
  "triple": {"rent": 5000, "deposit": 10000},
  "dormitory": {"rent": 4000, "deposit": 8000}
}'::jsonb;

-- Address types configuration
ALTER TABLE owner_config ADD COLUMN IF NOT EXISTS address_types JSONB DEFAULT '["Permanent", "Current", "Office", "Native"]'::jsonb;

-- ============================================
-- 2. MULTIPLE CONTACT FIELDS FOR TENANTS
-- ============================================

-- Phone numbers array: [{number, type, is_primary, is_whatsapp}]
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone_numbers JSONB DEFAULT '[]'::jsonb;

-- Emails array: [{email, type, is_primary}]
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS emails JSONB DEFAULT '[]'::jsonb;

-- Multiple addresses: [{type, line1, line2, city, state, zip, is_primary}]
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '[]'::jsonb;

-- Guardian/Parent contacts: [{name, relation, phone, email, is_primary}]
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS guardian_contacts JSONB DEFAULT '[]'::jsonb;

-- Profile photo URL
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS profile_photo TEXT;

-- ============================================
-- 3. PHOTO STORAGE FOR PROPERTIES AND ROOMS
-- ============================================

-- Property photos gallery (cover_image already exists)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- Room photos gallery
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}';

-- ============================================
-- 4. TENANT DOCUMENTS TABLE (ID Proofs)
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,

    -- Document type: aadhar, pan, passport, voter_id, driving_license, other
    document_type TEXT NOT NULL,
    document_name TEXT, -- Custom name for 'other' type
    document_number TEXT,

    -- Multiple files per document
    file_urls TEXT[] DEFAULT '{}',

    -- Verification status
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES auth.users(id),

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_tenant_documents_tenant ON tenant_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_owner ON tenant_documents(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_type ON tenant_documents(document_type);

-- ============================================
-- 5. RLS POLICIES FOR TENANT DOCUMENTS
-- ============================================
ALTER TABLE tenant_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage tenant documents" ON tenant_documents
    FOR ALL USING (owner_id = auth.uid());

-- ============================================
-- 6. TRIGGER: Update updated_at
-- ============================================
CREATE TRIGGER update_tenant_documents_updated_at
    BEFORE UPDATE ON tenant_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 7. MIGRATE EXISTING DATA
-- ============================================
-- Migrate existing single phone to phone_numbers array
UPDATE tenants
SET phone_numbers = jsonb_build_array(
    jsonb_build_object(
        'number', phone,
        'type', 'primary',
        'is_primary', true,
        'is_whatsapp', true
    )
)
WHERE phone IS NOT NULL
AND phone != ''
AND (phone_numbers IS NULL OR phone_numbers = '[]'::jsonb);

-- Migrate existing single email to emails array
UPDATE tenants
SET emails = jsonb_build_array(
    jsonb_build_object(
        'email', email,
        'type', 'primary',
        'is_primary', true
    )
)
WHERE email IS NOT NULL
AND email != ''
AND (emails IS NULL OR emails = '[]'::jsonb);

-- Migrate existing custom_fields addresses to addresses array
UPDATE tenants
SET addresses = jsonb_build_array(
    jsonb_build_object(
        'type', 'Permanent',
        'line1', COALESCE(custom_fields->>'permanent_address', ''),
        'line2', '',
        'city', '',
        'state', '',
        'zip', '',
        'is_primary', true
    )
)
WHERE custom_fields->>'permanent_address' IS NOT NULL
AND custom_fields->>'permanent_address' != ''
AND (addresses IS NULL OR addresses = '[]'::jsonb);

-- Migrate existing parent info to guardian_contacts
UPDATE tenants
SET guardian_contacts = jsonb_build_array(
    jsonb_build_object(
        'name', COALESCE(custom_fields->>'parent_name', ''),
        'relation', 'Parent',
        'phone', COALESCE(custom_fields->>'parent_phone', ''),
        'email', '',
        'is_primary', true
    )
)
WHERE (custom_fields->>'parent_name' IS NOT NULL OR custom_fields->>'parent_phone' IS NOT NULL)
AND (custom_fields->>'parent_name' != '' OR custom_fields->>'parent_phone' != '')
AND (guardian_contacts IS NULL OR guardian_contacts = '[]'::jsonb);

-- ============================================
-- 8. ROOM TYPE DEFAULTS FUNCTION
-- ============================================
-- Function to get default pricing for a room type
CREATE OR REPLACE FUNCTION get_room_type_defaults(
    p_owner_id UUID,
    p_room_type TEXT
)
RETURNS TABLE (
    default_rent DECIMAL,
    default_deposit DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE((oc.room_type_pricing->p_room_type->>'rent')::DECIMAL,
            CASE p_room_type
                WHEN 'single' THEN 8000
                WHEN 'double' THEN 6000
                WHEN 'triple' THEN 5000
                WHEN 'dormitory' THEN 4000
                ELSE 6000
            END
        ) as default_rent,
        COALESCE((oc.room_type_pricing->p_room_type->>'deposit')::DECIMAL,
            CASE p_room_type
                WHEN 'single' THEN 16000
                WHEN 'double' THEN 12000
                WHEN 'triple' THEN 10000
                WHEN 'dormitory' THEN 8000
                ELSE 12000
            END
        ) as default_deposit
    FROM owner_config oc
    WHERE oc.owner_id = p_owner_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 9. HELPER FUNCTION: Get default bed count
-- ============================================
CREATE OR REPLACE FUNCTION get_default_bed_count(p_room_type TEXT)
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE p_room_type
        WHEN 'single' THEN 1
        WHEN 'double' THEN 2
        WHEN 'triple' THEN 3
        WHEN 'dormitory' THEN 6
        ELSE 1
    END;
END;
$$ LANGUAGE plpgsql;
