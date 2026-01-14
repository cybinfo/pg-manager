-- Migration 050: Person Merge Function
-- Allows merging duplicate person records into one

-- ============================================
-- Function to merge two person records
-- ============================================
-- Parameters:
--   p_primary_id: The person ID to keep (target)
--   p_secondary_id: The person ID to merge and delete (source)
--   p_merge_strategy: 'keep_primary' or 'keep_newest' for conflicting fields
-- Returns: JSON with merge results
-- ============================================

CREATE OR REPLACE FUNCTION merge_persons(
  p_primary_id UUID,
  p_secondary_id UUID,
  p_merge_strategy TEXT DEFAULT 'keep_primary'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_primary RECORD;
  v_secondary RECORD;
  v_owner_id UUID;
  v_tenants_updated INTEGER := 0;
  v_staff_updated INTEGER := 0;
  v_visitors_updated INTEGER := 0;
  v_merged_tags TEXT[];
  v_merged_emergency_contacts JSONB;
  v_merged_id_documents JSONB;
BEGIN
  -- Validate inputs
  IF p_primary_id IS NULL OR p_secondary_id IS NULL THEN
    RAISE EXCEPTION 'Both person IDs are required';
  END IF;

  IF p_primary_id = p_secondary_id THEN
    RAISE EXCEPTION 'Cannot merge a person with themselves';
  END IF;

  -- Fetch both records
  SELECT * INTO v_primary FROM people WHERE id = p_primary_id;
  SELECT * INTO v_secondary FROM people WHERE id = p_secondary_id;

  IF v_primary IS NULL THEN
    RAISE EXCEPTION 'Primary person not found: %', p_primary_id;
  END IF;

  IF v_secondary IS NULL THEN
    RAISE EXCEPTION 'Secondary person not found: %', p_secondary_id;
  END IF;

  -- Ensure both belong to same owner
  IF v_primary.owner_id != v_secondary.owner_id THEN
    RAISE EXCEPTION 'Cannot merge persons from different owners';
  END IF;

  v_owner_id := v_primary.owner_id;

  -- ============================================
  -- Step 1: Update all references to point to primary
  -- ============================================

  -- Update tenants
  UPDATE tenants
  SET person_id = p_primary_id
  WHERE person_id = p_secondary_id;
  GET DIAGNOSTICS v_tenants_updated = ROW_COUNT;

  -- Update staff_members
  UPDATE staff_members
  SET person_id = p_primary_id
  WHERE person_id = p_secondary_id;
  GET DIAGNOSTICS v_staff_updated = ROW_COUNT;

  -- Update visitor_contacts
  UPDATE visitor_contacts
  SET person_id = p_primary_id
  WHERE person_id = p_secondary_id;
  GET DIAGNOSTICS v_visitors_updated = ROW_COUNT;

  -- ============================================
  -- Step 2: Merge data from secondary into primary
  -- ============================================

  -- Merge tags (union of both)
  v_merged_tags := ARRAY(
    SELECT DISTINCT unnest(
      COALESCE(v_primary.tags, ARRAY[]::TEXT[]) ||
      COALESCE(v_secondary.tags, ARRAY[]::TEXT[])
    )
  );

  -- Merge emergency contacts (combine both lists, dedupe by phone)
  WITH combined_contacts AS (
    SELECT DISTINCT ON (elem->>'phone')
      elem
    FROM (
      SELECT jsonb_array_elements(COALESCE(v_primary.emergency_contacts, '[]'::jsonb)) AS elem
      UNION ALL
      SELECT jsonb_array_elements(COALESCE(v_secondary.emergency_contacts, '[]'::jsonb)) AS elem
    ) sub
    WHERE elem->>'phone' IS NOT NULL AND elem->>'phone' != ''
  )
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_merged_emergency_contacts
  FROM combined_contacts;

  -- Merge ID documents (combine both lists, dedupe by type)
  WITH combined_docs AS (
    SELECT DISTINCT ON (elem->>'type')
      elem
    FROM (
      SELECT jsonb_array_elements(COALESCE(v_primary.id_documents, '[]'::jsonb)) AS elem
      UNION ALL
      SELECT jsonb_array_elements(COALESCE(v_secondary.id_documents, '[]'::jsonb)) AS elem
    ) sub
    WHERE elem->>'type' IS NOT NULL
  )
  SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) INTO v_merged_id_documents
  FROM combined_docs;

  -- Update primary record with merged data
  UPDATE people
  SET
    -- Fill in missing fields from secondary
    phone = COALESCE(v_primary.phone, v_secondary.phone),
    email = COALESCE(v_primary.email, v_secondary.email),
    photo_url = COALESCE(v_primary.photo_url, v_secondary.photo_url),
    aadhaar_number = COALESCE(v_primary.aadhaar_number, v_secondary.aadhaar_number),
    pan_number = COALESCE(v_primary.pan_number, v_secondary.pan_number),
    date_of_birth = COALESCE(v_primary.date_of_birth, v_secondary.date_of_birth),
    gender = COALESCE(v_primary.gender, v_secondary.gender),
    blood_group = COALESCE(v_primary.blood_group, v_secondary.blood_group),
    permanent_address = COALESCE(v_primary.permanent_address, v_secondary.permanent_address),
    permanent_city = COALESCE(v_primary.permanent_city, v_secondary.permanent_city),
    permanent_state = COALESCE(v_primary.permanent_state, v_secondary.permanent_state),
    permanent_pincode = COALESCE(v_primary.permanent_pincode, v_secondary.permanent_pincode),
    current_address = COALESCE(v_primary.current_address, v_secondary.current_address),
    current_city = COALESCE(v_primary.current_city, v_secondary.current_city),
    occupation = COALESCE(v_primary.occupation, v_secondary.occupation),
    company_name = COALESCE(v_primary.company_name, v_secondary.company_name),
    designation = COALESCE(v_primary.designation, v_secondary.designation),
    -- Merged arrays
    tags = v_merged_tags,
    emergency_contacts = v_merged_emergency_contacts,
    id_documents = v_merged_id_documents,
    -- Keep verified status if either was verified
    is_verified = v_primary.is_verified OR v_secondary.is_verified,
    verified_at = CASE
      WHEN v_primary.is_verified THEN v_primary.verified_at
      WHEN v_secondary.is_verified THEN v_secondary.verified_at
      ELSE NULL
    END,
    -- Merge notes
    notes = CASE
      WHEN v_primary.notes IS NOT NULL AND v_secondary.notes IS NOT NULL
        THEN v_primary.notes || E'\n\n--- Merged from duplicate ---\n' || v_secondary.notes
      ELSE COALESCE(v_primary.notes, v_secondary.notes)
    END,
    updated_at = NOW()
  WHERE id = p_primary_id;

  -- ============================================
  -- Step 3: Delete secondary record
  -- ============================================
  DELETE FROM people WHERE id = p_secondary_id;

  -- ============================================
  -- Return summary
  -- ============================================
  RETURN jsonb_build_object(
    'success', true,
    'primary_id', p_primary_id,
    'secondary_id', p_secondary_id,
    'primary_name', v_primary.name,
    'secondary_name', v_secondary.name,
    'tenants_updated', v_tenants_updated,
    'staff_updated', v_staff_updated,
    'visitors_updated', v_visitors_updated,
    'total_references_updated', v_tenants_updated + v_staff_updated + v_visitors_updated,
    'merged_at', NOW()
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Merge failed: %', SQLERRM;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION merge_persons TO authenticated;

-- Add comment
COMMENT ON FUNCTION merge_persons IS 'Merges two person records, updating all references and combining data';
