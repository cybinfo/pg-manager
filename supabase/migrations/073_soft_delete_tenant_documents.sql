-- Migration 073: Add soft delete support to tenant_documents
-- tenant_documents holds user-uploaded files — must follow E4 (90-day retention, never hard delete)

ALTER TABLE tenant_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE tenant_documents ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_tenant_documents_deleted ON tenant_documents(deleted_at) WHERE deleted_at IS NULL;
