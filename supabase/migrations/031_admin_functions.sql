-- ============================================
-- Migration 031: Admin Functions with Stats
-- ============================================
-- SECURITY DEFINER functions for platform admins
-- Uses owner_id for joins (not workspace_id)
-- ============================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_all_workspaces_admin();
DROP FUNCTION IF EXISTS get_platform_stats_admin();
DROP FUNCTION IF EXISTS get_audit_events_admin(INT);

-- ============================================
-- Function: get_all_workspaces_admin
-- Returns all workspaces with per-workspace stats
-- ============================================
CREATE OR REPLACE FUNCTION get_all_workspaces_admin()
RETURNS TABLE (
    id UUID,
    name TEXT,
    created_at TIMESTAMPTZ,
    owner_user_id UUID,
    owner_name TEXT,
    owner_email TEXT,
    total_properties BIGINT,
    total_rooms BIGINT,
    total_tenants BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if caller is a platform admin
    IF NOT EXISTS (
        SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: Not a platform admin';
    END IF;

    RETURN QUERY
    SELECT
        w.id,
        w.name::TEXT,
        w.created_at,
        w.owner_user_id,
        COALESCE(up.name, 'Unknown')::TEXT as owner_name,
        COALESCE(up.email, 'Unknown')::TEXT as owner_email,
        COALESCE(p.property_count, 0)::BIGINT as total_properties,
        COALESCE(r.room_count, 0)::BIGINT as total_rooms,
        COALESCE(t.tenant_count, 0)::BIGINT as total_tenants
    FROM workspaces w
    LEFT JOIN user_profiles up ON up.user_id = w.owner_user_id
    LEFT JOIN LATERAL (
        SELECT COUNT(*)::BIGINT as property_count
        FROM properties
        WHERE properties.owner_id = w.owner_user_id
    ) p ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*)::BIGINT as room_count
        FROM rooms
        JOIN properties pr ON pr.id = rooms.property_id
        WHERE pr.owner_id = w.owner_user_id
    ) r ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*)::BIGINT as tenant_count
        FROM tenants
        WHERE tenants.owner_id = w.owner_user_id
        AND tenants.status = 'active'
    ) t ON true
    ORDER BY w.created_at DESC;
END;
$$;

-- ============================================
-- Function: get_platform_stats_admin
-- Returns platform-wide statistics
-- ============================================
CREATE OR REPLACE FUNCTION get_platform_stats_admin()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result JSON;
BEGIN
    -- Check if caller is a platform admin
    IF NOT EXISTS (
        SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: Not a platform admin';
    END IF;

    SELECT json_build_object(
        'total_workspaces', (SELECT COUNT(*) FROM workspaces),
        'total_owners', (SELECT COUNT(DISTINCT owner_user_id) FROM workspaces),
        'total_properties', (SELECT COUNT(*) FROM properties),
        'total_rooms', (SELECT COUNT(*) FROM rooms),
        'total_tenants', (SELECT COUNT(*) FROM tenants),
        'active_tenants', (SELECT COUNT(*) FROM tenants WHERE status = 'active'),
        'total_bills', (SELECT COUNT(*) FROM bills),
        'total_payments', (SELECT COUNT(*) FROM payments)
    ) INTO result;

    RETURN result;
END;
$$;

-- ============================================
-- Function: get_audit_events_admin
-- Returns recent audit events (placeholder - returns empty)
-- ============================================
CREATE OR REPLACE FUNCTION get_audit_events_admin(p_limit INT DEFAULT 50)
RETURNS TABLE (
    id UUID,
    occurred_at TIMESTAMPTZ,
    action TEXT,
    entity_type TEXT,
    entity_id TEXT,
    actor_email TEXT,
    workspace_name TEXT,
    changes JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if caller is a platform admin
    IF NOT EXISTS (
        SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Access denied: Not a platform admin';
    END IF;

    -- Return empty for now - audit_events table structure may differ
    RETURN;
END;
$$;

-- Grant execute to authenticated users (functions will check platform admin status)
GRANT EXECUTE ON FUNCTION get_all_workspaces_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_stats_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_events_admin(INT) TO authenticated;

-- ============================================
-- Done
-- ============================================
