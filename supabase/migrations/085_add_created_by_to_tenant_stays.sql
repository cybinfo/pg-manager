-- Migration 085: Add created_by to tenant_stays and tenant_documents
-- Both tables were missed in migration 057. The tenant creation workflow
-- inserts created_by on every record written to these tables.

ALTER TABLE tenant_stays     ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE tenant_documents ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
