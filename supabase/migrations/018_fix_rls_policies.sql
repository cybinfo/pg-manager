-- ============================================
-- Migration 018 v2: Fix RLS Policies for Login
-- ============================================
-- Fixed: Removed tenant_id references that don't exist
-- ============================================

-- ============================================
-- 1. FIX PLATFORM_ADMINS TABLE POLICY
-- ============================================
DROP POLICY IF EXISTS "platform_admins_select_policy" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_no_insert_policy" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_no_update_policy" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_no_delete_policy" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_select_own" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_no_insert" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_no_update" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_no_delete" ON platform_admins;

-- Simple policy: users can check if THEY are an admin
CREATE POLICY "platform_admins_select_own"
ON platform_admins FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Prevent client-side modifications
CREATE POLICY "platform_admins_no_insert"
ON platform_admins FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "platform_admins_no_update"
ON platform_admins FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "platform_admins_no_delete"
ON platform_admins FOR DELETE
TO authenticated
USING (false);

-- ============================================
-- 2. FIX is_platform_admin FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION is_platform_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
DECLARE
    v_is_admin BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM public.platform_admins
        WHERE user_id = p_user_id
    ) INTO v_is_admin;
    RETURN COALESCE(v_is_admin, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_platform_admin(UUID) TO authenticated;

-- ============================================
-- 3. FIX OWNERS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "owner_select_policy" ON owners;
DROP POLICY IF EXISTS "owners_own_data" ON owners;
DROP POLICY IF EXISTS "owners_select" ON owners;
DROP POLICY IF EXISTS "owners_insert" ON owners;
DROP POLICY IF EXISTS "owners_update" ON owners;
DROP POLICY IF EXISTS "owners_delete" ON owners;

CREATE POLICY "owners_select"
ON owners FOR SELECT
TO authenticated
USING (
    id = auth.uid()
    OR is_platform_admin()
    OR id IN (
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid()
    )
);

CREATE POLICY "owners_insert"
ON owners FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

CREATE POLICY "owners_update"
ON owners FOR UPDATE
TO authenticated
USING (id = auth.uid() OR is_platform_admin())
WITH CHECK (id = auth.uid() OR is_platform_admin());

CREATE POLICY "owners_delete"
ON owners FOR DELETE
TO authenticated
USING (is_platform_admin());

-- ============================================
-- 4. FIX WORKSPACES TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "workspace_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspace_owner_all" ON workspaces;
DROP POLICY IF EXISTS "workspace_member_view" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;

CREATE POLICY "workspaces_select"
ON workspaces FOR SELECT
TO authenticated
USING (
    owner_user_id = auth.uid()
    OR is_platform_admin()
    OR id IN (
        SELECT workspace_id FROM user_contexts
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "workspaces_insert"
ON workspaces FOR INSERT
TO authenticated
WITH CHECK (owner_user_id = auth.uid() OR is_platform_admin());

CREATE POLICY "workspaces_update"
ON workspaces FOR UPDATE
TO authenticated
USING (owner_user_id = auth.uid() OR is_platform_admin())
WITH CHECK (owner_user_id = auth.uid() OR is_platform_admin());

CREATE POLICY "workspaces_delete"
ON workspaces FOR DELETE
TO authenticated
USING (is_platform_admin());

-- ============================================
-- 5. FIX USER_CONTEXTS TABLE POLICIES
-- ============================================
DROP POLICY IF EXISTS "user_contexts_select" ON user_contexts;
DROP POLICY IF EXISTS "user_contexts_insert" ON user_contexts;
DROP POLICY IF EXISTS "user_contexts_update" ON user_contexts;
DROP POLICY IF EXISTS "user_contexts_delete" ON user_contexts;
DROP POLICY IF EXISTS "Users can view their own contexts" ON user_contexts;
DROP POLICY IF EXISTS "Users can update their own contexts" ON user_contexts;

CREATE POLICY "user_contexts_select"
ON user_contexts FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR is_platform_admin()
);

CREATE POLICY "user_contexts_insert"
ON user_contexts FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR is_platform_admin()
);

CREATE POLICY "user_contexts_update"
ON user_contexts FOR UPDATE
TO authenticated
USING (user_id = auth.uid() OR is_platform_admin())
WITH CHECK (user_id = auth.uid() OR is_platform_admin());

CREATE POLICY "user_contexts_delete"
ON user_contexts FOR DELETE
TO authenticated
USING (user_id = auth.uid() OR is_platform_admin());

-- ============================================
-- 6. VERIFY/ENSURE PLATFORM ADMIN SEEDING
-- ============================================
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Add client owner as platform admin
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'newgreenhigh@gmail.com'
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO platform_admins (user_id, notes)
        VALUES (v_user_id, 'Platform admin - client owner')
        ON CONFLICT (user_id) DO UPDATE SET notes = 'Platform admin - client owner';
        RAISE NOTICE 'Added/updated platform admin for newgreenhigh@gmail.com';
    END IF;

    -- Add developer as platform admin
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'sethrajat0711@gmail.com'
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO platform_admins (user_id, notes)
        VALUES (v_user_id, 'Platform admin - developer')
        ON CONFLICT (user_id) DO UPDATE SET notes = 'Platform admin - developer';
    END IF;
END $$;

-- ============================================
-- 7. FIX REMAINING TABLE POLICIES (SIMPLIFIED)
-- ============================================
-- These use owner_id which should exist

-- TENANTS
DROP POLICY IF EXISTS "Owners can view their tenants" ON tenants;
DROP POLICY IF EXISTS "tenants_select" ON tenants;

CREATE POLICY "tenants_select"
ON tenants FOR SELECT
TO authenticated
USING (
    is_platform_admin()
    OR owner_id = auth.uid()
    OR owner_id IN (
        SELECT w.owner_user_id FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid()
    )
);

-- BILLS
DROP POLICY IF EXISTS "Owners can view their bills" ON bills;
DROP POLICY IF EXISTS "bills_select" ON bills;

CREATE POLICY "bills_select"
ON bills FOR SELECT
TO authenticated
USING (
    is_platform_admin()
    OR owner_id = auth.uid()
    OR owner_id IN (
        SELECT w.owner_user_id FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid()
    )
);

-- PAYMENTS
DROP POLICY IF EXISTS "Owners can view their payments" ON payments;
DROP POLICY IF EXISTS "Owners can delete their payments" ON payments;
DROP POLICY IF EXISTS "payments_select" ON payments;
DROP POLICY IF EXISTS "payments_delete" ON payments;

CREATE POLICY "payments_select"
ON payments FOR SELECT
TO authenticated
USING (
    is_platform_admin()
    OR owner_id = auth.uid()
    OR owner_id IN (
        SELECT w.owner_user_id FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid()
    )
);

CREATE POLICY "payments_delete"
ON payments FOR DELETE
TO authenticated
USING (
    is_platform_admin()
    OR owner_id = auth.uid()
);

-- PROPERTIES
DROP POLICY IF EXISTS "Owners can view their properties" ON properties;
DROP POLICY IF EXISTS "properties_select" ON properties;

CREATE POLICY "properties_select"
ON properties FOR SELECT
TO authenticated
USING (
    is_platform_admin()
    OR owner_id = auth.uid()
    OR owner_id IN (
        SELECT w.owner_user_id FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid()
    )
);

-- ROOMS
DROP POLICY IF EXISTS "Owners can view their rooms" ON rooms;
DROP POLICY IF EXISTS "rooms_select" ON rooms;

CREATE POLICY "rooms_select"
ON rooms FOR SELECT
TO authenticated
USING (
    is_platform_admin()
    OR owner_id = auth.uid()
    OR owner_id IN (
        SELECT w.owner_user_id FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid()
    )
);

-- ============================================
-- 8. CREATE DEBUG FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION debug_user_access()
RETURNS TABLE (
    check_name TEXT,
    check_result TEXT
) AS $$
DECLARE
    v_user_id UUID;
    v_is_admin BOOLEAN;
    v_context_count INTEGER;
    v_workspace_count INTEGER;
BEGIN
    v_user_id := auth.uid();

    check_name := 'Current User ID';
    check_result := COALESCE(v_user_id::TEXT, 'NULL - Not authenticated');
    RETURN NEXT;

    SELECT is_platform_admin(v_user_id) INTO v_is_admin;
    check_name := 'Is Platform Admin';
    check_result := COALESCE(v_is_admin::TEXT, 'NULL');
    RETURN NEXT;

    SELECT COUNT(*) INTO v_context_count
    FROM user_contexts WHERE user_id = v_user_id;
    check_name := 'User Context Count';
    check_result := v_context_count::TEXT;
    RETURN NEXT;

    SELECT COUNT(*) INTO v_workspace_count
    FROM workspaces
    WHERE owner_user_id = v_user_id
    OR id IN (SELECT workspace_id FROM user_contexts WHERE user_id = v_user_id);
    check_name := 'Accessible Workspace Count';
    check_result := v_workspace_count::TEXT;
    RETURN NEXT;

    check_name := 'Has Owner Record';
    check_result := (EXISTS (SELECT 1 FROM owners WHERE id = v_user_id))::TEXT;
    RETURN NEXT;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION debug_user_access() TO authenticated;

-- ============================================
-- DONE
-- ============================================
COMMENT ON FUNCTION debug_user_access IS 'Debug function to diagnose user access issues';
