-- ============================================
-- Migration 016: Audit Logging System
-- ============================================
-- Global, immutable audit trail for all actions
-- Supports RBAC-aware queries and superuser access
-- ============================================

-- ============================================
-- 1. CREATE AUDIT_EVENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- When the action occurred
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Who performed the action
    actor_user_id UUID NOT NULL REFERENCES auth.users(id),
    actor_context_id UUID REFERENCES user_contexts(id), -- Which context they were using

    -- What action was performed
    action TEXT NOT NULL, -- 'create', 'update', 'delete', 'login', 'logout', 'context_switch', etc.

    -- What entity was affected
    entity_type TEXT NOT NULL, -- 'tenant', 'bill', 'payment', 'room', 'property', 'staff', etc.
    entity_id TEXT NOT NULL,   -- UUID or composite key as string

    -- State changes (for CRUD operations)
    before_state JSONB,        -- Previous state (for update/delete)
    after_state JSONB,         -- New state (for create/update)

    -- Context
    workspace_id UUID REFERENCES workspaces(id), -- Which workspace (null for platform-level events)

    -- Request metadata
    request_id TEXT,           -- For correlating multiple events in single request
    ip_address INET,           -- Client IP
    user_agent TEXT,           -- Browser/client info

    -- Additional context
    metadata JSONB DEFAULT '{}'::jsonb -- Extra info (e.g., reason, notes)
);

-- Make table append-only (no updates or deletes)
-- This is enforced via RLS policies below

-- ============================================
-- 2. INDEXES FOR EFFICIENT QUERYING
-- ============================================

-- Primary query patterns
CREATE INDEX IF NOT EXISTS idx_audit_events_workspace_occurred
    ON audit_events(workspace_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_actor
    ON audit_events(actor_user_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_entity
    ON audit_events(entity_type, entity_id, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_events_action
    ON audit_events(action, occurred_at DESC);

-- For time-based queries
CREATE INDEX IF NOT EXISTS idx_audit_events_occurred_at
    ON audit_events(occurred_at DESC);

-- For searching in metadata
CREATE INDEX IF NOT EXISTS idx_audit_events_metadata
    ON audit_events USING gin(metadata);

-- ============================================
-- 3. ENABLE RLS
-- ============================================
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS POLICIES
-- ============================================

-- Drop existing policies if any
DROP POLICY IF EXISTS "audit_events_insert_policy" ON audit_events;
DROP POLICY IF EXISTS "audit_events_select_policy" ON audit_events;
DROP POLICY IF EXISTS "audit_events_no_update" ON audit_events;
DROP POLICY IF EXISTS "audit_events_no_delete" ON audit_events;

-- Insert: Only authenticated users can create audit events
CREATE POLICY "audit_events_insert_policy"
ON audit_events FOR INSERT
TO authenticated
WITH CHECK (
    actor_user_id = auth.uid()
);

-- Select: Users can only see audit events for workspaces they belong to
-- Platform admins (to be added in migration 017) can see all
CREATE POLICY "audit_events_select_policy"
ON audit_events FOR SELECT
TO authenticated
USING (
    -- User can see events in workspaces they're a member of
    workspace_id IN (
        SELECT workspace_id FROM user_contexts
        WHERE user_id = auth.uid()
    )
    -- Or platform-level events they created
    OR (workspace_id IS NULL AND actor_user_id = auth.uid())
);

-- No updates allowed - audit trail is immutable
CREATE POLICY "audit_events_no_update"
ON audit_events FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

-- No deletes allowed - audit trail is immutable
CREATE POLICY "audit_events_no_delete"
ON audit_events FOR DELETE
TO authenticated
USING (false);

-- ============================================
-- 5. HELPER FUNCTION TO LOG AUDIT EVENTS
-- ============================================

CREATE OR REPLACE FUNCTION log_audit_event(
    p_action TEXT,
    p_entity_type TEXT,
    p_entity_id TEXT,
    p_workspace_id UUID DEFAULT NULL,
    p_before_state JSONB DEFAULT NULL,
    p_after_state JSONB DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
    v_context_id UUID;
    v_event_id UUID;
BEGIN
    -- Get current user's active context (if any)
    SELECT id INTO v_context_id
    FROM user_contexts
    WHERE user_id = auth.uid()
    AND is_current = true
    LIMIT 1;

    -- Insert audit event
    INSERT INTO audit_events (
        actor_user_id,
        actor_context_id,
        action,
        entity_type,
        entity_id,
        workspace_id,
        before_state,
        after_state,
        metadata
    ) VALUES (
        auth.uid(),
        v_context_id,
        p_action,
        p_entity_type,
        p_entity_id,
        p_workspace_id,
        p_before_state,
        p_after_state,
        p_metadata
    )
    RETURNING id INTO v_event_id;

    RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 6. TRIGGER FUNCTION FOR AUTOMATIC LOGGING
-- ============================================
-- This can be attached to any table for automatic audit logging

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
    v_old_data JSONB;
    v_new_data JSONB;
    v_workspace_id UUID;
BEGIN
    -- Determine action
    IF TG_OP = 'INSERT' THEN
        v_action := 'create';
        v_old_data := NULL;
        v_new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'update';
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'delete';
        v_old_data := to_jsonb(OLD);
        v_new_data := NULL;
    END IF;

    -- Try to get workspace_id from the record
    -- This assumes tables have owner_id or workspace_id column
    IF TG_OP = 'DELETE' THEN
        IF OLD ? 'workspace_id' THEN
            v_workspace_id := (OLD->>'workspace_id')::UUID;
        ELSIF OLD ? 'owner_id' THEN
            -- Get workspace_id from owner
            SELECT w.id INTO v_workspace_id
            FROM workspaces w
            JOIN owners o ON o.user_id = w.owner_id
            WHERE o.id = (OLD->>'owner_id')::UUID
            LIMIT 1;
        END IF;
    ELSE
        IF NEW ? 'workspace_id' THEN
            v_workspace_id := (NEW->>'workspace_id')::UUID;
        ELSIF NEW ? 'owner_id' THEN
            -- Get workspace_id from owner
            SELECT w.id INTO v_workspace_id
            FROM workspaces w
            JOIN owners o ON o.user_id = w.owner_id
            WHERE o.id = (NEW->>'owner_id')::UUID
            LIMIT 1;
        END IF;
    END IF;

    -- Log the event (only if user is authenticated)
    IF auth.uid() IS NOT NULL THEN
        PERFORM log_audit_event(
            v_action,
            TG_TABLE_NAME,
            COALESCE(NEW.id::TEXT, OLD.id::TEXT),
            v_workspace_id,
            v_old_data,
            v_new_data,
            jsonb_build_object('table_schema', TG_TABLE_SCHEMA)
        );
    END IF;

    -- Return appropriate value
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. ATTACH AUDIT TRIGGERS TO KEY TABLES
-- ============================================
-- Note: Only attaching to most critical tables initially
-- Add more tables as needed

-- Tenants (critical data)
DROP TRIGGER IF EXISTS audit_tenants ON tenants;
CREATE TRIGGER audit_tenants
    AFTER INSERT OR UPDATE OR DELETE ON tenants
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Bills (financial)
DROP TRIGGER IF EXISTS audit_bills ON bills;
CREATE TRIGGER audit_bills
    AFTER INSERT OR UPDATE OR DELETE ON bills
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Payments (financial)
DROP TRIGGER IF EXISTS audit_payments ON payments;
CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Staff (access control)
DROP TRIGGER IF EXISTS audit_staff ON staff;
CREATE TRIGGER audit_staff
    AFTER INSERT OR UPDATE OR DELETE ON staff
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- User roles (access control)
DROP TRIGGER IF EXISTS audit_user_roles ON user_roles;
CREATE TRIGGER audit_user_roles
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Roles (access control)
DROP TRIGGER IF EXISTS audit_roles ON roles;
CREATE TRIGGER audit_roles
    AFTER INSERT OR UPDATE OR DELETE ON roles
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Properties (core data)
DROP TRIGGER IF EXISTS audit_properties ON properties;
CREATE TRIGGER audit_properties
    AFTER INSERT OR UPDATE OR DELETE ON properties
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Rooms (core data)
DROP TRIGGER IF EXISTS audit_rooms ON rooms;
CREATE TRIGGER audit_rooms
    AFTER INSERT OR UPDATE OR DELETE ON rooms
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- Exit clearance (tenant lifecycle)
DROP TRIGGER IF EXISTS audit_exit_clearance ON exit_clearance;
CREATE TRIGGER audit_exit_clearance
    AFTER INSERT OR UPDATE OR DELETE ON exit_clearance
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================
-- 8. VIEW FOR EASY QUERYING
-- ============================================

CREATE OR REPLACE VIEW audit_events_view AS
SELECT
    ae.id,
    ae.occurred_at,
    ae.action,
    ae.entity_type,
    ae.entity_id,
    ae.before_state,
    ae.after_state,
    ae.metadata,
    ae.ip_address,
    ae.user_agent,
    -- Actor info
    up.name AS actor_name,
    up.email AS actor_email,
    -- Context info
    CASE
        WHEN uc.context_type = 'owner' THEN 'Owner'
        WHEN uc.context_type = 'staff' THEN 'Staff'
        WHEN uc.context_type = 'tenant' THEN 'Tenant'
        ELSE 'Unknown'
    END AS actor_role,
    -- Workspace info
    w.name AS workspace_name
FROM audit_events ae
LEFT JOIN user_profiles up ON up.user_id = ae.actor_user_id
LEFT JOIN user_contexts uc ON uc.id = ae.actor_context_id
LEFT JOIN workspaces w ON w.id = ae.workspace_id;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE audit_events IS 'Immutable audit trail for all system actions';
COMMENT ON COLUMN audit_events.action IS 'Action type: create, update, delete, login, logout, context_switch, etc.';
COMMENT ON COLUMN audit_events.entity_type IS 'Table/entity name: tenant, bill, payment, room, property, staff, etc.';
COMMENT ON COLUMN audit_events.before_state IS 'Previous state of the entity (for update/delete)';
COMMENT ON COLUMN audit_events.after_state IS 'New state of the entity (for create/update)';
COMMENT ON COLUMN audit_events.metadata IS 'Additional context like reason, notes, source';
COMMENT ON FUNCTION log_audit_event IS 'Helper function to log audit events programmatically';
COMMENT ON FUNCTION audit_trigger_function IS 'Trigger function for automatic audit logging on tables';
