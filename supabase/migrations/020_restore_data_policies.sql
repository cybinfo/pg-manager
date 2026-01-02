-- ============================================
-- Migration 020: Restore Working Data Policies
-- ============================================
-- Fix 500 errors on data tables by using simple policies
-- that don't rely on is_platform_admin() function
-- ============================================

-- ============================================
-- 1. PROPERTIES - Simple owner-based access
-- ============================================
DROP POLICY IF EXISTS "properties_select" ON properties;
DROP POLICY IF EXISTS "Owners can view their properties" ON properties;
DROP POLICY IF EXISTS "properties_owner_all" ON properties;

-- Owner full access
CREATE POLICY "properties_owner_all"
ON properties FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Staff can view properties in their workspace
CREATE POLICY "properties_staff_view"
ON properties FOR SELECT
TO authenticated
USING (
    owner_id IN (
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = TRUE
    )
);

-- ============================================
-- 2. ROOMS - Simple owner-based access
-- ============================================
DROP POLICY IF EXISTS "rooms_select" ON rooms;
DROP POLICY IF EXISTS "Owners can view their rooms" ON rooms;
DROP POLICY IF EXISTS "rooms_owner_all" ON rooms;

-- Owner full access
CREATE POLICY "rooms_owner_all"
ON rooms FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Staff can view rooms in their workspace
CREATE POLICY "rooms_staff_view"
ON rooms FOR SELECT
TO authenticated
USING (
    owner_id IN (
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = TRUE
    )
);

-- ============================================
-- 3. TENANTS - Simple owner-based access
-- ============================================
DROP POLICY IF EXISTS "tenants_select" ON tenants;
DROP POLICY IF EXISTS "Owners can view their tenants" ON tenants;
DROP POLICY IF EXISTS "tenants_owner_all" ON tenants;

-- Owner full access
CREATE POLICY "tenants_owner_all"
ON tenants FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Staff can view tenants in their workspace
CREATE POLICY "tenants_staff_view"
ON tenants FOR SELECT
TO authenticated
USING (
    owner_id IN (
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = TRUE
    )
);

-- ============================================
-- 4. BILLS - Simple owner-based access
-- ============================================
DROP POLICY IF EXISTS "bills_select" ON bills;
DROP POLICY IF EXISTS "Owners can view their bills" ON bills;
DROP POLICY IF EXISTS "bills_owner_all" ON bills;

-- Owner full access
CREATE POLICY "bills_owner_all"
ON bills FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Staff can view bills in their workspace
CREATE POLICY "bills_staff_view"
ON bills FOR SELECT
TO authenticated
USING (
    owner_id IN (
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = TRUE
    )
);

-- ============================================
-- 5. PAYMENTS - Simple owner-based access
-- ============================================
DROP POLICY IF EXISTS "payments_select" ON payments;
DROP POLICY IF EXISTS "payments_delete" ON payments;
DROP POLICY IF EXISTS "Owners can view their payments" ON payments;
DROP POLICY IF EXISTS "Owners can delete their payments" ON payments;
DROP POLICY IF EXISTS "payments_owner_all" ON payments;

-- Owner full access
CREATE POLICY "payments_owner_all"
ON payments FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Staff can view payments in their workspace
CREATE POLICY "payments_staff_view"
ON payments FOR SELECT
TO authenticated
USING (
    owner_id IN (
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = TRUE
    )
);

-- ============================================
-- 6. EXPENSES - Simple owner-based access
-- ============================================
DROP POLICY IF EXISTS "expenses_select" ON expenses;
DROP POLICY IF EXISTS "Owners can view their expenses" ON expenses;
DROP POLICY IF EXISTS "expenses_owner_all" ON expenses;

-- Owner full access
CREATE POLICY "expenses_owner_all"
ON expenses FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Staff can view expenses in their workspace
CREATE POLICY "expenses_staff_view"
ON expenses FOR SELECT
TO authenticated
USING (
    owner_id IN (
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = TRUE
    )
);

-- ============================================
-- 7. METER READINGS - Simple owner-based access
-- ============================================
DROP POLICY IF EXISTS "meter_readings_select" ON meter_readings;
DROP POLICY IF EXISTS "Owners can view their meter readings" ON meter_readings;
DROP POLICY IF EXISTS "meter_readings_owner_all" ON meter_readings;

-- Owner full access
CREATE POLICY "meter_readings_owner_all"
ON meter_readings FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Staff can view meter readings in their workspace
CREATE POLICY "meter_readings_staff_view"
ON meter_readings FOR SELECT
TO authenticated
USING (
    owner_id IN (
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = TRUE
    )
);

-- ============================================
-- 8. COMPLAINTS - Simple owner-based access
-- ============================================
DROP POLICY IF EXISTS "complaints_select" ON complaints;
DROP POLICY IF EXISTS "Owners can view their complaints" ON complaints;
DROP POLICY IF EXISTS "complaints_owner_all" ON complaints;

-- Owner full access
CREATE POLICY "complaints_owner_all"
ON complaints FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Staff can view complaints in their workspace
CREATE POLICY "complaints_staff_view"
ON complaints FOR SELECT
TO authenticated
USING (
    owner_id IN (
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = TRUE
    )
);

-- ============================================
-- 9. CHARGES - Simple owner-based access
-- ============================================
DROP POLICY IF EXISTS "charges_select" ON charges;
DROP POLICY IF EXISTS "Owners can view their charges" ON charges;
DROP POLICY IF EXISTS "charges_owner_all" ON charges;

-- Owner full access
CREATE POLICY "charges_owner_all"
ON charges FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Staff can view charges in their workspace
CREATE POLICY "charges_staff_view"
ON charges FOR SELECT
TO authenticated
USING (
    owner_id IN (
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = TRUE
    )
);

-- ============================================
-- 10. CHARGE_TYPES - Everyone can read
-- ============================================
DROP POLICY IF EXISTS "charge_types_select" ON charge_types;
DROP POLICY IF EXISTS "charge_types_read" ON charge_types;

-- All authenticated users can read charge types
CREATE POLICY "charge_types_read"
ON charge_types FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 11. EXPENSE_TYPES - Everyone can read
-- ============================================
DROP POLICY IF EXISTS "expense_types_select" ON expense_types;
DROP POLICY IF EXISTS "expense_types_read" ON expense_types;

-- All authenticated users can read expense types
CREATE POLICY "expense_types_read"
ON expense_types FOR SELECT
TO authenticated
USING (true);

-- ============================================
-- 12. NOTICES - Simple owner-based access
-- ============================================
DROP POLICY IF EXISTS "notices_select" ON notices;
DROP POLICY IF EXISTS "Owners can view their notices" ON notices;
DROP POLICY IF EXISTS "notices_owner_all" ON notices;

-- Owner full access
CREATE POLICY "notices_owner_all"
ON notices FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Staff can view notices in their workspace
CREATE POLICY "notices_staff_view"
ON notices FOR SELECT
TO authenticated
USING (
    owner_id IN (
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = TRUE
    )
);

-- ============================================
-- 13. VISITORS - Simple owner-based access
-- ============================================
DROP POLICY IF EXISTS "visitors_select" ON visitors;
DROP POLICY IF EXISTS "Owners can view their visitors" ON visitors;
DROP POLICY IF EXISTS "visitors_owner_all" ON visitors;

-- Owner full access
CREATE POLICY "visitors_owner_all"
ON visitors FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Staff can view visitors in their workspace
CREATE POLICY "visitors_staff_view"
ON visitors FOR SELECT
TO authenticated
USING (
    owner_id IN (
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = TRUE
    )
);

-- ============================================
-- 14. EXIT_CLEARANCE - Simple owner-based access
-- ============================================
DROP POLICY IF EXISTS "exit_clearance_select" ON exit_clearance;
DROP POLICY IF EXISTS "Owners can view their exit clearance" ON exit_clearance;
DROP POLICY IF EXISTS "exit_clearance_owner_all" ON exit_clearance;

-- Owner full access
CREATE POLICY "exit_clearance_owner_all"
ON exit_clearance FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Staff can view exit clearance in their workspace
CREATE POLICY "exit_clearance_staff_view"
ON exit_clearance FOR SELECT
TO authenticated
USING (
    owner_id IN (
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = TRUE
    )
);

-- ============================================
-- 15. STAFF_MEMBERS - Simple owner-based access
-- ============================================
DROP POLICY IF EXISTS "staff_members_select" ON staff_members;
DROP POLICY IF EXISTS "Owners can view their staff" ON staff_members;
DROP POLICY IF EXISTS "staff_members_owner_all" ON staff_members;

-- Owner full access
CREATE POLICY "staff_members_owner_all"
ON staff_members FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Staff can view other staff in their workspace
CREATE POLICY "staff_members_staff_view"
ON staff_members FOR SELECT
TO authenticated
USING (
    owner_id IN (
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = TRUE
    )
);

-- ============================================
-- 16. ROLES - Owner-based access
-- ============================================
DROP POLICY IF EXISTS "roles_select" ON roles;
DROP POLICY IF EXISTS "roles_owner_all" ON roles;

-- Owner full access to their roles
CREATE POLICY "roles_owner_all"
ON roles FOR ALL
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (owner_id = auth.uid());

-- Staff can view roles belonging to their workspace owner
CREATE POLICY "roles_staff_view"
ON roles FOR SELECT
TO authenticated
USING (
    owner_id IN (
        SELECT w.owner_user_id
        FROM workspaces w
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = TRUE
    )
);

-- ============================================
-- 17. USER_ROLES - Workspace access
-- ============================================
DROP POLICY IF EXISTS "user_roles_select" ON user_roles;
DROP POLICY IF EXISTS "user_roles_owner_all" ON user_roles;

-- Owner full access to user_roles in their workspace
CREATE POLICY "user_roles_owner_all"
ON user_roles FOR ALL
TO authenticated
USING (
    staff_member_id IN (
        SELECT id FROM staff_members WHERE owner_id = auth.uid()
    )
)
WITH CHECK (
    staff_member_id IN (
        SELECT id FROM staff_members WHERE owner_id = auth.uid()
    )
);

-- Staff can view user_roles in their workspace
CREATE POLICY "user_roles_staff_view"
ON user_roles FOR SELECT
TO authenticated
USING (
    staff_member_id IN (
        SELECT sm.id FROM staff_members sm
        JOIN workspaces w ON w.owner_user_id = sm.owner_id
        JOIN user_contexts uc ON uc.workspace_id = w.id
        WHERE uc.user_id = auth.uid() AND uc.is_active = TRUE
    )
);

-- ============================================
-- Done - Simple owner-based policies restored
-- ============================================
