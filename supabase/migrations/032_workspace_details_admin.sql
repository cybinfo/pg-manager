-- Migration: 032_workspace_details_admin.sql
-- Description: Add function to get workspace details for platform admins

-- Function to get detailed workspace information for admin explorer
CREATE OR REPLACE FUNCTION get_workspace_details_admin(p_workspace_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_properties JSONB;
  v_tenants JSONB;
  v_activity JSONB;
  v_stats JSONB;
BEGIN
  -- Check if caller is platform admin
  IF NOT EXISTS (
    SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: Not a platform admin';
  END IF;

  -- Get properties
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'address', COALESCE(p.address, ''),
      'total_rooms', (SELECT COUNT(*) FROM rooms r WHERE r.property_id = p.id)
    )
  ), '[]'::jsonb)
  INTO v_properties
  FROM properties p
  WHERE p.workspace_id = p_workspace_id;

  -- Get active tenants
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', t.id,
      'name', t.name,
      'phone', t.phone,
      'status', t.status
    )
  ), '[]'::jsonb)
  INTO v_tenants
  FROM tenants t
  WHERE t.workspace_id = p_workspace_id
    AND t.status IN ('active', 'notice_period')
  ORDER BY t.name
  LIMIT 50;

  -- Get recent activity from audit_events
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', ae.id,
      'action', ae.action,
      'entity_type', ae.entity_type,
      'occurred_at', ae.occurred_at
    )
  ), '[]'::jsonb)
  INTO v_activity
  FROM audit_events ae
  WHERE ae.workspace_id = p_workspace_id
  ORDER BY ae.occurred_at DESC
  LIMIT 10;

  -- Get stats
  SELECT jsonb_build_object(
    'total_bills', (SELECT COUNT(*) FROM bills b JOIN tenants t ON b.tenant_id = t.id WHERE t.workspace_id = p_workspace_id),
    'total_payments', (SELECT COUNT(*) FROM payments pay JOIN bills b ON pay.bill_id = b.id JOIN tenants t ON b.tenant_id = t.id WHERE t.workspace_id = p_workspace_id),
    'total_collected', COALESCE((SELECT SUM(pay.amount) FROM payments pay JOIN bills b ON pay.bill_id = b.id JOIN tenants t ON b.tenant_id = t.id WHERE t.workspace_id = p_workspace_id), 0),
    'occupancy_rate', 0
  )
  INTO v_stats;

  -- Build result
  v_result := jsonb_build_object(
    'properties', v_properties,
    'tenants', v_tenants,
    'recentActivity', v_activity,
    'stats', v_stats
  );

  RETURN v_result;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_workspace_details_admin(UUID) TO authenticated;
