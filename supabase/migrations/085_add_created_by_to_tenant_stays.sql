-- Migration 085: Add created_by to tables missed in migration 057
-- These tables receive created_by in workflow inserts but the column was never added.

ALTER TABLE tenant_stays     ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE tenant_documents ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE approvals        ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE payment_refunds  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
