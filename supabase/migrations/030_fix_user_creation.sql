-- ============================================
-- Migration 030: Fix User Creation
-- ============================================
-- The trigger that creates user_profiles on signup
-- needs to bypass RLS. Adding service role policy.
-- ============================================

-- Drop existing policies on user_profiles
DROP POLICY IF EXISTS "user_profiles_select" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON user_profiles;
DROP POLICY IF EXISTS "profile_own" ON user_profiles;
DROP POLICY IF EXISTS "user_profiles_service_insert" ON user_profiles;

-- Recreate policies with service role bypass
CREATE POLICY "user_profiles_select"
ON user_profiles FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM platform_admins WHERE user_id = auth.uid())
);

-- Allow service role and trigger functions to insert
CREATE POLICY "user_profiles_insert"
ON user_profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Special policy for service role / trigger insertions
-- This allows the SECURITY DEFINER trigger to insert
CREATE POLICY "user_profiles_service_insert"
ON user_profiles FOR INSERT
TO postgres, service_role
WITH CHECK (true);

CREATE POLICY "user_profiles_update"
ON user_profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Also fix user_contexts policies
DROP POLICY IF EXISTS "user_contexts_select" ON user_contexts;
DROP POLICY IF EXISTS "user_contexts_update" ON user_contexts;
DROP POLICY IF EXISTS "user_contexts_insert" ON user_contexts;
DROP POLICY IF EXISTS "user_contexts_service_insert" ON user_contexts;

CREATE POLICY "user_contexts_select"
ON user_contexts FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "user_contexts_insert"
ON user_contexts FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "user_contexts_service_insert"
ON user_contexts FOR INSERT
TO postgres, service_role
WITH CHECK (true);

CREATE POLICY "user_contexts_update"
ON user_contexts FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Fix workspaces insert policy for triggers
DROP POLICY IF EXISTS "workspaces_service_insert" ON workspaces;

CREATE POLICY "workspaces_service_insert"
ON workspaces FOR INSERT
TO postgres, service_role
WITH CHECK (true);

-- ============================================
-- Done
-- ============================================
