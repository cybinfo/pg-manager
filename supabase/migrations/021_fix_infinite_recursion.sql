-- ============================================
-- Migration 021: Fix Infinite Recursion
-- ============================================
-- Remove staff_view policies that cause infinite recursion
-- Keep only simple owner-based policies
-- ============================================

-- Drop all staff_view policies that cause recursion
DROP POLICY IF EXISTS "properties_staff_view" ON properties;
DROP POLICY IF EXISTS "rooms_staff_view" ON rooms;
DROP POLICY IF EXISTS "tenants_staff_view" ON tenants;
DROP POLICY IF EXISTS "bills_staff_view" ON bills;
DROP POLICY IF EXISTS "payments_staff_view" ON payments;
DROP POLICY IF EXISTS "expenses_staff_view" ON expenses;
DROP POLICY IF EXISTS "meter_readings_staff_view" ON meter_readings;
DROP POLICY IF EXISTS "complaints_staff_view" ON complaints;
DROP POLICY IF EXISTS "charges_staff_view" ON charges;
DROP POLICY IF EXISTS "notices_staff_view" ON notices;
DROP POLICY IF EXISTS "visitors_staff_view" ON visitors;
DROP POLICY IF EXISTS "exit_clearance_staff_view" ON exit_clearance;
DROP POLICY IF EXISTS "staff_members_staff_view" ON staff_members;
DROP POLICY IF EXISTS "roles_staff_view" ON roles;
DROP POLICY IF EXISTS "user_roles_staff_view" ON user_roles;

-- Drop problematic workspaces policies that cause recursion
DROP POLICY IF EXISTS "workspaces_member_view" ON workspaces;
DROP POLICY IF EXISTS "workspace_member_view" ON workspaces;

-- Fix workspaces - simple owner-based access only
DROP POLICY IF EXISTS "workspaces_owner_all" ON workspaces;
DROP POLICY IF EXISTS "workspace_owner_all" ON workspaces;
DROP POLICY IF EXISTS "workspaces_select" ON workspaces;

CREATE POLICY "workspaces_owner_access"
ON workspaces FOR ALL
TO authenticated
USING (owner_user_id = auth.uid())
WITH CHECK (owner_user_id = auth.uid());

-- Fix user_contexts - avoid referencing workspaces
DROP POLICY IF EXISTS "user_contexts_owner_manage" ON user_contexts;
DROP POLICY IF EXISTS "context_owner_manage" ON user_contexts;

-- Users can view and update their own contexts
DROP POLICY IF EXISTS "user_contexts_select" ON user_contexts;
DROP POLICY IF EXISTS "user_contexts_update" ON user_contexts;

CREATE POLICY "user_contexts_own_select"
ON user_contexts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_contexts_own_update"
ON user_contexts FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- Done - Infinite recursion fixed
-- ============================================
