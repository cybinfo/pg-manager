-- ============================================
-- Migration 029: Fix Platform Admins
-- ============================================
-- Remove client email from platform admins
-- Add correct admin email (rajatseth@managekar.com)
-- ============================================

-- Remove ALL existing platform admins first
DELETE FROM platform_admins;

-- Add the correct platform admins
-- Only developer accounts should be platform admins
DO $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Add developer as admin (sethrajat0711@gmail.com)
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'sethrajat0711@gmail.com'
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO platform_admins (user_id, notes)
        VALUES (v_user_id, 'Developer account')
        ON CONFLICT (user_id) DO NOTHING;
        RAISE NOTICE 'Added developer account as platform admin';
    END IF;

    -- Add platform admin account (rajatseth@managekar.com)
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'rajatseth@managekar.com'
    LIMIT 1;

    IF v_user_id IS NOT NULL THEN
        INSERT INTO platform_admins (user_id, notes)
        VALUES (v_user_id, 'Platform admin account')
        ON CONFLICT (user_id) DO NOTHING;
        RAISE NOTICE 'Added platform admin account';
    ELSE
        RAISE NOTICE 'Platform admin account (rajatseth@managekar.com) not found in auth.users - create it first';
    END IF;
END $$;

-- ============================================
-- Done
-- ============================================
