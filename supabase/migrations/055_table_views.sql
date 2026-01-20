-- ============================================
-- Migration 055: Table Views
--
-- User-level table customization feature that allows users
-- to save and restore table configurations (sorting, filtering,
-- column visibility, grouping) as named views.
-- ============================================

-- ============================================
-- 1. Create table_views table
-- ============================================
CREATE TABLE IF NOT EXISTS table_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- View identification
    table_key TEXT NOT NULL,              -- e.g., "tenants", "payments", "bills"
    name TEXT NOT NULL,                   -- user-provided name
    description TEXT,                     -- optional description

    -- Default flag
    is_default BOOLEAN NOT NULL DEFAULT FALSE,  -- user's default view for this table

    -- Configuration stored as JSONB
    -- Structure: {
    --   sort?: { key: string; direction: "asc" | "desc" }
    --   filters?: Record<string, string>
    --   groupBy?: string[]
    --   pageSize?: number
    --   hiddenColumns?: string[]
    -- }
    config JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Usage tracking
    use_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. Create indexes
-- ============================================

-- Primary lookup: user's views for a specific table
CREATE INDEX IF NOT EXISTS idx_table_views_user_table
    ON table_views(user_id, table_key);

-- Ensure only one default view per user per table
CREATE UNIQUE INDEX IF NOT EXISTS idx_table_views_default
    ON table_views(user_id, table_key)
    WHERE is_default = TRUE;

-- Index for usage tracking queries
CREATE INDEX IF NOT EXISTS idx_table_views_last_used
    ON table_views(user_id, last_used_at DESC);

-- ============================================
-- 3. Enable RLS
-- ============================================
ALTER TABLE table_views ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS Policies - Users only access their own views
-- ============================================

-- Select policy
DROP POLICY IF EXISTS "table_views_select_own" ON table_views;
CREATE POLICY "table_views_select_own" ON table_views
    FOR SELECT USING (user_id = auth.uid());

-- Insert policy
DROP POLICY IF EXISTS "table_views_insert_own" ON table_views;
CREATE POLICY "table_views_insert_own" ON table_views
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Update policy
DROP POLICY IF EXISTS "table_views_update_own" ON table_views;
CREATE POLICY "table_views_update_own" ON table_views
    FOR UPDATE USING (user_id = auth.uid());

-- Delete policy
DROP POLICY IF EXISTS "table_views_delete_own" ON table_views;
CREATE POLICY "table_views_delete_own" ON table_views
    FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 5. Helper functions for atomic operations
-- ============================================

-- Function to set a view as default (clears any existing default first)
CREATE OR REPLACE FUNCTION set_default_table_view(p_view_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_table_key TEXT;
BEGIN
    -- Get the user_id and table_key of the view
    SELECT user_id, table_key INTO v_user_id, v_table_key
    FROM table_views
    WHERE id = p_view_id AND user_id = auth.uid();

    -- Return false if view not found or not owned by user
    IF v_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- Clear any existing default for this user/table
    UPDATE table_views
    SET is_default = FALSE, updated_at = NOW()
    WHERE user_id = v_user_id
      AND table_key = v_table_key
      AND is_default = TRUE
      AND id != p_view_id;

    -- Set the new default
    UPDATE table_views
    SET is_default = TRUE, updated_at = NOW()
    WHERE id = p_view_id;

    RETURN TRUE;
END;
$$;

-- Function to clear default view for a table
CREATE OR REPLACE FUNCTION clear_default_table_view(p_table_key TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE table_views
    SET is_default = FALSE, updated_at = NOW()
    WHERE user_id = auth.uid()
      AND table_key = p_table_key
      AND is_default = TRUE;

    RETURN TRUE;
END;
$$;

-- Function to record view usage
CREATE OR REPLACE FUNCTION record_table_view_usage(p_view_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE table_views
    SET use_count = use_count + 1,
        last_used_at = NOW()
    WHERE id = p_view_id AND user_id = auth.uid();

    RETURN FOUND;
END;
$$;

-- ============================================
-- 6. Trigger for updated_at
-- ============================================
CREATE OR REPLACE FUNCTION update_table_views_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_table_views_updated_at ON table_views;
CREATE TRIGGER trigger_table_views_updated_at
    BEFORE UPDATE ON table_views
    FOR EACH ROW
    EXECUTE FUNCTION update_table_views_updated_at();

-- ============================================
-- 7. Comments for documentation
-- ============================================
COMMENT ON TABLE table_views IS 'User-level saved table configurations including sorting, filtering, grouping, and column visibility';
COMMENT ON COLUMN table_views.table_key IS 'Identifier for the table/list page (e.g., "tenants", "payments", "bills")';
COMMENT ON COLUMN table_views.config IS 'JSONB containing sort, filters, groupBy, pageSize, and hiddenColumns settings';
COMMENT ON COLUMN table_views.is_default IS 'Whether this is the user''s default view for the table (only one per user/table)';
COMMENT ON COLUMN table_views.use_count IS 'Number of times this view has been applied';

-- ============================================
-- 8. Grant permissions
-- ============================================
GRANT SELECT, INSERT, UPDATE, DELETE ON table_views TO authenticated;
GRANT EXECUTE ON FUNCTION set_default_table_view(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION clear_default_table_view(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION record_table_view_usage(UUID) TO authenticated;

-- ============================================
-- 9. Log migration completion
-- ============================================
DO $$
BEGIN
    RAISE NOTICE 'Migration 055 completed: Created table_views table with RLS and helper functions';
END $$;
