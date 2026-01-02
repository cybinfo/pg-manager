-- ============================================
-- Migration: 014_fix_staff_permissions_aggregation.sql
-- Description: Fix get_user_contexts to aggregate ALL role permissions for staff
-- Problem: Staff with multiple roles only got permissions from primary role
-- Solution: Aggregate permissions from all roles in user_roles table
-- ============================================

-- Drop and recreate the function to aggregate permissions from ALL roles
CREATE OR REPLACE FUNCTION get_user_contexts(p_user_id UUID)
RETURNS TABLE (
  context_id UUID,
  workspace_id UUID,
  workspace_name TEXT,
  workspace_logo TEXT,
  context_type TEXT,
  role_name TEXT,
  permissions JSONB,
  is_default BOOLEAN,
  last_accessed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uc.id as context_id,
    uc.workspace_id,
    w.name as workspace_name,
    w.logo_url as workspace_logo,
    uc.context_type,
    -- For staff, show primary role name; for others, show single role name
    CASE
      WHEN uc.context_type = 'staff' THEN (
        SELECT r.name FROM roles r WHERE r.id = uc.role_id
      )
      ELSE r.name
    END as role_name,
    -- For staff, aggregate permissions from ALL assigned roles via user_roles
    CASE
      WHEN uc.context_type = 'staff' AND uc.entity_id IS NOT NULL THEN (
        SELECT COALESCE(
          jsonb_agg(DISTINCT perm),
          '[]'::jsonb
        )
        FROM user_roles ur
        JOIN roles ro ON ro.id = ur.role_id
        CROSS JOIN LATERAL jsonb_array_elements_text(COALESCE(ro.permissions, '[]'::jsonb)) AS perm
        WHERE ur.staff_member_id = uc.entity_id
      )
      ELSE COALESCE(r.permissions, '[]'::JSONB)
    END as permissions,
    uc.is_default,
    uc.last_accessed_at
  FROM user_contexts uc
  JOIN workspaces w ON w.id = uc.workspace_id
  LEFT JOIN roles r ON r.id = uc.role_id
  WHERE uc.user_id = p_user_id
    AND uc.is_active = TRUE
    AND w.is_active = TRUE
  ORDER BY uc.is_default DESC, uc.last_accessed_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also update has_permission function to check all roles
CREATE OR REPLACE FUNCTION has_permission(p_context_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_context user_contexts%ROWTYPE;
  v_has_permission BOOLEAN;
BEGIN
  SELECT * INTO v_context FROM user_contexts WHERE id = p_context_id;

  IF v_context.id IS NULL OR NOT v_context.is_active THEN
    RETURN FALSE;
  END IF;

  -- Owners have all permissions
  IF v_context.context_type = 'owner' THEN
    RETURN TRUE;
  END IF;

  -- Tenants have limited fixed permissions
  IF v_context.context_type = 'tenant' THEN
    RETURN p_permission IN (
      'profile.view', 'profile.edit',
      'payments.view',
      'complaints.view', 'complaints.create',
      'notices.view'
    );
  END IF;

  -- Staff check ALL assigned role permissions via user_roles
  IF v_context.context_type = 'staff' AND v_context.entity_id IS NOT NULL THEN
    SELECT EXISTS(
      SELECT 1
      FROM user_roles ur
      JOIN roles ro ON ro.id = ur.role_id
      WHERE ur.staff_member_id = v_context.entity_id
        AND ro.permissions ? p_permission
    ) INTO v_has_permission;
    RETURN COALESCE(v_has_permission, FALSE);
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment explaining the change
COMMENT ON FUNCTION get_user_contexts(UUID) IS
'Returns all active contexts for a user. For staff contexts, aggregates permissions from ALL assigned roles in user_roles table, not just the primary role_id in user_contexts.';

COMMENT ON FUNCTION has_permission(UUID, TEXT) IS
'Checks if a context has a specific permission. For staff, checks ALL assigned roles in user_roles table.';
