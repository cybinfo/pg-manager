-- ============================================
-- Migration 034: Fix Platform Admin JOIN Access
-- ============================================
-- Platform admins need to see properties/rooms when viewing
-- tenant data across workspaces. Without this, JOINs return null.
-- ============================================

-- First, let's create a simple is_platform_admin function
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
  )
$$;

-- ============================================
-- 1. PROPERTIES - Add platform admin bypass
-- ============================================
DROP POLICY IF EXISTS "properties_platform_admin" ON properties;

CREATE POLICY "properties_platform_admin"
ON properties FOR SELECT
TO authenticated
USING (is_platform_admin());

-- ============================================
-- 2. ROOMS - Add platform admin bypass
-- ============================================
DROP POLICY IF EXISTS "rooms_platform_admin" ON rooms;

CREATE POLICY "rooms_platform_admin"
ON rooms FOR SELECT
TO authenticated
USING (is_platform_admin());

-- ============================================
-- 3. TENANTS - Add platform admin bypass (if not exists)
-- ============================================
DROP POLICY IF EXISTS "tenants_platform_admin" ON tenants;

CREATE POLICY "tenants_platform_admin"
ON tenants FOR SELECT
TO authenticated
USING (is_platform_admin());

-- ============================================
-- 4. BILLS - Add platform admin bypass
-- ============================================
DROP POLICY IF EXISTS "bills_platform_admin" ON bills;

CREATE POLICY "bills_platform_admin"
ON bills FOR SELECT
TO authenticated
USING (is_platform_admin());

-- ============================================
-- 5. PAYMENTS - Add platform admin bypass
-- ============================================
DROP POLICY IF EXISTS "payments_platform_admin" ON payments;

CREATE POLICY "payments_platform_admin"
ON payments FOR SELECT
TO authenticated
USING (is_platform_admin());

-- ============================================
-- Done - Platform admins can now see all data for JOINs
-- ============================================
