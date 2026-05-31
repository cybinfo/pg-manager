-- =============================================================
-- Migration 088: Simplify Business Hierarchy
-- Remove the Locations layer. Entities (properties, libraries)
-- link directly to a Business. Add registered address fields
-- to businesses table.
-- =============================================================

-- 1. Add registered address to businesses
ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS reg_address TEXT,
  ADD COLUMN IF NOT EXISTS reg_city    TEXT,
  ADD COLUMN IF NOT EXISTS reg_state   TEXT,
  ADD COLUMN IF NOT EXISTS reg_pincode TEXT;

-- 2. Add business_id to properties and libraries (nullable initially)
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);

ALTER TABLE libraries
  ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES businesses(id);

-- 3. Remove the location_id columns added in migration 087
ALTER TABLE properties DROP COLUMN IF EXISTS location_id;
ALTER TABLE libraries  DROP COLUMN IF EXISTS location_id;

-- 4. Drop location-related indexes
DROP INDEX IF EXISTS idx_locations_business_id;
DROP INDEX IF EXISTS idx_locations_workspace_id;
DROP INDEX IF EXISTS idx_locations_owner_id;
DROP INDEX IF EXISTS idx_locations_active;
DROP INDEX IF EXISTS idx_properties_location_id;
DROP INDEX IF EXISTS idx_libraries_location_id;

-- 5. Drop audit trigger before dropping table
DROP TRIGGER IF EXISTS audit_locations ON locations;

-- 6. Drop the locations table
DROP TABLE IF EXISTS locations;

-- 7. Add indexes for the new FK columns
CREATE INDEX IF NOT EXISTS idx_properties_business_id
  ON properties(business_id) WHERE business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_libraries_business_id
  ON libraries(business_id) WHERE business_id IS NOT NULL;
