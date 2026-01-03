-- ============================================
-- Migration 033: Tenant Documents + Expanded Approval Types
-- ============================================
-- 1. Creates tenant_documents table for document management
-- 2. Adds new approval types for bills, payments, tenancy, room issues
-- 3. Adds document_ids column to approvals for attaching documents
-- ============================================

-- ============================================
-- Part 1: Expand Approval Types
-- ============================================

-- Drop existing constraint and add new one with expanded types
ALTER TABLE approvals
DROP CONSTRAINT IF EXISTS approvals_type_check;

ALTER TABLE approvals
ADD CONSTRAINT approvals_type_check
CHECK (type IN (
    -- Existing types
    'name_change', 'address_change', 'phone_change', 'email_change',
    'room_change', 'complaint', 'other',
    -- NEW types for expanded reporting
    'bill_dispute',      -- Tenant disputes a bill (wrong amount, duplicate, etc.)
    'payment_dispute',   -- Tenant disputes a payment record
    'tenancy_issue',     -- Issues with tenancy details (check-in date, rent, etc.)
    'room_issue'         -- Issues with room details (wrong room, amenities, etc.)
));

-- Add document_ids column to link supporting documents to approvals
ALTER TABLE approvals
ADD COLUMN IF NOT EXISTS document_ids UUID[] DEFAULT '{}';

-- Add index for efficient document lookups
CREATE INDEX IF NOT EXISTS idx_approvals_documents ON approvals USING GIN(document_ids);

-- ============================================
-- Part 2: Tenant Documents Table
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,

    -- Document info
    name TEXT NOT NULL,                -- User-provided name (e.g., "Aadhaar Card")
    document_type TEXT NOT NULL        -- Category
        CHECK (document_type IN ('id_proof', 'address_proof', 'income_proof', 'agreement', 'receipt', 'other')),
    description TEXT,                  -- Optional notes
    file_url TEXT NOT NULL,            -- Supabase Storage URL
    file_name TEXT NOT NULL,           -- Original filename
    file_size INTEGER,                 -- Size in bytes
    mime_type TEXT,                    -- MIME type (e.g., 'application/pdf')

    -- Approval workflow
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,

    -- Timestamps
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tenant_documents_tenant ON tenant_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_workspace ON tenant_documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_status ON tenant_documents(status);
CREATE INDEX IF NOT EXISTS idx_tenant_documents_type ON tenant_documents(document_type);

-- Updated_at trigger
CREATE TRIGGER update_tenant_documents_updated_at
    BEFORE UPDATE ON tenant_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Part 3: RLS Policies for tenant_documents
-- ============================================

ALTER TABLE tenant_documents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Tenants can view own documents" ON tenant_documents;
DROP POLICY IF EXISTS "Tenants can insert own documents" ON tenant_documents;
DROP POLICY IF EXISTS "Tenants can delete pending documents" ON tenant_documents;
DROP POLICY IF EXISTS "Owners can view all documents" ON tenant_documents;
DROP POLICY IF EXISTS "Owners can update documents" ON tenant_documents;
DROP POLICY IF EXISTS "Platform admins full access" ON tenant_documents;

-- Tenants can view their own documents
CREATE POLICY "Tenants can view own documents"
ON tenant_documents FOR SELECT
TO authenticated
USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
);

-- Tenants can insert their own documents
CREATE POLICY "Tenants can insert own documents"
ON tenant_documents FOR INSERT
TO authenticated
WITH CHECK (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
);

-- Tenants can delete ONLY pending (unapproved) documents
-- This is the key security feature - approved docs cannot be deleted
CREATE POLICY "Tenants can delete pending documents"
ON tenant_documents FOR DELETE
TO authenticated
USING (
    tenant_id IN (SELECT id FROM tenants WHERE user_id = auth.uid())
    AND status = 'pending'
);

-- Owners/staff can view all documents in their workspace
-- workspace_id comes from the property the tenant belongs to
CREATE POLICY "Owners can view all documents"
ON tenant_documents FOR SELECT
TO authenticated
USING (
    workspace_id IN (
        SELECT uc.workspace_id FROM user_contexts uc WHERE uc.user_id = auth.uid()
    )
);

-- Owners/staff can update document status (approve/reject)
CREATE POLICY "Owners can update documents"
ON tenant_documents FOR UPDATE
TO authenticated
USING (
    workspace_id IN (
        SELECT uc.workspace_id FROM user_contexts uc
        WHERE uc.user_id = auth.uid() AND uc.context_type IN ('owner', 'staff')
    )
)
WITH CHECK (
    workspace_id IN (
        SELECT uc.workspace_id FROM user_contexts uc
        WHERE uc.user_id = auth.uid() AND uc.context_type IN ('owner', 'staff')
    )
);

-- Platform admins have full access
CREATE POLICY "Platform admins full access"
ON tenant_documents FOR ALL
TO authenticated
USING (is_platform_admin(auth.uid()))
WITH CHECK (is_platform_admin(auth.uid()));

-- ============================================
-- Done
-- ============================================
