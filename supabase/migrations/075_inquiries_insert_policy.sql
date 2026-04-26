-- Allow authenticated owners to manually log inquiries (phone, walk-in)
-- The original migration 005 only had SELECT, UPDATE, DELETE policies.

CREATE POLICY "Owners can insert inquiries" ON website_inquiries
  FOR INSERT WITH CHECK (owner_id = auth.uid());
