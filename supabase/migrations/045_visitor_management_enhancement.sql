-- Migration 045: Visitor Management System Enhancement
-- Transform visitor tracking into a comprehensive visitor management application
-- Support: tenant visitors, enquiries, service providers, and general visitors

-- ============================================
-- 1. Create visitor_type enum
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'visitor_type') THEN
    CREATE TYPE visitor_type AS ENUM (
      'tenant_visitor',    -- Visiting existing tenant (current functionality)
      'enquiry',           -- Prospective tenant viewing the PG
      'service_provider',  -- Plumbers, electricians, delivery, etc.
      'general'            -- Any other visitor
    );
  END IF;
END$$;

-- ============================================
-- 2. Add visitor_type column with default
-- ============================================
ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS visitor_type visitor_type NOT NULL DEFAULT 'tenant_visitor';

-- ============================================
-- 3. Make tenant_id nullable (only required for tenant_visitor type)
-- ============================================
ALTER TABLE visitors
  ALTER COLUMN tenant_id DROP NOT NULL;

-- ============================================
-- 4. Add new columns for enhanced visitor management
-- ============================================

-- Service provider fields
ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS company_name TEXT,
  ADD COLUMN IF NOT EXISTS service_type TEXT;

-- Enquiry tracking fields
ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS enquiry_status TEXT,
  ADD COLUMN IF NOT EXISTS enquiry_source TEXT,
  ADD COLUMN IF NOT EXISTS rooms_interested TEXT[],
  ADD COLUMN IF NOT EXISTS follow_up_date DATE,
  ADD COLUMN IF NOT EXISTS converted_tenant_id UUID REFERENCES tenants(id);

-- General visitor fields
ALTER TABLE visitors
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS id_type TEXT,
  ADD COLUMN IF NOT EXISTS id_number TEXT,
  ADD COLUMN IF NOT EXISTS vehicle_number TEXT,
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS badge_number TEXT,
  ADD COLUMN IF NOT EXISTS host_name TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT;

-- ============================================
-- 5. Add check constraint for tenant_visitor type
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visitor_tenant_required'
  ) THEN
    ALTER TABLE visitors ADD CONSTRAINT visitor_tenant_required
      CHECK (visitor_type != 'tenant_visitor' OR tenant_id IS NOT NULL);
  END IF;
END$$;

-- ============================================
-- 6. Add check constraint for enquiry_status values
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'visitor_enquiry_status_check'
  ) THEN
    ALTER TABLE visitors ADD CONSTRAINT visitor_enquiry_status_check
      CHECK (enquiry_status IS NULL OR enquiry_status IN ('pending', 'follow_up', 'converted', 'lost'));
  END IF;
END$$;

-- ============================================
-- 7. Create indexes for efficient querying
-- ============================================
CREATE INDEX IF NOT EXISTS idx_visitors_visitor_type ON visitors(visitor_type);
CREATE INDEX IF NOT EXISTS idx_visitors_enquiry_status ON visitors(enquiry_status) WHERE visitor_type = 'enquiry';
CREATE INDEX IF NOT EXISTS idx_visitors_service_type ON visitors(service_type) WHERE visitor_type = 'service_provider';
CREATE INDEX IF NOT EXISTS idx_visitors_follow_up_date ON visitors(follow_up_date) WHERE follow_up_date IS NOT NULL;

-- ============================================
-- 8. Add comment for documentation
-- ============================================
COMMENT ON TABLE visitors IS 'Comprehensive visitor management supporting tenant visitors, enquiries, service providers, and general visitors';
COMMENT ON COLUMN visitors.visitor_type IS 'Type of visitor: tenant_visitor, enquiry, service_provider, or general';
COMMENT ON COLUMN visitors.enquiry_status IS 'For enquiries: pending, follow_up, converted, or lost';
COMMENT ON COLUMN visitors.converted_tenant_id IS 'Reference to tenant record if enquiry was converted';
