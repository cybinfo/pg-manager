-- ============================================================================
-- Migration 069: Fix universal_audit_trigger for service role context
-- ============================================================================
-- Problem: When using the Supabase service role key (cron jobs, migration
-- scripts), auth.uid() returns NULL. The trigger uses COALESCE to fall back
-- to '00000000-0000-0000-0000-000000000000', but that UUID does not exist
-- in auth.users. The actor_user_id column (from migration 016) has both a
-- NOT NULL constraint and a FK reference to auth.users(id), causing inserts
-- to fail with a foreign key violation.
--
-- Fix:
-- 1. Drop the NOT NULL constraint on audit_events.actor_user_id
-- 2. Update universal_audit_trigger to set actor_user_id to NULL (not the
--    zero UUID) when auth.uid() is NULL, preserving the FK integrity
-- 3. actor_id (from migration 038) keeps the COALESCE zero-UUID pattern
--    since it has no FK constraint to auth.users
-- ============================================================================

-- ============================================
-- 1. Make actor_user_id nullable
-- ============================================
-- Migration 016 created it as NOT NULL REFERENCES auth.users(id).
-- Service role inserts have no auth context, so we must allow NULL.

ALTER TABLE audit_events ALTER COLUMN actor_user_id DROP NOT NULL;

-- ============================================
-- 2. Replace universal_audit_trigger function
-- ============================================
-- Changes from migration 042 version:
-- - actor_user_id is set to auth.uid() directly (NULL when service role)
-- - actor_id keeps COALESCE pattern (system actor UUID, no FK constraint)
-- - actor_type is 'system' when no auth context, 'user' otherwise

CREATE OR REPLACE FUNCTION universal_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB;
  v_before JSONB;
  v_after JSONB;
  v_entity_type TEXT;
  v_workspace_id UUID;
  v_auth_uid UUID;
  v_actor_id UUID;
BEGIN
  -- Determine entity type from table name
  v_entity_type := TG_TABLE_NAME;

  -- Map table names to entity types
  CASE TG_TABLE_NAME
    WHEN 'tenants' THEN v_entity_type := 'tenant';
    WHEN 'properties' THEN v_entity_type := 'property';
    WHEN 'rooms' THEN v_entity_type := 'room';
    WHEN 'bills' THEN v_entity_type := 'bill';
    WHEN 'payments' THEN v_entity_type := 'payment';
    WHEN 'expenses' THEN v_entity_type := 'expense';
    WHEN 'complaints' THEN v_entity_type := 'complaint';
    WHEN 'notices' THEN v_entity_type := 'notice';
    WHEN 'visitors' THEN v_entity_type := 'visitor';
    WHEN 'staff_members' THEN v_entity_type := 'staff';
    WHEN 'exit_clearance' THEN v_entity_type := 'exit_clearance';
    WHEN 'approvals' THEN v_entity_type := 'approval';
    WHEN 'meter_readings' THEN v_entity_type := 'meter_reading';
    WHEN 'charges' THEN v_entity_type := 'charge';
    WHEN 'roles' THEN v_entity_type := 'role';
    WHEN 'tenant_documents' THEN v_entity_type := 'tenant_document';
    WHEN 'refunds' THEN v_entity_type := 'refund';
    ELSE v_entity_type := TG_TABLE_NAME;
  END CASE;

  -- Get auth.uid() once; NULL when using service role key
  v_auth_uid := auth.uid();

  -- actor_id (no FK constraint): use system actor UUID as fallback
  v_actor_id := COALESCE(v_auth_uid, '00000000-0000-0000-0000-000000000000'::UUID);

  -- Try to get workspace_id from the record (owner_id in most tables)
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_workspace_id := OLD.owner_id;
    ELSE
      v_workspace_id := NEW.owner_id;
    END IF;
  EXCEPTION WHEN undefined_column THEN
    v_workspace_id := NULL;
  END;

  -- Build before/after state
  IF TG_OP = 'INSERT' THEN
    v_before := NULL;
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'UPDATE' THEN
    v_before := to_jsonb(OLD);
    v_after := to_jsonb(NEW);
  ELSIF TG_OP = 'DELETE' THEN
    v_before := to_jsonb(OLD);
    v_after := NULL;
  END IF;

  -- Build combined changes object
  v_changes := jsonb_build_object('before', v_before, 'after', v_after);

  -- Insert audit event with ALL columns populated
  INSERT INTO audit_events (
    entity_type,
    entity_id,
    action,
    -- Migration 038 columns
    actor_id,
    actor_type,
    changes,
    created_at,
    -- Migration 016 columns (actor_user_id is NULL for service role)
    actor_user_id,
    before_state,
    after_state,
    occurred_at,
    -- Shared columns
    workspace_id,
    metadata
  ) VALUES (
    v_entity_type,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT
      ELSE NEW.id::TEXT
    END,
    LOWER(TG_OP),
    -- Migration 038 columns
    v_actor_id,
    CASE WHEN v_auth_uid IS NULL THEN 'system' ELSE 'user' END,
    v_changes,
    NOW(),
    -- Migration 016 columns: use v_auth_uid directly (NULL-safe, no FK violation)
    v_auth_uid,
    v_before,
    v_after,
    NOW(),
    -- Shared columns
    v_workspace_id,
    jsonb_build_object('table_schema', TG_TABLE_SCHEMA)
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Done
-- ============================================
COMMENT ON FUNCTION universal_audit_trigger IS 'Audit trigger that handles both authenticated and service role (NULL auth.uid) contexts';
