-- Tenant History: Re-joining and Room Switching
-- Tracks tenant stays (tenures) and room transfers

-- ============================================
-- TENANT STAYS (Track multiple tenures)
-- ============================================
-- Each time a tenant joins/rejoins, a new stay record is created
CREATE TABLE IF NOT EXISTS tenant_stays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,

    -- Stay period
    join_date DATE NOT NULL,
    exit_date DATE,

    -- Financial terms for this stay
    monthly_rent DECIMAL(10,2) NOT NULL,
    security_deposit DECIMAL(10,2) DEFAULT 0,

    -- Status: active, completed, transferred (room change creates new stay)
    status TEXT DEFAULT 'active',

    -- Exit details
    exit_reason TEXT, -- 'moved_out', 'transferred', 'evicted', etc.
    exit_notes TEXT,

    -- Stay number for this tenant (1st stay, 2nd stay, etc.)
    stay_number INTEGER DEFAULT 1,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ROOM TRANSFERS (Track room switches)
-- ============================================
CREATE TABLE IF NOT EXISTS room_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

    -- From room
    from_property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    from_room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    from_bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,

    -- To room
    to_property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    to_room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    to_bed_id UUID REFERENCES beds(id) ON DELETE SET NULL,

    -- Transfer details
    transfer_date DATE NOT NULL,
    reason TEXT, -- 'upgrade', 'downgrade', 'request', 'maintenance', 'other'
    notes TEXT,

    -- Rent change
    old_rent DECIMAL(10,2),
    new_rent DECIMAL(10,2),

    -- Who approved
    approved_by UUID REFERENCES auth.users(id),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Add is_returning flag to tenants
-- ============================================
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_returning BOOLEAN DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS previous_tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS total_stays INTEGER DEFAULT 1;

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_tenant_stays_tenant ON tenant_stays(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_stays_owner ON tenant_stays(owner_id);
CREATE INDEX IF NOT EXISTS idx_tenant_stays_property ON tenant_stays(property_id);
CREATE INDEX IF NOT EXISTS idx_tenant_stays_room ON tenant_stays(room_id);
CREATE INDEX IF NOT EXISTS idx_tenant_stays_status ON tenant_stays(status);
CREATE INDEX IF NOT EXISTS idx_room_transfers_tenant ON room_transfers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_room_transfers_owner ON room_transfers(owner_id);
CREATE INDEX IF NOT EXISTS idx_room_transfers_date ON room_transfers(transfer_date);

-- Index for finding returning tenants by phone
CREATE INDEX IF NOT EXISTS idx_tenants_phone ON tenants(phone);

-- ============================================
-- RLS POLICIES
-- ============================================
ALTER TABLE tenant_stays ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage tenant stays" ON tenant_stays
    FOR ALL USING (owner_id = auth.uid());

CREATE POLICY "Owners can manage room transfers" ON room_transfers
    FOR ALL USING (owner_id = auth.uid());

-- ============================================
-- FUNCTION: Create initial stay record for existing tenants
-- ============================================
-- This creates stay records for all existing active tenants
INSERT INTO tenant_stays (owner_id, tenant_id, property_id, room_id, bed_id, join_date, monthly_rent, security_deposit, status, stay_number)
SELECT
    t.owner_id,
    t.id,
    t.property_id,
    t.room_id,
    t.bed_id,
    COALESCE(t.join_date, t.created_at::date),
    t.monthly_rent,
    COALESCE(t.security_deposit, 0),
    CASE WHEN t.status = 'active' THEN 'active' ELSE 'completed' END,
    1
FROM tenants t
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_stays ts WHERE ts.tenant_id = t.id
);

-- ============================================
-- FUNCTION: Find returning tenant by phone
-- ============================================
CREATE OR REPLACE FUNCTION find_returning_tenant(
    p_owner_id UUID,
    p_phone TEXT
)
RETURNS TABLE (
    tenant_id UUID,
    tenant_name TEXT,
    phone TEXT,
    last_property TEXT,
    last_room TEXT,
    last_exit_date DATE,
    total_stays INTEGER,
    last_stay_status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id as tenant_id,
        t.name as tenant_name,
        t.phone,
        p.name as last_property,
        r.room_number as last_room,
        t.exit_date as last_exit_date,
        COALESCE(t.total_stays, 1) as total_stays,
        t.status as last_stay_status
    FROM tenants t
    LEFT JOIN properties p ON t.property_id = p.id
    LEFT JOIN rooms r ON t.room_id = r.id
    WHERE t.owner_id = p_owner_id
    AND t.phone = p_phone
    AND t.status IN ('moved_out', 'inactive')
    ORDER BY t.exit_date DESC NULLS LAST, t.created_at DESC
    LIMIT 5;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION: Process room transfer
-- ============================================
CREATE OR REPLACE FUNCTION process_room_transfer(
    p_tenant_id UUID,
    p_to_property_id UUID,
    p_to_room_id UUID,
    p_to_bed_id UUID,
    p_transfer_date DATE,
    p_new_rent DECIMAL,
    p_reason TEXT,
    p_notes TEXT
)
RETURNS UUID AS $$
DECLARE
    v_owner_id UUID;
    v_from_property_id UUID;
    v_from_room_id UUID;
    v_from_bed_id UUID;
    v_old_rent DECIMAL;
    v_transfer_id UUID;
    v_current_stay_id UUID;
BEGIN
    -- Get current tenant info
    SELECT owner_id, property_id, room_id, bed_id, monthly_rent
    INTO v_owner_id, v_from_property_id, v_from_room_id, v_from_bed_id, v_old_rent
    FROM tenants
    WHERE id = p_tenant_id;

    -- Create transfer record
    INSERT INTO room_transfers (
        owner_id, tenant_id,
        from_property_id, from_room_id, from_bed_id,
        to_property_id, to_room_id, to_bed_id,
        transfer_date, reason, notes,
        old_rent, new_rent
    ) VALUES (
        v_owner_id, p_tenant_id,
        v_from_property_id, v_from_room_id, v_from_bed_id,
        p_to_property_id, p_to_room_id, p_to_bed_id,
        p_transfer_date, p_reason, p_notes,
        v_old_rent, p_new_rent
    ) RETURNING id INTO v_transfer_id;

    -- Update current stay to completed
    UPDATE tenant_stays
    SET status = 'transferred',
        exit_date = p_transfer_date,
        exit_reason = 'transferred',
        exit_notes = p_notes,
        updated_at = NOW()
    WHERE tenant_id = p_tenant_id AND status = 'active';

    -- Create new stay record
    INSERT INTO tenant_stays (
        owner_id, tenant_id, property_id, room_id, bed_id,
        join_date, monthly_rent, security_deposit, status,
        stay_number
    )
    SELECT
        v_owner_id, p_tenant_id, p_to_property_id, p_to_room_id, p_to_bed_id,
        p_transfer_date, p_new_rent,
        (SELECT security_deposit FROM tenants WHERE id = p_tenant_id),
        'active',
        COALESCE((SELECT MAX(stay_number) + 1 FROM tenant_stays WHERE tenant_id = p_tenant_id), 1);

    -- Update tenant record
    UPDATE tenants
    SET property_id = p_to_property_id,
        room_id = p_to_room_id,
        bed_id = p_to_bed_id,
        monthly_rent = p_new_rent,
        updated_at = NOW()
    WHERE id = p_tenant_id;

    RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Update updated_at on tenant_stays
-- ============================================
CREATE TRIGGER update_tenant_stays_updated_at
    BEFORE UPDATE ON tenant_stays
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
