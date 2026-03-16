-- Migration 068: Library plans audit trigger + library_members indexes
--
-- 1. Add audit trigger to library_plans (was missing from migration 061)
-- 2. Add email index on library_members for cron notification lookups
-- 3. Add composite index for active members with hours balance (cron performance)

-- 1. Audit trigger for library_plans
CREATE TRIGGER audit_library_plans
    AFTER INSERT OR UPDATE OR DELETE ON library_plans
    FOR EACH ROW EXECUTE FUNCTION universal_audit_trigger();

-- 2. Email index on library_members
CREATE INDEX IF NOT EXISTS idx_library_members_email
    ON library_members(email) WHERE email IS NOT NULL;

-- 3. Composite index for cron notification queries (active members with low hours)
CREATE INDEX IF NOT EXISTS idx_library_members_status_hours_balance
    ON library_members(status, hours_balance) WHERE status = 'active';
