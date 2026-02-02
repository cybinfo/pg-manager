-- Migration: 065_library_waitlist.sql
-- Description: Add library waitlist table for tracking prospective members

-- Library Waitlist Table
CREATE TABLE library_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id UUID NOT NULL REFERENCES workspaces(id),
  library_id UUID NOT NULL REFERENCES libraries(id) ON DELETE CASCADE,

  -- Contact Info
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,

  -- Person link (if existing person)
  person_id UUID REFERENCES people(id),

  -- Preferences
  preferred_slot TEXT,  -- Morning, Evening, Night, 24 Hours
  preferred_plan TEXT,
  notes TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'waiting',  -- waiting, contacted, converted, cancelled
  position INTEGER,  -- Queue position (set by trigger)

  -- Contact history
  last_contacted_at TIMESTAMPTZ,
  contact_notes TEXT,

  -- Conversion tracking
  converted_member_id UUID REFERENCES library_members(id),
  converted_at TIMESTAMPTZ,

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES user_profiles(id)
);

-- Enable RLS
ALTER TABLE library_waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policy
CREATE POLICY "library_waitlist_policy" ON library_waitlist
  FOR ALL USING (
    auth.uid() = owner_id
    OR is_platform_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_contexts uc
      JOIN workspaces w ON w.id = uc.workspace_id
      WHERE uc.user_id = auth.uid()
        AND w.owner_user_id = library_waitlist.owner_id
        AND uc.is_active = true
    )
  );

-- Index for soft delete filtering
CREATE INDEX idx_library_waitlist_workspace ON library_waitlist(workspace_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_library_waitlist_library ON library_waitlist(library_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_library_waitlist_status ON library_waitlist(library_id, status)
  WHERE deleted_at IS NULL;

-- Function to auto-set queue position
CREATE OR REPLACE FUNCTION set_waitlist_position()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.position IS NULL AND NEW.status = 'waiting' THEN
    SELECT COALESCE(MAX(position), 0) + 1
    INTO NEW.position
    FROM library_waitlist
    WHERE library_id = NEW.library_id
      AND status = 'waiting'
      AND deleted_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_waitlist_position
  BEFORE INSERT ON library_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION set_waitlist_position();

-- Function to reorder positions when someone leaves the waitlist
CREATE OR REPLACE FUNCTION reorder_waitlist_positions()
RETURNS TRIGGER AS $$
BEGIN
  -- If status changed from 'waiting' to something else, reorder remaining
  IF OLD.status = 'waiting' AND NEW.status != 'waiting' THEN
    UPDATE library_waitlist
    SET position = position - 1,
        updated_at = NOW()
    WHERE library_id = OLD.library_id
      AND status = 'waiting'
      AND position > OLD.position
      AND deleted_at IS NULL;

    NEW.position = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_reorder_waitlist_positions
  BEFORE UPDATE ON library_waitlist
  FOR EACH ROW
  WHEN (OLD.status = 'waiting' AND NEW.status != 'waiting')
  EXECUTE FUNCTION reorder_waitlist_positions();

-- Add audit trigger
CREATE TRIGGER audit_library_waitlist_trigger
  AFTER INSERT OR UPDATE OR DELETE ON library_waitlist
  FOR EACH ROW
  EXECUTE FUNCTION universal_audit_trigger();
