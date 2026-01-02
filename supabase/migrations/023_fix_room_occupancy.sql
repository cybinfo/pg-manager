-- ============================================
-- Migration 023: Fix Room Occupancy Calculation
-- ============================================
-- 1. Make trigger use SECURITY DEFINER to bypass RLS
-- 2. Recalculate all room occupancies
-- ============================================

-- Fix the trigger function to use SECURITY DEFINER
CREATE OR REPLACE FUNCTION update_room_occupancy()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_room_id UUID;
    v_tenant_count INTEGER;
    v_total_beds INTEGER;
BEGIN
    -- Get the room_id
    v_room_id := COALESCE(NEW.room_id, OLD.room_id);

    -- Count active tenants in this room
    SELECT COUNT(*) INTO v_tenant_count
    FROM tenants
    WHERE room_id = v_room_id
    AND status = 'active';

    -- Get total beds
    SELECT total_beds INTO v_total_beds
    FROM rooms
    WHERE id = v_room_id;

    -- Update occupied_beds and status
    UPDATE rooms
    SET
        occupied_beds = v_tenant_count,
        status = CASE
            WHEN v_tenant_count = 0 THEN 'available'
            WHEN v_tenant_count >= v_total_beds THEN 'occupied'
            ELSE 'partial'
        END
    WHERE id = v_room_id;

    RETURN COALESCE(NEW, OLD);
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'update_room_occupancy failed: %', SQLERRM;
        RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Recalculate all room occupancies
-- ============================================
UPDATE rooms r
SET
    occupied_beds = (
        SELECT COUNT(*)
        FROM tenants t
        WHERE t.room_id = r.id
        AND t.status = 'active'
    ),
    status = CASE
        WHEN (SELECT COUNT(*) FROM tenants t WHERE t.room_id = r.id AND t.status = 'active') = 0 THEN 'available'
        WHEN (SELECT COUNT(*) FROM tenants t WHERE t.room_id = r.id AND t.status = 'active') >= r.total_beds THEN 'occupied'
        ELSE 'partial'
    END;

-- ============================================
-- Done
-- ============================================
