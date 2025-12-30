-- Migration: Default Roles & Tenant Feature Toggles
-- Description: Add default staff roles and property-level tenant feature toggles

-- ============================================
-- 1. Add tenant_features column to properties
-- ============================================

ALTER TABLE properties ADD COLUMN IF NOT EXISTS tenant_features JSONB DEFAULT '{
  "view_bills": true,
  "view_payments": true,
  "submit_complaints": true,
  "view_notices": true,
  "request_visitors": false,
  "download_receipts": true,
  "update_profile": true
}'::jsonb;

COMMENT ON COLUMN properties.tenant_features IS 'Feature toggles for tenant portal access per property';

-- ============================================
-- 2. Update create_default_roles_for_owner function
-- ============================================

CREATE OR REPLACE FUNCTION create_default_roles_for_owner(owner_uuid UUID)
RETURNS void AS $$
BEGIN
  -- Manager role - Full operational access
  INSERT INTO roles (owner_id, name, description, is_system_role, permissions)
  VALUES (
    owner_uuid,
    'Manager',
    'Full operational access to manage the property',
    TRUE,
    '[
      "properties.view", "properties.edit",
      "rooms.view", "rooms.create", "rooms.edit", "rooms.delete",
      "tenants.view", "tenants.create", "tenants.edit", "tenants.delete",
      "payments.view", "payments.create", "payments.edit", "payments.delete",
      "bills.view", "bills.create", "bills.edit",
      "expenses.view", "expenses.create", "expenses.edit", "expenses.delete",
      "meter_readings.view", "meter_readings.create", "meter_readings.edit",
      "complaints.view", "complaints.create", "complaints.edit", "complaints.resolve",
      "notices.view", "notices.create", "notices.edit", "notices.delete",
      "visitors.view", "visitors.create", "visitors.edit",
      "reports.view", "reports.export",
      "exit_clearance.initiate", "exit_clearance.process", "exit_clearance.approve",
      "staff.view"
    ]'::jsonb
  )
  ON CONFLICT (owner_id, name) DO NOTHING;

  -- Accountant role - Financial operations
  INSERT INTO roles (owner_id, name, description, is_system_role, permissions)
  VALUES (
    owner_uuid,
    'Accountant',
    'Manage bills, payments, expenses and financial reports',
    TRUE,
    '[
      "properties.view",
      "rooms.view",
      "tenants.view",
      "payments.view", "payments.create", "payments.edit",
      "bills.view", "bills.create", "bills.edit",
      "expenses.view", "expenses.create", "expenses.edit", "expenses.delete",
      "reports.view", "reports.export"
    ]'::jsonb
  )
  ON CONFLICT (owner_id, name) DO NOTHING;

  -- Caretaker role - Day-to-day operations
  INSERT INTO roles (owner_id, name, description, is_system_role, permissions)
  VALUES (
    owner_uuid,
    'Caretaker',
    'Handle daily operations, tenants, complaints and meter readings',
    TRUE,
    '[
      "properties.view",
      "rooms.view", "rooms.edit",
      "tenants.view", "tenants.create", "tenants.edit",
      "meter_readings.view", "meter_readings.create", "meter_readings.edit",
      "complaints.view", "complaints.create", "complaints.edit", "complaints.resolve",
      "visitors.view", "visitors.create", "visitors.edit",
      "notices.view",
      "exit_clearance.initiate", "exit_clearance.process"
    ]'::jsonb
  )
  ON CONFLICT (owner_id, name) DO NOTHING;

  -- Receptionist role - Front desk duties
  INSERT INTO roles (owner_id, name, description, is_system_role, permissions)
  VALUES (
    owner_uuid,
    'Receptionist',
    'Manage visitors, handle inquiries and view tenant information',
    TRUE,
    '[
      "properties.view",
      "rooms.view",
      "tenants.view",
      "visitors.view", "visitors.create", "visitors.edit",
      "complaints.view", "complaints.create",
      "notices.view"
    ]'::jsonb
  )
  ON CONFLICT (owner_id, name) DO NOTHING;

  -- Note: "Custom" role is not created as a system role
  -- Users create custom roles themselves when they need specific permissions
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 3. Create default roles for existing owners
-- ============================================

DO $$
DECLARE
  owner_record RECORD;
BEGIN
  FOR owner_record IN SELECT id FROM owners LOOP
    PERFORM create_default_roles_for_owner(owner_record.id);
  END LOOP;
END $$;

-- ============================================
-- 4. Function to get tenant features for a property
-- ============================================

CREATE OR REPLACE FUNCTION get_tenant_features(property_uuid UUID)
RETURNS JSONB AS $$
DECLARE
  features JSONB;
BEGIN
  SELECT COALESCE(tenant_features, '{
    "view_bills": true,
    "view_payments": true,
    "submit_complaints": true,
    "view_notices": true,
    "request_visitors": false,
    "download_receipts": true,
    "update_profile": true
  }'::jsonb)
  INTO features
  FROM properties
  WHERE id = property_uuid;

  RETURN features;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 5. Update default tenant features on property creation
-- ============================================

CREATE OR REPLACE FUNCTION set_default_tenant_features()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.tenant_features IS NULL THEN
    NEW.tenant_features := '{
      "view_bills": true,
      "view_payments": true,
      "submit_complaints": true,
      "view_notices": true,
      "request_visitors": false,
      "download_receipts": true,
      "update_profile": true
    }'::jsonb;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_default_tenant_features ON properties;
CREATE TRIGGER trigger_set_default_tenant_features
  BEFORE INSERT ON properties
  FOR EACH ROW
  EXECUTE FUNCTION set_default_tenant_features();

-- ============================================
-- 6. Grant access to authenticated users for the function
-- ============================================

GRANT EXECUTE ON FUNCTION get_tenant_features(UUID) TO authenticated;
