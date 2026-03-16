-- ============================================================================
-- Migration 066: Library Member Status Log
-- Tracks status transitions (active → suspended, etc.) with reasons
-- ============================================================================

-- Status log table
CREATE TABLE IF NOT EXISTS library_member_status_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID,
  member_id UUID NOT NULL REFERENCES library_members(id) ON DELETE CASCADE,
  old_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  changed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_member_status_log_member ON library_member_status_log(member_id);
CREATE INDEX IF NOT EXISTS idx_member_status_log_changed ON library_member_status_log(changed_at DESC);

-- RLS
ALTER TABLE library_member_status_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "member_status_log_owner_access" ON library_member_status_log
  FOR ALL USING (
    owner_id = auth.uid()
    OR is_platform_admin(auth.uid())
  );

-- Audit trigger
CREATE TRIGGER library_member_status_log_audit
  AFTER INSERT OR UPDATE OR DELETE ON library_member_status_log
  FOR EACH ROW EXECUTE FUNCTION universal_audit_trigger();

-- Comments
COMMENT ON TABLE library_member_status_log IS 'Tracks library member status transitions with reasons';
