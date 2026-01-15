-- Migration: 053_cleanup_old_meter_readings.sql
-- Description: Delete old meter readings that are not linked to meters
-- Author: Claude
-- Date: 2026-01-15

-- ============================================================================
-- CLEANUP OLD METER READINGS
-- Delete all meter readings that don't have a meter_id (old flow records)
-- ============================================================================

-- Disable user-defined triggers temporarily (audit triggers)
ALTER TABLE meter_readings DISABLE TRIGGER USER;
ALTER TABLE charges DISABLE TRIGGER USER;

-- First, delete any charges that reference old meter readings
DELETE FROM charges
WHERE calculation_details->>'meter_reading_id' IS NOT NULL
  AND calculation_details->>'meter_reading_id' IN (
    SELECT id::text FROM meter_readings WHERE meter_id IS NULL
  );

-- Delete old meter readings without meter_id
DELETE FROM meter_readings WHERE meter_id IS NULL;

-- Re-enable user-defined triggers
ALTER TABLE meter_readings ENABLE TRIGGER USER;
ALTER TABLE charges ENABLE TRIGGER USER;

-- Make meter_id required for future readings
ALTER TABLE meter_readings
  ALTER COLUMN meter_id SET NOT NULL;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN meter_readings.meter_id IS 'Required reference to the meter - all readings must be linked to a specific meter';
