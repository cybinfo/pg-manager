-- Migration 076: Business Module Config
--
-- Adds per-workspace module configuration to support the multi-module, multi-business
-- architecture where each business (workspace) independently enables modules and features.
--
-- Also adds business_type to workspaces and migrates the old workspace type enum values.

-- 1. Add module_config JSONB column to workspaces
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS module_config JSONB NOT NULL DEFAULT '{}';

-- 2. Add business_type TEXT column
--    Values: pg | hostel | gym | library | school | hospital | hotel | coworking | other
ALTER TABLE workspaces
  ADD COLUMN IF NOT EXISTS business_type TEXT NOT NULL DEFAULT 'other'
  CHECK (business_type IN ('pg', 'hostel', 'gym', 'library', 'school', 'hospital', 'hotel', 'coworking', 'other'));

-- 3. Migrate existing workspace type values to business_type
UPDATE workspaces SET business_type = CASE
  WHEN type = 'pg_manager'        THEN 'pg'
  WHEN type = 'rent_manager'      THEN 'hostel'
  WHEN type = 'shop_manager'      THEN 'other'
  WHEN type = 'society_manager'   THEN 'other'
  ELSE 'other'
END;

-- 4. Backfill module_config from owner_config.feature_flags for existing workspaces
--    Maps old flat feature flags -> new nested module config.
--    All features default OFF; only the module-level enabled flag is set from old data.
UPDATE workspaces w
SET module_config = (
  SELECT
    jsonb_strip_nulls(
      jsonb_build_object(
        'expenses',     CASE WHEN (oc.feature_flags->>'expenses')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END,
        'exitClearance',CASE WHEN (oc.feature_flags->>'exitClearance')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END,
        'visitors',     CASE WHEN (oc.feature_flags->>'visitors')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END,
        'complaints',   CASE WHEN (oc.feature_flags->>'complaints')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END,
        'notices',      CASE WHEN (oc.feature_flags->>'notices')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END,
        'reports',      CASE WHEN (oc.feature_flags->>'reports')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END,
        'activityLog',  CASE WHEN (oc.feature_flags->>'activityLog')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END,
        'approvals',    CASE WHEN (oc.feature_flags->>'approvals')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END,
        'meters',       CASE WHEN (oc.feature_flags->>'meterReadings')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END,
        'properties',   '{"enabled":true,"features":{}}'::jsonb,
        'rooms',        '{"enabled":true,"features":{}}'::jsonb,
        'tenants',      '{"enabled":true,"features":{}}'::jsonb,
        'billing',      '{"enabled":true,"features":{}}'::jsonb,
        'payments',     '{"enabled":true,"features":{}}'::jsonb,
        'refunds',      '{"enabled":true,"features":{}}'::jsonb,
        'staff',        '{"enabled":true,"features":{}}'::jsonb,
        'people',       '{"enabled":true,"features":{}}'::jsonb,
        'inquiries',    '{"enabled":true,"features":{}}'::jsonb,
        -- Library modules: enabled if old 'library' flag was true
        'members',      CASE WHEN (oc.feature_flags->>'library')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END,
        'sections',     CASE WHEN (oc.feature_flags->>'library')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END,
        'seats',        CASE WHEN (oc.feature_flags->>'library')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END,
        'attendance',   CASE WHEN (oc.feature_flags->>'library')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END,
        'lockers',      CASE WHEN (oc.feature_flags->>'library')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END,
        'waitlist',     CASE WHEN (oc.feature_flags->>'library')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END,
        'subscriptions',CASE WHEN (oc.feature_flags->>'library')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END,
        'plans',        CASE WHEN (oc.feature_flags->>'library')::boolean IS TRUE
                             THEN '{"enabled":true,"features":{}}'::jsonb ELSE NULL END
      )
    )
  FROM owner_config oc
  WHERE oc.owner_id = w.owner_user_id
  LIMIT 1
)
WHERE EXISTS (
  SELECT 1 FROM owner_config oc WHERE oc.owner_id = w.owner_user_id
);

-- 5. For workspaces with no owner_config row, set sensible defaults
--    (core modules enabled, optional modules disabled)
UPDATE workspaces
SET module_config = '{
  "properties":   {"enabled":true,"features":{}},
  "rooms":        {"enabled":true,"features":{}},
  "tenants":      {"enabled":true,"features":{}},
  "billing":      {"enabled":true,"features":{}},
  "payments":     {"enabled":true,"features":{}},
  "refunds":      {"enabled":true,"features":{}},
  "staff":        {"enabled":true,"features":{}},
  "people":       {"enabled":true,"features":{}},
  "inquiries":    {"enabled":true,"features":{}},
  "complaints":   {"enabled":true,"features":{}},
  "notices":      {"enabled":true,"features":{}},
  "reports":      {"enabled":true,"features":{}},
  "activityLog":  {"enabled":true,"features":{}},
  "approvals":    {"enabled":true,"features":{}},
  "exitClearance":{"enabled":true,"features":{}},
  "visitors":     {"enabled":true,"features":{}},
  "expenses":     {"enabled":true,"features":{}},
  "meters":       {"enabled":true,"features":{}}
}'::jsonb
WHERE module_config = '{}'::jsonb;

-- 6. Index for fast module_config lookups
CREATE INDEX IF NOT EXISTS idx_workspaces_module_config ON workspaces USING GIN (module_config);
