-- ============================================
-- Migration 022: Fix Audit Trigger Function
-- ============================================
-- Fix: The ? operator was used on record types instead of JSONB
-- This caused "operator does not exist: rooms ? unknown" errors
-- ============================================

CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
    v_action TEXT;
    v_old_data JSONB;
    v_new_data JSONB;
    v_workspace_id UUID;
BEGIN
    -- Determine action and convert to JSONB first
    IF TG_OP = 'INSERT' THEN
        v_action := 'create';
        v_old_data := NULL;
        v_new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        v_action := 'update';
        v_old_data := to_jsonb(OLD);
        v_new_data := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        v_action := 'delete';
        v_old_data := to_jsonb(OLD);
        v_new_data := NULL;
    END IF;

    -- Try to get workspace_id from the JSONB data (not the record directly)
    IF TG_OP = 'DELETE' THEN
        IF v_old_data ? 'workspace_id' THEN
            v_workspace_id := (v_old_data->>'workspace_id')::UUID;
        ELSIF v_old_data ? 'owner_id' THEN
            -- Get workspace_id from owner
            SELECT w.id INTO v_workspace_id
            FROM workspaces w
            WHERE w.owner_user_id = (v_old_data->>'owner_id')::UUID
            LIMIT 1;
        END IF;
    ELSE
        IF v_new_data ? 'workspace_id' THEN
            v_workspace_id := (v_new_data->>'workspace_id')::UUID;
        ELSIF v_new_data ? 'owner_id' THEN
            -- Get workspace_id from owner
            SELECT w.id INTO v_workspace_id
            FROM workspaces w
            WHERE w.owner_user_id = (v_new_data->>'owner_id')::UUID
            LIMIT 1;
        END IF;
    END IF;

    -- Log the event (only if user is authenticated)
    IF auth.uid() IS NOT NULL THEN
        INSERT INTO audit_events (
            actor_user_id,
            action,
            entity_type,
            entity_id,
            before_state,
            after_state,
            workspace_id
        ) VALUES (
            auth.uid(),
            v_action,
            TG_TABLE_NAME,
            COALESCE(
                (v_new_data->>'id')::UUID,
                (v_old_data->>'id')::UUID
            ),
            v_old_data,
            v_new_data,
            v_workspace_id
        );
    END IF;

    -- Return appropriate value
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Don't fail the transaction if audit logging fails
        RAISE WARNING 'Audit logging failed: %', SQLERRM;
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        ELSE
            RETURN NEW;
        END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Done - Audit trigger fixed
-- ============================================
