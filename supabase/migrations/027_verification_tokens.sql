-- ============================================
-- Migration 027: Email & Phone Verification
-- ============================================
-- Verification tokens for email and phone verification
-- ============================================

-- Create verification_tokens table
CREATE TABLE IF NOT EXISTS verification_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Who is being verified
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- What is being verified
    type TEXT NOT NULL CHECK (type IN ('email', 'phone')),
    value TEXT NOT NULL, -- The email or phone being verified

    -- Security
    token_hash TEXT NOT NULL, -- SHA256 hash of the token

    -- Expiry and usage
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Unique constraint: one active token per user/type/value
    UNIQUE(user_id, type, value, token_hash)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_verification_tokens_user ON verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_hash ON verification_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_verification_tokens_expires ON verification_tokens(expires_at) WHERE used_at IS NULL;

-- Add verification columns to user_profiles
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- RLS Policies
ALTER TABLE verification_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "Users can view own verification tokens"
ON verification_tokens FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Insert via server function only (no direct insert)
CREATE POLICY "No direct insert to verification_tokens"
ON verification_tokens FOR INSERT
TO authenticated
WITH CHECK (false);

-- Function to create a verification token (server-side)
CREATE OR REPLACE FUNCTION create_verification_token(
    p_user_id UUID,
    p_type TEXT,
    p_value TEXT,
    p_token TEXT,
    p_expires_in_minutes INTEGER DEFAULT 60
)
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token_id UUID;
    v_token_hash TEXT;
BEGIN
    -- Hash the token
    v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

    -- Invalidate any existing tokens for this user/type/value
    UPDATE verification_tokens
    SET used_at = NOW()
    WHERE user_id = p_user_id
      AND type = p_type
      AND value = p_value
      AND used_at IS NULL;

    -- Create new token
    INSERT INTO verification_tokens (
        user_id,
        type,
        value,
        token_hash,
        expires_at
    ) VALUES (
        p_user_id,
        p_type,
        p_value,
        v_token_hash,
        NOW() + (p_expires_in_minutes || ' minutes')::interval
    )
    RETURNING id INTO v_token_id;

    RETURN v_token_id;
END;
$$ LANGUAGE plpgsql;

-- Function to verify a token
CREATE OR REPLACE FUNCTION verify_token(
    p_token TEXT,
    p_type TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    user_id UUID,
    value TEXT,
    message TEXT
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_token_hash TEXT;
    v_record RECORD;
BEGIN
    -- Hash the provided token
    v_token_hash := encode(digest(p_token, 'sha256'), 'hex');

    -- Find the token
    SELECT vt.* INTO v_record
    FROM verification_tokens vt
    WHERE vt.token_hash = v_token_hash
      AND vt.type = p_type
      AND vt.used_at IS NULL
    LIMIT 1;

    -- Check if token exists
    IF NOT FOUND THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Invalid or expired token';
        RETURN;
    END IF;

    -- Check if token is expired
    IF v_record.expires_at < NOW() THEN
        RETURN QUERY SELECT false, NULL::UUID, NULL::TEXT, 'Token has expired';
        RETURN;
    END IF;

    -- Mark token as used
    UPDATE verification_tokens
    SET used_at = NOW()
    WHERE id = v_record.id;

    -- Update user profile
    IF p_type = 'email' THEN
        UPDATE user_profiles
        SET email_verified = true, email_verified_at = NOW()
        WHERE user_id = v_record.user_id;
    ELSIF p_type = 'phone' THEN
        UPDATE user_profiles
        SET phone_verified = true, phone_verified_at = NOW()
        WHERE user_id = v_record.user_id;
    END IF;

    RETURN QUERY SELECT true, v_record.user_id, v_record.value, 'Verification successful';
END;
$$ LANGUAGE plpgsql;

-- Function to check if email is verified
CREATE OR REPLACE FUNCTION is_email_verified(p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN COALESCE(
        (SELECT email_verified FROM user_profiles WHERE user_id = p_user_id),
        false
    );
END;
$$ LANGUAGE plpgsql;

-- Function to check if phone is verified
CREATE OR REPLACE FUNCTION is_phone_verified(p_user_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN COALESCE(
        (SELECT phone_verified FROM user_profiles WHERE user_id = p_user_id),
        false
    );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION create_verification_token(UUID, TEXT, TEXT, TEXT, INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION verify_token(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION is_email_verified(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_phone_verified(UUID) TO authenticated;

-- Clean up expired tokens (can be run via cron)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM verification_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days'
       OR used_at < NOW() - INTERVAL '30 days';

    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION cleanup_expired_tokens() TO service_role;

-- ============================================
-- Done
-- ============================================
