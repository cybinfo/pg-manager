ALTER TABLE notices ADD COLUMN IF NOT EXISTS scheduled_at timestamptz;
ALTER TABLE notices ADD COLUMN IF NOT EXISTS is_published boolean DEFAULT true;

COMMENT ON COLUMN notices.scheduled_at IS 'When set, notice is not shown until this time. NULL means publish immediately.';
COMMENT ON COLUMN notices.is_published IS 'False for scheduled notices not yet sent';
