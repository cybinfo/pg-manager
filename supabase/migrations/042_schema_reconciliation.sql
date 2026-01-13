-- ============================================
-- Migration 042: Schema Reconciliation
-- ============================================
-- Reconciles conflicting table definitions between migrations:
-- - audit_events (016 vs 038)
-- - room_transfers (007 vs 038)
-- - Adds missing indexes on foreign key columns
-- ============================================

-- ============================================
-- 1. RECONCILE audit_events TABLE
-- ============================================
-- Migration 016 created: occurred_at, actor_user_id, actor_context_id, before_state, after_state
-- Migration 038 expects: created_at, actor_id, actor_type, changes
-- We add missing columns to support both trigger functions

-- Add columns expected by migration 038 (if table was created by 016)
DO $$
BEGIN
  -- actor_id (alias for actor_user_id)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_events' AND column_name = 'actor_id'
  ) THEN
    ALTER TABLE audit_events ADD COLUMN actor_id UUID;
    -- Populate from actor_user_id if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'audit_events' AND column_name = 'actor_user_id'
    ) THEN
      UPDATE audit_events SET actor_id = actor_user_id WHERE actor_id IS NULL;
    END IF;
  END IF;

  -- actor_type
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_events' AND column_name = 'actor_type'
  ) THEN
    ALTER TABLE audit_events ADD COLUMN actor_type TEXT DEFAULT 'system';
  END IF;

  -- changes (combined before/after)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_events' AND column_name = 'changes'
  ) THEN
    ALTER TABLE audit_events ADD COLUMN changes JSONB;
    -- Populate from before_state/after_state if they exist
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'audit_events' AND column_name = 'before_state'
    ) THEN
      UPDATE audit_events SET changes = jsonb_build_object(
        'before', before_state,
        'after', after_state
      ) WHERE changes IS NULL AND (before_state IS NOT NULL OR after_state IS NOT NULL);
    END IF;
  END IF;

  -- created_at (alias for occurred_at)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_events' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE audit_events ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    -- Populate from occurred_at if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'audit_events' AND column_name = 'occurred_at'
    ) THEN
      UPDATE audit_events SET created_at = occurred_at WHERE created_at IS NULL;
    END IF;
  END IF;
END;
$$;

-- Add columns expected by migration 016 (if table was created by 038)
DO $$
BEGIN
  -- actor_user_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_events' AND column_name = 'actor_user_id'
  ) THEN
    ALTER TABLE audit_events ADD COLUMN actor_user_id UUID REFERENCES auth.users(id);
    -- Populate from actor_id if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'audit_events' AND column_name = 'actor_id'
    ) THEN
      UPDATE audit_events SET actor_user_id = actor_id WHERE actor_user_id IS NULL;
    END IF;
  END IF;

  -- actor_context_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_events' AND column_name = 'actor_context_id'
  ) THEN
    ALTER TABLE audit_events ADD COLUMN actor_context_id UUID REFERENCES user_contexts(id);
  END IF;

  -- before_state
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_events' AND column_name = 'before_state'
  ) THEN
    ALTER TABLE audit_events ADD COLUMN before_state JSONB;
    -- Populate from changes if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'audit_events' AND column_name = 'changes'
    ) THEN
      UPDATE audit_events SET before_state = changes->'before' WHERE before_state IS NULL AND changes IS NOT NULL;
    END IF;
  END IF;

  -- after_state
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_events' AND column_name = 'after_state'
  ) THEN
    ALTER TABLE audit_events ADD COLUMN after_state JSONB;
    -- Populate from changes if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'audit_events' AND column_name = 'changes'
    ) THEN
      UPDATE audit_events SET after_state = changes->'after' WHERE after_state IS NULL AND changes IS NOT NULL;
    END IF;
  END IF;

  -- occurred_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_events' AND column_name = 'occurred_at'
  ) THEN
    ALTER TABLE audit_events ADD COLUMN occurred_at TIMESTAMPTZ DEFAULT NOW();
    -- Populate from created_at if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'audit_events' AND column_name = 'created_at'
    ) THEN
      UPDATE audit_events SET occurred_at = created_at WHERE occurred_at IS NULL;
    END IF;
  END IF;

  -- request_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_events' AND column_name = 'request_id'
  ) THEN
    ALTER TABLE audit_events ADD COLUMN request_id TEXT;
  END IF;

  -- metadata (may be missing or have wrong default)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'audit_events' AND column_name = 'metadata'
  ) THEN
    ALTER TABLE audit_events ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
  END IF;
END;
$$;

-- ============================================
-- 2. UPDATE audit trigger to use correct columns
-- ============================================
-- This trigger function populates BOTH column sets for compatibility
CREATE OR REPLACE FUNCTION universal_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB;
  v_before JSONB;
  v_after JSONB;
  v_entity_type TEXT;
  v_workspace_id UUID;
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

  -- Get actor ID from auth.uid() or use system UUID
  v_actor_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID);

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
    -- Migration 016 columns
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
    'system',
    v_changes,
    NOW(),
    -- Migration 016 columns
    v_actor_id,
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
-- 3. RECONCILE room_transfers TABLE
-- ============================================
-- Migration 007 created: owner_id, from_property_id, from_room_id, to_property_id, to_room_id, approved_by
-- Migration 038 expects: old_room_id, new_room_id, old_bed_id, new_bed_id, created_by (no owner_id!)

-- Add owner_id if missing (critical for RLS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_transfers' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE room_transfers ADD COLUMN owner_id UUID REFERENCES owners(id) ON DELETE CASCADE;
    -- Populate from tenant's owner_id
    UPDATE room_transfers rt
    SET owner_id = t.owner_id
    FROM tenants t
    WHERE rt.tenant_id = t.id AND rt.owner_id IS NULL;
  END IF;

  -- Add missing columns from migration 038 (if table created by 007)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_transfers' AND column_name = 'old_room_id'
  ) THEN
    ALTER TABLE room_transfers ADD COLUMN old_room_id UUID REFERENCES rooms(id);
    -- Populate from from_room_id if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'room_transfers' AND column_name = 'from_room_id'
    ) THEN
      UPDATE room_transfers SET old_room_id = from_room_id WHERE old_room_id IS NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_transfers' AND column_name = 'new_room_id'
  ) THEN
    ALTER TABLE room_transfers ADD COLUMN new_room_id UUID REFERENCES rooms(id);
    -- Populate from to_room_id if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'room_transfers' AND column_name = 'to_room_id'
    ) THEN
      UPDATE room_transfers SET new_room_id = to_room_id WHERE new_room_id IS NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_transfers' AND column_name = 'old_bed_id'
  ) THEN
    ALTER TABLE room_transfers ADD COLUMN old_bed_id UUID;
    -- Populate from from_bed_id if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'room_transfers' AND column_name = 'from_bed_id'
    ) THEN
      UPDATE room_transfers SET old_bed_id = from_bed_id WHERE old_bed_id IS NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_transfers' AND column_name = 'new_bed_id'
  ) THEN
    ALTER TABLE room_transfers ADD COLUMN new_bed_id UUID;
    -- Populate from to_bed_id if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'room_transfers' AND column_name = 'to_bed_id'
    ) THEN
      UPDATE room_transfers SET new_bed_id = to_bed_id WHERE new_bed_id IS NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_transfers' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE room_transfers ADD COLUMN created_by UUID REFERENCES auth.users(id);
    -- Populate from approved_by if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'room_transfers' AND column_name = 'approved_by'
    ) THEN
      UPDATE room_transfers SET created_by = approved_by WHERE created_by IS NULL;
    END IF;
  END IF;

  -- Add missing columns from migration 007 (if table created by 038)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_transfers' AND column_name = 'from_property_id'
  ) THEN
    ALTER TABLE room_transfers ADD COLUMN from_property_id UUID REFERENCES properties(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_transfers' AND column_name = 'from_room_id'
  ) THEN
    ALTER TABLE room_transfers ADD COLUMN from_room_id UUID REFERENCES rooms(id) ON DELETE CASCADE;
    -- Populate from old_room_id if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'room_transfers' AND column_name = 'old_room_id'
    ) THEN
      UPDATE room_transfers SET from_room_id = old_room_id WHERE from_room_id IS NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_transfers' AND column_name = 'from_bed_id'
  ) THEN
    ALTER TABLE room_transfers ADD COLUMN from_bed_id UUID REFERENCES beds(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_transfers' AND column_name = 'to_property_id'
  ) THEN
    ALTER TABLE room_transfers ADD COLUMN to_property_id UUID REFERENCES properties(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_transfers' AND column_name = 'to_room_id'
  ) THEN
    ALTER TABLE room_transfers ADD COLUMN to_room_id UUID REFERENCES rooms(id) ON DELETE CASCADE;
    -- Populate from new_room_id if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'room_transfers' AND column_name = 'new_room_id'
    ) THEN
      UPDATE room_transfers SET to_room_id = new_room_id WHERE to_room_id IS NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_transfers' AND column_name = 'to_bed_id'
  ) THEN
    ALTER TABLE room_transfers ADD COLUMN to_bed_id UUID REFERENCES beds(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_transfers' AND column_name = 'approved_by'
  ) THEN
    ALTER TABLE room_transfers ADD COLUMN approved_by UUID REFERENCES auth.users(id);
    -- Populate from created_by if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'room_transfers' AND column_name = 'created_by'
    ) THEN
      UPDATE room_transfers SET approved_by = created_by WHERE approved_by IS NULL;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'room_transfers' AND column_name = 'notes'
  ) THEN
    ALTER TABLE room_transfers ADD COLUMN notes TEXT;
  END IF;
END;
$$;

-- Fix RLS policy for room_transfers to use owner_id
DROP POLICY IF EXISTS "Owners can manage room transfers" ON room_transfers;
DROP POLICY IF EXISTS room_transfers_select ON room_transfers;
DROP POLICY IF EXISTS room_transfers_insert ON room_transfers;

CREATE POLICY "room_transfers_owner_access" ON room_transfers
  FOR ALL USING (
    owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_contexts uc
      WHERE uc.user_id = auth.uid()
      AND uc.workspace_id = room_transfers.owner_id
      AND uc.is_active = true
    )
  );

-- ============================================
-- 4. ADD MISSING INDEXES ON FOREIGN KEY COLUMNS
-- ============================================
-- These indexes improve JOIN performance and are best practice for FKs

-- tenants table indexes
CREATE INDEX IF NOT EXISTS idx_tenants_owner_id ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property_id ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_room_id ON tenants(room_id);
CREATE INDEX IF NOT EXISTS idx_tenants_bed_id ON tenants(bed_id);

-- bills table indexes
CREATE INDEX IF NOT EXISTS idx_bills_owner_id ON bills(owner_id);
CREATE INDEX IF NOT EXISTS idx_bills_tenant_id ON bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bills_property_id ON bills(property_id);

-- payments table indexes
CREATE INDEX IF NOT EXISTS idx_payments_owner_id ON payments(owner_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);

-- charges table indexes
CREATE INDEX IF NOT EXISTS idx_charges_owner_id ON charges(owner_id);
CREATE INDEX IF NOT EXISTS idx_charges_tenant_id ON charges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_charges_property_id ON charges(property_id);
CREATE INDEX IF NOT EXISTS idx_charges_charge_type_id ON charges(charge_type_id);

-- rooms table indexes
CREATE INDEX IF NOT EXISTS idx_rooms_owner_id ON rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_property_id ON rooms(property_id);

-- properties table indexes
CREATE INDEX IF NOT EXISTS idx_properties_owner_id ON properties(owner_id);

-- expenses table indexes
CREATE INDEX IF NOT EXISTS idx_expenses_owner_id ON expenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_expenses_property_id ON expenses(property_id);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_type_id ON expenses(expense_type_id);

-- complaints table indexes
CREATE INDEX IF NOT EXISTS idx_complaints_owner_id ON complaints(owner_id);
CREATE INDEX IF NOT EXISTS idx_complaints_tenant_id ON complaints(tenant_id);
CREATE INDEX IF NOT EXISTS idx_complaints_property_id ON complaints(property_id);

-- notices table indexes
CREATE INDEX IF NOT EXISTS idx_notices_owner_id ON notices(owner_id);
CREATE INDEX IF NOT EXISTS idx_notices_property_id ON notices(property_id);

-- visitors table indexes
CREATE INDEX IF NOT EXISTS idx_visitors_owner_id ON visitors(owner_id);
CREATE INDEX IF NOT EXISTS idx_visitors_tenant_id ON visitors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_visitors_property_id ON visitors(property_id);

-- exit_clearance table indexes
CREATE INDEX IF NOT EXISTS idx_exit_clearance_owner_id ON exit_clearance(owner_id);
CREATE INDEX IF NOT EXISTS idx_exit_clearance_tenant_id ON exit_clearance(tenant_id);

-- staff_members table indexes
CREATE INDEX IF NOT EXISTS idx_staff_members_owner_id ON staff_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id ON staff_members(user_id);

-- user_contexts table indexes
CREATE INDEX IF NOT EXISTS idx_user_contexts_user_id ON user_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contexts_workspace_id ON user_contexts(workspace_id);

-- user_roles table indexes
CREATE INDEX IF NOT EXISTS idx_user_roles_user_context_id ON user_roles(user_context_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);

-- tenant_stays table indexes
CREATE INDEX IF NOT EXISTS idx_tenant_stays_owner_id ON tenant_stays(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenant_stays_tenant_id ON tenant_stays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_stays_property_id ON tenant_stays(property_id);
CREATE INDEX IF NOT EXISTS idx_tenant_stays_room_id ON tenant_stays(room_id);

-- room_transfers table indexes
CREATE INDEX IF NOT EXISTS idx_room_transfers_owner_id ON room_transfers(owner_id);
CREATE INDEX IF NOT EXISTS idx_room_transfers_tenant_id ON room_transfers(tenant_id);

-- refunds table indexes (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'refunds') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_refunds_owner_id ON refunds(owner_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_refunds_tenant_id ON refunds(tenant_id)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_refunds_exit_clearance_id ON refunds(exit_clearance_id)';
  END IF;
END;
$$;

-- audit_events table indexes
CREATE INDEX IF NOT EXISTS idx_audit_events_workspace_id ON audit_events(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor_user_id ON audit_events(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity_type_id ON audit_events(entity_type, entity_id);

-- ============================================
-- 5. FIX audit_events RLS POLICY
-- ============================================
-- The policy in 038 incorrectly checks workspace_id = auth.uid()
-- It should check if user owns the workspace or has context access

DROP POLICY IF EXISTS audit_events_select ON audit_events;
DROP POLICY IF EXISTS "audit_events_select_policy" ON audit_events;

CREATE POLICY "audit_events_select_policy" ON audit_events
  FOR SELECT
  USING (
    -- Owner can see their workspace events
    workspace_id = auth.uid()
    -- Platform admin can see all
    OR EXISTS (
      SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
    )
    -- Staff can see events for workspaces they have access to
    OR EXISTS (
      SELECT 1 FROM user_contexts uc
      WHERE uc.user_id = auth.uid()
      AND uc.workspace_id = audit_events.workspace_id
      AND uc.is_active = true
    )
    -- User can see events they created
    OR actor_user_id = auth.uid()
    OR actor_id = auth.uid()
  );

-- ============================================
-- 6. ATOMIC ROOM OCCUPANCY FUNCTIONS (FIX BL-001)
-- ============================================
-- These functions provide atomic increment/decrement operations
-- to prevent race conditions when multiple tenants are added/removed simultaneously

-- Increment room occupancy atomically
CREATE OR REPLACE FUNCTION increment_room_occupancy(
  p_room_id UUID,
  p_total_beds INTEGER
)
RETURNS TABLE (occupied_beds INTEGER, status TEXT) AS $$
DECLARE
  v_new_occupied INTEGER;
  v_new_status TEXT;
BEGIN
  -- Atomic update with RETURNING
  UPDATE rooms
  SET occupied_beds = COALESCE(rooms.occupied_beds, 0) + 1,
      status = CASE
        WHEN COALESCE(rooms.occupied_beds, 0) + 1 >= p_total_beds THEN 'occupied'
        ELSE 'partially_occupied'
      END,
      updated_at = NOW()
  WHERE id = p_room_id
  RETURNING rooms.occupied_beds, rooms.status INTO v_new_occupied, v_new_status;

  RETURN QUERY SELECT v_new_occupied, v_new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Decrement room occupancy atomically
CREATE OR REPLACE FUNCTION decrement_room_occupancy(p_room_id UUID)
RETURNS TABLE (occupied_beds INTEGER, status TEXT) AS $$
DECLARE
  v_new_occupied INTEGER;
  v_new_status TEXT;
BEGIN
  -- Atomic update with RETURNING
  UPDATE rooms
  SET occupied_beds = GREATEST(0, COALESCE(rooms.occupied_beds, 1) - 1),
      status = CASE
        WHEN GREATEST(0, COALESCE(rooms.occupied_beds, 1) - 1) = 0 THEN 'available'
        ELSE 'occupied'
      END,
      updated_at = NOW()
  WHERE id = p_room_id
  RETURNING rooms.occupied_beds, rooms.status INTO v_new_occupied, v_new_status;

  RETURN QUERY SELECT v_new_occupied, v_new_status;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic advance balance update (FIX BL-002)
CREATE OR REPLACE FUNCTION update_advance_balance(
  p_tenant_id UUID,
  p_amount DECIMAL(10,2),
  p_operation TEXT -- 'add' or 'subtract'
)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_new_balance DECIMAL(10,2);
BEGIN
  IF p_operation = 'add' THEN
    UPDATE tenants
    SET advance_balance = COALESCE(advance_balance, 0) + p_amount,
        updated_at = NOW()
    WHERE id = p_tenant_id
    RETURNING advance_balance INTO v_new_balance;
  ELSIF p_operation = 'subtract' THEN
    UPDATE tenants
    SET advance_balance = GREATEST(0, COALESCE(advance_balance, 0) - p_amount),
        updated_at = NOW()
    WHERE id = p_tenant_id
    RETURNING advance_balance INTO v_new_balance;
  ELSE
    RAISE EXCEPTION 'Invalid operation: %. Use "add" or "subtract".', p_operation;
  END IF;

  RETURN v_new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION increment_room_occupancy IS 'Atomically increments room occupied_beds count to prevent race conditions';
COMMENT ON FUNCTION decrement_room_occupancy IS 'Atomically decrements room occupied_beds count to prevent race conditions';
COMMENT ON FUNCTION update_advance_balance IS 'Atomically updates tenant advance_balance to prevent lost updates';

-- ============================================
-- COMPLETE
-- ============================================

COMMENT ON TABLE audit_events IS 'Reconciled audit trail - supports both migration 016 and 038 column formats';
COMMENT ON TABLE room_transfers IS 'Reconciled room transfers - supports both migration 007 and 038 column formats';
