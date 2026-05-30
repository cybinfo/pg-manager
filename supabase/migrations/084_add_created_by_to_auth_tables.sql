-- Migration 084: Add created_by to auth/identity tables
-- staff_members, user_contexts, user_roles, and invitations were missed in migration 057.
-- The application code uses withCreatedBy() on all inserts to these tables.

ALTER TABLE staff_members ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE user_contexts ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE user_roles    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE invitations   ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
