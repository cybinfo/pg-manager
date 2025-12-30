-- Migration: Enhanced Tenant & Room Fields
-- Adds structured JSONB fields for multiple phones, emails, addresses, guardians
-- Also adds profile_photo field, room amenity columns, and property photo columns

-- ============================================
-- PROPERTY PHOTO COLUMNS
-- ============================================
-- Add cover_image and photos columns to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cover_image TEXT;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- ROOM AMENITY COLUMNS
-- ============================================
-- Add additional room amenity boolean columns (has_ac and has_attached_bathroom already exist)
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS has_wifi BOOLEAN DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS has_tv BOOLEAN DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS has_geyser BOOLEAN DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS has_balcony BOOLEAN DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS has_wardrobe BOOLEAN DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS has_study_table BOOLEAN DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS has_refrigerator BOOLEAN DEFAULT FALSE;

-- Add photos column for room photos
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]'::jsonb;

-- ============================================
-- TENANT ENHANCED FIELDS
-- ============================================

-- Add profile_photo column (separate from legacy photo_url)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS profile_photo TEXT;

-- Add phone_numbers JSONB array for multiple phone entries
-- Structure: [{ "number": "9876543210", "type": "primary", "is_primary": true, "is_whatsapp": true }]
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS phone_numbers JSONB DEFAULT '[]'::jsonb;

-- Add emails JSONB array for multiple email entries
-- Structure: [{ "email": "tenant@example.com", "type": "primary", "is_primary": true }]
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS emails JSONB DEFAULT '[]'::jsonb;

-- Add addresses JSONB array for multiple addresses
-- Structure: [{ "type": "Permanent", "line1": "...", "line2": "...", "city": "...", "state": "...", "zip": "...", "is_primary": true }]
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS addresses JSONB DEFAULT '[]'::jsonb;

-- Add guardian_contacts JSONB array for guardians/emergency contacts
-- Structure: [{ "name": "Parent Name", "relation": "Parent", "phone": "...", "email": "...", "is_primary": true }]
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS guardian_contacts JSONB DEFAULT '[]'::jsonb;

-- Create indexes for JSONB fields to improve query performance
CREATE INDEX IF NOT EXISTS idx_tenants_phone_numbers ON tenants USING GIN (phone_numbers);
CREATE INDEX IF NOT EXISTS idx_tenants_emails ON tenants USING GIN (emails);
CREATE INDEX IF NOT EXISTS idx_tenants_addresses ON tenants USING GIN (addresses);
CREATE INDEX IF NOT EXISTS idx_tenants_guardian_contacts ON tenants USING GIN (guardian_contacts);

-- Add comment explaining the migration
COMMENT ON COLUMN tenants.profile_photo IS 'URL to tenant profile photo (uploaded to Supabase storage)';
COMMENT ON COLUMN tenants.phone_numbers IS 'Array of phone numbers with type, primary flag, and WhatsApp indicator';
COMMENT ON COLUMN tenants.emails IS 'Array of email addresses with type and primary flag';
COMMENT ON COLUMN tenants.addresses IS 'Array of addresses (permanent, current, etc.) with full address fields';
COMMENT ON COLUMN tenants.guardian_contacts IS 'Array of guardian/emergency contacts with relation type';

-- Function to migrate existing data from custom_fields to new structured fields
-- This preserves backwards compatibility while enabling new features
CREATE OR REPLACE FUNCTION migrate_tenant_custom_fields()
RETURNS void AS $$
DECLARE
    tenant_rec RECORD;
BEGIN
    FOR tenant_rec IN
        SELECT id, phone, email, custom_fields, photo_url
        FROM tenants
        WHERE (phone_numbers IS NULL OR phone_numbers = '[]'::jsonb)
    LOOP
        -- Migrate primary phone to phone_numbers array if not already set
        IF tenant_rec.phone IS NOT NULL AND tenant_rec.phone != '' THEN
            UPDATE tenants
            SET phone_numbers = jsonb_build_array(
                jsonb_build_object(
                    'number', tenant_rec.phone,
                    'type', 'primary',
                    'is_primary', true,
                    'is_whatsapp', true
                )
            )
            WHERE id = tenant_rec.id AND (phone_numbers IS NULL OR phone_numbers = '[]'::jsonb);
        END IF;

        -- Migrate primary email to emails array if not already set
        IF tenant_rec.email IS NOT NULL AND tenant_rec.email != '' THEN
            UPDATE tenants
            SET emails = jsonb_build_array(
                jsonb_build_object(
                    'email', tenant_rec.email,
                    'type', 'primary',
                    'is_primary', true
                )
            )
            WHERE id = tenant_rec.id AND (emails IS NULL OR emails = '[]'::jsonb);
        END IF;

        -- Migrate photo_url to profile_photo if profile_photo is not set
        IF tenant_rec.photo_url IS NOT NULL AND tenant_rec.photo_url != '' THEN
            UPDATE tenants
            SET profile_photo = tenant_rec.photo_url
            WHERE id = tenant_rec.id AND (profile_photo IS NULL OR profile_photo = '');
        END IF;

        -- Migrate parent info from custom_fields to guardian_contacts
        IF tenant_rec.custom_fields IS NOT NULL AND
           (tenant_rec.custom_fields->>'parent_name' IS NOT NULL OR
            tenant_rec.custom_fields->>'parent_phone' IS NOT NULL) THEN
            UPDATE tenants
            SET guardian_contacts = jsonb_build_array(
                jsonb_build_object(
                    'name', COALESCE(tenant_rec.custom_fields->>'parent_name', ''),
                    'relation', 'Parent',
                    'phone', COALESCE(tenant_rec.custom_fields->>'parent_phone', ''),
                    'email', '',
                    'is_primary', true
                )
            )
            WHERE id = tenant_rec.id AND (guardian_contacts IS NULL OR guardian_contacts = '[]'::jsonb);
        END IF;

        -- Migrate permanent_address from custom_fields to addresses
        IF tenant_rec.custom_fields IS NOT NULL AND
           tenant_rec.custom_fields->>'permanent_address' IS NOT NULL THEN
            UPDATE tenants
            SET addresses = jsonb_build_array(
                jsonb_build_object(
                    'type', 'Permanent',
                    'line1', COALESCE(tenant_rec.custom_fields->>'permanent_address', ''),
                    'line2', '',
                    'city', '',
                    'state', '',
                    'zip', '',
                    'is_primary', true
                )
            )
            WHERE id = tenant_rec.id AND (addresses IS NULL OR addresses = '[]'::jsonb);
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Run the migration function
SELECT migrate_tenant_custom_fields();

-- Drop the migration function after use (optional, keeps database clean)
-- DROP FUNCTION migrate_tenant_custom_fields();
