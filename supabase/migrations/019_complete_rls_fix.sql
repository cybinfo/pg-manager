-- ============================================
-- Migration 019: Complete RLS Fix
-- ============================================
-- This migration comprehensively fixes ALL RLS policies
-- to ensure login works properly
-- ============================================

-- ============================================
-- 1. DROP ALL EXISTING POLICIES ON ALL AFFECTED TABLES
-- ============================================

-- Platform Admins (all variations)
DROP POLICY IF EXISTS "platform_admins_select_policy" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_select_own" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_no_insert_policy" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_no_insert" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_no_update_policy" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_no_update" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_no_delete_policy" ON platform_admins;
DROP POLICY IF EXISTS "platform_admins_no_delete" ON platform_admins;

-- User Profiles (from migration 012)
DROP POLICY IF EXISTS "profile_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;

-- User Contexts (from migration 012 and 018)
DROP POLICY IF EXISTS "context_own_view" ON user_contexts;
DROP POLICY IF EXISTS "context_owner_manage" ON user_contexts;
DROP POLICY IF EXISTS "user_contexts_select" ON user_contexts;
DROP POLICY IF EXISTS "user_contexts_insert" ON user_contexts;
DROP POLICY IF EXISTS "user_contexts_update" ON user_contexts;
DROP POLICY IF EXISTS "user_contexts_delete" ON user_contexts;
DROP POLICY IF EXISTS "Users can view their own contexts" ON user_contexts;
DROP POLICY IF EXISTS "Users can update their own contexts" ON user_contexts;

-- Workspaces (from migration 012 and 018)
DROP POLICY IF EXISTS "workspace_owner_all" ON workspaces;
DROP POLICY IF EXISTS "workspace_member_view" ON workspaces;
DROP POLICY IF EXISTS "workspace_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON workspaces;
DROP POLICY IF EXISTS "workspaces_update" ON workspaces;
DROP POLICY IF EXISTS "workspaces_delete" ON workspaces;

-- Owners
DROP POLICY IF EXISTS "owner_select_policy" ON owners;
DROP POLICY IF EXISTS "owners_own_data" ON owners;
DROP POLICY IF EXISTS "owners_select" ON owners;
DROP POLICY IF EXISTS "owners_insert" ON owners;
DROP POLICY IF EXISTS "owners_update" ON owners;
DROP POLICY IF EXISTS "owners_delete" ON owners;

-- ============================================
-- 2. RECREATE is_platform_admin FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION is_platform_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    -- Simple check - SECURITY DEFINER bypasses RLS
    RETURN EXISTS (
        SELECT 1 FROM public.platform_admins
        WHERE user_id = p_user_id
    );
EXCEPTION WHEN OTHERS THEN
    -- Return false on any error to prevent blocking
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_platform_admin(UUID) TO authenticated;

-- ============================================
-- 3. PLATFORM ADMINS - Simple self-check policy
-- ============================================
CREATE POLICY "platform_admins_select"
ON platform_admins FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "platform_admins_no_modify"
ON platform_admins FOR INSERT
TO authenticated
WITH CHECK (false);

CREATE POLICY "platform_admins_no_update"
ON platform_admins FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "platform_admins_no_delete"
ON platform_admins FOR DELETE
TO authenticated
USING (false);

-- ============================================
-- 4. USER PROFILES - Users can access their own
-- ============================================
CREATE POLICY "user_profiles_select"
ON user_profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_profiles_insert"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_profiles_update"
ON user_profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- 5. USER CONTEXTS - Users can access their own
-- ============================================
CREATE POLICY "user_contexts_select"
ON user_contexts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_contexts_update"
ON user_contexts FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Workspace owners can manage contexts in their workspace
CREATE POLICY "user_contexts_owner_manage"
ON user_contexts FOR ALL
TO authenticated
USING (
    workspace_id IN (
        SELECT id FROM workspaces WHERE owner_user_id = auth.uid()
    )
);

-- ============================================
-- 6. WORKSPACES - Owners and members can access
-- ============================================
CREATE POLICY "workspaces_owner_all"
ON workspaces FOR ALL
TO authenticated
USING (owner_user_id = auth.uid());

CREATE POLICY "workspaces_member_view"
ON workspaces FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT workspace_id FROM user_contexts
        WHERE user_id = auth.uid()
    )
);

-- ============================================
-- 7. OWNERS - Simple self-access
-- ============================================
CREATE POLICY "owners_self_access"
ON owners FOR ALL
TO authenticated
USING (id = auth.uid());

-- Staff can view their owner
CREATE POLICY "owners_staff_view"
ON owners FOR SELECT
TO authenticated
USING (
    id IN (
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid()
    )
);

-- ============================================
-- 8. SEED PLATFORM ADMINS
-- ============================================
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Client owner
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'newgreenhigh@gmail.com' LIMIT 1;
    IF v_user_id IS NOT NULL THEN
        INSERT INTO platform_admins (user_id, notes)
        VALUES (v_user_id, 'Platform admin - client owner')
        ON CONFLICT (user_id) DO UPDATE SET notes = 'Platform admin - client owner';
    END IF;

    -- Developer
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'sethrajat0711@gmail.com' LIMIT 1;
    IF v_user_id IS NOT NULL THEN
        INSERT INTO platform_admins (user_id, notes)
        VALUES (v_user_id, 'Platform admin - developer')
        ON CONFLICT (user_id) DO UPDATE SET notes = 'Platform admin - developer';
    END IF;
END $$;

-- ============================================
-- 9. VERIFY USER HAS CONTEXT
-- ============================================
-- Ensure the user has at least one context
DO $$
DECLARE
    v_user_id UUID;
    v_workspace_id UUID;
    v_context_count INTEGER;
BEGIN
    -- Check for newgreenhigh@gmail.com
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'newgreenhigh@gmail.com' LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        -- Check if user has any contexts
        SELECT COUNT(*) INTO v_context_count FROM user_contexts WHERE user_id = v_user_id;

        IF v_context_count = 0 THEN
            RAISE NOTICE 'User newgreenhigh@gmail.com has no contexts, creating owner context...';

            -- Check if workspace exists
            SELECT id INTO v_workspace_id FROM workspaces WHERE owner_user_id = v_user_id LIMIT 1;

            IF v_workspace_id IS NULL THEN
                -- Create workspace
                INSERT INTO workspaces (owner_user_id, name, slug)
                VALUES (v_user_id, 'My PG Business', 'my-pg-' || SUBSTRING(v_user_id::TEXT, 1, 8))
                RETURNING id INTO v_workspace_id;
            END IF;

            -- Create owner context
            INSERT INTO user_contexts (user_id, workspace_id, context_type, is_active, is_default, accepted_at)
            VALUES (v_user_id, v_workspace_id, 'owner', TRUE, TRUE, NOW())
            ON CONFLICT DO NOTHING;

            RAISE NOTICE 'Created owner context for user';
        ELSE
            RAISE NOTICE 'User has % context(s)', v_context_count;
        END IF;
    END IF;
END $$;

-- ============================================
-- 10. DIAGNOSTIC FUNCTION
-- ============================================
CREATE OR REPLACE FUNCTION debug_auth_state()
RETURNS TABLE (
    item TEXT,
    value TEXT
) AS $$
DECLARE
    v_uid UUID;
BEGIN
    v_uid := auth.uid();

    item := 'auth.uid()';
    value := COALESCE(v_uid::TEXT, 'NULL');
    RETURN NEXT;

    item := 'User email';
    SELECT email INTO value FROM auth.users WHERE id = v_uid;
    value := COALESCE(value, 'NOT FOUND');
    RETURN NEXT;

    item := 'Is platform admin';
    value := is_platform_admin(v_uid)::TEXT;
    RETURN NEXT;

    item := 'Profile exists';
    value := EXISTS(SELECT 1 FROM user_profiles WHERE user_id = v_uid)::TEXT;
    RETURN NEXT;

    item := 'Context count';
    SELECT COUNT(*)::TEXT INTO value FROM user_contexts WHERE user_id = v_uid;
    RETURN NEXT;

    item := 'Workspace count';
    SELECT COUNT(*)::TEXT INTO value FROM workspaces WHERE owner_user_id = v_uid;
    RETURN NEXT;

    item := 'Owner record exists';
    value := EXISTS(SELECT 1 FROM owners WHERE id = v_uid)::TEXT;
    RETURN NEXT;

    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION debug_auth_state() TO authenticated;

-- ============================================
-- Done
-- ============================================
