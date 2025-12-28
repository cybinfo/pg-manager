-- Expense Tracking System
-- Migration: 009_expense_tracking.sql

-- =====================================================
-- EXPENSE TYPES TABLE (Categories)
-- =====================================================
CREATE TABLE IF NOT EXISTS expense_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),

    UNIQUE(owner_id, code)
);

-- RLS for expense_types
ALTER TABLE expense_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own expense types"
    ON expense_types FOR ALL
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Index for faster lookups
CREATE INDEX idx_expense_types_owner ON expense_types(owner_id);

-- =====================================================
-- EXPENSES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE SET NULL,
    expense_type_id UUID NOT NULL REFERENCES expense_types(id) ON DELETE RESTRICT,

    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL,
    description TEXT,

    vendor_name TEXT,
    reference_number TEXT,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'bank_transfer', 'card', 'cheque')),

    receipt_url TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS for expenses
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own expenses"
    ON expenses FOR ALL
    USING (owner_id = auth.uid())
    WITH CHECK (owner_id = auth.uid());

-- Indexes for faster queries
CREATE INDEX idx_expenses_owner ON expenses(owner_id);
CREATE INDEX idx_expenses_property ON expenses(property_id);
CREATE INDEX idx_expenses_type ON expenses(expense_type_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date DESC);
CREATE INDEX idx_expenses_owner_date ON expenses(owner_id, expense_date DESC);

-- =====================================================
-- FUNCTION: Create default expense types for new owner
-- =====================================================
CREATE OR REPLACE FUNCTION create_default_expense_types(p_owner_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO expense_types (owner_id, name, code, description, display_order) VALUES
        (p_owner_id, 'Maintenance & Repairs', 'maintenance', 'Property maintenance and repair costs', 1),
        (p_owner_id, 'Electricity Bill (Owner)', 'electricity_owner', 'Electricity bills paid by owner for common areas', 2),
        (p_owner_id, 'Water Bill (Owner)', 'water_owner', 'Water bills paid by owner', 3),
        (p_owner_id, 'Cleaning & Housekeeping', 'cleaning', 'Cleaning services and supplies', 4),
        (p_owner_id, 'Security', 'security', 'Security services and equipment', 5),
        (p_owner_id, 'Internet/WiFi', 'internet', 'Internet and WiFi expenses', 6),
        (p_owner_id, 'Supplies & Consumables', 'supplies', 'General supplies and consumables', 7),
        (p_owner_id, 'Furniture & Fixtures', 'furniture', 'Furniture and fixture purchases', 8),
        (p_owner_id, 'Staff Salary', 'salary', 'Staff and employee salaries', 9),
        (p_owner_id, 'Property Tax', 'property_tax', 'Property and municipal taxes', 10),
        (p_owner_id, 'Insurance', 'insurance', 'Property and liability insurance', 11),
        (p_owner_id, 'Marketing', 'marketing', 'Advertising and marketing expenses', 12),
        (p_owner_id, 'Miscellaneous', 'misc', 'Other miscellaneous expenses', 13)
    ON CONFLICT (owner_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: Auto-update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_expenses_updated_at
    BEFORE UPDATE ON expenses
    FOR EACH ROW
    EXECUTE FUNCTION update_expenses_updated_at();

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE expense_types IS 'Categories/types of expenses that owners can track';
COMMENT ON TABLE expenses IS 'Individual expense records for property management';
COMMENT ON COLUMN expenses.payment_method IS 'Payment method: cash, upi, bank_transfer, card, cheque';
COMMENT ON COLUMN expenses.property_id IS 'Optional - NULL means expense applies to all properties';
