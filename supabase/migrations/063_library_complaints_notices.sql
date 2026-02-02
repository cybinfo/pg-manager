-- ============================================================================
-- Migration: 063_library_complaints_notices.sql
-- Description: Add library support to complaints and notices tables
-- Author: Claude
-- Date: 2026-02-02
-- ============================================================================

-- ============================================================================
-- 1. COMPLAINTS - Add library_id column
-- ============================================================================
ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS library_id UUID REFERENCES libraries(id);

-- Index for library-based queries
CREATE INDEX IF NOT EXISTS idx_complaints_library ON complaints(library_id) WHERE library_id IS NOT NULL AND deleted_at IS NULL;

-- ============================================================================
-- 2. NOTICES - Add library_id column
-- ============================================================================
ALTER TABLE notices
ADD COLUMN IF NOT EXISTS library_id UUID REFERENCES libraries(id);

-- Index for library-based queries
CREATE INDEX IF NOT EXISTS idx_notices_library ON notices(library_id) WHERE library_id IS NOT NULL AND deleted_at IS NULL;

-- ============================================================================
-- 3. Update RLS policies to include library access
-- ============================================================================

-- Note: Existing RLS policies check owner_id which will continue to work.
-- Library members can access complaints/notices via the owner_id relationship.

-- ============================================================================
-- 4. Add check constraint to ensure either property_id or library_id is set
-- ============================================================================

-- For complaints - one of property_id or library_id should be set (but not both required)
-- This allows flexibility for complaints that may be general to the workspace
-- ALTER TABLE complaints ADD CONSTRAINT chk_complaints_entity
--   CHECK (property_id IS NOT NULL OR library_id IS NOT NULL);

-- For notices - same flexibility
-- ALTER TABLE notices ADD CONSTRAINT chk_notices_entity
--   CHECK (property_id IS NOT NULL OR library_id IS NOT NULL);
