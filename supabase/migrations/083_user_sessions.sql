-- Migration: User session tracking for security visibility
-- Each row = one device/browser session per user

CREATE TABLE IF NOT EXISTS user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fingerprint TEXT NOT NULL,                     -- client-generated UUID, stable across JWT refreshes
  device_type TEXT NOT NULL DEFAULT 'desktop',   -- 'desktop' | 'mobile' | 'tablet'
  browser TEXT,
  os TEXT,
  ip_address TEXT,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  signed_out_at TIMESTAMPTZ,                     -- NULL = active
  UNIQUE(user_id, fingerprint)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON user_sessions(user_id, signed_out_at) WHERE signed_out_at IS NULL;

-- RLS
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions"
  ON user_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role manages sessions"
  ON user_sessions FOR ALL
  USING (true)
  WITH CHECK (true);
