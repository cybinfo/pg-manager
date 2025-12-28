-- Create roles table for role-based access control
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_system_role BOOLEAN DEFAULT FALSE,
  permissions JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create staff_members table
CREATE TABLE IF NOT EXISTS staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_roles table for assigning roles to staff
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  staff_member_id UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_roles_owner_id ON roles(owner_id);
CREATE INDEX IF NOT EXISTS idx_roles_is_system_role ON roles(is_system_role);
CREATE INDEX IF NOT EXISTS idx_staff_members_owner_id ON staff_members(owner_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_email ON staff_members(email);
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id ON staff_members(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_owner_id ON user_roles(owner_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_staff_member_id ON user_roles(staff_member_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_property_id ON user_roles(property_id);

-- Enable Row Level Security
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for roles
CREATE POLICY "Users can view their own roles"
  ON roles FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create roles"
  ON roles FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own roles"
  ON roles FOR UPDATE
  USING (auth.uid() = owner_id AND is_system_role = FALSE);

CREATE POLICY "Users can delete their own custom roles"
  ON roles FOR DELETE
  USING (auth.uid() = owner_id AND is_system_role = FALSE);

-- RLS Policies for staff_members
CREATE POLICY "Users can view their own staff members"
  ON staff_members FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create staff members"
  ON staff_members FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own staff members"
  ON staff_members FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own staff members"
  ON staff_members FOR DELETE
  USING (auth.uid() = owner_id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own user roles"
  ON user_roles FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create user roles"
  ON user_roles FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own user roles"
  ON user_roles FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete their own user roles"
  ON user_roles FOR DELETE
  USING (auth.uid() = owner_id);

-- Note: System roles should be created per owner when they sign up
-- This can be done in the application code during onboarding
-- Example system roles to create:
-- 1. Super Admin - Full access to everything
-- 2. Admin - Full operational access, no settings
-- 3. Receptionist - Tenant check-in, visitors, basic queries
-- 4. Accountant - Payments, charges, reports
-- 5. Maintenance - Complaints, room status
-- 6. Meter Reader - Only meter readings

-- Function to create default roles for a new owner
CREATE OR REPLACE FUNCTION create_default_roles_for_owner(owner_uuid UUID)
RETURNS void AS $$
BEGIN
  -- Super Admin role (system role - cannot be modified)
  INSERT INTO roles (owner_id, name, description, is_system_role, permissions)
  VALUES (
    owner_uuid,
    'Super Admin',
    'Full access to all features and settings',
    TRUE,
    '["properties.view", "properties.create", "properties.edit", "properties.delete", "rooms.view", "rooms.create", "rooms.edit", "rooms.delete", "tenants.view", "tenants.create", "tenants.edit", "tenants.delete", "payments.view", "payments.create", "payments.edit", "payments.delete", "meter_readings.view", "meter_readings.create", "meter_readings.edit", "complaints.view", "complaints.create", "complaints.edit", "complaints.resolve", "notices.view", "notices.create", "notices.edit", "notices.delete", "visitors.view", "visitors.create", "reports.view", "reports.export", "exit_clearance.initiate", "exit_clearance.process", "exit_clearance.approve", "staff.view", "staff.create", "staff.edit", "staff.delete", "settings.view", "settings.edit"]'::jsonb
  );

  -- Admin role (system role)
  INSERT INTO roles (owner_id, name, description, is_system_role, permissions)
  VALUES (
    owner_uuid,
    'Admin',
    'Full operational access without settings management',
    TRUE,
    '["properties.view", "properties.create", "properties.edit", "rooms.view", "rooms.create", "rooms.edit", "tenants.view", "tenants.create", "tenants.edit", "payments.view", "payments.create", "payments.edit", "meter_readings.view", "meter_readings.create", "meter_readings.edit", "complaints.view", "complaints.create", "complaints.edit", "complaints.resolve", "notices.view", "notices.create", "notices.edit", "visitors.view", "visitors.create", "reports.view", "reports.export", "exit_clearance.initiate", "exit_clearance.process", "staff.view"]'::jsonb
  );

  -- Tenant role (system role - for tenant self-service portal)
  INSERT INTO roles (owner_id, name, description, is_system_role, permissions)
  VALUES (
    owner_uuid,
    'Tenant',
    'Self-service access for tenants',
    TRUE,
    '["complaints.view", "complaints.create", "notices.view", "payments.view"]'::jsonb
  );
END;
$$ LANGUAGE plpgsql;

-- Unique constraint to prevent duplicate staff emails per owner
ALTER TABLE staff_members ADD CONSTRAINT unique_staff_email_per_owner UNIQUE (owner_id, email);

-- Unique constraint to prevent duplicate role names per owner
ALTER TABLE roles ADD CONSTRAINT unique_role_name_per_owner UNIQUE (owner_id, name);
