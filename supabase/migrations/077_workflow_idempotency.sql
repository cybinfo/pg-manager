-- Migration 077: Workflow idempotency table and RPCs
--
-- The workflow engine (src/lib/services/workflow.engine.ts) calls two RPCs:
--   check_idempotency_key   — before executing a workflow
--   store_idempotency_result — after successful execution
--
-- Without this migration those RPC calls silently return an error and the engine
-- falls back to no idempotency protection, meaning duplicate form submissions or
-- retries can execute a workflow twice. This migration makes idempotency actually work.

-- ─── Table ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS workflow_idempotency (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  idempotency_key  TEXT        NOT NULL,
  workflow_name    TEXT        NOT NULL,
  actor_id         TEXT        NOT NULL,
  workspace_id     UUID        REFERENCES workspaces(id) ON DELETE CASCADE,
  result           JSONB       NOT NULL,
  expires_at       TIMESTAMPTZ NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Lookup by key is the hot path
CREATE UNIQUE INDEX IF NOT EXISTS idx_workflow_idempotency_key
  ON workflow_idempotency(idempotency_key);

-- Supports lazy expiry cleanup
CREATE INDEX IF NOT EXISTS idx_workflow_idempotency_expires
  ON workflow_idempotency(expires_at);

-- Only accessible server-side via service role — no client policies needed
ALTER TABLE workflow_idempotency ENABLE ROW LEVEL SECURITY;

-- ─── check_idempotency_key ────────────────────────────────────────────────────
-- Returns [{is_duplicate, cached_result}].
-- Cleans up expired rows on each call (lazy GC — avoids a separate cron job).

CREATE OR REPLACE FUNCTION check_idempotency_key(
  p_key          TEXT,
  p_workflow_name TEXT,
  p_actor_id     TEXT,
  p_workspace_id UUID,
  p_ttl_minutes  INTEGER DEFAULT 5
)
RETURNS TABLE(is_duplicate BOOLEAN, cached_result JSONB)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_record workflow_idempotency;
BEGIN
  -- Lazy cleanup of expired entries on every check
  DELETE FROM workflow_idempotency WHERE expires_at < now();

  SELECT * INTO v_record
  FROM workflow_idempotency
  WHERE idempotency_key = p_key
    AND expires_at >= now();

  IF FOUND THEN
    RETURN QUERY SELECT TRUE, v_record.result;
  ELSE
    RETURN QUERY SELECT FALSE, NULL::JSONB;
  END IF;
END;
$$;

-- ─── store_idempotency_result ─────────────────────────────────────────────────
-- Upserts the workflow result with a TTL.
-- Called after successful workflow execution.

CREATE OR REPLACE FUNCTION store_idempotency_result(
  p_key          TEXT,
  p_workflow_name TEXT,
  p_result       JSONB,
  p_actor_id     TEXT,
  p_workspace_id UUID,
  p_ttl_minutes  INTEGER DEFAULT 5
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO workflow_idempotency (
    idempotency_key,
    workflow_name,
    actor_id,
    workspace_id,
    result,
    expires_at
  ) VALUES (
    p_key,
    p_workflow_name,
    p_actor_id,
    p_workspace_id,
    p_result,
    now() + (p_ttl_minutes || ' minutes')::INTERVAL
  )
  ON CONFLICT (idempotency_key) DO UPDATE SET
    result     = EXCLUDED.result,
    expires_at = EXCLUDED.expires_at;
END;
$$;
