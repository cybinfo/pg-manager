ALTER TABLE properties ADD COLUMN IF NOT EXISTS is_under_maintenance boolean DEFAULT false;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_under_maintenance boolean DEFAULT false;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS maintenance_notes text;

COMMENT ON COLUMN properties.is_under_maintenance IS 'When true, blocks new tenant assignments to this property';
COMMENT ON COLUMN rooms.is_under_maintenance IS 'When true, blocks new tenant assignments to this room';
COMMENT ON COLUMN rooms.maintenance_notes IS 'Optional notes describing the maintenance work';
