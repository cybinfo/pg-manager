-- Migration: 066_add_composite_indexes.sql
-- Description: Add composite indexes for library query optimization
-- These indexes improve performance for common query patterns in library cron jobs and list pages

-- Library memberships: queried by (member_id, status) in expire-library-memberships cron
CREATE INDEX IF NOT EXISTS idx_library_memberships_member_status
ON library_memberships(member_id, status);

-- Library memberships: queried by (status, end_date) in expire-library-memberships cron
CREATE INDEX IF NOT EXISTS idx_library_memberships_status_end_date
ON library_memberships(status, end_date);

-- Library members: queried by (status, hours_balance) in library-notifications cron
CREATE INDEX IF NOT EXISTS idx_library_members_status_hours
ON library_members(status, hours_balance);
