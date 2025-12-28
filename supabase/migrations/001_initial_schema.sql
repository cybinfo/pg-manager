-- PG Manager Database Schema
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new)

-- Enable UUID extension (usually enabled by default)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- OWNERS TABLE (PG Business Owners)
-- ============================================
CREATE TABLE IF NOT EXISTS owners (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    business_name TEXT,
    is_setup_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- OWNER CONFIGURATION (Flexible Settings)
-- ============================================
CREATE TABLE IF NOT EXISTS owner_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,

    -- Tenant fields configuration (which fields to show/require)
    tenant_fields JSONB DEFAULT '[
        {"key": "phone", "label": "Phone Number", "type": "tel", "required": true, "enabled": true},
        {"key": "emergency_contact", "label": "Emergency Contact", "type": "tel", "required": false, "enabled": true},
        {"key": "parent_name", "label": "Parent/Guardian Name", "type": "text", "required": false, "enabled": true},
        {"key": "parent_phone", "label": "Parent Phone", "type": "tel", "required": false, "enabled": true},
        {"key": "permanent_address", "label": "Permanent Address", "type": "textarea", "required": false, "enabled": true},
        {"key": "id_proof_type", "label": "ID Proof Type", "type": "select", "options": ["Aadhaar", "PAN", "Passport", "Driving License", "Voter ID"], "required": false, "enabled": true},
        {"key": "id_proof_number", "label": "ID Proof Number", "type": "text", "required": false, "enabled": true},
        {"key": "company_name", "label": "Company/College Name", "type": "text", "required": false, "enabled": false},
        {"key": "designation", "label": "Designation/Course", "type": "text", "required": false, "enabled": false},
        {"key": "vehicle_number", "label": "Vehicle Number", "type": "text", "required": false, "enabled": false},
        {"key": "blood_group", "label": "Blood Group", "type": "select", "options": ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"], "required": false, "enabled": false}
    ]'::jsonb,

    -- Room amenities list
    room_amenities JSONB DEFAULT '["AC", "Attached Bathroom", "Balcony", "TV", "WiFi", "Wardrobe", "Study Table", "Geyser"]'::jsonb,

    -- Default settings
    default_notice_period INTEGER DEFAULT 30,
    default_rent_due_day INTEGER DEFAULT 1,
    default_grace_period INTEGER DEFAULT 5,
    default_late_fee_type TEXT DEFAULT 'fixed', -- 'fixed', 'percentage', 'per_day'
    default_late_fee_amount DECIMAL(10,2) DEFAULT 0,

    -- Business settings
    currency TEXT DEFAULT 'INR',
    date_format TEXT DEFAULT 'DD/MM/YYYY',
    financial_year_start INTEGER DEFAULT 4, -- April

    -- Communication preferences
    send_payment_reminders BOOLEAN DEFAULT TRUE,
    reminder_days_before INTEGER DEFAULT 5,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(owner_id)
);

-- ============================================
-- CHARGE TYPES (Configurable Payment Types)
-- ============================================
CREATE TABLE IF NOT EXISTS charge_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,

    name TEXT NOT NULL, -- "Rent", "Security Deposit", "Electricity"
    code TEXT NOT NULL, -- "rent", "security", "electricity"
    description TEXT,

    category TEXT NOT NULL DEFAULT 'recurring', -- 'recurring', 'one_time', 'usage_based', 'deposit'

    -- Calculation method
    calculation_method TEXT NOT NULL DEFAULT 'fixed', -- 'fixed', 'per_day', 'per_bed', 'meter_reading', 'per_occupant'
    calculation_config JSONB DEFAULT '{}'::jsonb,
    /*
    Examples of calculation_config:

    For electricity (meter-based, split by occupants):
    {
        "method": "meter_reading",
        "split_by": "occupants",
        "rate_type": "fixed",
        "rate_per_unit": 8.5
    }

    For rent (fixed monthly):
    {
        "method": "fixed",
        "source": "room"
    }

    For food (per day):
    {
        "method": "per_day",
        "daily_rate": 100
    }
    */

    is_refundable BOOLEAN DEFAULT FALSE,
    is_taxable BOOLEAN DEFAULT FALSE,
    tax_percentage DECIMAL(5,2) DEFAULT 0,

    apply_late_fee BOOLEAN DEFAULT FALSE,
    is_enabled BOOLEAN DEFAULT TRUE,
    is_system BOOLEAN DEFAULT FALSE, -- System defaults can't be deleted

    display_order INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(owner_id, code)
);

-- ============================================
-- PROPERTIES
-- ============================================
CREATE TABLE IF NOT EXISTS properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,

    name TEXT NOT NULL,
    address TEXT,
    city TEXT NOT NULL,
    state TEXT,
    pincode TEXT,

    -- Property-specific settings (overrides owner defaults)
    property_config JSONB DEFAULT '{}'::jsonb,
    /*
    {
        "rent_due_day": 5,
        "notice_period": 30,
        "grace_period": 3
    }
    */

    -- Contact for this property
    manager_name TEXT,
    manager_phone TEXT,

    is_active BOOLEAN DEFAULT TRUE,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROOMS
-- ============================================
CREATE TABLE IF NOT EXISTS rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,

    room_number TEXT NOT NULL,
    room_type TEXT DEFAULT 'single', -- 'single', 'double', 'triple', 'dormitory'
    floor INTEGER DEFAULT 0,

    rent_amount DECIMAL(10,2) NOT NULL,
    deposit_amount DECIMAL(10,2) DEFAULT 0,

    total_beds INTEGER DEFAULT 1,
    occupied_beds INTEGER DEFAULT 0,

    amenities JSONB DEFAULT '[]'::jsonb, -- ["AC", "Attached Bathroom"]

    has_attached_bathroom BOOLEAN DEFAULT FALSE,
    has_ac BOOLEAN DEFAULT FALSE,

    -- For meter-based billing
    has_electricity_meter BOOLEAN DEFAULT FALSE,
    electricity_meter_number TEXT,
    has_water_meter BOOLEAN DEFAULT FALSE,
    water_meter_number TEXT,

    -- Room inventory
    inventory JSONB DEFAULT '[]'::jsonb,
    /*
    [
        {"item": "Bed", "quantity": 2, "condition": "good"},
        {"item": "Fan", "quantity": 1, "condition": "good"}
    ]
    */

    status TEXT DEFAULT 'available', -- 'available', 'occupied', 'partially_occupied', 'maintenance'

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(property_id, room_number)
);

-- ============================================
-- BEDS (For shared room allocation)
-- ============================================
CREATE TABLE IF NOT EXISTS beds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,

    bed_number TEXT NOT NULL, -- "A", "B", "C" or "1", "2", "3"

    -- Override room rent for specific bed
    rent_amount DECIMAL(10,2),

    status TEXT DEFAULT 'available', -- 'available', 'occupied', 'reserved', 'maintenance'
    current_tenant_id UUID, -- Will be FK to tenants after tenants table is created

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(room_id, bed_number)
);

-- ============================================
-- TENANTS
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,

    -- For tenant self-service portal login
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

    -- Basic info
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT NOT NULL,
    photo_url TEXT,

    -- All configurable fields stored as JSONB
    custom_fields JSONB DEFAULT '{}'::jsonb,
    /*
    {
        "parent_name": "John Doe",
        "parent_phone": "9876543210",
        "permanent_address": "123 Main St",
        "id_proof_type": "Aadhaar",
        "id_proof_number": "XXXX-XXXX-XXXX",
        "company_name": "Tech Corp",
        "blood_group": "O+"
    }
    */

    -- Documents
    documents JSONB DEFAULT '[]'::jsonb,
    /*
    [
        {"type": "id_proof", "name": "Aadhaar Card", "url": "...", "uploaded_at": "..."},
        {"type": "photo", "name": "Profile Photo", "url": "...", "uploaded_at": "..."}
    ]
    */

    -- Tenancy details
    check_in_date DATE NOT NULL,
    check_out_date DATE,
    expected_exit_date DATE,

    -- Billing
    monthly_rent DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2) DEFAULT 0,
    security_deposit_paid DECIMAL(10,2) DEFAULT 0,

    billing_mode TEXT DEFAULT 'monthly', -- 'monthly', 'daily', 'weekly'
    billing_cycle_start_day INTEGER, -- For custom billing cycles

    -- Advance payment tracking
    advance_amount DECIMAL(10,2) DEFAULT 0,
    advance_balance DECIMAL(10,2) DEFAULT 0,

    -- Notice period
    notice_given_date DATE,
    lock_in_end_date DATE,

    -- Discounts
    discount_percent DECIMAL(5,2) DEFAULT 0,
    discount_reason TEXT,

    -- Status
    status TEXT DEFAULT 'active', -- 'active', 'notice_period', 'checked_out'

    -- Verification
    police_verification_status TEXT DEFAULT 'pending', -- 'pending', 'submitted', 'verified', 'na'
    police_verification_date DATE,

    agreement_signed BOOLEAN DEFAULT FALSE,
    agreement_url TEXT,
    agreement_start_date DATE,
    agreement_end_date DATE,

    -- Private notes for owner
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK from beds to tenants now that tenants table exists
ALTER TABLE beds
ADD CONSTRAINT beds_current_tenant_fkey
FOREIGN KEY (current_tenant_id) REFERENCES tenants(id) ON DELETE SET NULL;

-- ============================================
-- CHARGES (Generated Bills/Dues)
-- ============================================
CREATE TABLE IF NOT EXISTS charges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    charge_type_id UUID NOT NULL REFERENCES charge_types(id) ON DELETE RESTRICT,

    amount DECIMAL(10,2) NOT NULL,
    due_date DATE NOT NULL,

    for_period TEXT, -- "January 2024" or "2024-01-15 to 2024-02-14"
    period_start DATE,
    period_end DATE,

    -- How was this calculated
    calculation_details JSONB DEFAULT '{}'::jsonb,
    /*
    {
        "units": 150,
        "rate": 8.5,
        "occupants": 2,
        "per_person": 637.5,
        "method": "meter_reading"
    }
    */

    status TEXT DEFAULT 'pending', -- 'pending', 'partial', 'paid', 'overdue', 'waived'

    paid_amount DECIMAL(10,2) DEFAULT 0,

    late_fee_applied DECIMAL(10,2) DEFAULT 0,

    waived_amount DECIMAL(10,2) DEFAULT 0,
    waived_reason TEXT,
    waived_by UUID REFERENCES auth.users(id),
    waived_at TIMESTAMPTZ,

    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PAYMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

    -- Link to specific charge (optional - can be general payment)
    charge_id UUID REFERENCES charges(id) ON DELETE SET NULL,
    charge_type_id UUID REFERENCES charge_types(id) ON DELETE SET NULL,

    amount DECIMAL(10,2) NOT NULL,

    payment_method TEXT NOT NULL, -- 'cash', 'upi', 'bank_transfer', 'cheque', 'card'
    payment_date DATE NOT NULL,

    for_period TEXT, -- "January 2024"

    -- Reference details
    reference_number TEXT, -- UPI ref, cheque number, etc.
    receipt_number TEXT, -- Auto-generated receipt number

    notes TEXT,

    -- Who recorded this
    created_by UUID REFERENCES auth.users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- METER READINGS
-- ============================================
CREATE TABLE IF NOT EXISTS meter_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,

    charge_type_id UUID NOT NULL REFERENCES charge_types(id) ON DELETE RESTRICT, -- electricity, water

    reading_date DATE NOT NULL,
    reading_value DECIMAL(12,2) NOT NULL,

    previous_reading DECIMAL(12,2),
    units_consumed DECIMAL(12,2),

    image_url TEXT, -- Photo of meter

    notes TEXT,

    created_by UUID REFERENCES auth.users(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- COMPLAINTS
-- ============================================
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,

    category TEXT NOT NULL, -- 'electrical', 'plumbing', 'furniture', 'cleanliness', 'other'
    title TEXT NOT NULL,
    description TEXT,

    images JSONB DEFAULT '[]'::jsonb, -- Array of image URLs

    status TEXT DEFAULT 'open', -- 'open', 'acknowledged', 'in_progress', 'resolved', 'closed'
    priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'

    assigned_to TEXT, -- Staff name or ID

    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,

    -- Who created this
    created_by UUID REFERENCES auth.users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- NOTICES
-- ============================================
CREATE TABLE IF NOT EXISTS notices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE, -- NULL = all properties

    title TEXT NOT NULL,
    content TEXT NOT NULL,

    type TEXT DEFAULT 'general', -- 'general', 'maintenance', 'payment_reminder', 'emergency'

    target_audience TEXT DEFAULT 'all', -- 'all', 'tenants_only', 'specific_rooms'
    target_rooms JSONB, -- Array of room IDs if specific

    is_active BOOLEAN DEFAULT TRUE,
    is_pinned BOOLEAN DEFAULT FALSE,

    expires_at TIMESTAMPTZ,

    created_by UUID REFERENCES auth.users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- EXIT CLEARANCE
-- ============================================
CREATE TABLE IF NOT EXISTS exit_clearance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,

    notice_given_date DATE,
    expected_exit_date DATE NOT NULL,
    actual_exit_date DATE,

    -- Financial summary
    total_dues DECIMAL(10,2) DEFAULT 0,
    total_refundable DECIMAL(10,2) DEFAULT 0, -- Security deposit etc.

    deductions JSONB DEFAULT '[]'::jsonb,
    /*
    [
        {"reason": "Wall damage", "amount": 500},
        {"reason": "Deep cleaning", "amount": 300}
    ]
    */

    final_amount DECIMAL(10,2) DEFAULT 0, -- Positive = tenant pays, Negative = refund to tenant

    settlement_status TEXT DEFAULT 'initiated', -- 'initiated', 'pending_payment', 'cleared'

    -- Checklist
    room_inspection_done BOOLEAN DEFAULT FALSE,
    room_condition_notes TEXT,
    key_returned BOOLEAN DEFAULT FALSE,

    approved_by UUID REFERENCES auth.users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- ============================================
-- CHANGE REQUESTS (Tenant profile modifications)
-- ============================================
CREATE TABLE IF NOT EXISTS change_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    request_type TEXT NOT NULL, -- 'profile_update', 'room_change', 'complaint', 'other'

    field_name TEXT, -- For profile updates
    current_value TEXT,
    requested_value TEXT,

    reason TEXT,

    supporting_docs JSONB DEFAULT '[]'::jsonb, -- Array of document URLs

    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'more_info_needed'

    admin_notes TEXT,

    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACTIVITY LOG (Audit Trail)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),

    action TEXT NOT NULL, -- 'payment_recorded', 'tenant_added', 'room_updated', etc.

    entity_type TEXT NOT NULL, -- 'tenant', 'payment', 'room', 'property'
    entity_id UUID,

    details JSONB DEFAULT '{}'::jsonb, -- Additional context

    ip_address TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_properties_owner ON properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_rooms_property ON rooms(property_id);
CREATE INDEX IF NOT EXISTS idx_rooms_owner ON rooms(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_owner ON tenants(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenants_property ON tenants(property_id);
CREATE INDEX IF NOT EXISTS idx_tenants_room ON tenants(room_id);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_charges_tenant ON charges(tenant_id);
CREATE INDEX IF NOT EXISTS idx_charges_status ON charges(status);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_complaints_property ON complaints(property_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_activity_log_owner ON activity_log(owner_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created ON activity_log(created_at);

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE owner_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE charge_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE charges ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE exit_clearance ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Owners can only see/modify their own data (USING for read, WITH CHECK for write)
CREATE POLICY "owners_own_data" ON owners FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "owner_config_own_data" ON owner_config FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "charge_types_own_data" ON charge_types FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "properties_own_data" ON properties FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "rooms_own_data" ON rooms FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "beds_own_data" ON beds FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "tenants_own_data" ON tenants FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "charges_own_data" ON charges FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "payments_own_data" ON payments FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "meter_readings_own_data" ON meter_readings FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "complaints_own_data" ON complaints FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "notices_own_data" ON notices FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "exit_clearance_own_data" ON exit_clearance FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "change_requests_own_data" ON change_requests FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "activity_log_own_data" ON activity_log FOR ALL USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Tenants can view their own data (for tenant portal)
CREATE POLICY "tenants_view_own" ON tenants FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "charges_tenant_view_own" ON charges FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
);
CREATE POLICY "payments_tenant_view_own" ON payments FOR SELECT USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
);
CREATE POLICY "complaints_tenant_manage" ON complaints FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
);
CREATE POLICY "notices_tenant_view" ON notices FOR SELECT USING (
    property_id IN (SELECT property_id FROM tenants WHERE user_id = auth.uid() AND status = 'active')
);
CREATE POLICY "change_requests_tenant_manage" ON change_requests FOR ALL USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to relevant tables
CREATE TRIGGER update_owners_updated_at BEFORE UPDATE ON owners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_owner_config_updated_at BEFORE UPDATE ON owner_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_charge_types_updated_at BEFORE UPDATE ON charge_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_properties_updated_at BEFORE UPDATE ON properties
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON rooms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_beds_updated_at BEFORE UPDATE ON beds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tenants_updated_at BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_charges_updated_at BEFORE UPDATE ON charges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at BEFORE UPDATE ON complaints
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_notices_updated_at BEFORE UPDATE ON notices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create owner record after signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.owners (id, name, email)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        NEW.email
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create owner on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to generate receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number(owner_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    prefix TEXT := 'RCP';
    year_month TEXT := to_char(NOW(), 'YYMM');
    seq_num INTEGER;
    receipt TEXT;
BEGIN
    -- Get count of payments this month for this owner
    SELECT COUNT(*) + 1 INTO seq_num
    FROM payments
    WHERE owner_id = owner_uuid
    AND date_trunc('month', created_at) = date_trunc('month', NOW());

    receipt := prefix || year_month || lpad(seq_num::text, 4, '0');
    RETURN receipt;
END;
$$ LANGUAGE plpgsql;

-- Function to update room occupancy
CREATE OR REPLACE FUNCTION update_room_occupancy()
RETURNS TRIGGER AS $$
BEGIN
    -- Update occupied_beds count
    UPDATE rooms
    SET occupied_beds = (
        SELECT COUNT(*)
        FROM tenants
        WHERE room_id = COALESCE(NEW.room_id, OLD.room_id)
        AND status = 'active'
    ),
    status = CASE
        WHEN (SELECT COUNT(*) FROM tenants WHERE room_id = COALESCE(NEW.room_id, OLD.room_id) AND status = 'active') = 0 THEN 'available'
        WHEN (SELECT COUNT(*) FROM tenants WHERE room_id = COALESCE(NEW.room_id, OLD.room_id) AND status = 'active') >= total_beds THEN 'occupied'
        ELSE 'partially_occupied'
    END
    WHERE id = COALESCE(NEW.room_id, OLD.room_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_room_on_tenant_change
    AFTER INSERT OR UPDATE OR DELETE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_room_occupancy();

-- ============================================
-- DEFAULT CHARGE TYPES (Seed Data Function)
-- ============================================
CREATE OR REPLACE FUNCTION create_default_charge_types(owner_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO charge_types (owner_id, name, code, category, calculation_method, calculation_config, is_refundable, apply_late_fee, is_system, display_order)
    VALUES
        (owner_uuid, 'Rent', 'rent', 'recurring', 'fixed', '{"source": "room"}'::jsonb, false, true, true, 1),
        (owner_uuid, 'Security Deposit', 'security_deposit', 'deposit', 'fixed', '{"source": "room"}'::jsonb, true, false, true, 2),
        (owner_uuid, 'Electricity', 'electricity', 'usage_based', 'meter_reading', '{"split_by": "occupants", "rate_per_unit": 8}'::jsonb, false, false, true, 3),
        (owner_uuid, 'Water', 'water', 'recurring', 'fixed', '{"default_amount": 200}'::jsonb, false, false, false, 4),
        (owner_uuid, 'Maintenance', 'maintenance', 'recurring', 'fixed', '{"default_amount": 500}'::jsonb, false, false, false, 5),
        (owner_uuid, 'Food/Mess', 'food', 'recurring', 'fixed', '{"default_amount": 3000}'::jsonb, false, false, false, 6),
        (owner_uuid, 'WiFi', 'wifi', 'recurring', 'fixed', '{"default_amount": 300}'::jsonb, false, false, false, 7),
        (owner_uuid, 'Parking', 'parking', 'recurring', 'fixed', '{"default_amount": 500}'::jsonb, false, false, false, 8),
        (owner_uuid, 'Laundry', 'laundry', 'recurring', 'fixed', '{"default_amount": 500}'::jsonb, false, false, false, 9),
        (owner_uuid, 'Late Fee', 'late_fee', 'one_time', 'fixed', '{"default_amount": 100}'::jsonb, false, false, true, 100)
    ON CONFLICT (owner_id, code) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Create default config for owner
CREATE OR REPLACE FUNCTION create_default_owner_config(owner_uuid UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO owner_config (owner_id)
    VALUES (owner_uuid)
    ON CONFLICT (owner_id) DO NOTHING;

    -- Also create default charge types
    PERFORM create_default_charge_types(owner_uuid);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'PG Manager database schema created successfully!';
    RAISE NOTICE 'Tables created: owners, owner_config, charge_types, properties, rooms, beds, tenants, charges, payments, meter_readings, complaints, notices, exit_clearance, change_requests, activity_log';
    RAISE NOTICE 'RLS policies enabled for multi-tenant security';
    RAISE NOTICE 'Triggers set up for automatic timestamps and occupancy updates';
END $$;
