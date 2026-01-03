-- ============================================
-- Migration 034: Fix Email Change Approval
-- ============================================
-- Updates apply_approval_change to also update user_profiles.email
-- The auth.users.email is updated via API route (requires service role)
-- ============================================

CREATE OR REPLACE FUNCTION apply_approval_change(p_approval_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_approval RECORD;
    v_tenant RECORD;
BEGIN
    -- Get the approval
    SELECT * INTO v_approval FROM approvals WHERE id = p_approval_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Approval not found';
    END IF;

    IF v_approval.status != 'approved' THEN
        RAISE EXCEPTION 'Can only apply approved requests';
    END IF;

    IF v_approval.change_applied THEN
        RAISE EXCEPTION 'Change already applied';
    END IF;

    -- Apply changes based on type
    CASE v_approval.type
        WHEN 'name_change' THEN
            UPDATE tenants
            SET name = v_approval.payload->>'new_name'
            WHERE id = v_approval.requester_tenant_id;

        WHEN 'phone_change' THEN
            UPDATE tenants
            SET phone = v_approval.payload->>'new_phone'
            WHERE id = v_approval.requester_tenant_id;

        WHEN 'email_change' THEN
            -- Get tenant info to find user_id
            SELECT * INTO v_tenant FROM tenants WHERE id = v_approval.requester_tenant_id;

            -- Update tenants table
            UPDATE tenants
            SET email = v_approval.payload->>'new_email'
            WHERE id = v_approval.requester_tenant_id;

            -- Update user_profiles if tenant has user_id
            IF v_tenant.user_id IS NOT NULL THEN
                UPDATE user_profiles
                SET email = v_approval.payload->>'new_email'
                WHERE user_id = v_tenant.user_id;
            END IF;

            -- Note: auth.users.email must be updated via API route (requires service role)

        ELSE
            -- For other types (address_change, room_change, disputes, etc.), just mark as applied
            -- These require manual handling or are informational
            NULL;
    END CASE;

    -- Mark as applied
    UPDATE approvals
    SET change_applied = TRUE, applied_at = NOW()
    WHERE id = p_approval_id;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Grant execute
GRANT EXECUTE ON FUNCTION apply_approval_change(UUID) TO authenticated;

-- ============================================
-- Done
-- ============================================
