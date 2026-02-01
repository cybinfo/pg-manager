-- ============================================================================
-- Migration: 061_library_module.sql
-- Description: Library Module for study space management (seats, hours, lockers)
-- Author: Claude
-- Date: 2026-02-01
-- ============================================================================

-- ============================================================================
-- 1. LIBRARIES TABLE (like Properties)
-- ============================================================================

CREATE TABLE IF NOT EXISTS libraries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Identity
    name VARCHAR(255) NOT NULL,
    code VARCHAR(20),                        -- Short code like "CBL"

    -- Location
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100) DEFAULT 'Uttar Pradesh',
    pincode VARCHAR(10),

    -- Contact
    phone VARCHAR(20),
    email VARCHAR(255),

    -- Capacity
    total_sections INTEGER DEFAULT 0,
    total_seats INTEGER DEFAULT 0,
    occupied_seats INTEGER DEFAULT 0,

    -- Operating hours
    opening_time TIME DEFAULT '06:00',
    closing_time TIME DEFAULT '23:00',

    -- Features
    has_ac BOOLEAN DEFAULT false,
    has_wifi BOOLEAN DEFAULT true,
    has_lockers BOOLEAN DEFAULT true,
    has_parking BOOLEAN DEFAULT false,

    -- Settings (JSONB for flexibility)
    settings JSONB DEFAULT '{
        "time_slots": ["Morning", "Evening", "Night", "24 Hours"],
        "default_hours_per_month": 9,
        "grace_period_minutes": 15
    }'::jsonb,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- 2. LIBRARY SECTIONS TABLE (like Rooms)
-- ============================================================================

CREATE TABLE IF NOT EXISTS library_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,

    -- Identity
    name VARCHAR(100) NOT NULL,              -- "AC Hall", "Non-AC Hall", "Silent Zone"
    section_number VARCHAR(10),              -- "A", "B", "C"
    floor INTEGER DEFAULT 0,

    -- Capacity
    total_seats INTEGER DEFAULT 0,
    occupied_seats INTEGER DEFAULT 0,

    -- Features
    is_ac BOOLEAN DEFAULT false,
    has_power_outlets BOOLEAN DEFAULT true,

    -- Pricing (per hour or per month)
    hourly_rate DECIMAL(10,2),
    monthly_rate DECIMAL(10,2),

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- 3. LIBRARY SEATS TABLE (like Beds)
-- ============================================================================

CREATE TABLE IF NOT EXISTS library_seats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    section_id UUID NOT NULL REFERENCES library_sections(id) ON DELETE CASCADE,

    -- Identity
    seat_number VARCHAR(20) NOT NULL,        -- "A-01", "A-02"
    row_number VARCHAR(10),                  -- "A", "B"

    -- Features
    has_power_outlet BOOLEAN DEFAULT true,
    has_lamp BOOLEAN DEFAULT false,
    is_window_seat BOOLEAN DEFAULT false,

    -- Status
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'maintenance')),
    current_member_id UUID,                  -- FK added after library_members created

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- 4. LIBRARY LOCKERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS library_lockers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,

    -- Identity
    locker_number VARCHAR(20) NOT NULL,
    size VARCHAR(20) DEFAULT 'medium' CHECK (size IN ('small', 'medium', 'large')),

    -- Location
    floor INTEGER DEFAULT 0,
    section VARCHAR(50),

    -- Pricing
    monthly_rent DECIMAL(10,2),
    deposit_amount DECIMAL(10,2),

    -- Status
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
    current_member_id UUID,                  -- FK added after library_members created
    assigned_from DATE,
    assigned_until DATE,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- 5. LIBRARY PLANS TABLE (Subscription Plans)
-- ============================================================================

CREATE TABLE IF NOT EXISTS library_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Identity
    name VARCHAR(100) NOT NULL,              -- "9 Hours", "15 Hours", "Monthly Unlimited"
    description TEXT,

    -- Hours
    hours_included DECIMAL(10,2),            -- NULL = unlimited
    validity_days INTEGER NOT NULL,          -- 30, 60, 90

    -- Pricing
    base_price DECIMAL(10,2) NOT NULL,

    -- Time slot restrictions (NULL = all slots)
    allowed_slots TEXT[],                    -- ["Morning", "Evening"] or NULL for all

    -- Status
    is_active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. LIBRARY MEMBERS TABLE (like Tenants)
-- ============================================================================

CREATE TABLE IF NOT EXISTS library_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,

    -- Person link (CRITICAL - live data pattern)
    person_id UUID REFERENCES people(id),

    -- Denormalized (for performance, may be stale)
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20),
    email VARCHAR(255),

    -- Member details
    member_code VARCHAR(50),                 -- "CBL-2024-001"

    -- ID Proof
    id_proof_type VARCHAR(50),               -- aadhar, pan, student_id
    id_proof_number VARCHAR(50),
    id_proof_photo_url TEXT,

    -- Current subscription (FK added after library_memberships)
    current_subscription_id UUID,

    -- Seat assignment
    assigned_seat_id UUID REFERENCES library_seats(id),

    -- Hours balance
    hours_balance DECIMAL(10,2) DEFAULT 0,   -- Remaining hours
    hours_used DECIMAL(10,2) DEFAULT 0,      -- Total used

    -- Time slot preference
    preferred_slot VARCHAR(20),              -- "Morning", "Evening", "Night", "24 Hours"

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'cancelled')),

    -- Dates
    join_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expiry_date DATE,

    -- Locker (if assigned)
    locker_id UUID REFERENCES library_lockers(id),

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- Add FK to seats and lockers now that library_members exists
ALTER TABLE library_seats ADD CONSTRAINT fk_seats_current_member
    FOREIGN KEY (current_member_id) REFERENCES library_members(id);

ALTER TABLE library_lockers ADD CONSTRAINT fk_lockers_current_member
    FOREIGN KEY (current_member_id) REFERENCES library_members(id);

-- ============================================================================
-- 7. LIBRARY MEMBERSHIPS TABLE (Subscriptions, like Tenant Stays)
-- ============================================================================

CREATE TABLE IF NOT EXISTS library_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES library_members(id) ON DELETE CASCADE,

    -- Plan details
    plan_id UUID REFERENCES library_plans(id),
    plan_name VARCHAR(100) NOT NULL,         -- Denormalized
    hours_included DECIMAL(10,2),            -- NULL for unlimited

    -- Pricing
    amount DECIMAL(10,2) NOT NULL,
    discount_amount DECIMAL(10,2) DEFAULT 0,
    final_amount DECIMAL(10,2) NOT NULL,

    -- Time slot
    time_slot VARCHAR(20),                   -- "Morning", "Evening", "Night", "24 Hours"

    -- Period
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Hours tracking
    hours_remaining DECIMAL(10,2),
    hours_used DECIMAL(10,2) DEFAULT 0,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'upgraded')),

    -- Payment link (added after library_payments table)
    payment_id UUID,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- Add FK for current_subscription_id
ALTER TABLE library_members ADD CONSTRAINT fk_current_subscription
    FOREIGN KEY (current_subscription_id) REFERENCES library_memberships(id);

-- ============================================================================
-- 8. LIBRARY PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS library_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES library_members(id),

    -- Receipt
    receipt_number VARCHAR(50),

    -- Payment details
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),

    -- Type
    payment_type VARCHAR(30) NOT NULL CHECK (payment_type IN ('subscription', 'locker_rent', 'locker_deposit', 'fine', 'other')),

    -- Method
    payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'card', 'bank_transfer', 'cheque', 'paytm', 'other')),
    payment_reference VARCHAR(100),          -- UPI ref, cheque number, etc.

    -- Links
    membership_id UUID REFERENCES library_memberships(id),
    locker_assignment_id UUID,               -- FK added after locker_assignments

    -- Notes
    notes TEXT,

    -- Status
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('completed', 'pending', 'refunded')),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- Add FK for payment_id in memberships
ALTER TABLE library_memberships ADD CONSTRAINT fk_membership_payment
    FOREIGN KEY (payment_id) REFERENCES library_payments(id);

-- ============================================================================
-- 9. LIBRARY LOCKER ASSIGNMENTS TABLE (History)
-- ============================================================================

CREATE TABLE IF NOT EXISTS library_locker_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    locker_id UUID NOT NULL REFERENCES library_lockers(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES library_members(id),

    -- Period
    start_date DATE NOT NULL,
    end_date DATE,

    -- Payment
    rent_amount DECIMAL(10,2),
    deposit_amount DECIMAL(10,2),
    deposit_returned BOOLEAN DEFAULT false,

    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended')),

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- Add FK for locker_assignment_id in payments
ALTER TABLE library_payments ADD CONSTRAINT fk_payment_locker_assignment
    FOREIGN KEY (locker_assignment_id) REFERENCES library_locker_assignments(id);

-- ============================================================================
-- 10. LIBRARY ATTENDANCE TABLE (Check-in/Check-out)
-- ============================================================================

CREATE TABLE IF NOT EXISTS library_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES library_members(id) ON DELETE CASCADE,
    membership_id UUID REFERENCES library_memberships(id),

    -- Date
    attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,

    -- Times
    check_in_time TIMESTAMPTZ NOT NULL,
    check_out_time TIMESTAMPTZ,

    -- Calculated
    hours_spent DECIMAL(10,2),               -- Calculated on check-out

    -- Seat used
    seat_id UUID REFERENCES library_seats(id),

    -- Notes
    notes TEXT,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id)
);

-- ============================================================================
-- 11. INDEXES
-- ============================================================================

-- Libraries
CREATE INDEX IF NOT EXISTS idx_libraries_workspace ON libraries(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_libraries_owner ON libraries(owner_id) WHERE deleted_at IS NULL;

-- Sections
CREATE INDEX IF NOT EXISTS idx_library_sections_workspace ON library_sections(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_sections_library ON library_sections(library_id) WHERE deleted_at IS NULL;

-- Seats
CREATE INDEX IF NOT EXISTS idx_library_seats_workspace ON library_seats(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_seats_section ON library_seats(section_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_seats_status ON library_seats(status) WHERE deleted_at IS NULL;

-- Members
CREATE INDEX IF NOT EXISTS idx_library_members_workspace ON library_members(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_members_library ON library_members(library_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_members_person ON library_members(person_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_members_status ON library_members(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_members_code ON library_members(member_code) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_members_phone ON library_members(phone) WHERE deleted_at IS NULL;

-- Memberships
CREATE INDEX IF NOT EXISTS idx_library_memberships_workspace ON library_memberships(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_memberships_member ON library_memberships(member_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_memberships_dates ON library_memberships(start_date, end_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_memberships_status ON library_memberships(status) WHERE deleted_at IS NULL;

-- Attendance
CREATE INDEX IF NOT EXISTS idx_library_attendance_workspace ON library_attendance(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_attendance_member ON library_attendance(member_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_attendance_date ON library_attendance(attendance_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_attendance_checkin ON library_attendance(check_in_time DESC) WHERE deleted_at IS NULL AND check_out_time IS NULL;

-- Lockers
CREATE INDEX IF NOT EXISTS idx_library_lockers_workspace ON library_lockers(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_lockers_library ON library_lockers(library_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_lockers_status ON library_lockers(status) WHERE deleted_at IS NULL;

-- Locker Assignments
CREATE INDEX IF NOT EXISTS idx_library_locker_assignments_workspace ON library_locker_assignments(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_locker_assignments_locker ON library_locker_assignments(locker_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_locker_assignments_member ON library_locker_assignments(member_id) WHERE deleted_at IS NULL;

-- Payments
CREATE INDEX IF NOT EXISTS idx_library_payments_workspace ON library_payments(workspace_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_payments_member ON library_payments(member_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_payments_date ON library_payments(payment_date DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_library_payments_type ON library_payments(payment_type) WHERE deleted_at IS NULL;

-- Plans
CREATE INDEX IF NOT EXISTS idx_library_plans_workspace ON library_plans(workspace_id);

-- ============================================================================
-- 12. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE libraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_lockers ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_locker_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE library_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same pattern for all tables)
CREATE POLICY "libraries_workspace_isolation" ON libraries
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM user_contexts
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR is_platform_admin(auth.uid())
    );

CREATE POLICY "library_sections_workspace_isolation" ON library_sections
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM user_contexts
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR is_platform_admin(auth.uid())
    );

CREATE POLICY "library_seats_workspace_isolation" ON library_seats
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM user_contexts
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR is_platform_admin(auth.uid())
    );

CREATE POLICY "library_members_workspace_isolation" ON library_members
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM user_contexts
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR is_platform_admin(auth.uid())
    );

CREATE POLICY "library_memberships_workspace_isolation" ON library_memberships
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM user_contexts
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR is_platform_admin(auth.uid())
    );

CREATE POLICY "library_attendance_workspace_isolation" ON library_attendance
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM user_contexts
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR is_platform_admin(auth.uid())
    );

CREATE POLICY "library_lockers_workspace_isolation" ON library_lockers
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM user_contexts
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR is_platform_admin(auth.uid())
    );

CREATE POLICY "library_locker_assignments_workspace_isolation" ON library_locker_assignments
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM user_contexts
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR is_platform_admin(auth.uid())
    );

CREATE POLICY "library_payments_workspace_isolation" ON library_payments
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM user_contexts
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR is_platform_admin(auth.uid())
    );

CREATE POLICY "library_plans_workspace_isolation" ON library_plans
    FOR ALL USING (
        workspace_id IN (
            SELECT workspace_id FROM user_contexts
            WHERE user_id = auth.uid() AND is_active = true
        )
        OR is_platform_admin(auth.uid())
    );

-- ============================================================================
-- 13. TRIGGERS
-- ============================================================================

-- Updated_at triggers
CREATE TRIGGER update_libraries_updated_at
    BEFORE UPDATE ON libraries
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_library_sections_updated_at
    BEFORE UPDATE ON library_sections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_library_seats_updated_at
    BEFORE UPDATE ON library_seats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_library_members_updated_at
    BEFORE UPDATE ON library_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_library_memberships_updated_at
    BEFORE UPDATE ON library_memberships
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_library_attendance_updated_at
    BEFORE UPDATE ON library_attendance
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_library_lockers_updated_at
    BEFORE UPDATE ON library_lockers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_library_locker_assignments_updated_at
    BEFORE UPDATE ON library_locker_assignments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_library_payments_updated_at
    BEFORE UPDATE ON library_payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_library_plans_updated_at
    BEFORE UPDATE ON library_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit triggers
CREATE TRIGGER audit_libraries
    AFTER INSERT OR UPDATE OR DELETE ON libraries
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_library_sections
    AFTER INSERT OR UPDATE OR DELETE ON library_sections
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_library_seats
    AFTER INSERT OR UPDATE OR DELETE ON library_seats
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_library_members
    AFTER INSERT OR UPDATE OR DELETE ON library_members
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_library_memberships
    AFTER INSERT OR UPDATE OR DELETE ON library_memberships
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_library_attendance
    AFTER INSERT OR UPDATE OR DELETE ON library_attendance
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_library_lockers
    AFTER INSERT OR UPDATE OR DELETE ON library_lockers
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_library_locker_assignments
    AFTER INSERT OR UPDATE OR DELETE ON library_locker_assignments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_library_payments
    AFTER INSERT OR UPDATE OR DELETE ON library_payments
    FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- 14. HELPER FUNCTIONS
-- ============================================================================

-- Function to calculate hours on check-out
CREATE OR REPLACE FUNCTION library_calculate_attendance_hours()
RETURNS TRIGGER AS $$
DECLARE
    v_hours DECIMAL(10,2);
BEGIN
    -- Only run when check_out_time is being set
    IF NEW.check_out_time IS NOT NULL AND OLD.check_out_time IS NULL THEN
        -- Calculate hours spent
        v_hours := EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0;
        NEW.hours_spent := ROUND(v_hours, 2);

        -- Update member hours
        UPDATE library_members
        SET hours_used = hours_used + v_hours,
            hours_balance = GREATEST(0, hours_balance - v_hours)
        WHERE id = NEW.member_id;

        -- Update membership hours if linked
        IF NEW.membership_id IS NOT NULL THEN
            UPDATE library_memberships
            SET hours_used = hours_used + v_hours,
                hours_remaining = CASE
                    WHEN hours_remaining IS NOT NULL THEN GREATEST(0, hours_remaining - v_hours)
                    ELSE NULL
                END
            WHERE id = NEW.membership_id;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_library_calculate_hours
    BEFORE UPDATE ON library_attendance
    FOR EACH ROW
    EXECUTE FUNCTION library_calculate_attendance_hours();

-- Function to update section/library seat counts
CREATE OR REPLACE FUNCTION library_update_seat_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update section counts
    UPDATE library_sections
    SET total_seats = (
        SELECT COUNT(*) FROM library_seats
        WHERE section_id = COALESCE(NEW.section_id, OLD.section_id)
        AND deleted_at IS NULL
    ),
    occupied_seats = (
        SELECT COUNT(*) FROM library_seats
        WHERE section_id = COALESCE(NEW.section_id, OLD.section_id)
        AND status = 'occupied'
        AND deleted_at IS NULL
    )
    WHERE id = COALESCE(NEW.section_id, OLD.section_id);

    -- Update library counts
    UPDATE libraries
    SET total_seats = (
        SELECT COALESCE(SUM(total_seats), 0) FROM library_sections
        WHERE library_id = libraries.id AND deleted_at IS NULL
    ),
    occupied_seats = (
        SELECT COALESCE(SUM(occupied_seats), 0) FROM library_sections
        WHERE library_id = libraries.id AND deleted_at IS NULL
    )
    WHERE id IN (
        SELECT library_id FROM library_sections
        WHERE id = COALESCE(NEW.section_id, OLD.section_id)
    );

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_library_seat_counts
    AFTER INSERT OR UPDATE OR DELETE ON library_seats
    FOR EACH ROW
    EXECUTE FUNCTION library_update_seat_counts();

-- Function to update section counts on section changes
CREATE OR REPLACE FUNCTION library_update_library_section_counts()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE libraries
    SET total_sections = (
        SELECT COUNT(*) FROM library_sections
        WHERE library_id = COALESCE(NEW.library_id, OLD.library_id)
        AND deleted_at IS NULL
    )
    WHERE id = COALESCE(NEW.library_id, OLD.library_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_library_section_counts
    AFTER INSERT OR UPDATE OR DELETE ON library_sections
    FOR EACH ROW
    EXECUTE FUNCTION library_update_library_section_counts();

-- Function to generate member code
CREATE OR REPLACE FUNCTION library_generate_member_code(
    p_library_id UUID
)
RETURNS TEXT AS $$
DECLARE
    v_library_code TEXT;
    v_year TEXT;
    v_sequence INTEGER;
BEGIN
    -- Get library code or use first 3 chars of name
    SELECT COALESCE(code, UPPER(SUBSTRING(name FROM 1 FOR 3)))
    INTO v_library_code
    FROM libraries WHERE id = p_library_id;

    v_year := TO_CHAR(CURRENT_DATE, 'YYYY');

    -- Get next sequence number
    SELECT COALESCE(MAX(
        CASE
            WHEN member_code ~ (v_library_code || '-' || v_year || '-[0-9]+')
            THEN CAST(SUBSTRING(member_code FROM v_library_code || '-' || v_year || '-([0-9]+)') AS INTEGER)
            ELSE 0
        END
    ), 0) + 1
    INTO v_sequence
    FROM library_members
    WHERE library_id = p_library_id;

    RETURN v_library_code || '-' || v_year || '-' || LPAD(v_sequence::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;

-- Function to get library attendance summary
CREATE OR REPLACE FUNCTION get_library_attendance_summary(
    p_library_id UUID,
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_members INTEGER,
    active_members INTEGER,
    currently_checked_in INTEGER,
    total_check_ins_today INTEGER,
    available_seats INTEGER,
    occupied_seats INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT COUNT(*)::INTEGER FROM library_members WHERE library_id = p_library_id AND deleted_at IS NULL),
        (SELECT COUNT(*)::INTEGER FROM library_members WHERE library_id = p_library_id AND status = 'active' AND deleted_at IS NULL),
        (SELECT COUNT(*)::INTEGER FROM library_attendance la
         JOIN library_members lm ON la.member_id = lm.id
         WHERE lm.library_id = p_library_id
         AND la.attendance_date = p_date
         AND la.check_out_time IS NULL
         AND la.deleted_at IS NULL),
        (SELECT COUNT(*)::INTEGER FROM library_attendance la
         JOIN library_members lm ON la.member_id = lm.id
         WHERE lm.library_id = p_library_id
         AND la.attendance_date = p_date
         AND la.deleted_at IS NULL),
        (SELECT COALESCE(total_seats - occupied_seats, 0)::INTEGER FROM libraries WHERE id = p_library_id),
        (SELECT COALESCE(occupied_seats, 0)::INTEGER FROM libraries WHERE id = p_library_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 15. COMMENTS
-- ============================================================================

COMMENT ON TABLE libraries IS 'Study library locations (similar to PG properties)';
COMMENT ON TABLE library_sections IS 'Sections within a library (AC Hall, Silent Zone, etc.)';
COMMENT ON TABLE library_seats IS 'Individual seats within sections';
COMMENT ON TABLE library_members IS 'Library members with subscriptions';
COMMENT ON TABLE library_memberships IS 'Subscription periods with hours allocation';
COMMENT ON TABLE library_attendance IS 'Check-in/check-out tracking for hours deduction';
COMMENT ON TABLE library_lockers IS 'Lockers available for rent';
COMMENT ON TABLE library_locker_assignments IS 'History of locker assignments';
COMMENT ON TABLE library_payments IS 'All payments (subscriptions, lockers, fines)';
COMMENT ON TABLE library_plans IS 'Subscription plan definitions';

COMMENT ON COLUMN library_members.person_id IS 'Link to people table for live data (name, phone, photo)';
COMMENT ON COLUMN library_members.hours_balance IS 'Current remaining hours from subscription';
COMMENT ON COLUMN library_memberships.hours_included IS 'NULL means unlimited hours';
COMMENT ON COLUMN library_attendance.hours_spent IS 'Calculated on check-out via trigger';
