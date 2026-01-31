-- ============================================================================
-- Migration: 060_misc_transactions_module.sql
-- Description: Miscellaneous Transactions module for tracking money in/out
-- Author: Claude
-- Date: 2026-01-31
-- ============================================================================

-- ============================================================================
-- 1. MISC TRANSACTION CATEGORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS misc_transaction_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Category details
    name VARCHAR(100) NOT NULL,
    name_hi VARCHAR(100),                    -- Hindi name
    description TEXT,

    -- Type: which direction this category is typically used for
    -- 'in' = money coming in, 'out' = money going out, 'both' = either direction
    default_type VARCHAR(10) DEFAULT 'both' CHECK (default_type IN ('in', 'out', 'both')),

    -- Display
    icon VARCHAR(50),                        -- Lucide icon name
    color VARCHAR(20),                       -- Color for UI
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),

    UNIQUE(workspace_id, name)
);

-- ============================================================================
-- 2. MISC TRANSACTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS misc_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Transaction type
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('in', 'out')),

    -- Category (optional - can be uncategorized)
    category_id UUID REFERENCES misc_transaction_categories(id),
    category_name VARCHAR(100),              -- Denormalized for display

    -- Transaction details
    person_name VARCHAR(255),                -- Who gave/received money
    description TEXT,                        -- What it's for
    amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),

    -- Date & Payment
    transaction_date DATE NOT NULL,
    payment_mode VARCHAR(20) DEFAULT 'cash' CHECK (payment_mode IN ('cash', 'upi', 'bank_transfer', 'card', 'cheque', 'paytm', 'other')),
    payment_reference VARCHAR(100),          -- UPI ref, cheque number, etc.

    -- Optional reference to related entities
    property_id UUID REFERENCES properties(id),
    tenant_id UUID REFERENCES tenants(id),

    -- Attachments
    receipt_url TEXT,
    notes TEXT,

    -- Legacy ID for migration tracking
    legacy_id VARCHAR(50),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_misc_transaction_categories_workspace
    ON misc_transaction_categories(workspace_id) WHERE deleted_at IS NULL;

-- Transactions indexes
CREATE INDEX IF NOT EXISTS idx_misc_transactions_workspace
    ON misc_transactions(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_misc_transactions_date
    ON misc_transactions(workspace_id, transaction_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_misc_transactions_type
    ON misc_transactions(workspace_id, transaction_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_misc_transactions_category
    ON misc_transactions(category_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_misc_transactions_legacy
    ON misc_transactions(legacy_id) WHERE legacy_id IS NOT NULL;

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE misc_transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE misc_transactions ENABLE ROW LEVEL SECURITY;

-- Categories RLS
CREATE POLICY "misc_transaction_categories_workspace_isolation" ON misc_transaction_categories
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM user_contexts
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR is_platform_admin(auth.uid())
    );

-- Transactions RLS
CREATE POLICY "misc_transactions_workspace_isolation" ON misc_transactions
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM user_contexts
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR is_platform_admin(auth.uid())
    );

-- ============================================================================
-- 5. AUDIT TRIGGERS
-- ============================================================================

-- Updated_at trigger for categories
CREATE TRIGGER update_misc_transaction_categories_updated_at
    BEFORE UPDATE ON misc_transaction_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Updated_at trigger for transactions
CREATE TRIGGER update_misc_transactions_updated_at
    BEFORE UPDATE ON misc_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger for categories
CREATE TRIGGER audit_misc_transaction_categories
    AFTER INSERT OR UPDATE OR DELETE ON misc_transaction_categories
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- Audit trigger for transactions
CREATE TRIGGER audit_misc_transactions
    AFTER INSERT OR UPDATE OR DELETE ON misc_transactions
    FOR EACH ROW
    EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to get misc transaction summary for a workspace
CREATE OR REPLACE FUNCTION get_misc_transaction_summary(
    p_workspace_id UUID,
    p_start_date DATE DEFAULT NULL,
    p_end_date DATE DEFAULT NULL
)
RETURNS TABLE (
    total_in DECIMAL(12,2),
    total_out DECIMAL(12,2),
    net_amount DECIMAL(12,2),
    transaction_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        COALESCE(SUM(CASE WHEN transaction_type = 'in' THEN amount ELSE 0 END), 0) as total_in,
        COALESCE(SUM(CASE WHEN transaction_type = 'out' THEN amount ELSE 0 END), 0) as total_out,
        COALESCE(SUM(CASE WHEN transaction_type = 'in' THEN amount ELSE -amount END), 0) as net_amount,
        COUNT(*)::INTEGER as transaction_count
    FROM misc_transactions
    WHERE workspace_id = p_workspace_id
      AND deleted_at IS NULL
      AND (p_start_date IS NULL OR transaction_date >= p_start_date)
      AND (p_end_date IS NULL OR transaction_date <= p_end_date);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. COMMENTS
-- ============================================================================

COMMENT ON TABLE misc_transaction_categories IS 'Categories for miscellaneous money in/out transactions';
COMMENT ON TABLE misc_transactions IS 'Miscellaneous money in/out transactions (cash book)';
COMMENT ON COLUMN misc_transactions.transaction_type IS 'in = money received, out = money paid';
COMMENT ON COLUMN misc_transactions.legacy_id IS 'Original ID from migrated data for tracking';
