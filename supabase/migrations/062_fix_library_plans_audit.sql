-- ============================================================================
-- Migration: 062_fix_missing_audit_columns.sql
-- Description: Add missing audit columns to multiple tables
-- Author: Claude
-- Date: 2026-02-01
-- ============================================================================

-- ============================================================================
-- 1. LIBRARY_PLANS - Missing audit columns
-- ============================================================================
ALTER TABLE library_plans
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_library_plans_active ON library_plans(workspace_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. STAFF_MEMBERS - Missing deleted_at columns
-- ============================================================================
ALTER TABLE staff_members
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_staff_members_active ON staff_members(owner_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- 3. APPROVALS - Missing deleted_at columns
-- ============================================================================
ALTER TABLE approvals
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_approvals_active ON approvals(workspace_id) WHERE deleted_at IS NULL;
