-- =============================================================
-- Migration 087: Business Hierarchy Architecture
-- Three-layer model: Workspace → Business → Location → Operation
-- Solves address/legal data fragmentation across modules.
-- =============================================================

-- ── businesses ────────────────────────────────────────────────
CREATE TABLE businesses (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id            UUID NOT NULL REFERENCES auth.users(id),

  -- Identity
  name                TEXT NOT NULL,
  legal_name          TEXT,
  slug                TEXT UNIQUE,
  description         TEXT,
  logo_url            TEXT,
  cover_url           TEXT,

  -- Legal / Tax (India-first)
  gst_number          TEXT,
  pan_number          TEXT,
  registration_number TEXT,
  business_type       TEXT, -- proprietorship | partnership | pvt_ltd | llp | trust

  -- Contact
  phone               TEXT,
  email               TEXT,
  website             TEXT,

  -- Meta
  is_active           BOOLEAN NOT NULL DEFAULT true,
  tags                TEXT[] DEFAULT '{}',

  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID REFERENCES auth.users(id),
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID REFERENCES auth.users(id)
);

-- ── locations ─────────────────────────────────────────────────
CREATE TABLE locations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id         UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  workspace_id        UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  owner_id            UUID NOT NULL REFERENCES auth.users(id),

  -- Identity
  name                TEXT NOT NULL,
  description         TEXT,

  -- Address (canonical physical address)
  address             TEXT,
  city                TEXT,
  state               TEXT,
  pincode             TEXT,
  country             TEXT NOT NULL DEFAULT 'India',
  latitude            DECIMAL(10, 8),
  longitude           DECIMAL(11, 8),

  -- Contact (overrides business-level when set)
  phone               TEXT,
  email               TEXT,

  -- Operating schedule
  opening_time        TIME,
  closing_time        TIME,
  operating_days      TEXT[], -- ['mon','tue','wed','thu','fri','sat']

  -- Meta
  is_active           BOOLEAN NOT NULL DEFAULT true,
  is_primary          BOOLEAN NOT NULL DEFAULT false, -- marks head-office / main branch

  -- Audit
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by          UUID REFERENCES auth.users(id),
  deleted_at          TIMESTAMPTZ,
  deleted_by          UUID REFERENCES auth.users(id)
);

-- ── FK additions to existing operation tables ─────────────────
-- Nullable initially to allow non-breaking migration of existing data.
-- Goal: make NOT NULL after all records are back-filled via migration script.
ALTER TABLE properties
  ADD COLUMN location_id UUID REFERENCES locations(id);

ALTER TABLE libraries
  ADD COLUMN location_id UUID REFERENCES locations(id);

-- ── Performance indexes ───────────────────────────────────────
CREATE INDEX idx_businesses_workspace_id ON businesses(workspace_id);
CREATE INDEX idx_businesses_owner_id     ON businesses(owner_id);
CREATE INDEX idx_businesses_slug         ON businesses(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_businesses_active       ON businesses(is_active) WHERE deleted_at IS NULL;

CREATE INDEX idx_locations_business_id  ON locations(business_id);
CREATE INDEX idx_locations_workspace_id ON locations(workspace_id);
CREATE INDEX idx_locations_owner_id     ON locations(owner_id);
CREATE INDEX idx_locations_active       ON locations(is_active) WHERE deleted_at IS NULL;

CREATE INDEX idx_properties_location_id ON properties(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX idx_libraries_location_id  ON libraries(location_id)  WHERE location_id IS NOT NULL;

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners_manage_businesses"
  ON businesses FOR ALL
  USING  (owner_id = auth.uid() OR is_platform_admin(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR is_platform_admin(auth.uid()));

CREATE POLICY "owners_manage_locations"
  ON locations FOR ALL
  USING  (owner_id = auth.uid() OR is_platform_admin(auth.uid()))
  WITH CHECK (owner_id = auth.uid() OR is_platform_admin(auth.uid()));

-- ── Universal audit triggers ──────────────────────────────────
CREATE TRIGGER audit_businesses
  AFTER INSERT OR UPDATE OR DELETE ON businesses
  FOR EACH ROW EXECUTE FUNCTION universal_audit_trigger();

CREATE TRIGGER audit_locations
  AFTER INSERT OR UPDATE OR DELETE ON locations
  FOR EACH ROW EXECUTE FUNCTION universal_audit_trigger();
