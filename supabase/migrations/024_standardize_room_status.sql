-- ============================================
-- Migration 024: Standardize Room Status Values
-- ============================================
-- 1. Use consistent status values: 'available', 'occupied', 'partially_occupied', 'maintenance'
-- 2. Fix trigger to use 'partially_occupied' instead of 'partial'
-- 3. Update any existing 'partial' status to 'partially_occupied'
-- 4. Recalculate all room occupancies
-- ============================================

-- First, normalize any existing 'partial' status to 'partially_occupied'
UPDATE rooms SET status = 'partially_occupied' WHERE status = 'partial';

-- Recreate the trigger function with correct status value
CREATE OR REPLACE FUNCTION update_room_occupancy()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_old_room_id UUID;
    v_new_room_id UUID;
    v_tenant_count INTEGER;
    v_total_beds INTEGER;
BEGIN
    -- Handle room_id changes (tenant moved to different room)
    v_old_room_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.room_id WHEN TG_OP = 'UPDATE' THEN OLD.room_id ELSE NULL END;
    v_new_room_id := CASE WHEN TG_OP = 'INSERT' THEN NEW.room_id WHEN TG_OP = 'UPDATE' THEN NEW.room_id ELSE NULL END;

    -- Update old room if tenant moved away
    IF v_old_room_id IS NOT NULL AND (TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND v_old_room_id != v_new_room_id)) THEN
        SELECT COUNT(*) INTO v_tenant_count
        FROM tenants
        WHERE room_id = v_old_room_id
        AND status = 'active';

        SELECT total_beds INTO v_total_beds
        FROM rooms
        WHERE id = v_old_room_id;

        UPDATE rooms
        SET
            occupied_beds = v_tenant_count,
            status = CASE
                WHEN v_tenant_count = 0 THEN 'available'
                WHEN v_tenant_count >= COALESCE(v_total_beds, 0) THEN 'occupied'
                ELSE 'partially_occupied'
            END
        WHERE id = v_old_room_id;
    END IF;

    -- Update new room if tenant added or moved in
    IF v_new_room_id IS NOT NULL THEN
        SELECT COUNT(*) INTO v_tenant_count
        FROM tenants
        WHERE room_id = v_new_room_id
        AND status = 'active';

        SELECT total_beds INTO v_total_beds
        FROM rooms
        WHERE id = v_new_room_id;

        UPDATE rooms
        SET
            occupied_beds = v_tenant_count,
            status = CASE
                WHEN v_tenant_count = 0 THEN 'available'
                WHEN v_tenant_count >= COALESCE(v_total_beds, 0) THEN 'occupied'
                ELSE 'partially_occupied'
            END
        WHERE id = v_new_room_id;
    END IF;

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
        ELSE 'partially_occupied'
    END;

-- ============================================
-- Create a helper function to manually sync room occupancy
-- ============================================
CREATE OR REPLACE FUNCTION sync_room_occupancy(p_room_id UUID DEFAULT NULL)
RETURNS TABLE(room_id UUID, room_number TEXT, old_occupied INTEGER, new_occupied INTEGER, old_status TEXT, new_status TEXT)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    r RECORD;
    v_count INTEGER;
    v_new_status TEXT;
BEGIN
    FOR r IN
        SELECT rm.id, rm.room_number, rm.occupied_beds, rm.total_beds, rm.status
        FROM rooms rm
        WHERE p_room_id IS NULL OR rm.id = p_room_id
    LOOP
        SELECT COUNT(*) INTO v_count
        FROM tenants t
        WHERE t.room_id = r.id
        AND t.status = 'active';

        v_new_status := CASE
            WHEN v_count = 0 THEN 'available'
            WHEN v_count >= r.total_beds THEN 'occupied'
            ELSE 'partially_occupied'
        END;

        IF r.occupied_beds != v_count OR r.status != v_new_status THEN
            UPDATE rooms
            SET occupied_beds = v_count, status = v_new_status
            WHERE id = r.id;

            room_id := r.id;
            room_number := r.room_number;
            old_occupied := r.occupied_beds;
            new_occupied := v_count;
            old_status := r.status;
            new_status := v_new_status;
            RETURN NEXT;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION sync_room_occupancy(UUID) TO authenticated;

-- ============================================
-- Done
-- ============================================
