-- Migration 036: Fix RLS policies for charge_types and expense_types
-- SECURITY FIX: Previous policies used USING(true) allowing all users to see all data!

-- ============================================
-- 1. FIX CHARGE_TYPES RLS
-- ============================================
DROP POLICY IF EXISTS "charge_types_read" ON charge_types;
DROP POLICY IF EXISTS "charge_types_own_data" ON charge_types;
DROP POLICY IF EXISTS "charge_types_select" ON charge_types;

-- Owner can read their own charge types
CREATE POLICY "charge_types_owner_read"
ON charge_types FOR SELECT
TO authenticated
USING (
    owner_id = auth.uid()
    OR owner_id IN (
        -- Staff can read charge types from their workspace
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = true
    )
    OR is_platform_admin()
);

-- Owner can insert their own charge types
CREATE POLICY "charge_types_owner_insert"
ON charge_types FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Owner can update their own charge types
CREATE POLICY "charge_types_owner_update"
ON charge_types FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Owner can delete their own charge types
CREATE POLICY "charge_types_owner_delete"
ON charge_types FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- ============================================
-- 2. FIX EXPENSE_TYPES RLS
-- ============================================
DROP POLICY IF EXISTS "expense_types_read" ON expense_types;
DROP POLICY IF EXISTS "expense_types_own_data" ON expense_types;
DROP POLICY IF EXISTS "expense_types_select" ON expense_types;

-- Owner can read their own expense types
CREATE POLICY "expense_types_owner_read"
ON expense_types FOR SELECT
TO authenticated
USING (
    owner_id = auth.uid()
    OR owner_id IN (
        -- Staff can read expense types from their workspace
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = true
    )
    OR is_platform_admin()
);

-- Owner can insert their own expense types
CREATE POLICY "expense_types_owner_insert"
ON expense_types FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

-- Owner can update their own expense types
CREATE POLICY "expense_types_owner_update"
ON expense_types FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Owner can delete their own expense types
CREATE POLICY "expense_types_owner_delete"
ON expense_types FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- ============================================
-- Add comments for documentation
-- ============================================
COMMENT ON POLICY "charge_types_owner_read" ON charge_types IS 'Owners and their staff can read charge types. Platform admins can read all.';
COMMENT ON POLICY "expense_types_owner_read" ON expense_types IS 'Owners and their staff can read expense types. Platform admins can read all.';
