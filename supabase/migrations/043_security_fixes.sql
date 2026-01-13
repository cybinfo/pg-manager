-- ============================================
-- Migration 043: Security Fixes
-- ============================================
-- Fixes:
-- SEC-008: Audit trail tampering via overly permissive INSERT policy
-- ============================================

-- ============================================
-- SEC-008: Fix audit_events INSERT policy
-- ============================================
-- Problem: The current policy allows any authenticated user to create
-- audit events for ANY workspace as long as they set actor_id to their user ID.
-- This allows audit trail tampering.
--
-- Solution: Require that users can only create audit events for workspaces
-- they actually have access to (owner, staff with context, or platform admin).

DROP POLICY IF EXISTS audit_events_insert ON audit_events;
DROP POLICY IF EXISTS audit_events_insert_policy ON audit_events;

CREATE POLICY audit_events_insert_secure ON audit_events
  FOR INSERT
  WITH CHECK (
    -- User must be the actor (or system via service role)
    (actor_id = auth.uid() OR actor_id IS NULL)
    AND (
      -- Workspace owner (workspace_id = owner's user ID)
      workspace_id = auth.uid()
      -- OR user has an active context in the workspace
      OR EXISTS (
        SELECT 1 FROM user_contexts
        WHERE user_id = auth.uid()
        AND workspace_id = audit_events.workspace_id
        AND is_active = true
      )
      -- OR platform admin
      OR EXISTS (
        SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
      )
    )
  );

COMMENT ON POLICY audit_events_insert_secure ON audit_events IS
  'SEC-008: Secure INSERT policy - users can only create audit events for workspaces they have access to';

-- ============================================
-- DB-009: Add CHECK constraints for data validation
-- ============================================

-- Tenants: discount_percent must be 0-100
ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_discount_percent_check;
ALTER TABLE tenants ADD CONSTRAINT tenants_discount_percent_check
  CHECK (discount_percent IS NULL OR (discount_percent >= 0 AND discount_percent <= 100));

-- Bills: paid_amount and balance_due must be non-negative
ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_paid_amount_check;
ALTER TABLE bills ADD CONSTRAINT bills_paid_amount_check
  CHECK (paid_amount IS NULL OR paid_amount >= 0);

ALTER TABLE bills DROP CONSTRAINT IF EXISTS bills_balance_due_check;
ALTER TABLE bills ADD CONSTRAINT bills_balance_due_check
  CHECK (balance_due IS NULL OR balance_due >= 0);

-- Payments: amount must be positive
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_amount_check;
ALTER TABLE payments ADD CONSTRAINT payments_amount_check
  CHECK (amount > 0);

-- Refunds: amount must be positive
ALTER TABLE refunds DROP CONSTRAINT IF EXISTS refunds_amount_check;
ALTER TABLE refunds ADD CONSTRAINT refunds_amount_check
  CHECK (amount > 0);

-- tenant_risk_alerts: severity must be valid
ALTER TABLE tenant_risk_alerts DROP CONSTRAINT IF EXISTS tenant_risk_alerts_severity_check;
ALTER TABLE tenant_risk_alerts ADD CONSTRAINT tenant_risk_alerts_severity_check
  CHECK (severity IN ('low', 'medium', 'high', 'critical'));

COMMENT ON CONSTRAINT tenants_discount_percent_check ON tenants IS 'DB-009: Discount percent must be 0-100';
COMMENT ON CONSTRAINT bills_paid_amount_check ON bills IS 'DB-009: Paid amount cannot be negative';
COMMENT ON CONSTRAINT bills_balance_due_check ON bills IS 'DB-009: Balance due cannot be negative';
COMMENT ON CONSTRAINT payments_amount_check ON payments IS 'DB-009: Payment amount must be positive';
COMMENT ON CONSTRAINT refunds_amount_check ON refunds IS 'DB-009: Refund amount must be positive';
COMMENT ON CONSTRAINT tenant_risk_alerts_severity_check ON tenant_risk_alerts IS 'DB-009: Severity must be low, medium, high, or critical';

-- ============================================
-- DB-008: Add audit triggers to critical tables
-- ============================================
-- Note: universal_audit_trigger was reconciled in migration 042

-- Refunds audit trigger
DROP TRIGGER IF EXISTS refunds_audit_trigger ON refunds;
CREATE TRIGGER refunds_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON refunds
  FOR EACH ROW EXECUTE FUNCTION universal_audit_trigger();

-- Approvals audit trigger
DROP TRIGGER IF EXISTS approvals_audit_trigger ON approvals;
CREATE TRIGGER approvals_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON approvals
  FOR EACH ROW EXECUTE FUNCTION universal_audit_trigger();

-- Complaints audit trigger
DROP TRIGGER IF EXISTS complaints_audit_trigger ON complaints;
CREATE TRIGGER complaints_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON complaints
  FOR EACH ROW EXECUTE FUNCTION universal_audit_trigger();

-- Meter readings audit trigger
DROP TRIGGER IF EXISTS meter_readings_audit_trigger ON meter_readings;
CREATE TRIGGER meter_readings_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON meter_readings
  FOR EACH ROW EXECUTE FUNCTION universal_audit_trigger();
