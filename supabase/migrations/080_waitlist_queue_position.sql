ALTER TABLE library_waitlist ADD COLUMN IF NOT EXISTS queue_position integer;

CREATE OR REPLACE FUNCTION assign_waitlist_queue_position()
RETURNS TRIGGER AS $$
BEGIN
  SELECT COALESCE(MAX(queue_position), 0) + 1 INTO NEW.queue_position
  FROM library_waitlist
  WHERE workspace_id = NEW.workspace_id
    AND library_id = NEW.library_id
    AND status = 'waiting'
    AND deleted_at IS NULL;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_assign_waitlist_queue_position ON library_waitlist;
CREATE TRIGGER tr_assign_waitlist_queue_position
  BEFORE INSERT ON library_waitlist
  FOR EACH ROW
  WHEN (NEW.queue_position IS NULL)
  EXECUTE FUNCTION assign_waitlist_queue_position();
