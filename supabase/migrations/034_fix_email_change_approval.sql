-- ============================================
-- Migration 034: Fix Email Change Approval
-- ============================================
-- SECURITY FIX: Only update tenants.email for email_change
-- Do NOT update user_profiles.email because:
-- 1. The user might be an owner/staff with same email
-- 2. Changing their login email would lock them out
-- The API route handles the logic for when to update auth/profile
-- ============================================

CREATE OR REPLACE FUNCTION apply_approval_change(p_approval_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_approval RECORD;
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
            -- ONLY update tenants.email (the record)
            -- Do NOT update user_profiles.email here!
            -- The API route will decide if login email should change
            -- based on whether user has owner/staff contexts
            UPDATE tenants
            SET email = v_approval.payload->>'new_email'
            WHERE id = v_approval.requester_tenant_id;

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
