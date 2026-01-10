-- ============================================
-- Migration 039: Refunds Table
--
-- Comprehensive refund tracking system for:
-- - Security deposit refunds (from exit clearance)
-- - Overpayment refunds
-- - Adjustment refunds
-- ============================================

-- Create refunds table
CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Links
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    exit_clearance_id UUID REFERENCES exit_clearance(id) ON DELETE SET NULL,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,

    -- Refund details
    refund_type TEXT NOT NULL DEFAULT 'deposit_refund', -- 'deposit_refund', 'overpayment', 'adjustment', 'other'
    amount DECIMAL(10,2) NOT NULL,

    -- Payment details
    payment_mode TEXT NOT NULL DEFAULT 'cash', -- 'cash', 'upi', 'bank_transfer', 'cheque'
    reference_number TEXT,
    bank_details JSONB DEFAULT '{}'::jsonb, -- For bank transfers: account_number, ifsc, bank_name

    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'cancelled'

    -- Dates
    refund_date DATE,
    due_date DATE,

    -- Processing info
    processed_by UUID REFERENCES auth.users(id),
    processed_at TIMESTAMPTZ,

    -- Notes and metadata
    reason TEXT,
    notes TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_refunds_owner_id ON refunds(owner_id);
CREATE INDEX IF NOT EXISTS idx_refunds_tenant_id ON refunds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_refunds_exit_clearance_id ON refunds(exit_clearance_id);
CREATE INDEX IF NOT EXISTS idx_refunds_status ON refunds(status);
CREATE INDEX IF NOT EXISTS idx_refunds_refund_date ON refunds(refund_date);
CREATE INDEX IF NOT EXISTS idx_refunds_created_at ON refunds(created_at);

-- Enable RLS
ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "refunds_select_policy" ON refunds;
CREATE POLICY "refunds_select_policy" ON refunds
    FOR SELECT USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_contexts uc
            WHERE uc.user_id = auth.uid()
            AND uc.workspace_id = refunds.workspace_id
            AND uc.is_active = true
        )
        OR EXISTS (
            SELECT 1 FROM platform_admins pa
            WHERE pa.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "refunds_insert_policy" ON refunds;
CREATE POLICY "refunds_insert_policy" ON refunds
    FOR INSERT WITH CHECK (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_contexts uc
            WHERE uc.user_id = auth.uid()
            AND uc.workspace_id = refunds.workspace_id
            AND uc.is_active = true
        )
    );

DROP POLICY IF EXISTS "refunds_update_policy" ON refunds;
CREATE POLICY "refunds_update_policy" ON refunds
    FOR UPDATE USING (
        owner_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM user_contexts uc
            WHERE uc.user_id = auth.uid()
            AND uc.workspace_id = refunds.workspace_id
            AND uc.is_active = true
        )
    );

DROP POLICY IF EXISTS "refunds_delete_policy" ON refunds;
CREATE POLICY "refunds_delete_policy" ON refunds
    FOR DELETE USING (
        owner_id = auth.uid()
    );

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_refunds_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_refunds_updated_at ON refunds;
CREATE TRIGGER trigger_refunds_updated_at
    BEFORE UPDATE ON refunds
    FOR EACH ROW
    EXECUTE FUNCTION update_refunds_updated_at();

-- Add refund_status to exit_clearance for quick reference
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'exit_clearance' AND column_name = 'refund_status'
    ) THEN
        ALTER TABLE exit_clearance ADD COLUMN refund_status TEXT DEFAULT 'pending';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'exit_clearance' AND column_name = 'refund_amount'
    ) THEN
        ALTER TABLE exit_clearance ADD COLUMN refund_amount DECIMAL(10,2) DEFAULT 0;
    END IF;
END $$;

-- Comment on table
COMMENT ON TABLE refunds IS 'Tracks all refund transactions including deposit refunds, overpayments, and adjustments';
