-- Billing System Enhancement
-- Creates bills/invoices that group charges for easier tracking

-- ============================================
-- BILLS (Monthly Invoices)
-- ============================================
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

    -- Bill identification
    bill_number TEXT NOT NULL,  -- INV-2024-001

    -- Billing period
    bill_date DATE NOT NULL,
    due_date DATE NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    for_month TEXT NOT NULL,  -- "January 2024"

    -- Amounts
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,  -- Sum of all charges
    discount_amount DECIMAL(10,2) DEFAULT 0,
    late_fee DECIMAL(10,2) DEFAULT 0,
    previous_balance DECIMAL(10,2) DEFAULT 0,  -- Carried forward from previous bills
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,  -- Final amount due
    paid_amount DECIMAL(10,2) DEFAULT 0,
    balance_due DECIMAL(10,2) NOT NULL DEFAULT 0,

    -- Status: pending, partial, paid, overdue, cancelled
    status TEXT DEFAULT 'pending',

    -- Breakdown stored as JSONB for easy display
    line_items JSONB DEFAULT '[]'::jsonb,
    /*
    [
        {"type": "Rent", "description": "Monthly Rent - January 2024", "amount": 8000},
        {"type": "Electricity", "description": "150 units @ ₹8/unit", "amount": 1200},
        {"type": "Water", "description": "Flat charge", "amount": 200},
        {"type": "Previous Balance", "description": "Carried forward", "amount": 500}
    ]
    */

    notes TEXT,

    -- Auto-generation tracking
    is_auto_generated BOOLEAN DEFAULT FALSE,
    generated_at TIMESTAMPTZ,

    -- Sent notifications
    sent_via_email BOOLEAN DEFAULT FALSE,
    sent_via_whatsapp BOOLEAN DEFAULT FALSE,
    last_reminder_sent TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(owner_id, bill_number)
);

-- Link charges to bills
ALTER TABLE charges ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES bills(id) ON DELETE SET NULL;

-- Link payments to bills
ALTER TABLE payments ADD COLUMN IF NOT EXISTS bill_id UUID REFERENCES bills(id) ON DELETE SET NULL;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bills_owner ON bills(owner_id);
CREATE INDEX IF NOT EXISTS idx_bills_tenant ON bills(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bills_property ON bills(property_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON bills(due_date);
CREATE INDEX IF NOT EXISTS idx_bills_for_month ON bills(for_month);
CREATE INDEX IF NOT EXISTS idx_charges_bill ON charges(bill_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill ON payments(bill_id);

-- RLS for bills
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their bills" ON bills
    FOR ALL USING (owner_id = auth.uid());

-- Function to generate bill number
CREATE OR REPLACE FUNCTION generate_bill_number(p_owner_id UUID, p_year INTEGER)
RETURNS TEXT AS $$
DECLARE
    bill_count INTEGER;
    new_number TEXT;
BEGIN
    SELECT COUNT(*) + 1 INTO bill_count
    FROM bills
    WHERE owner_id = p_owner_id
    AND EXTRACT(YEAR FROM bill_date) = p_year;

    new_number := 'INV-' || p_year || '-' || LPAD(bill_count::TEXT, 4, '0');
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to update bill status based on payments
CREATE OR REPLACE FUNCTION update_bill_status()
RETURNS TRIGGER AS $$
DECLARE
    v_bill_id UUID;
    v_total_paid DECIMAL(10,2);
    v_total_amount DECIMAL(10,2);
    v_new_status TEXT;
BEGIN
    -- Get the bill_id from the payment
    IF TG_OP = 'DELETE' THEN
        v_bill_id := OLD.bill_id;
    ELSE
        v_bill_id := NEW.bill_id;
    END IF;

    -- Skip if no bill linked
    IF v_bill_id IS NULL THEN
        RETURN COALESCE(NEW, OLD);
    END IF;

    -- Calculate total paid for this bill
    SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
    FROM payments
    WHERE bill_id = v_bill_id;

    -- Get bill total
    SELECT total_amount INTO v_total_amount
    FROM bills
    WHERE id = v_bill_id;

    -- Determine new status
    IF v_total_paid >= v_total_amount THEN
        v_new_status := 'paid';
    ELSIF v_total_paid > 0 THEN
        v_new_status := 'partial';
    ELSE
        v_new_status := 'pending';
    END IF;

    -- Update bill
    UPDATE bills
    SET paid_amount = v_total_paid,
        balance_due = GREATEST(0, total_amount - v_total_paid),
        status = v_new_status,
        updated_at = NOW()
    WHERE id = v_bill_id;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update bill status when payment changes
DROP TRIGGER IF EXISTS trg_update_bill_status ON payments;
CREATE TRIGGER trg_update_bill_status
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_bill_status();

-- Function to check overdue bills (call from cron)
CREATE OR REPLACE FUNCTION mark_overdue_bills()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE bills
    SET status = 'overdue',
        updated_at = NOW()
    WHERE status IN ('pending', 'partial')
    AND due_date < CURRENT_DATE
    AND balance_due > 0;

    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;
