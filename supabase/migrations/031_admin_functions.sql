-- ============================================
-- Migration 031: Admin Functions with Stats
-- ============================================
-- Enhanced SECURITY DEFINER functions for platform admins
-- Now includes per-workspace statistics
-- ============================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS get_all_workspaces_admin();
DROP FUNCTION IF EXISTS get_platform_stats_admin();

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
        COALESCE(u.email, 'Unknown')::TEXT as owner_email,
        COALESCE(p.property_count, 0) as total_properties,
        COALESCE(r.room_count, 0) as total_rooms,
        COALESCE(t.tenant_count, 0) as total_tenants
    FROM workspaces w
    LEFT JOIN auth.users u ON u.id = w.owner_user_id
    LEFT JOIN user_profiles up ON up.user_id = w.owner_user_id
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as property_count
        FROM properties
        WHERE properties.workspace_id = w.id
    ) p ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as room_count
        FROM rooms
        JOIN properties ON properties.id = rooms.property_id
        WHERE properties.workspace_id = w.id
    ) r ON true
    LEFT JOIN LATERAL (
        SELECT COUNT(*) as tenant_count
        FROM tenants
        WHERE tenants.workspace_id = w.id
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
-- Returns recent audit events across all workspaces
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

    -- Check if audit_events table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'audit_events'
    ) THEN
        -- Return empty if table doesn't exist
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        ae.id,
        ae.occurred_at,
        ae.action::TEXT,
        ae.entity_type::TEXT,
        ae.entity_id::TEXT,
        COALESCE(u.email, 'System')::TEXT as actor_email,
        COALESCE(w.name, 'Unknown')::TEXT as workspace_name,
        ae.changes
    FROM audit_events ae
    LEFT JOIN auth.users u ON u.id = ae.actor_id
    LEFT JOIN workspaces w ON w.id = ae.workspace_id
    ORDER BY ae.occurred_at DESC
    LIMIT p_limit;
END;
$$;

-- Grant execute to authenticated users (functions will check platform admin status)
GRANT EXECUTE ON FUNCTION get_all_workspaces_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_platform_stats_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION get_audit_events_admin(INT) TO authenticated;

-- ============================================
-- Done
-- ============================================
