-- ============================================
-- Migration: 012_unified_identity_system.sql
-- Description: Unified Identity & Context System
-- Enables: Multi-role login, context switching, staff portal
-- ============================================

-- ============================================
-- 1. WORKSPACES TABLE
-- Each PG owner account becomes a "workspace"
-- ============================================
CREATE TABLE IF NOT EXISTS workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  type TEXT DEFAULT 'pg_manager' CHECK (type IN ('pg_manager', 'shop_manager', 'rent_manager', 'society_manager')),
  logo_url TEXT,
  settings JSONB DEFAULT '{
    "timezone": "Asia/Kolkata",
    "currency": "INR",
    "date_format": "DD/MM/YYYY",
    "allow_staff_invite": true,
    "allow_tenant_portal": true
  }',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create workspace for each existing owner
INSERT INTO workspaces (owner_user_id, name, slug)
SELECT DISTINCT
  owner_id,
  COALESCE(
    (SELECT name FROM properties WHERE owner_id = t.owner_id LIMIT 1),
    'My PG Business'
  ),
  LOWER(REPLACE(
    COALESCE(
      (SELECT name FROM properties WHERE owner_id = t.owner_id LIMIT 1),
      'workspace-' || SUBSTRING(t.owner_id::TEXT, 1, 8)
    ),
    ' ', '-'
  )) || '-' || SUBSTRING(uuid_generate_v4()::TEXT, 1, 4)
FROM (
  SELECT owner_id FROM properties
  UNION SELECT owner_id FROM tenants
  UNION SELECT owner_id FROM staff_members
) t
ON CONFLICT DO NOTHING;

-- ============================================
-- 2. USER PROFILES TABLE
-- Central identity for each person
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  profile_photo TEXT,
  preferences JSONB DEFAULT '{
    "theme": "system",
    "language": "en",
    "default_context_id": null,
    "notifications": {
      "email": true,
      "sms": true,
      "push": true,
      "payment_reminders": true,
      "complaint_updates": true
    }
  }',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create profile for each existing auth user
INSERT INTO user_profiles (user_id, name, email)
SELECT
  id,
  COALESCE(raw_user_meta_data->>'name', email),
  email
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================
-- 3. USER CONTEXTS TABLE
-- Links users to workspaces with specific roles
-- ============================================
CREATE TABLE IF NOT EXISTS user_contexts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  workspace_id UUID REFERENCES workspaces NOT NULL,
  context_type TEXT NOT NULL CHECK (context_type IN ('owner', 'staff', 'tenant')),

  -- Role & Entity linking
  role_id UUID REFERENCES roles,
  entity_id UUID, -- staff_members.id or tenants.id

  -- Access control
  is_active BOOLEAN DEFAULT TRUE,
  is_default BOOLEAN DEFAULT FALSE,

  -- Invitation tracking
  invited_by UUID REFERENCES auth.users,
  invited_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,

  -- Usage tracking
  last_accessed_at TIMESTAMPTZ,
  access_count INTEGER DEFAULT 0,

  -- Metadata for extensibility
  metadata JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Each user can only have one context of each type per workspace
  UNIQUE(user_id, workspace_id, context_type)
);

-- Create owner contexts for existing owners
INSERT INTO user_contexts (user_id, workspace_id, context_type, is_active, is_default, accepted_at)
SELECT
  w.owner_user_id,
  w.id,
  'owner',
  TRUE,
  TRUE,
  NOW()
FROM workspaces w
ON CONFLICT DO NOTHING;

-- Create staff contexts for staff with user_id
INSERT INTO user_contexts (user_id, workspace_id, context_type, role_id, entity_id, is_active, accepted_at)
SELECT
  sm.user_id,
  w.id,
  'staff',
  (SELECT role_id FROM user_roles WHERE staff_member_id = sm.id LIMIT 1),
  sm.id,
  sm.is_active,
  NOW()
FROM staff_members sm
JOIN workspaces w ON w.owner_user_id = sm.owner_id
WHERE sm.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Create tenant contexts for tenants with user_id
INSERT INTO user_contexts (user_id, workspace_id, context_type, entity_id, is_active, accepted_at)
SELECT
  t.user_id,
  w.id,
  'tenant',
  t.id,
  t.status = 'active',
  NOW()
FROM tenants t
JOIN workspaces w ON w.owner_user_id = t.owner_id
WHERE t.user_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. INVITATIONS TABLE
-- For inviting users who haven't registered yet
-- ============================================
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID REFERENCES workspaces NOT NULL,
  invited_by UUID REFERENCES auth.users NOT NULL,

  -- Invitee identification (at least one required)
  email TEXT,
  phone TEXT,
  name TEXT,

  -- Context to create on acceptance
  context_type TEXT NOT NULL CHECK (context_type IN ('staff', 'tenant')),
  role_id UUID REFERENCES roles,
  entity_id UUID, -- Link to staff_members or tenants

  -- Invitation management
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  message TEXT, -- Optional personal message

  -- Expiry and tracking
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  sent_at TIMESTAMPTZ,
  sent_via TEXT[], -- ['email', 'sms', 'whatsapp']
  reminder_sent_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  accepted_by UUID REFERENCES auth.users,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- ============================================
-- 5. CONTEXT SWITCHES LOG (BI & Audit)
-- ============================================
CREATE TABLE IF NOT EXISTS context_switches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  from_context_id UUID REFERENCES user_contexts,
  to_context_id UUID REFERENCES user_contexts NOT NULL,
  switched_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  session_id TEXT
);

-- ============================================
-- 6. PERMISSION AUDIT LOG
-- ============================================
CREATE TABLE IF NOT EXISTS permission_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  context_id UUID REFERENCES user_contexts NOT NULL,
  permission TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  action TEXT NOT NULL CHECK (action IN ('granted', 'denied', 'used')),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. INDEXES FOR PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_workspaces_owner ON workspaces(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_user_contexts_user ON user_contexts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_contexts_workspace ON user_contexts(workspace_id);
CREATE INDEX IF NOT EXISTS idx_user_contexts_active ON user_contexts(user_id, is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_invitations_phone ON invitations(phone) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_context_switches_user ON context_switches(user_id);
CREATE INDEX IF NOT EXISTS idx_permission_audit_user ON permission_audit_log(user_id, created_at);

-- ============================================
-- 8. RLS POLICIES
-- ============================================
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_contexts ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE context_switches ENABLE ROW LEVEL SECURITY;
ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

-- Workspaces: Owner can manage, members can view
CREATE POLICY "workspace_owner_all" ON workspaces FOR ALL
  USING (owner_user_id = auth.uid());

CREATE POLICY "workspace_member_view" ON workspaces FOR SELECT
  USING (id IN (SELECT workspace_id FROM user_contexts WHERE user_id = auth.uid() AND is_active = TRUE));

-- User Profiles: Users can manage their own
CREATE POLICY "profile_own" ON user_profiles FOR ALL
  USING (user_id = auth.uid());

-- User Contexts: Users can view their own, owners can manage workspace contexts
CREATE POLICY "context_own_view" ON user_contexts FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "context_owner_manage" ON user_contexts FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_user_id = auth.uid()));

-- Invitations: Owners can manage, invitees can view their own
CREATE POLICY "invitation_owner_manage" ON invitations FOR ALL
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_user_id = auth.uid()));

CREATE POLICY "invitation_invitee_view" ON invitations FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid()) OR
    phone = (SELECT phone FROM auth.users WHERE id = auth.uid())
  );

-- Context Switches: Users can view their own
CREATE POLICY "context_switch_own" ON context_switches FOR ALL
  USING (user_id = auth.uid());

-- Permission Audit: Users can view their own, owners can view workspace
CREATE POLICY "audit_own_view" ON permission_audit_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "audit_owner_view" ON permission_audit_log FOR SELECT
  USING (context_id IN (
    SELECT uc.id FROM user_contexts uc
    JOIN workspaces w ON w.id = uc.workspace_id
    WHERE w.owner_user_id = auth.uid()
  ));

-- ============================================
-- 9. HELPER FUNCTIONS
-- ============================================

-- Get user's active contexts
CREATE OR REPLACE FUNCTION get_user_contexts(p_user_id UUID)
RETURNS TABLE (
  context_id UUID,
  workspace_id UUID,
  workspace_name TEXT,
  workspace_logo TEXT,
  context_type TEXT,
  role_name TEXT,
  permissions JSONB,
  is_default BOOLEAN,
  last_accessed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    uc.id as context_id,
    uc.workspace_id,
    w.name as workspace_name,
    w.logo_url as workspace_logo,
    uc.context_type,
    r.name as role_name,
    COALESCE(r.permissions, '[]'::JSONB) as permissions,
    uc.is_default,
    uc.last_accessed_at
  FROM user_contexts uc
  JOIN workspaces w ON w.id = uc.workspace_id
  LEFT JOIN roles r ON r.id = uc.role_id
  WHERE uc.user_id = p_user_id
    AND uc.is_active = TRUE
    AND w.is_active = TRUE
  ORDER BY uc.is_default DESC, uc.last_accessed_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Switch context (updates last_accessed and logs)
CREATE OR REPLACE FUNCTION switch_context(
  p_user_id UUID,
  p_to_context_id UUID,
  p_from_context_id UUID DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  v_context_exists BOOLEAN;
BEGIN
  -- Verify context belongs to user and is active
  SELECT EXISTS(
    SELECT 1 FROM user_contexts
    WHERE id = p_to_context_id
      AND user_id = p_user_id
      AND is_active = TRUE
  ) INTO v_context_exists;

  IF NOT v_context_exists THEN
    RETURN FALSE;
  END IF;

  -- Update last_accessed and increment count
  UPDATE user_contexts
  SET last_accessed_at = NOW(),
      access_count = access_count + 1,
      updated_at = NOW()
  WHERE id = p_to_context_id;

  -- Log the switch
  INSERT INTO context_switches (user_id, from_context_id, to_context_id, ip_address, user_agent)
  VALUES (p_user_id, p_from_context_id, p_to_context_id, p_ip_address, p_user_agent);

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set default context
CREATE OR REPLACE FUNCTION set_default_context(p_user_id UUID, p_context_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Remove default from all user's contexts
  UPDATE user_contexts SET is_default = FALSE WHERE user_id = p_user_id;

  -- Set new default
  UPDATE user_contexts SET is_default = TRUE
  WHERE id = p_context_id AND user_id = p_user_id AND is_active = TRUE;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Accept invitation
CREATE OR REPLACE FUNCTION accept_invitation(p_token TEXT, p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_invitation invitations%ROWTYPE;
  v_context_id UUID;
BEGIN
  -- Get and validate invitation
  SELECT * INTO v_invitation
  FROM invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW();

  IF v_invitation.id IS NULL THEN
    RAISE EXCEPTION 'Invalid or expired invitation';
  END IF;

  -- Create the context
  INSERT INTO user_contexts (
    user_id, workspace_id, context_type, role_id, entity_id,
    is_active, invited_by, invited_at, accepted_at
  )
  VALUES (
    p_user_id, v_invitation.workspace_id, v_invitation.context_type,
    v_invitation.role_id, v_invitation.entity_id,
    TRUE, v_invitation.invited_by, v_invitation.created_at, NOW()
  )
  RETURNING id INTO v_context_id;

  -- Update invitation status
  UPDATE invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      accepted_by = p_user_id,
      updated_at = NOW()
  WHERE id = v_invitation.id;

  -- Link user_id to entity if applicable
  IF v_invitation.context_type = 'staff' AND v_invitation.entity_id IS NOT NULL THEN
    UPDATE staff_members SET user_id = p_user_id WHERE id = v_invitation.entity_id;
  ELSIF v_invitation.context_type = 'tenant' AND v_invitation.entity_id IS NOT NULL THEN
    UPDATE tenants SET user_id = p_user_id WHERE id = v_invitation.entity_id;
  END IF;

  RETURN v_context_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check permission for current context
CREATE OR REPLACE FUNCTION has_permission(p_context_id UUID, p_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_context user_contexts%ROWTYPE;
  v_permissions JSONB;
BEGIN
  SELECT * INTO v_context FROM user_contexts WHERE id = p_context_id;

  IF v_context.id IS NULL OR NOT v_context.is_active THEN
    RETURN FALSE;
  END IF;

  -- Owners have all permissions
  IF v_context.context_type = 'owner' THEN
    RETURN TRUE;
  END IF;

  -- Tenants have limited fixed permissions
  IF v_context.context_type = 'tenant' THEN
    RETURN p_permission IN (
      'profile.view', 'profile.edit',
      'payments.view',
      'complaints.view', 'complaints.create',
      'notices.view'
    );
  END IF;

  -- Staff check role permissions
  IF v_context.context_type = 'staff' AND v_context.role_id IS NOT NULL THEN
    SELECT permissions INTO v_permissions FROM roles WHERE id = v_context.role_id;
    RETURN v_permissions ? p_permission;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Find existing user by email or phone
CREATE OR REPLACE FUNCTION find_user_by_identity(p_email TEXT DEFAULT NULL, p_phone TEXT DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  has_contexts BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    up.user_id,
    up.name,
    up.email,
    up.phone,
    EXISTS(SELECT 1 FROM user_contexts WHERE user_contexts.user_id = up.user_id) as has_contexts
  FROM user_profiles up
  WHERE (p_email IS NOT NULL AND up.email = p_email)
     OR (p_phone IS NOT NULL AND up.phone = p_phone);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-detect duplicate identities
CREATE OR REPLACE FUNCTION detect_identity_conflicts(p_email TEXT DEFAULT NULL, p_phone TEXT DEFAULT NULL)
RETURNS TABLE (
  source_type TEXT,
  source_id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  has_user_id BOOLEAN,
  workspace_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  -- Check staff_members
  SELECT
    'staff'::TEXT as source_type,
    sm.id as source_id,
    sm.name,
    sm.email,
    sm.phone,
    sm.user_id IS NOT NULL as has_user_id,
    w.name as workspace_name
  FROM staff_members sm
  JOIN workspaces w ON w.owner_user_id = sm.owner_id
  WHERE (p_email IS NOT NULL AND sm.email = p_email)
     OR (p_phone IS NOT NULL AND sm.phone = p_phone)

  UNION ALL

  -- Check tenants
  SELECT
    'tenant'::TEXT,
    t.id,
    t.name,
    t.email,
    t.phone,
    t.user_id IS NOT NULL,
    w.name
  FROM tenants t
  JOIN workspaces w ON w.owner_user_id = t.owner_id
  WHERE (p_email IS NOT NULL AND t.email = p_email)
     OR (p_phone IS NOT NULL AND t.phone = p_phone)

  UNION ALL

  -- Check pending invitations
  SELECT
    'invitation'::TEXT,
    i.id,
    i.name,
    i.email,
    i.phone,
    FALSE,
    w.name
  FROM invitations i
  JOIN workspaces w ON w.id = i.workspace_id
  WHERE i.status = 'pending'
    AND ((p_email IS NOT NULL AND i.email = p_email)
     OR (p_phone IS NOT NULL AND i.phone = p_phone));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 10. TRIGGERS
-- ============================================

-- Auto-create workspace when owner registers
CREATE OR REPLACE FUNCTION create_workspace_for_owner()
RETURNS TRIGGER AS $$
BEGIN
  -- Only for users with role = 'owner' in metadata
  IF NEW.raw_user_meta_data->>'role' = 'owner' THEN
    INSERT INTO workspaces (owner_user_id, name, slug)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', 'My PG Business'),
      LOWER(REPLACE(COALESCE(NEW.raw_user_meta_data->>'name', 'workspace'), ' ', '-'))
        || '-' || SUBSTRING(NEW.id::TEXT, 1, 8)
    );

    -- Create owner context
    INSERT INTO user_contexts (user_id, workspace_id, context_type, is_active, is_default, accepted_at)
    SELECT NEW.id, id, 'owner', TRUE, TRUE, NOW()
    FROM workspaces WHERE owner_user_id = NEW.id;
  END IF;

  -- Always create user profile
  INSERT INTO user_profiles (user_id, name, email, phone)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    NEW.phone
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if trigger exists, create if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_workspace'
  ) THEN
    CREATE TRIGGER on_auth_user_created_workspace
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION create_workspace_for_owner();
  END IF;
END
$$;

-- Auto-check pending invitations on user registration
CREATE OR REPLACE FUNCTION process_pending_invitations()
RETURNS TRIGGER AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Find and process any pending invitations for this user
  FOR v_invitation IN
    SELECT * FROM invitations
    WHERE status = 'pending'
      AND expires_at > NOW()
      AND (email = NEW.email OR phone = NEW.phone)
  LOOP
    PERFORM accept_invitation(v_invitation.token, NEW.id);
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'on_auth_user_created_invitations'
  ) THEN
    CREATE TRIGGER on_auth_user_created_invitations
      AFTER INSERT ON auth.users
      FOR EACH ROW EXECUTE FUNCTION process_pending_invitations();
  END IF;
END
$$;

-- Update workspace when contexts change
CREATE OR REPLACE FUNCTION update_workspace_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE workspaces SET updated_at = NOW() WHERE id = NEW.workspace_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER context_update_workspace
  AFTER INSERT OR UPDATE ON user_contexts
  FOR EACH ROW EXECUTE FUNCTION update_workspace_timestamp();

-- ============================================
-- 11. ANALYTICS VIEWS
-- ============================================

-- Context usage analytics
CREATE OR REPLACE VIEW context_analytics AS
SELECT
  uc.workspace_id,
  w.name as workspace_name,
  uc.context_type,
  COUNT(DISTINCT uc.user_id) as user_count,
  COUNT(DISTINCT CASE WHEN uc.last_accessed_at > NOW() - INTERVAL '7 days' THEN uc.user_id END) as active_last_7_days,
  COUNT(DISTINCT CASE WHEN uc.last_accessed_at > NOW() - INTERVAL '30 days' THEN uc.user_id END) as active_last_30_days,
  AVG(uc.access_count) as avg_access_count,
  MAX(uc.last_accessed_at) as last_activity
FROM user_contexts uc
JOIN workspaces w ON w.id = uc.workspace_id
WHERE uc.is_active = TRUE
GROUP BY uc.workspace_id, w.name, uc.context_type;

-- Permission usage analytics
CREATE OR REPLACE VIEW permission_usage_analytics AS
SELECT
  uc.workspace_id,
  pal.permission,
  pal.action,
  COUNT(*) as usage_count,
  COUNT(DISTINCT pal.user_id) as unique_users,
  MAX(pal.created_at) as last_used
FROM permission_audit_log pal
JOIN user_contexts uc ON uc.id = pal.context_id
WHERE pal.created_at > NOW() - INTERVAL '30 days'
GROUP BY uc.workspace_id, pal.permission, pal.action;

COMMENT ON TABLE workspaces IS 'Each PG owner account is a workspace. Supports multi-tenant architecture.';
COMMENT ON TABLE user_profiles IS 'Central identity for each person. One profile per auth user.';
COMMENT ON TABLE user_contexts IS 'Links users to workspaces with specific roles. Enables multi-role support.';
COMMENT ON TABLE invitations IS 'Pending invitations for users who have not registered yet.';
COMMENT ON TABLE context_switches IS 'Audit log of context switches for BI and security.';
COMMENT ON TABLE permission_audit_log IS 'Tracks permission checks for analytics and debugging.';
