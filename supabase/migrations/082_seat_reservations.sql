-- Migration 082: Seat Reservations for library seats
-- Allows members to reserve seats in advance.

CREATE TABLE IF NOT EXISTS library_seat_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id),
  seat_id uuid NOT NULL REFERENCES library_seats(id),
  member_id uuid NOT NULL REFERENCES library_members(id),
  reserved_date date NOT NULL,
  start_time time,
  end_time time,
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz,
  deleted_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_seat_reservations_seat_date ON library_seat_reservations(seat_id, reserved_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_seat_reservations_member ON library_seat_reservations(member_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_seat_reservations_workspace ON library_seat_reservations(workspace_id) WHERE deleted_at IS NULL;

ALTER TABLE library_seat_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "workspace_access" ON library_seat_reservations
  FOR ALL USING (
    workspace_id IN (
      SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = true
    )
    OR is_platform_admin(auth.uid())
  );
