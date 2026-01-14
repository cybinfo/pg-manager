-- Migration 044: Critical Fixes
-- Addresses issues identified in comprehensive review
-- Date: 2026-01-14

-- ============================================
-- 1. IDEMPOTENCY TABLE (Replaces in-memory cache)
-- ============================================

CREATE TABLE IF NOT EXISTS idempotency_keys (
    key TEXT PRIMARY KEY,
    workflow_name TEXT NOT NULL,
    result JSONB NOT NULL,
    actor_id UUID NOT NULL,
    workspace_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,

    -- Index for cleanup queries
    CONSTRAINT idempotency_expires_positive CHECK (expires_at > created_at)
);

-- Index for expired key cleanup
CREATE INDEX IF NOT EXISTS idx_idempotency_expires ON idempotency_keys(expires_at);

-- Index for lookup by actor
CREATE INDEX IF NOT EXISTS idx_idempotency_actor ON idempotency_keys(actor_id);

-- RLS for idempotency_keys
ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Function to clean expired keys (called by cron or application)
CREATE OR REPLACE FUNCTION clean_expired_idempotency_keys()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM idempotency_keys
    WHERE expires_at < NOW();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and store idempotency key
CREATE OR REPLACE FUNCTION check_idempotency_key(
    p_key TEXT,
    p_workflow_name TEXT,
    p_actor_id UUID,
    p_workspace_id UUID DEFAULT NULL,
    p_ttl_minutes INTEGER DEFAULT 5
)
RETURNS TABLE(
    is_duplicate BOOLEAN,
    cached_result JSONB
) AS $$
DECLARE
    existing_result JSONB;
BEGIN
    -- Clean expired keys first (lightweight cleanup)
    DELETE FROM idempotency_keys
    WHERE key = p_key AND expires_at < NOW();

    -- Check for existing non-expired key
    SELECT result INTO existing_result
    FROM idempotency_keys
    WHERE key = p_key AND expires_at > NOW();

    IF existing_result IS NOT NULL THEN
        RETURN QUERY SELECT TRUE, existing_result;
    ELSE
        RETURN QUERY SELECT FALSE, NULL::JSONB;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to store idempotency result
CREATE OR REPLACE FUNCTION store_idempotency_result(
    p_key TEXT,
    p_workflow_name TEXT,
    p_result JSONB,
    p_actor_id UUID,
    p_workspace_id UUID DEFAULT NULL,
    p_ttl_minutes INTEGER DEFAULT 5
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO idempotency_keys (key, workflow_name, result, actor_id, workspace_id, expires_at)
    VALUES (
        p_key,
        p_workflow_name,
        p_result,
        p_actor_id,
        p_workspace_id,
        NOW() + (p_ttl_minutes || ' minutes')::INTERVAL
    )
    ON CONFLICT (key) DO UPDATE SET
        result = EXCLUDED.result,
        expires_at = EXCLUDED.expires_at;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 2. FIX CASCADE DELETE (rooms -> tenants)
-- Change to RESTRICT to prevent accidental tenant deletion
-- ============================================

-- First check if the constraint exists and drop it
DO $$
BEGIN
    -- Drop existing constraint if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'tenants_room_id_fkey'
        AND table_name = 'tenants'
    ) THEN
        ALTER TABLE tenants DROP CONSTRAINT tenants_room_id_fkey;
    END IF;

    -- Re-add with RESTRICT
    ALTER TABLE tenants
    ADD CONSTRAINT tenants_room_id_fkey
    FOREIGN KEY (room_id) REFERENCES rooms(id)
    ON DELETE RESTRICT;

EXCEPTION WHEN OTHERS THEN
    -- Constraint might not exist or have different name
    RAISE NOTICE 'Could not modify tenants_room_id_fkey: %', SQLERRM;
END $$;


-- ============================================
-- 3. ADDITIONAL CHECK CONSTRAINTS
-- ============================================

-- rooms.occupied_beds validation
DO $$
BEGIN
    ALTER TABLE rooms ADD CONSTRAINT check_occupied_beds_range
        CHECK (occupied_beds >= 0);
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- rooms.total_beds validation
DO $$
BEGIN
    ALTER TABLE rooms ADD CONSTRAINT check_total_beds_positive
        CHECK (total_beds > 0);
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- tenants.security_deposit validation
DO $$
BEGIN
    ALTER TABLE tenants ADD CONSTRAINT check_security_deposit_non_negative
        CHECK (security_deposit >= 0);
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- tenants.monthly_rent validation
DO $$
BEGIN
    ALTER TABLE tenants ADD CONSTRAINT check_monthly_rent_positive
        CHECK (monthly_rent > 0);
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;

-- bills.total_amount validation
DO $$
BEGIN
    ALTER TABLE bills ADD CONSTRAINT check_bill_total_non_negative
        CHECK (total_amount >= 0);
EXCEPTION WHEN duplicate_object THEN
    NULL;
END $$;


-- ============================================
-- 4. PLATFORM ADMIN BYPASS FOR REMAINING TABLES
-- ============================================

-- Function already exists from migration 017, ensure it's available
CREATE OR REPLACE FUNCTION is_platform_admin(p_user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM platform_admins
        WHERE user_id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- charge_types - Add platform admin bypass
DO $$
BEGIN
    DROP POLICY IF EXISTS "Owners can manage charge_types" ON charge_types;
    CREATE POLICY "Owners and admins can manage charge_types"
    ON charge_types FOR ALL
    TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR owner_id = auth.uid()
        OR owner_id IN (
            SELECT w.owner_user_id FROM workspaces w
            JOIN user_contexts uc ON uc.workspace_id = w.id
            WHERE uc.user_id = auth.uid()
        )
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update charge_types policy: %', SQLERRM;
END $$;

-- expense_types - Add platform admin bypass
DO $$
BEGIN
    DROP POLICY IF EXISTS "Owners can manage expense_types" ON expense_types;
    CREATE POLICY "Owners and admins can manage expense_types"
    ON expense_types FOR ALL
    TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR owner_id = auth.uid()
        OR owner_id IN (
            SELECT w.owner_user_id FROM workspaces w
            JOIN user_contexts uc ON uc.workspace_id = w.id
            WHERE uc.user_id = auth.uid()
        )
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update expense_types policy: %', SQLERRM;
END $$;

-- beds - Add platform admin bypass
DO $$
BEGIN
    DROP POLICY IF EXISTS "Owners can manage beds" ON beds;
    CREATE POLICY "Owners and admins can manage beds"
    ON beds FOR ALL
    TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR owner_id = auth.uid()
        OR owner_id IN (
            SELECT w.owner_user_id FROM workspaces w
            JOIN user_contexts uc ON uc.workspace_id = w.id
            WHERE uc.user_id = auth.uid()
        )
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update beds policy: %', SQLERRM;
END $$;

-- complaints - Add platform admin bypass
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view complaints" ON complaints;
    CREATE POLICY "Users and admins can view complaints"
    ON complaints FOR SELECT
    TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR owner_id = auth.uid()
        OR owner_id IN (
            SELECT w.owner_user_id FROM workspaces w
            JOIN user_contexts uc ON uc.workspace_id = w.id
            WHERE uc.user_id = auth.uid()
        )
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update complaints policy: %', SQLERRM;
END $$;

-- notices - Add platform admin bypass
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view notices" ON notices;
    CREATE POLICY "Users and admins can view notices"
    ON notices FOR SELECT
    TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR owner_id = auth.uid()
        OR owner_id IN (
            SELECT w.owner_user_id FROM workspaces w
            JOIN user_contexts uc ON uc.workspace_id = w.id
            WHERE uc.user_id = auth.uid()
        )
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update notices policy: %', SQLERRM;
END $$;

-- visitors - Add platform admin bypass
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view visitors" ON visitors;
    CREATE POLICY "Users and admins can view visitors"
    ON visitors FOR SELECT
    TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR owner_id = auth.uid()
        OR owner_id IN (
            SELECT w.owner_user_id FROM workspaces w
            JOIN user_contexts uc ON uc.workspace_id = w.id
            WHERE uc.user_id = auth.uid()
        )
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update visitors policy: %', SQLERRM;
END $$;

-- meter_readings - Add platform admin bypass
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view meter_readings" ON meter_readings;
    CREATE POLICY "Users and admins can view meter_readings"
    ON meter_readings FOR SELECT
    TO authenticated
    USING (
        is_platform_admin(auth.uid())
        OR owner_id = auth.uid()
        OR owner_id IN (
            SELECT w.owner_user_id FROM workspaces w
            JOIN user_contexts uc ON uc.workspace_id = w.id
            WHERE uc.user_id = auth.uid()
        )
    );
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not update meter_readings policy: %', SQLERRM;
END $$;


-- ============================================
-- 5. MISSING COMPOSITE INDEXES
-- ============================================

-- Tenants by owner and status (very common query)
CREATE INDEX IF NOT EXISTS idx_tenants_owner_status
    ON tenants(owner_id, status);

-- Bills by owner, status, and due date (for overdue queries)
CREATE INDEX IF NOT EXISTS idx_bills_owner_status_due
    ON bills(owner_id, status, due_date);

-- Charges by tenant and status
CREATE INDEX IF NOT EXISTS idx_charges_tenant_status
    ON charges(tenant_id, status);

-- Payments by created_at (for transaction history)
CREATE INDEX IF NOT EXISTS idx_payments_created_at
    ON payments(created_at);


-- ============================================
-- 6. AUDIT TRIGGERS FOR MISSING TABLES
-- ============================================

-- Add audit trigger to beds table if not exists
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'audit_beds_trigger'
    ) THEN
        -- Only create if universal_audit_trigger function exists
        IF EXISTS (
            SELECT 1 FROM pg_proc
            WHERE proname = 'universal_audit_trigger'
        ) THEN
            CREATE TRIGGER audit_beds_trigger
            AFTER INSERT OR UPDATE OR DELETE ON beds
            FOR EACH ROW EXECUTE FUNCTION universal_audit_trigger();
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create beds audit trigger: %', SQLERRM;
END $$;


-- ============================================
-- 7. TRANSACTION WRAPPER FUNCTION FOR WORKFLOWS
-- This allows workflows to execute in a single transaction
-- ============================================

CREATE OR REPLACE FUNCTION execute_workflow_transaction(
    p_workflow_name TEXT,
    p_operations JSONB,  -- Array of {table, operation, data} objects
    p_actor_id UUID,
    p_workspace_id UUID
)
RETURNS JSONB AS $$
DECLARE
    op JSONB;
    result JSONB := '{}';
    operation_results JSONB := '[]';
    op_result JSONB;
    v_table TEXT;
    v_operation TEXT;
    v_data JSONB;
    v_where JSONB;
    v_id UUID;
BEGIN
    -- Execute all operations within this transaction
    FOR op IN SELECT * FROM jsonb_array_elements(p_operations)
    LOOP
        v_table := op->>'table';
        v_operation := op->>'operation';
        v_data := op->'data';
        v_where := op->'where';

        CASE v_operation
            WHEN 'insert' THEN
                EXECUTE format(
                    'INSERT INTO %I SELECT * FROM jsonb_populate_record(NULL::%I, $1) RETURNING id',
                    v_table, v_table
                ) USING v_data INTO v_id;
                op_result := jsonb_build_object('id', v_id, 'operation', 'insert', 'table', v_table);

            WHEN 'update' THEN
                -- Update requires a where clause with id
                EXECUTE format(
                    'UPDATE %I SET %s WHERE id = $1',
                    v_table,
                    (SELECT string_agg(format('%I = %L', key, value), ', ')
                     FROM jsonb_each_text(v_data))
                ) USING (v_where->>'id')::UUID;
                op_result := jsonb_build_object('operation', 'update', 'table', v_table, 'id', v_where->>'id');

            WHEN 'delete' THEN
                EXECUTE format(
                    'DELETE FROM %I WHERE id = $1',
                    v_table
                ) USING (v_where->>'id')::UUID;
                op_result := jsonb_build_object('operation', 'delete', 'table', v_table, 'id', v_where->>'id');

            ELSE
                RAISE EXCEPTION 'Unknown operation: %', v_operation;
        END CASE;

        operation_results := operation_results || op_result;
    END LOOP;

    result := jsonb_build_object(
        'success', TRUE,
        'workflow', p_workflow_name,
        'operations', operation_results,
        'actor_id', p_actor_id,
        'workspace_id', p_workspace_id,
        'executed_at', NOW()
    );

    RETURN result;

EXCEPTION WHEN OTHERS THEN
    -- Transaction will be rolled back automatically
    RETURN jsonb_build_object(
        'success', FALSE,
        'error', SQLERRM,
        'workflow', p_workflow_name,
        'actor_id', p_actor_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================
-- 8. DEPRECATE payment_refunds TABLE
-- Mark as deprecated, keep for backward compatibility
-- ============================================

COMMENT ON TABLE payment_refunds IS 'DEPRECATED: Use refunds table instead. Kept for backward compatibility.';


-- ============================================
-- Done
-- ============================================

-- Migration 044 completed - Critical fixes applied
DO $$ BEGIN RAISE NOTICE 'Migration 044 completed successfully'; END $$;
