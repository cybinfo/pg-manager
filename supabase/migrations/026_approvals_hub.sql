-- ============================================
-- Migration 026: Approvals Hub
-- ============================================
-- Tenant request workflow for name changes, address changes, etc.
-- ============================================

-- Create approvals table
CREATE TABLE IF NOT EXISTS approvals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Who is requesting
    requester_tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,

    -- What type of request
    type TEXT NOT NULL CHECK (type IN ('name_change', 'address_change', 'phone_change', 'email_change', 'room_change', 'complaint', 'other')),

    -- Request details
    title TEXT NOT NULL,
    description TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- payload structure varies by type:
    -- name_change: { current_name, new_name }
    -- address_change: { current_address, new_address }
    -- phone_change: { current_phone, new_phone }
    -- room_change: { current_room_id, requested_room_id, reason }

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
    priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),

    -- Decision details
    decided_by UUID REFERENCES auth.users(id),
    decided_at TIMESTAMPTZ,
    decision_notes TEXT,

    -- If approved, was the change applied?
    change_applied BOOLEAN DEFAULT FALSE,
    applied_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_approvals_workspace ON approvals(workspace_id);
CREATE INDEX IF NOT EXISTS idx_approvals_tenant ON approvals(requester_tenant_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON approvals(status);
CREATE INDEX IF NOT EXISTS idx_approvals_type ON approvals(type);
CREATE INDEX IF NOT EXISTS idx_approvals_created ON approvals(created_at DESC);

-- RLS Policies
ALTER TABLE approvals ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Owners can view all approvals in their workspace" ON approvals;
DROP POLICY IF EXISTS "Owners can manage approvals" ON approvals;
DROP POLICY IF EXISTS "Staff can view approvals" ON approvals;
DROP POLICY IF EXISTS "Tenants can view own approvals" ON approvals;
DROP POLICY IF EXISTS "Tenants can create approvals" ON approvals;

-- Owners can view and manage all approvals in their workspace
CREATE POLICY "Owners can view all approvals in their workspace"
ON approvals FOR SELECT
TO authenticated
USING (
    owner_id IN (SELECT id FROM owners WHERE id = auth.uid())
);

CREATE POLICY "Owners can manage approvals"
ON approvals FOR ALL
TO authenticated
USING (
    owner_id IN (SELECT id FROM owners WHERE id = auth.uid())
)
WITH CHECK (
    owner_id IN (SELECT id FROM owners WHERE id = auth.uid())
);

-- Staff can view approvals (based on permissions - handled in app)
CREATE POLICY "Staff can view approvals"
ON approvals FOR SELECT
TO authenticated
USING (
    workspace_id IN (
        SELECT workspace_id FROM user_contexts
        WHERE user_id = auth.uid()
        AND context_type = 'staff'
    )
);

-- Tenants can view their own approvals (tenant must have user_id matching auth.uid())
CREATE POLICY "Tenants can view own approvals"
ON approvals FOR SELECT
TO authenticated
USING (
    requester_tenant_id IN (
        SELECT id FROM tenants WHERE user_id = auth.uid()
    )
);

-- Tenants can create approvals for themselves
CREATE POLICY "Tenants can create approvals"
ON approvals FOR INSERT
TO authenticated
WITH CHECK (
    requester_tenant_id IN (
        SELECT id FROM tenants WHERE user_id = auth.uid()
    )
);

-- Updated at trigger
CREATE TRIGGER update_approvals_updated_at
    BEFORE UPDATE ON approvals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to apply approved changes
CREATE OR REPLACE FUNCTION apply_approval_change(p_approval_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_approval RECORD;
BEGIN
    -- Get the approval
    SELECT * INTO v_approval FROM approvals WHERE id = p_approval_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Approval not found';
    END IF;

    IF v_approval.status != 'approved' THEN
        RAISE EXCEPTION 'Can only apply approved requests';
    END IF;

    IF v_approval.change_applied THEN
        RAISE EXCEPTION 'Change already applied';
    END IF;

    -- Apply the change based on type
    CASE v_approval.type
        WHEN 'name_change' THEN
            UPDATE tenants
            SET name = v_approval.payload->>'new_name'
            WHERE id = v_approval.requester_tenant_id;

        WHEN 'phone_change' THEN
            UPDATE tenants
            SET phone = v_approval.payload->>'new_phone'
            WHERE id = v_approval.requester_tenant_id;

        WHEN 'email_change' THEN
            UPDATE tenants
            SET email = v_approval.payload->>'new_email'
            WHERE id = v_approval.requester_tenant_id;

        ELSE
            -- For other types, just mark as applied (manual handling)
            NULL;
    END CASE;

    -- Mark as applied
    UPDATE approvals
    SET change_applied = TRUE, applied_at = NOW()
    WHERE id = p_approval_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute
GRANT EXECUTE ON FUNCTION apply_approval_change(UUID) TO authenticated;

-- ============================================
-- Done
-- ============================================
