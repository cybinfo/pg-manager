-- ============================================================================
-- Migration 071: Add left_date to library_members
-- ============================================================================
-- Tracks when a member explicitly left the library.
-- Used to distinguish "expired" (subscription ended) from "suspended" (member left).
-- When left_date is set, status should be "suspended".
-- When a suspended member renews, left_date should be cleared.
-- ============================================================================

-- Add left_date column
ALTER TABLE library_members ADD COLUMN IF NOT EXISTS left_date DATE;

-- Add index for queries filtering by left_date
CREATE INDEX IF NOT EXISTS idx_library_members_left_date
    ON library_members(left_date) WHERE left_date IS NOT NULL;

COMMENT ON COLUMN library_members.left_date IS
    'Date when member explicitly left the library. NULL = still enrolled or expired naturally. When set, status should be suspended.';
