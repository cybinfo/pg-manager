-- Migration 051: Automatic Duplicate Detection for People
-- Identifies potential duplicate person records based on phone, email, name similarity

-- ============================================
-- Function to find potential duplicates
-- ============================================
-- Returns groups of people that might be duplicates
-- Each group has a match_type indicating why they matched

CREATE OR REPLACE FUNCTION find_duplicate_people(
  p_owner_id UUID DEFAULT NULL
)
RETURNS TABLE (
  group_id INTEGER,
  person_id UUID,
  person_name TEXT,
  phone TEXT,
  email TEXT,
  photo_url TEXT,
  tags TEXT[],
  is_verified BOOLEAN,
  is_blocked BOOLEAN,
  created_at TIMESTAMPTZ,
  match_type TEXT,
  match_confidence TEXT,
  tenant_count BIGINT,
  staff_count BIGINT,
  visitor_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_group_counter INTEGER := 0;
BEGIN
  -- Get owner_id from auth if not provided
  v_owner_id := COALESCE(p_owner_id, auth.uid());

  IF v_owner_id IS NULL THEN
    RAISE EXCEPTION 'Owner ID is required';
  END IF;

  -- Create temp table to store results
  CREATE TEMP TABLE IF NOT EXISTS temp_duplicates (
    group_id INTEGER,
    person_id UUID,
    person_name TEXT,
    phone TEXT,
    email TEXT,
    photo_url TEXT,
    tags TEXT[],
    is_verified BOOLEAN,
    is_blocked BOOLEAN,
    created_at TIMESTAMPTZ,
    match_type TEXT,
    match_confidence TEXT
  ) ON COMMIT DROP;

  -- Clear any existing data
  DELETE FROM temp_duplicates;

  -- ============================================
  -- Match 1: Exact phone number match (HIGH confidence)
  -- ============================================
  FOR v_group_counter IN
    SELECT row_number() OVER () + COALESCE((SELECT MAX(group_id) FROM temp_duplicates), 0)
    FROM (
      SELECT phone FROM people
      WHERE owner_id = v_owner_id
        AND phone IS NOT NULL
        AND phone != ''
        AND is_active = true
      GROUP BY phone
      HAVING COUNT(*) > 1
    ) dups
  LOOP
    INSERT INTO temp_duplicates (group_id, person_id, person_name, phone, email, photo_url, tags, is_verified, is_blocked, created_at, match_type, match_confidence)
    SELECT
      v_group_counter,
      p.id,
      p.name,
      p.phone,
      p.email,
      p.photo_url,
      p.tags,
      p.is_verified,
      p.is_blocked,
      p.created_at,
      'phone',
      'high'
    FROM people p
    WHERE p.owner_id = v_owner_id
      AND p.is_active = true
      AND p.phone = (
        SELECT phone FROM people
        WHERE owner_id = v_owner_id
          AND phone IS NOT NULL
          AND phone != ''
          AND is_active = true
        GROUP BY phone
        HAVING COUNT(*) > 1
        OFFSET v_group_counter - 1
        LIMIT 1
      );
  END LOOP;

  -- ============================================
  -- Match 2: Exact email match (HIGH confidence)
  -- ============================================
  INSERT INTO temp_duplicates (group_id, person_id, person_name, phone, email, photo_url, tags, is_verified, is_blocked, created_at, match_type, match_confidence)
  SELECT
    (SELECT COALESCE(MAX(group_id), 0) FROM temp_duplicates) +
      dense_rank() OVER (ORDER BY LOWER(p.email)),
    p.id,
    p.name,
    p.phone,
    p.email,
    p.photo_url,
    p.tags,
    p.is_verified,
    p.is_blocked,
    p.created_at,
    'email',
    'high'
  FROM people p
  WHERE p.owner_id = v_owner_id
    AND p.is_active = true
    AND p.email IS NOT NULL
    AND p.email != ''
    AND LOWER(p.email) IN (
      SELECT LOWER(email) FROM people
      WHERE owner_id = v_owner_id
        AND email IS NOT NULL
        AND email != ''
        AND is_active = true
      GROUP BY LOWER(email)
      HAVING COUNT(*) > 1
    )
    AND p.id NOT IN (SELECT person_id FROM temp_duplicates);

  -- ============================================
  -- Match 3: Exact Aadhaar match (HIGH confidence)
  -- ============================================
  INSERT INTO temp_duplicates (group_id, person_id, person_name, phone, email, photo_url, tags, is_verified, is_blocked, created_at, match_type, match_confidence)
  SELECT
    (SELECT COALESCE(MAX(group_id), 0) FROM temp_duplicates) +
      dense_rank() OVER (ORDER BY p.aadhaar_number),
    p.id,
    p.name,
    p.phone,
    p.email,
    p.photo_url,
    p.tags,
    p.is_verified,
    p.is_blocked,
    p.created_at,
    'aadhaar',
    'high'
  FROM people p
  WHERE p.owner_id = v_owner_id
    AND p.is_active = true
    AND p.aadhaar_number IS NOT NULL
    AND p.aadhaar_number != ''
    AND p.aadhaar_number IN (
      SELECT aadhaar_number FROM people
      WHERE owner_id = v_owner_id
        AND aadhaar_number IS NOT NULL
        AND aadhaar_number != ''
        AND is_active = true
      GROUP BY aadhaar_number
      HAVING COUNT(*) > 1
    )
    AND p.id NOT IN (SELECT person_id FROM temp_duplicates);

  -- ============================================
  -- Match 4: Similar name (MEDIUM confidence)
  -- Uses trigram similarity for fuzzy matching
  -- ============================================
  -- Note: Requires pg_trgm extension
  -- Only match names with > 0.6 similarity that aren't already matched

  -- Return results with counts
  RETURN QUERY
  SELECT
    d.group_id,
    d.person_id,
    d.person_name,
    d.phone,
    d.email,
    d.photo_url,
    d.tags,
    d.is_verified,
    d.is_blocked,
    d.created_at,
    d.match_type,
    d.match_confidence,
    (SELECT COUNT(*) FROM tenants t WHERE t.person_id = d.person_id) as tenant_count,
    (SELECT COUNT(*) FROM staff_members s WHERE s.person_id = d.person_id) as staff_count,
    (SELECT COUNT(*) FROM visitor_contacts v WHERE v.person_id = d.person_id) as visitor_count
  FROM temp_duplicates d
  ORDER BY d.group_id, d.created_at;

END;
$$;

-- ============================================
-- Simpler function to get duplicate count
-- ============================================
CREATE OR REPLACE FUNCTION get_duplicate_count(
  p_owner_id UUID DEFAULT NULL
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_owner_id UUID;
  v_count INTEGER := 0;
BEGIN
  v_owner_id := COALESCE(p_owner_id, auth.uid());

  IF v_owner_id IS NULL THEN
    RETURN 0;
  END IF;

  -- Count phone duplicates
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT phone FROM people
    WHERE owner_id = v_owner_id
      AND phone IS NOT NULL
      AND phone != ''
      AND is_active = true
    GROUP BY phone
    HAVING COUNT(*) > 1
  ) phone_dups;

  -- Add email duplicates
  SELECT v_count + COUNT(*) INTO v_count
  FROM (
    SELECT LOWER(email) FROM people
    WHERE owner_id = v_owner_id
      AND email IS NOT NULL
      AND email != ''
      AND is_active = true
    GROUP BY LOWER(email)
    HAVING COUNT(*) > 1
  ) email_dups;

  -- Add Aadhaar duplicates
  SELECT v_count + COUNT(*) INTO v_count
  FROM (
    SELECT aadhaar_number FROM people
    WHERE owner_id = v_owner_id
      AND aadhaar_number IS NOT NULL
      AND aadhaar_number != ''
      AND is_active = true
    GROUP BY aadhaar_number
    HAVING COUNT(*) > 1
  ) aadhaar_dups;

  RETURN v_count;
END;
$$;

-- ============================================
-- View for quick duplicate summary
-- ============================================
CREATE OR REPLACE VIEW duplicate_people_summary AS
SELECT
  owner_id,
  'phone' as match_type,
  phone as match_value,
  COUNT(*) as duplicate_count,
  array_agg(id) as person_ids,
  array_agg(name) as person_names
FROM people
WHERE phone IS NOT NULL
  AND phone != ''
  AND is_active = true
GROUP BY owner_id, phone
HAVING COUNT(*) > 1

UNION ALL

SELECT
  owner_id,
  'email' as match_type,
  LOWER(email) as match_value,
  COUNT(*) as duplicate_count,
  array_agg(id) as person_ids,
  array_agg(name) as person_names
FROM people
WHERE email IS NOT NULL
  AND email != ''
  AND is_active = true
GROUP BY owner_id, LOWER(email)
HAVING COUNT(*) > 1

UNION ALL

SELECT
  owner_id,
  'aadhaar' as match_type,
  aadhaar_number as match_value,
  COUNT(*) as duplicate_count,
  array_agg(id) as person_ids,
  array_agg(name) as person_names
FROM people
WHERE aadhaar_number IS NOT NULL
  AND aadhaar_number != ''
  AND is_active = true
GROUP BY owner_id, aadhaar_number
HAVING COUNT(*) > 1;

-- Grant permissions
GRANT EXECUTE ON FUNCTION find_duplicate_people TO authenticated;
GRANT EXECUTE ON FUNCTION get_duplicate_count TO authenticated;
GRANT SELECT ON duplicate_people_summary TO authenticated;

-- Comments
COMMENT ON FUNCTION find_duplicate_people IS 'Finds potential duplicate person records based on phone, email, and Aadhaar matches';
COMMENT ON FUNCTION get_duplicate_count IS 'Returns count of duplicate groups for the current owner';
COMMENT ON VIEW duplicate_people_summary IS 'Summary view of duplicate people grouped by match type';
