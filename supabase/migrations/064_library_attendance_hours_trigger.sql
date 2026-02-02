-- ============================================================================
-- Migration: 064_library_attendance_hours_trigger.sql
-- Description: Auto-calculate hours and update member/membership balances on check-out
-- Author: Claude
-- Date: 2026-02-02
-- ============================================================================

-- ============================================================================
-- 1. Function: Calculate hours spent and update balances on check-out
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_library_attendance_hours()
RETURNS TRIGGER AS $$
DECLARE
  v_hours_spent DECIMAL(10,2);
  v_member_hours_balance DECIMAL(10,2);
  v_member_hours_used DECIMAL(10,2);
  v_membership_hours_remaining DECIMAL(10,2);
  v_membership_hours_used DECIMAL(10,2);
BEGIN
  -- Only trigger when check_out_time is set (was NULL, now has value)
  IF OLD.check_out_time IS NULL AND NEW.check_out_time IS NOT NULL THEN
    -- Calculate hours spent
    v_hours_spent := ROUND(
      EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 3600.0,
      2
    );

    -- Ensure non-negative (minimum 0)
    IF v_hours_spent < 0 THEN
      v_hours_spent := 0;
    END IF;

    -- Set hours_spent on the attendance record
    NEW.hours_spent := v_hours_spent;

    -- Update member hours balance if member_id exists
    IF NEW.member_id IS NOT NULL THEN
      -- Get current member balances
      SELECT hours_balance, hours_used
      INTO v_member_hours_balance, v_member_hours_used
      FROM library_members
      WHERE id = NEW.member_id;

      -- Update member hours
      UPDATE library_members
      SET
        hours_used = COALESCE(v_member_hours_used, 0) + v_hours_spent,
        hours_balance = GREATEST(0, COALESCE(v_member_hours_balance, 0) - v_hours_spent),
        updated_at = NOW()
      WHERE id = NEW.member_id;
    END IF;

    -- Update membership hours if membership_id exists
    IF NEW.membership_id IS NOT NULL THEN
      -- Get current membership balances
      SELECT hours_remaining, hours_used
      INTO v_membership_hours_remaining, v_membership_hours_used
      FROM library_memberships
      WHERE id = NEW.membership_id;

      -- Update membership hours (only if hours_remaining is tracked)
      UPDATE library_memberships
      SET
        hours_used = COALESCE(v_membership_hours_used, 0) + v_hours_spent,
        hours_remaining = CASE
          WHEN v_membership_hours_remaining IS NOT NULL
          THEN GREATEST(0, v_membership_hours_remaining - v_hours_spent)
          ELSE NULL
        END,
        updated_at = NOW()
      WHERE id = NEW.membership_id;
    END IF;

    -- Log to audit (if needed, this can be expanded)
    RAISE NOTICE 'Attendance check-out: member_id=%, hours_spent=%', NEW.member_id, v_hours_spent;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 2. Create trigger on library_attendance
-- ============================================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_calculate_library_attendance_hours ON library_attendance;

-- Create trigger that fires BEFORE UPDATE
CREATE TRIGGER trigger_calculate_library_attendance_hours
  BEFORE UPDATE ON library_attendance
  FOR EACH ROW
  WHEN (OLD.check_out_time IS NULL AND NEW.check_out_time IS NOT NULL)
  EXECUTE FUNCTION calculate_library_attendance_hours();

-- ============================================================================
-- 3. Function: Release seat on check-out (if seat was assigned)
-- ============================================================================

CREATE OR REPLACE FUNCTION release_library_seat_on_checkout()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger when check_out_time is set (was NULL, now has value)
  IF OLD.check_out_time IS NULL AND NEW.check_out_time IS NOT NULL THEN
    -- Release seat if one was assigned
    IF NEW.seat_id IS NOT NULL THEN
      UPDATE library_seats
      SET
        status = 'available',
        current_member_id = NULL,
        updated_at = NOW()
      WHERE id = NEW.seat_id
        AND current_member_id = NEW.member_id;  -- Safety check
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Create trigger for seat release
-- ============================================================================

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_release_library_seat_on_checkout ON library_attendance;

-- Create trigger that fires AFTER UPDATE (after hours are calculated)
CREATE TRIGGER trigger_release_library_seat_on_checkout
  AFTER UPDATE ON library_attendance
  FOR EACH ROW
  WHEN (OLD.check_out_time IS NULL AND NEW.check_out_time IS NOT NULL)
  EXECUTE FUNCTION release_library_seat_on_checkout();

-- ============================================================================
-- 5. Comment on triggers for documentation
-- ============================================================================

COMMENT ON FUNCTION calculate_library_attendance_hours() IS
  'Automatically calculates hours spent and updates member/membership balances when check_out_time is set';

COMMENT ON FUNCTION release_library_seat_on_checkout() IS
  'Automatically releases assigned seat when member checks out';

-- ============================================================================
-- 6. Add index for performance on attendance queries
-- ============================================================================

-- Index for finding active check-ins (no check_out_time)
CREATE INDEX IF NOT EXISTS idx_library_attendance_active
  ON library_attendance(member_id, check_in_time)
  WHERE check_out_time IS NULL AND deleted_at IS NULL;

-- Index for attendance date queries
CREATE INDEX IF NOT EXISTS idx_library_attendance_date
  ON library_attendance(attendance_date)
  WHERE deleted_at IS NULL;
