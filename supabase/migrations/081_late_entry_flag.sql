-- Migration 081: Late Entry Flag for library_attendance
-- Flags check-ins that occur outside the member's assigned time slot.

ALTER TABLE library_attendance ADD COLUMN IF NOT EXISTS is_late boolean DEFAULT false;
ALTER TABLE library_attendance ADD COLUMN IF NOT EXISTS scheduled_slot text;

COMMENT ON COLUMN library_attendance.is_late IS 'True if check-in occurred outside the member assigned time slot';
COMMENT ON COLUMN library_attendance.scheduled_slot IS 'The expected time slot string for the member at check-in time';
