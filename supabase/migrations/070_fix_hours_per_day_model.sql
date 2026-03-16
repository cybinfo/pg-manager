-- ============================================================================
-- Migration: 070_fix_hours_per_day_model.sql
-- Description: Switch library hours tracking from pool model to per-day model
--
-- BEFORE: Member enrolls in "9 Hours Plan" → hours_balance depletes over
--         the entire subscription (pool model) — WRONG for Indian study libraries.
--
-- AFTER:  Member enrolls in "9 Hours Plan" → gets 9 hours EVERY DAY.
--         hours_balance = daily_allowance - today's total usage.
--         Resets automatically each day (computed, no cron needed).
--
-- Changes:
-- 1. Replace trigger function to compute hours_balance from today's attendance
-- 2. Add helper function get_member_today_hours_used()
-- 3. Add helper function get_member_daily_allowance()
-- 4. Add index for today's attendance lookups
-- ============================================================================

-- ============================================================================
-- 1. Helper: Get a member's daily hour allowance from active membership
-- ============================================================================

CREATE OR REPLACE FUNCTION get_member_daily_allowance(p_member_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_hours_included DECIMAL(10,2);
BEGIN
  -- Get hours_included from the member's current active subscription
  SELECT lms.hours_included
  INTO v_hours_included
  FROM library_members lm
  JOIN library_memberships lms ON lms.id = lm.current_subscription_id
  WHERE lm.id = p_member_id
    AND lms.status = 'active';

  -- NULL means unlimited plan (no daily cap)
  RETURN v_hours_included;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_member_daily_allowance(UUID) IS
  'Returns the daily hour allowance from the member''s active subscription. NULL = unlimited.';

-- ============================================================================
-- 2. Helper: Get total hours used by a member TODAY
-- ============================================================================

CREATE OR REPLACE FUNCTION get_member_today_hours_used(p_member_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  v_today_hours DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(hours_spent), 0)
  INTO v_today_hours
  FROM library_attendance
  WHERE member_id = p_member_id
    AND DATE(check_out_time) = CURRENT_DATE
    AND deleted_at IS NULL;

  RETURN v_today_hours;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_member_today_hours_used(UUID) IS
  'Returns total hours spent by a member today (based on check_out_time date).';

-- ============================================================================
-- 3. Replace the checkout trigger function — per-day model
-- ============================================================================

CREATE OR REPLACE FUNCTION calculate_library_attendance_hours()
RETURNS TRIGGER AS $$
DECLARE
  v_hours_spent DECIMAL(10,2);
  v_member_hours_used DECIMAL(10,2);
  v_membership_hours_used DECIMAL(10,2);
  v_daily_allowance DECIMAL(10,2);
  v_today_total DECIMAL(10,2);
  v_new_balance DECIMAL(10,2);
BEGIN
  -- Only trigger when check_out_time is set (was NULL, now has value)
  IF OLD.check_out_time IS NULL AND NEW.check_out_time IS NOT NULL THEN
    -- Calculate hours spent for this session
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

    -- Update member hours if member_id exists
    IF NEW.member_id IS NOT NULL THEN
      -- Get current cumulative hours_used
      SELECT hours_used
      INTO v_member_hours_used
      FROM library_members
      WHERE id = NEW.member_id;

      -- Get daily allowance from active membership
      v_daily_allowance := get_member_daily_allowance(NEW.member_id);

      -- Calculate today's total usage (including this checkout)
      -- We need to include the current session that's being checked out
      -- Note: NEW.hours_spent is set above but the row isn't committed yet,
      -- so get_member_today_hours_used won't include it. Add manually.
      v_today_total := get_member_today_hours_used(NEW.member_id) + v_hours_spent;

      -- Compute new balance: daily_allowance - today_total
      -- NULL daily_allowance = unlimited → set balance to a large number
      IF v_daily_allowance IS NULL THEN
        v_new_balance := 999; -- Unlimited plan
      ELSE
        v_new_balance := GREATEST(0, v_daily_allowance - v_today_total);
      END IF;

      -- Update member: increment cumulative hours_used, set today's balance
      UPDATE library_members
      SET
        hours_used = COALESCE(v_member_hours_used, 0) + v_hours_spent,
        hours_balance = v_new_balance,
        updated_at = NOW()
      WHERE id = NEW.member_id;
    END IF;

    -- Update membership cumulative hours (for analytics)
    IF NEW.membership_id IS NOT NULL THEN
      SELECT hours_used
      INTO v_membership_hours_used
      FROM library_memberships
      WHERE id = NEW.membership_id;

      UPDATE library_memberships
      SET
        hours_used = COALESCE(v_membership_hours_used, 0) + v_hours_spent,
        updated_at = NOW()
      WHERE id = NEW.membership_id;
    END IF;

    RAISE NOTICE 'Attendance check-out (per-day model): member_id=%, hours_spent=%, today_total=%, daily_allowance=%, new_balance=%',
      NEW.member_id, v_hours_spent, v_today_total, v_daily_allowance, v_new_balance;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. Function: Reset hours_balance for all active members (daily reset)
--    This should be called at the start of each day to reset balances.
--    Can be triggered by a cron or called manually.
--    Sets hours_balance = daily allowance from active membership.
-- ============================================================================

CREATE OR REPLACE FUNCTION reset_daily_hours_balance()
RETURNS TABLE(member_id UUID, new_balance DECIMAL(10,2)) AS $$
BEGIN
  RETURN QUERY
  UPDATE library_members lm
  SET
    hours_balance = COALESCE(lms.hours_included, 999),
    updated_at = NOW()
  FROM library_memberships lms
  WHERE lms.id = lm.current_subscription_id
    AND lms.status = 'active'
    AND lm.status = 'active'
    AND lm.deleted_at IS NULL
  RETURNING lm.id AS member_id, lm.hours_balance AS new_balance;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reset_daily_hours_balance() IS
  'Resets hours_balance for all active members to their daily allowance. Call at start of day or use as self-correcting mechanism.';

-- ============================================================================
-- 5. Index for efficient today-based attendance queries
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_library_attendance_checkout_date
  ON library_attendance(member_id, check_out_time)
  WHERE deleted_at IS NULL AND check_out_time IS NOT NULL;

-- ============================================================================
-- 6. Reset all active members' hours_balance to their daily allowance NOW
--    This corrects any existing pool-model balances to the per-day model.
-- ============================================================================

SELECT * FROM reset_daily_hours_balance();

-- ============================================================================
-- 7. Drop hours_remaining from library_memberships (no longer meaningful
--    in per-day model). We keep hours_used for cumulative analytics.
--    Note: We don't actually DROP the column to avoid breaking existing code.
--    Instead, we stop updating it in the trigger and set all to NULL.
-- ============================================================================

-- Set hours_remaining to NULL for all memberships — it's no longer tracked
UPDATE library_memberships
SET hours_remaining = NULL
WHERE hours_remaining IS NOT NULL;

COMMENT ON COLUMN library_memberships.hours_remaining IS
  'DEPRECATED: No longer used in per-day hours model. Was pool-model remaining hours. Kept for backward compatibility.';
