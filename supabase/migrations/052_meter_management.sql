-- Migration: 052_meter_management.sql
-- Description: Create meter management system with meters and meter_assignments tables
-- Author: Claude
-- Date: 2026-01-14

-- ============================================================================
-- METERS TABLE
-- Stores meter entities as independent records
-- ============================================================================

CREATE TABLE IF NOT EXISTS meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Meter identification
  meter_number TEXT NOT NULL,
  meter_type TEXT NOT NULL CHECK (meter_type IN ('electricity', 'water', 'gas')),

  -- Lifecycle
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'faulty', 'replaced', 'retired')),
  initial_reading DECIMAL(12, 2) DEFAULT 0,

  -- Metadata
  make TEXT,                    -- Manufacturer
  model TEXT,                   -- Model number
  installation_date DATE,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique meter number per owner
  UNIQUE(owner_id, meter_number)
);

-- Indexes for meters
CREATE INDEX IF NOT EXISTS idx_meters_owner_id ON meters(owner_id);
CREATE INDEX IF NOT EXISTS idx_meters_property_id ON meters(property_id);
CREATE INDEX IF NOT EXISTS idx_meters_meter_type ON meters(meter_type);
CREATE INDEX IF NOT EXISTS idx_meters_status ON meters(status);

-- RLS for meters
ALTER TABLE meters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meters_select_policy" ON meters
  FOR SELECT USING (
    auth.uid() = owner_id
    OR is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_contexts uc
      JOIN workspaces w ON w.id = uc.workspace_id
      WHERE uc.user_id = auth.uid()
        AND w.owner_user_id = meters.owner_id
        AND uc.is_active = true
    )
  );

CREATE POLICY "meters_insert_policy" ON meters
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "meters_update_policy" ON meters
  FOR UPDATE USING (
    auth.uid() = owner_id
    OR is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_contexts uc
      JOIN workspaces w ON w.id = uc.workspace_id
      WHERE uc.user_id = auth.uid()
        AND w.owner_user_id = meters.owner_id
        AND uc.is_active = true
    )
  );

CREATE POLICY "meters_delete_policy" ON meters
  FOR DELETE USING (
    auth.uid() = owner_id
    OR is_platform_admin(auth.uid())
  );

-- ============================================================================
-- METER ASSIGNMENTS TABLE
-- Tracks which meter is assigned to which room and when
-- ============================================================================

-- Enable btree_gist extension for exclusion constraints
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS meter_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meter_id UUID NOT NULL REFERENCES meters(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,

  -- Assignment period
  start_date DATE NOT NULL,
  end_date DATE,                -- NULL = currently assigned

  -- Readings at assignment boundaries
  start_reading DECIMAL(12, 2) NOT NULL,
  end_reading DECIMAL(12, 2),   -- Captured when meter is removed

  -- Reason for change
  reason TEXT CHECK (reason IN ('initial', 'replacement', 'transfer', 'repair', 'upgrade')),
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent overlapping assignments for the same meter
  CONSTRAINT unique_active_meter_assignment
    EXCLUDE USING gist (
      meter_id WITH =,
      daterange(start_date, COALESCE(end_date, '9999-12-31'::date), '[]') WITH &&
    )
);

-- Indexes for meter_assignments
CREATE INDEX IF NOT EXISTS idx_meter_assignments_owner_id ON meter_assignments(owner_id);
CREATE INDEX IF NOT EXISTS idx_meter_assignments_meter_id ON meter_assignments(meter_id);
CREATE INDEX IF NOT EXISTS idx_meter_assignments_room_id ON meter_assignments(room_id);
CREATE INDEX IF NOT EXISTS idx_meter_assignments_active ON meter_assignments(meter_id) WHERE end_date IS NULL;

-- RLS for meter_assignments
ALTER TABLE meter_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "meter_assignments_select_policy" ON meter_assignments
  FOR SELECT USING (
    auth.uid() = owner_id
    OR is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_contexts uc
      JOIN workspaces w ON w.id = uc.workspace_id
      WHERE uc.user_id = auth.uid()
        AND w.owner_user_id = meter_assignments.owner_id
        AND uc.is_active = true
    )
  );

CREATE POLICY "meter_assignments_insert_policy" ON meter_assignments
  FOR INSERT WITH CHECK (
    auth.uid() = owner_id
    OR is_platform_admin(auth.uid())
  );

CREATE POLICY "meter_assignments_update_policy" ON meter_assignments
  FOR UPDATE USING (
    auth.uid() = owner_id
    OR is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_contexts uc
      JOIN workspaces w ON w.id = uc.workspace_id
      WHERE uc.user_id = auth.uid()
        AND w.owner_user_id = meter_assignments.owner_id
        AND uc.is_active = true
    )
  );

CREATE POLICY "meter_assignments_delete_policy" ON meter_assignments
  FOR DELETE USING (
    auth.uid() = owner_id
    OR is_platform_admin(auth.uid())
  );

-- ============================================================================
-- UPDATE METER_READINGS TABLE
-- Add optional meter_id column for linking readings to specific meters
-- ============================================================================

ALTER TABLE meter_readings
  ADD COLUMN IF NOT EXISTS meter_id UUID REFERENCES meters(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_meter_readings_meter_id ON meter_readings(meter_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to get current active meter assignment for a room and type
CREATE OR REPLACE FUNCTION get_active_meter_for_room(
  p_room_id UUID,
  p_meter_type TEXT
) RETURNS TABLE (
  meter_id UUID,
  meter_number TEXT,
  assignment_id UUID,
  start_date DATE,
  start_reading DECIMAL(12, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS meter_id,
    m.meter_number,
    ma.id AS assignment_id,
    ma.start_date,
    ma.start_reading
  FROM meters m
  INNER JOIN meter_assignments ma ON ma.meter_id = m.id
  WHERE ma.room_id = p_room_id
    AND m.meter_type = p_meter_type
    AND ma.end_date IS NULL
    AND m.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get all active meters for a room
CREATE OR REPLACE FUNCTION get_active_meters_for_room(
  p_room_id UUID
) RETURNS TABLE (
  meter_id UUID,
  meter_number TEXT,
  meter_type TEXT,
  assignment_id UUID,
  start_date DATE,
  start_reading DECIMAL(12, 2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id AS meter_id,
    m.meter_number,
    m.meter_type,
    ma.id AS assignment_id,
    ma.start_date,
    ma.start_reading
  FROM meters m
  INNER JOIN meter_assignments ma ON ma.meter_id = m.id
  WHERE ma.room_id = p_room_id
    AND ma.end_date IS NULL
    AND m.status = 'active'
  ORDER BY m.meter_type;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to end a meter assignment (when replacing or removing)
CREATE OR REPLACE FUNCTION end_meter_assignment(
  p_assignment_id UUID,
  p_end_date DATE,
  p_end_reading DECIMAL(12, 2),
  p_new_status TEXT DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
  v_meter_id UUID;
BEGIN
  -- Update the assignment
  UPDATE meter_assignments
  SET
    end_date = p_end_date,
    end_reading = p_end_reading
  WHERE id = p_assignment_id
  RETURNING meter_id INTO v_meter_id;

  -- Update meter status if specified
  IF p_new_status IS NOT NULL AND v_meter_id IS NOT NULL THEN
    UPDATE meters
    SET
      status = p_new_status,
      updated_at = NOW()
    WHERE id = v_meter_id;
  END IF;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- AUDIT TRIGGERS
-- ============================================================================

-- Updated_at trigger for meters
CREATE OR REPLACE FUNCTION update_meters_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_meters_updated_at ON meters;
CREATE TRIGGER trigger_meters_updated_at
  BEFORE UPDATE ON meters
  FOR EACH ROW
  EXECUTE FUNCTION update_meters_updated_at();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE meters IS 'Physical meters (electricity, water, gas) as independent entities';
COMMENT ON TABLE meter_assignments IS 'Tracks meter assignments to rooms with date ranges';
COMMENT ON COLUMN meters.meter_number IS 'Unique identifier printed on the physical meter';
COMMENT ON COLUMN meters.status IS 'Lifecycle status: active, faulty, replaced, retired';
COMMENT ON COLUMN meters.initial_reading IS 'Reading when meter was first registered in system';
COMMENT ON COLUMN meter_assignments.start_reading IS 'Meter reading when assigned to this room';
COMMENT ON COLUMN meter_assignments.end_reading IS 'Meter reading when removed from this room';
COMMENT ON COLUMN meter_assignments.reason IS 'Why the meter was assigned: initial, replacement, transfer, repair, upgrade';
