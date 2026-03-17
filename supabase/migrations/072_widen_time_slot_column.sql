-- ============================================================================
-- Migration 072: Widen time_slot column to TEXT for JSON storage
-- ============================================================================
-- time_slot was VARCHAR(20) which only fit preset names like "Morning".
-- New multi-slot format stores JSON arrays like:
--   [{"start":"09:00","end":"12:00"},{"start":"16:00","end":"18:00"}]
-- which exceeds 20 characters.
-- ============================================================================

ALTER TABLE library_memberships ALTER COLUMN time_slot TYPE TEXT;

-- Also widen on library_members.preferred_slot for consistency
ALTER TABLE library_members ALTER COLUMN preferred_slot TYPE TEXT;
