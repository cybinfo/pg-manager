-- Migration 086: Consolidate inquiries into visitors
--
-- website_inquiries were a separate pre-visit lead-tracking table.
-- The visitors table already has visitor_type = 'enquiry' with a richer schema
-- (enquiry_status, enquiry_source, rooms_interested, follow_up_date, converted_tenant_id).
-- This migration:
--   1. Makes check_in_time nullable so phone/web enquiries don't need a physical check-in time
--   2. Adds expected_move_in for enquiry context
--   3. Migrates all existing website_inquiries rows into visitors

-- 1. Allow NULL check_in_time (enquiries that haven't visited yet have no check-in time)
ALTER TABLE visitors
  ALTER COLUMN check_in_time DROP NOT NULL;

-- 2. Add expected_move_in (maps from website_inquiries.expected_move_in)
ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS expected_move_in DATE;

-- 3. Migrate existing website_inquiries into visitors
--    Status mapping: new→pending, contacted→follow_up, converted→converted, closed→lost
--    Source mapping: website→website, whatsapp→whatsapp, phone→phone, walk_in→walk_in
--    check_in_time = NULL (these were remote/pre-visit leads, not physical check-ins)
INSERT INTO visitors (
  owner_id,
  property_id,
  visitor_type,
  visitor_name,
  visitor_phone,
  enquiry_status,
  enquiry_source,
  expected_move_in,
  notes,
  check_in_time,
  created_at,
  created_by
)
SELECT
  wi.owner_id,
  wi.property_id,
  'enquiry'::text AS visitor_type,
  wi.name AS visitor_name,
  wi.phone AS visitor_phone,
  CASE wi.status
    WHEN 'new'       THEN 'pending'
    WHEN 'contacted' THEN 'follow_up'
    WHEN 'converted' THEN 'converted'
    WHEN 'closed'    THEN 'lost'
    ELSE 'pending'
  END AS enquiry_status,
  wi.source AS enquiry_source,
  wi.expected_move_in,
  CASE
    WHEN wi.message IS NOT NULL AND wi.notes IS NOT NULL
      THEN wi.message || E'\n---\n' || wi.notes
    WHEN wi.message IS NOT NULL THEN wi.message
    WHEN wi.notes   IS NOT NULL THEN wi.notes
    ELSE NULL
  END AS notes,
  NULL AS check_in_time,
  wi.created_at,
  wi.owner_id AS created_by
FROM website_inquiries wi
ON CONFLICT DO NOTHING;
