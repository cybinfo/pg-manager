-- Create meter_readings table for tracking electricity, water, gas consumption
CREATE TABLE IF NOT EXISTS meter_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  meter_type TEXT NOT NULL DEFAULT 'electricity', -- electricity, water, gas
  reading_date DATE NOT NULL,
  reading_value DECIMAL(12, 2) NOT NULL,
  previous_value DECIMAL(12, 2),
  units_consumed DECIMAL(12, 2),
  image_url TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_meter_readings_owner_id ON meter_readings(owner_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_property_id ON meter_readings(property_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_room_id ON meter_readings(room_id);
CREATE INDEX IF NOT EXISTS idx_meter_readings_meter_type ON meter_readings(meter_type);
CREATE INDEX IF NOT EXISTS idx_meter_readings_reading_date ON meter_readings(reading_date DESC);

-- Enable Row Level Security
ALTER TABLE meter_readings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for meter_readings
CREATE POLICY "Users can view their own meter readings"
  ON meter_readings FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create meter readings"
  ON meter_readings FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own meter readings"
  ON meter_readings FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own meter readings"
  ON meter_readings FOR DELETE
  USING (auth.uid() = owner_id);

-- Add meter-related columns to rooms table if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'has_electricity_meter') THEN
    ALTER TABLE rooms ADD COLUMN has_electricity_meter BOOLEAN DEFAULT FALSE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'rooms' AND column_name = 'meter_number') THEN
    ALTER TABLE rooms ADD COLUMN meter_number TEXT;
  END IF;
END $$;
