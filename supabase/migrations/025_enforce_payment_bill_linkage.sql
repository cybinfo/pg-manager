-- ============================================
-- Migration 025: Enforce Payment-Bill Linkage
-- ============================================
-- 1. Payments MUST reference a bill (no standalone payments)
-- 2. Add constraint to ensure bill_id is NOT NULL for new payments
-- 3. Add RLS policy to enforce this
-- ============================================

-- Add NOT NULL constraint to bill_id for new payments
-- First, let's add a check constraint that allows existing null values but requires new ones
-- We use a trigger approach to allow existing data while enforcing for new records

-- Create a function to validate payment has bill_id
CREATE OR REPLACE FUNCTION validate_payment_has_bill()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- New payments must have a bill_id
    IF NEW.bill_id IS NULL THEN
        RAISE EXCEPTION 'Payment must be linked to a bill. Create a bill first, then record the payment.';
    END IF;

    -- Verify the bill exists and belongs to the same tenant
    IF NOT EXISTS (
        SELECT 1 FROM bills
        WHERE id = NEW.bill_id
        AND tenant_id = NEW.tenant_id
    ) THEN
        RAISE EXCEPTION 'Invalid bill_id. The bill does not exist or belongs to a different tenant.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for INSERT only (allow updates to existing payments)
DROP TRIGGER IF EXISTS enforce_payment_bill_linkage ON payments;
CREATE TRIGGER enforce_payment_bill_linkage
    BEFORE INSERT ON payments
    FOR EACH ROW
    EXECUTE FUNCTION validate_payment_has_bill();

-- ============================================
-- Also add a helpful function to get or create a bill for a tenant
-- ============================================
CREATE OR REPLACE FUNCTION get_or_create_bill_for_payment(
    p_tenant_id UUID,
    p_owner_id UUID,
    p_amount DECIMAL,
    p_for_month TEXT DEFAULT NULL
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_bill_id UUID;
    v_tenant RECORD;
    v_bill_number TEXT;
    v_for_month TEXT;
BEGIN
    -- Get tenant details
    SELECT t.*, p.id as prop_id
    INTO v_tenant
    FROM tenants t
    JOIN properties p ON t.property_id = p.id
    WHERE t.id = p_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Tenant not found';
    END IF;

    -- Determine the month
    v_for_month := COALESCE(p_for_month, to_char(CURRENT_DATE, 'Month YYYY'));

    -- Check if there's already a pending bill for this month
    SELECT id INTO v_bill_id
    FROM bills
    WHERE tenant_id = p_tenant_id
    AND for_month = v_for_month
    AND status IN ('pending', 'partial', 'overdue')
    LIMIT 1;

    -- If no existing bill, create one
    IF v_bill_id IS NULL THEN
        -- Generate bill number
        SELECT 'BILL-' || LPAD((COALESCE(MAX(CAST(SUBSTRING(bill_number FROM 6) AS INTEGER)), 0) + 1)::TEXT, 6, '0')
        INTO v_bill_number
        FROM bills
        WHERE owner_id = p_owner_id;

        INSERT INTO bills (
            owner_id,
            tenant_id,
            property_id,
            bill_number,
            bill_date,
            due_date,
            for_month,
            total_amount,
            balance_due,
            status,
            line_items
        ) VALUES (
            p_owner_id,
            p_tenant_id,
            v_tenant.prop_id,
            v_bill_number,
            CURRENT_DATE,
            CURRENT_DATE + INTERVAL '7 days',
            v_for_month,
            p_amount,
            p_amount,
            'pending',
            jsonb_build_array(jsonb_build_object(
                'description', 'Payment for ' || v_for_month,
                'amount', p_amount
            ))
        )
        RETURNING id INTO v_bill_id;
    END IF;

    RETURN v_bill_id;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION get_or_create_bill_for_payment(UUID, UUID, DECIMAL, TEXT) TO authenticated;

-- ============================================
-- Done
-- ============================================
