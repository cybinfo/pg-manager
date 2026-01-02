-- ============================================
-- Migration 017: Platform Admin (Superuser) System
-- ============================================
-- Global admin with cross-workspace access
-- Includes ability to delete payments for troubleshooting
-- ============================================

-- ============================================
-- 1. CREATE PLATFORM_ADMINS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS platform_admins (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    notes TEXT
);

-- Enable RLS
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view the table
CREATE POLICY "platform_admins_select_policy"
ON platform_admins FOR SELECT
TO authenticated
USING (
    -- Only platform admins can see the list
    auth.uid() IN (SELECT user_id FROM platform_admins)
);

-- No direct modifications via client - use server actions
CREATE POLICY "platform_admins_no_insert_policy"
ON platform_admins FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "platform_admins_no_update_policy"
ON platform_admins FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "platform_admins_no_delete_policy"
ON platform_admins FOR DELETE
TO authenticated
USING (false);

-- ============================================
-- 2. HELPER FUNCTION TO CHECK PLATFORM ADMIN
-- ============================================
CREATE OR REPLACE FUNCTION is_platform_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM platform_admins
        WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 3. UPDATE AUDIT_EVENTS RLS FOR SUPERUSER ACCESS
-- ============================================
DROP POLICY IF EXISTS "audit_events_select_policy" ON audit_events;

CREATE POLICY "audit_events_select_policy"
ON audit_events FOR SELECT
TO authenticated
USING (
    -- Platform admin can see all events
    is_platform_admin(auth.uid())
    -- Or user can see events in workspaces they belong to
    OR workspace_id IN (
        SELECT workspace_id FROM user_contexts
        WHERE user_id = auth.uid()
    )
    -- Or platform-level events they created
    OR (workspace_id IS NULL AND actor_user_id = auth.uid())
);

-- ============================================
-- 4. ADD SUPERUSER BYPASS TO KEY TABLES
-- ============================================

-- Update policies for tenants table
DROP POLICY IF EXISTS "Owners can view their tenants" ON tenants;
CREATE POLICY "Owners can view their tenants"
ON tenants FOR SELECT
TO authenticated
USING (
    is_platform_admin(auth.uid())
    OR owner_id IN (
        SELECT id FROM owners WHERE id = auth.uid()
    )
    OR owner_id IN (
        SELECT o.id FROM owners o
        JOIN workspaces w ON w.owner_user_id = o.id
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.context_type = 'staff'
    )
);

-- Update policies for bills table
DROP POLICY IF EXISTS "Owners can view their bills" ON bills;
CREATE POLICY "Owners can view their bills"
ON bills FOR SELECT
TO authenticated
USING (
    is_platform_admin(auth.uid())
    OR owner_id IN (
        SELECT id FROM owners WHERE id = auth.uid()
    )
    OR owner_id IN (
        SELECT o.id FROM owners o
        JOIN workspaces w ON w.owner_user_id = o.id
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.context_type = 'staff'
    )
);

-- Update policies for payments table (including delete for superuser)
DROP POLICY IF EXISTS "Owners can view their payments" ON payments;
CREATE POLICY "Owners can view their payments"
ON payments FOR SELECT
TO authenticated
USING (
    is_platform_admin(auth.uid())
    OR owner_id IN (
        SELECT id FROM owners WHERE id = auth.uid()
    )
    OR owner_id IN (
        SELECT o.id FROM owners o
        JOIN workspaces w ON w.owner_user_id = o.id
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.context_type = 'staff'
    )
);

-- Allow platform admins to delete payments (for troubleshooting)
DROP POLICY IF EXISTS "Owners can delete their payments" ON payments;
CREATE POLICY "Owners can delete their payments"
ON payments FOR DELETE
TO authenticated
USING (
    -- Only platform admins can delete payments
    is_platform_admin(auth.uid())
    -- Or owners can delete their own payments
    OR owner_id IN (
        SELECT id FROM owners WHERE id = auth.uid()
    )
);

-- Update policies for properties table
DROP POLICY IF EXISTS "Owners can view their properties" ON properties;
CREATE POLICY "Owners can view their properties"
ON properties FOR SELECT
TO authenticated
USING (
    is_platform_admin(auth.uid())
    OR owner_id IN (
        SELECT id FROM owners WHERE id = auth.uid()
    )
    OR owner_id IN (
        SELECT o.id FROM owners o
        JOIN workspaces w ON w.owner_user_id = o.id
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.context_type = 'staff'
    )
);

-- Update policies for rooms table
DROP POLICY IF EXISTS "Owners can view their rooms" ON rooms;
CREATE POLICY "Owners can view their rooms"
ON rooms FOR SELECT
TO authenticated
USING (
    is_platform_admin(auth.uid())
    OR owner_id IN (
        SELECT id FROM owners WHERE id = auth.uid()
    )
    OR owner_id IN (
        SELECT o.id FROM owners o
        JOIN workspaces w ON w.owner_user_id = o.id
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.context_type = 'staff'
    )
);

-- Update policies for workspaces table
DROP POLICY IF EXISTS "workspace_select_policy" ON workspaces;
CREATE POLICY "workspace_select_policy"
ON workspaces FOR SELECT
TO authenticated
USING (
    is_platform_admin(auth.uid())
    OR owner_user_id = auth.uid()
    OR id IN (
        SELECT workspace_id FROM user_contexts
        WHERE user_id = auth.uid()
    )
);

-- Update policies for owners table
DROP POLICY IF EXISTS "owner_select_policy" ON owners;
CREATE POLICY "owner_select_policy"
ON owners FOR SELECT
TO authenticated
USING (
    is_platform_admin(auth.uid())
    OR id = auth.uid()
    OR id IN (
        SELECT o.id FROM owners o
        JOIN workspaces w ON w.owner_user_id = o.id
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid()
    )
);

-- ============================================
-- 5. SEED INITIAL PLATFORM ADMIN
-- ============================================
-- Add the client owner as initial platform admin
-- This needs to be run after the user exists

DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Find user by email
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'newgreenhigh@gmail.com'
    LIMIT 1;

    -- Insert as platform admin if user exists
    IF v_user_id IS NOT NULL THEN
        INSERT INTO platform_admins (user_id, notes)
        VALUES (v_user_id, 'Initial platform admin - client owner')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;

    -- Also add developer as admin
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'sethrajat0711@gmail.com'
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO platform_admins (user_id, notes)
        VALUES (v_user_id, 'Initial platform admin - developer')
        ON CONFLICT (user_id) DO NOTHING;
    END IF;
END $$;

-- ============================================
-- 6. ADMIN ACTIVITY LOG VIEW
-- ============================================
CREATE OR REPLACE VIEW admin_audit_log AS
SELECT
    ae.id,
    ae.occurred_at,
    ae.action,
    ae.entity_type,
    ae.entity_id,
    ae.before_state,
    ae.after_state,
    ae.metadata,
    up.name AS admin_name,
    up.email AS admin_email,
    w.name AS workspace_name
FROM audit_events ae
JOIN platform_admins pa ON pa.user_id = ae.actor_user_id
LEFT JOIN user_profiles up ON up.user_id = ae.actor_user_id
LEFT JOIN workspaces w ON w.id = ae.workspace_id
ORDER BY ae.occurred_at DESC;

-- ============================================
-- COMMENTS
-- ============================================
COMMENT ON TABLE platform_admins IS 'Users with global admin access across all workspaces';
COMMENT ON FUNCTION is_platform_admin IS 'Check if a user is a platform admin (superuser)';
COMMENT ON VIEW admin_audit_log IS 'View of audit events created by platform admins';
