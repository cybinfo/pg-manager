-- ============================================
-- Migration 038: Comprehensive Audit System
-- ============================================
-- Adds audit triggers to ALL tables and creates
-- supporting infrastructure for the workflow engine.
-- ============================================

-- ============================================
-- 1. Create audit_events table if not exists
-- ============================================

CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  actor_id UUID NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'owner',
  workspace_id UUID,
  changes JSONB,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON audit_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_workspace ON audit_events(workspace_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON audit_events(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_created ON audit_events(created_at DESC);

-- ============================================
-- 2. Create notification_queue table
-- ============================================

CREATE TABLE IF NOT EXISTS notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel TEXT NOT NULL, -- 'email', 'whatsapp', 'in_app', 'push'
  recipient_id UUID NOT NULL,
  recipient_type TEXT NOT NULL, -- 'owner', 'staff', 'tenant'
  notification_type TEXT NOT NULL,
  subject TEXT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  action_label TEXT,
  data JSONB,
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high'
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  error_message TEXT,
  retry_count INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_recipient ON notification_queue(recipient_id, created_at DESC);

-- ============================================
-- 3. Create notifications table (in-app)
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read, created_at DESC);

-- ============================================
-- 4. Create room_transfers table
-- ============================================

CREATE TABLE IF NOT EXISTS room_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  old_room_id UUID REFERENCES rooms(id),
  new_room_id UUID NOT NULL REFERENCES rooms(id),
  old_bed_id UUID,
  new_bed_id UUID,
  transfer_date DATE NOT NULL,
  reason TEXT,
  old_rent DECIMAL(10,2),
  new_rent DECIMAL(10,2),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_transfers_tenant ON room_transfers(tenant_id, transfer_date DESC);

-- ============================================
-- 5. Create payment_refunds table
-- ============================================

CREATE TABLE IF NOT EXISTS payment_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  refund_method TEXT NOT NULL,
  reference_number TEXT,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment ON payment_refunds(payment_id);

-- ============================================
-- 6. Universal Audit Trigger Function
-- ============================================

CREATE OR REPLACE FUNCTION universal_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_changes JSONB;
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
    ELSE v_entity_type := TG_TABLE_NAME;
  END CASE;

  -- Get actor ID from auth.uid() or use system
  v_actor_id := COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::UUID);

  -- Try to get workspace_id from the record
  BEGIN
    IF TG_OP = 'DELETE' THEN
      v_workspace_id := OLD.owner_id;
    ELSE
      v_workspace_id := NEW.owner_id;
    END IF;
  EXCEPTION WHEN undefined_column THEN
    v_workspace_id := NULL;
  END;

  -- Build changes object
  IF TG_OP = 'INSERT' THEN
    v_changes := jsonb_build_object('after', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    v_changes := jsonb_build_object(
      'before', to_jsonb(OLD),
      'after', to_jsonb(NEW)
    );
  ELSIF TG_OP = 'DELETE' THEN
    v_changes := jsonb_build_object('before', to_jsonb(OLD));
  END IF;

  -- Insert audit event
  INSERT INTO audit_events (
    entity_type,
    entity_id,
    action,
    actor_id,
    actor_type,
    workspace_id,
    changes,
    created_at
  ) VALUES (
    v_entity_type,
    CASE
      WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT
      ELSE NEW.id::TEXT
    END,
    LOWER(TG_OP),
    v_actor_id,
    'system', -- Will be updated by application layer
    v_workspace_id,
    v_changes,
    NOW()
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 7. Apply Audit Triggers to ALL Tables
-- ============================================

-- Drop existing triggers first to avoid conflicts
DO $$
DECLARE
  tables TEXT[] := ARRAY[
    'tenants', 'properties', 'rooms', 'bills', 'payments',
    'expenses', 'complaints', 'notices', 'visitors', 'staff_members',
    'exit_clearance', 'approvals', 'meter_readings', 'charges',
    'roles', 'user_roles', 'tenant_documents', 'room_transfers',
    'payment_refunds', 'charge_types', 'expense_types'
  ];
  t TEXT;
BEGIN
  FOREACH t IN ARRAY tables
  LOOP
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t AND table_schema = 'public') THEN
      -- Drop existing trigger if any
      EXECUTE format('DROP TRIGGER IF EXISTS audit_trigger ON %I', t);

      -- Create new trigger
      EXECUTE format('
        CREATE TRIGGER audit_trigger
        AFTER INSERT OR UPDATE OR DELETE ON %I
        FOR EACH ROW
        EXECUTE FUNCTION universal_audit_trigger()
      ', t);

      RAISE NOTICE 'Audit trigger created for table: %', t;
    ELSE
      RAISE NOTICE 'Table % does not exist, skipping', t;
    END IF;
  END LOOP;
END;
$$;

-- ============================================
-- 8. Add missing columns to exit_clearance
-- ============================================

-- Add columns if they don't exist
DO $$
BEGIN
  -- actual_exit_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exit_clearance' AND column_name = 'actual_exit_date'
  ) THEN
    ALTER TABLE exit_clearance ADD COLUMN actual_exit_date DATE;
  END IF;

  -- settlement_mode
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exit_clearance' AND column_name = 'settlement_mode'
  ) THEN
    ALTER TABLE exit_clearance ADD COLUMN settlement_mode TEXT;
  END IF;

  -- settlement_reference
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exit_clearance' AND column_name = 'settlement_reference'
  ) THEN
    ALTER TABLE exit_clearance ADD COLUMN settlement_reference TEXT;
  END IF;

  -- final_notes
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exit_clearance' AND column_name = 'final_notes'
  ) THEN
    ALTER TABLE exit_clearance ADD COLUMN final_notes TEXT;
  END IF;

  -- completed_at
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exit_clearance' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE exit_clearance ADD COLUMN completed_at TIMESTAMPTZ;
  END IF;

  -- completed_by
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exit_clearance' AND column_name = 'completed_by'
  ) THEN
    ALTER TABLE exit_clearance ADD COLUMN completed_by UUID REFERENCES auth.users(id);
  END IF;

  -- deduction_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exit_clearance' AND column_name = 'deduction_amount'
  ) THEN
    ALTER TABLE exit_clearance ADD COLUMN deduction_amount DECIMAL(10,2) DEFAULT 0;
  END IF;

  -- refund_amount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exit_clearance' AND column_name = 'refund_amount'
  ) THEN
    ALTER TABLE exit_clearance ADD COLUMN refund_amount DECIMAL(10,2) DEFAULT 0;
  END IF;

  -- additional_payment
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'exit_clearance' AND column_name = 'additional_payment'
  ) THEN
    ALTER TABLE exit_clearance ADD COLUMN additional_payment DECIMAL(10,2) DEFAULT 0;
  END IF;
END;
$$;

-- ============================================
-- 9. Add missing columns to tenants
-- ============================================

DO $$
BEGIN
  -- expected_exit_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'expected_exit_date'
  ) THEN
    ALTER TABLE tenants ADD COLUMN expected_exit_date DATE;
  END IF;

  -- notice_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'notice_date'
  ) THEN
    ALTER TABLE tenants ADD COLUMN notice_date DATE;
  END IF;

  -- advance_balance
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tenants' AND column_name = 'advance_balance'
  ) THEN
    ALTER TABLE tenants ADD COLUMN advance_balance DECIMAL(10,2) DEFAULT 0;
  END IF;
END;
$$;

-- ============================================
-- 10. Add missing columns to bills
-- ============================================

DO $$
BEGIN
  -- last_payment_date
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'bills' AND column_name = 'last_payment_date'
  ) THEN
    ALTER TABLE bills ADD COLUMN last_payment_date DATE;
  END IF;
END;
$$;

-- ============================================
-- 11. Add missing columns to payments
-- ============================================

DO $$
BEGIN
  -- is_advance
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'is_advance'
  ) THEN
    ALTER TABLE payments ADD COLUMN is_advance BOOLEAN DEFAULT FALSE;
  END IF;
END;
$$;

-- ============================================
-- 12. RLS Policies for new tables
-- ============================================

-- audit_events (read-only for owners)
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_events_select ON audit_events;
CREATE POLICY audit_events_select ON audit_events
  FOR SELECT
  USING (
    workspace_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM platform_admins WHERE user_id = auth.uid()
    )
  );

-- notification_queue (owner access)
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_queue_all ON notification_queue;
CREATE POLICY notification_queue_all ON notification_queue
  FOR ALL
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- notifications (user access)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_all ON notifications;
CREATE POLICY notifications_all ON notifications
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- room_transfers (owner access via tenant)
ALTER TABLE room_transfers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS room_transfers_select ON room_transfers;
CREATE POLICY room_transfers_select ON room_transfers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = room_transfers.tenant_id
      AND t.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS room_transfers_insert ON room_transfers;
CREATE POLICY room_transfers_insert ON room_transfers
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tenants t
      WHERE t.id = room_transfers.tenant_id
      AND t.owner_id = auth.uid()
    )
  );

-- payment_refunds (owner access via payment)
ALTER TABLE payment_refunds ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS payment_refunds_select ON payment_refunds;
CREATE POLICY payment_refunds_select ON payment_refunds
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_refunds.payment_id
      AND p.owner_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS payment_refunds_insert ON payment_refunds;
CREATE POLICY payment_refunds_insert ON payment_refunds
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM payments p
      WHERE p.id = payment_refunds.payment_id
      AND p.owner_id = auth.uid()
    )
  );

-- ============================================
-- 13. Function to mark notifications as read
-- ============================================

CREATE OR REPLACE FUNCTION mark_notifications_read(notification_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE notifications
  SET read = TRUE, read_at = NOW()
  WHERE id = ANY(notification_ids)
  AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 14. Function to get unread notification count
-- ============================================

CREATE OR REPLACE FUNCTION get_unread_notification_count()
RETURNS INT AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notifications
    WHERE user_id = auth.uid()
    AND read = FALSE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- Complete
-- ============================================

COMMENT ON TABLE audit_events IS 'Comprehensive audit trail for all entity changes';
COMMENT ON TABLE notification_queue IS 'Queue for outbound notifications (email, WhatsApp, etc.)';
COMMENT ON TABLE notifications IS 'In-app notifications for users';
COMMENT ON TABLE room_transfers IS 'History of tenant room transfers';
COMMENT ON TABLE payment_refunds IS 'Record of payment refunds';
