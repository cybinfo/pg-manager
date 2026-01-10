-- =============================================
-- Migration: 041_tenant_journey_analytics
-- Description: Tables for tenant journey tracking, risk alerts, and communications
-- =============================================

-- =============================================
-- 1. Tenant Risk Alerts Table
-- =============================================
-- Stores automated risk alerts for tenants based on analytics

CREATE TABLE IF NOT EXISTS tenant_risk_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- Alert classification
    alert_type TEXT NOT NULL, -- 'payment_delay', 'complaint_unresolved', 'deposit_low', 'churn_risk', 'agreement_expiry', 'overdue'
    severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

    -- Alert content
    title TEXT NOT NULL,
    description TEXT,

    -- Alert data (JSON for flexibility)
    data JSONB DEFAULT '{}'::jsonb,
    -- Example data:
    -- {
    --   "consecutive_late_payments": 3,
    --   "last_payment_date": "2024-01-15",
    --   "days_overdue": 15,
    --   "amount_overdue": 12500
    -- }

    -- Status management
    status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'resolved', 'dismissed', 'expired'
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by UUID REFERENCES auth.users(id),
    resolved_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    dismissed_by UUID REFERENCES auth.users(id),
    dismiss_reason TEXT,

    -- Recurrence prevention
    alert_hash TEXT, -- Hash of alert_type + tenant_id + relevant data to prevent duplicates

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ, -- Auto-dismiss after this time

    -- Unique constraint to prevent duplicate alerts
    UNIQUE(owner_id, tenant_id, alert_hash)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_risk_alerts_tenant ON tenant_risk_alerts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_owner_status ON tenant_risk_alerts(owner_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_workspace ON tenant_risk_alerts(workspace_id, status);
CREATE INDEX IF NOT EXISTS idx_risk_alerts_severity ON tenant_risk_alerts(severity) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_risk_alerts_type ON tenant_risk_alerts(alert_type) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_risk_alerts_expires ON tenant_risk_alerts(expires_at) WHERE status = 'active' AND expires_at IS NOT NULL;

-- RLS Policies
ALTER TABLE tenant_risk_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_risk_alerts_select_policy" ON tenant_risk_alerts
    FOR SELECT USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_contexts uc
            WHERE uc.user_id = auth.uid()
            AND uc.workspace_id = tenant_risk_alerts.workspace_id
            AND uc.is_active = true
        )
        OR is_platform_admin(auth.uid())
    );

CREATE POLICY "tenant_risk_alerts_insert_policy" ON tenant_risk_alerts
    FOR INSERT WITH CHECK (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_contexts uc
            WHERE uc.user_id = auth.uid()
            AND uc.workspace_id = tenant_risk_alerts.workspace_id
            AND uc.is_active = true
        )
    );

CREATE POLICY "tenant_risk_alerts_update_policy" ON tenant_risk_alerts
    FOR UPDATE USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_contexts uc
            WHERE uc.user_id = auth.uid()
            AND uc.workspace_id = tenant_risk_alerts.workspace_id
            AND uc.is_active = true
        )
    );

CREATE POLICY "tenant_risk_alerts_delete_policy" ON tenant_risk_alerts
    FOR DELETE USING (owner_id = auth.uid());

-- =============================================
-- 2. Communications Table
-- =============================================
-- Tracks all communications with tenants (WhatsApp, Email, SMS, etc.)

CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Target
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    recipient_type TEXT NOT NULL, -- 'tenant', 'guardian', 'other'
    recipient_name TEXT,
    recipient_phone TEXT,
    recipient_email TEXT,

    -- Communication details
    channel TEXT NOT NULL, -- 'whatsapp', 'email', 'sms', 'in_app', 'push', 'call'
    direction TEXT NOT NULL DEFAULT 'outbound', -- 'outbound', 'inbound'
    message_type TEXT NOT NULL, -- 'receipt', 'reminder', 'notice', 'bill', 'welcome', 'alert', 'custom'

    -- Content
    subject TEXT,
    message_preview TEXT, -- First 200 chars
    template_id TEXT, -- If using message templates

    -- Related entity
    related_entity_type TEXT, -- 'bill', 'payment', 'complaint', 'notice', 'exit_clearance'
    related_entity_id UUID,

    -- Status tracking
    status TEXT DEFAULT 'sent', -- 'pending', 'sent', 'delivered', 'read', 'failed', 'clicked'

    -- Delivery timestamps
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,

    -- Error tracking
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    -- Metadata (for provider-specific data)
    metadata JSONB DEFAULT '{}'::jsonb,
    -- Example metadata:
    -- {
    --   "whatsapp_message_id": "...",
    --   "email_provider_id": "...",
    --   "click_url": "...",
    --   "template_used": "payment_receipt",
    --   "variables": { "amount": "12500", "tenant_name": "John" }
    -- }

    -- Audit
    sent_by UUID REFERENCES auth.users(id),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_communications_tenant ON communications(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_owner ON communications(owner_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_workspace ON communications(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_communications_channel ON communications(channel);
CREATE INDEX IF NOT EXISTS idx_communications_type ON communications(message_type);
CREATE INDEX IF NOT EXISTS idx_communications_status ON communications(status) WHERE status NOT IN ('delivered', 'read');
CREATE INDEX IF NOT EXISTS idx_communications_related ON communications(related_entity_type, related_entity_id);

-- RLS Policies
ALTER TABLE communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "communications_select_policy" ON communications
    FOR SELECT USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_contexts uc
            WHERE uc.user_id = auth.uid()
            AND uc.workspace_id = communications.workspace_id
            AND uc.is_active = true
        )
        OR is_platform_admin(auth.uid())
    );

CREATE POLICY "communications_insert_policy" ON communications
    FOR INSERT WITH CHECK (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_contexts uc
            WHERE uc.user_id = auth.uid()
            AND uc.workspace_id = communications.workspace_id
            AND uc.is_active = true
        )
    );

-- =============================================
-- 3. Visitor Linking Columns
-- =============================================
-- Add columns to visitors table for tenant linkage

ALTER TABLE visitors
ADD COLUMN IF NOT EXISTS linked_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS link_method TEXT DEFAULT NULL, -- 'auto_phone', 'auto_email', 'manual'
ADD COLUMN IF NOT EXISTS link_confidence TEXT DEFAULT NULL, -- 'high', 'medium', 'low'
ADD COLUMN IF NOT EXISTS linked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS linked_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_visitors_linked_tenant ON visitors(linked_tenant_id) WHERE linked_tenant_id IS NOT NULL;

-- =============================================
-- 4. Tenant Analytics Score Columns (Optional)
-- =============================================
-- Add cached score columns to tenants table for quick access

ALTER TABLE tenants
ADD COLUMN IF NOT EXISTS payment_reliability_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS churn_risk_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS satisfaction_score INTEGER DEFAULT NULL,
ADD COLUMN IF NOT EXISTS scores_updated_at TIMESTAMPTZ DEFAULT NULL;

-- Index for score-based queries
CREATE INDEX IF NOT EXISTS idx_tenants_payment_score ON tenants(payment_reliability_score) WHERE payment_reliability_score IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tenants_churn_score ON tenants(churn_risk_score) WHERE churn_risk_score IS NOT NULL;

-- =============================================
-- 5. Helper Functions
-- =============================================

-- Function to auto-expire old alerts
CREATE OR REPLACE FUNCTION expire_old_risk_alerts()
RETURNS void AS $$
BEGIN
    UPDATE tenant_risk_alerts
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'active'
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to create risk alert (prevents duplicates)
CREATE OR REPLACE FUNCTION create_risk_alert(
    p_owner_id UUID,
    p_workspace_id UUID,
    p_tenant_id UUID,
    p_alert_type TEXT,
    p_severity TEXT,
    p_title TEXT,
    p_description TEXT,
    p_data JSONB DEFAULT '{}'::jsonb,
    p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_alert_hash TEXT;
    v_alert_id UUID;
BEGIN
    -- Generate hash from type, tenant, and key data points
    v_alert_hash := md5(p_alert_type || '::' || p_tenant_id::text || '::' || COALESCE(p_data->>'key', ''));

    -- Insert or update (upsert)
    INSERT INTO tenant_risk_alerts (
        owner_id, workspace_id, tenant_id, alert_type, severity,
        title, description, data, alert_hash, expires_at
    ) VALUES (
        p_owner_id, p_workspace_id, p_tenant_id, p_alert_type, p_severity,
        p_title, p_description, p_data, v_alert_hash, p_expires_at
    )
    ON CONFLICT (owner_id, tenant_id, alert_hash)
    DO UPDATE SET
        severity = EXCLUDED.severity,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        data = EXCLUDED.data,
        updated_at = NOW(),
        status = 'active' -- Reactivate if previously dismissed
    WHERE tenant_risk_alerts.status != 'resolved'
    RETURNING id INTO v_alert_id;

    RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. Updated At Triggers
-- =============================================

CREATE TRIGGER update_tenant_risk_alerts_updated_at
    BEFORE UPDATE ON tenant_risk_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Comments
-- =============================================

COMMENT ON TABLE tenant_risk_alerts IS 'Automated risk alerts for tenants based on payment patterns, complaints, and other factors';
COMMENT ON TABLE communications IS 'Tracks all communications with tenants across channels (WhatsApp, Email, SMS, etc.)';
COMMENT ON COLUMN visitors.linked_tenant_id IS 'If this visitor later became a tenant, links to that tenant record';
COMMENT ON COLUMN tenants.payment_reliability_score IS 'Cached payment reliability score (0-100) for quick access';
COMMENT ON COLUMN tenants.churn_risk_score IS 'Cached churn risk score (0-100) for quick access';
