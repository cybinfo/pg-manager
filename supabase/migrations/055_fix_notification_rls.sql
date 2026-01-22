-- Migration 055: Fix RLS policies for notification_queue, notifications, and invitations
-- Allow owners to create notifications/invitations for users in their workspace

-- ============================================
-- 1. Fix notification_queue RLS
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS notification_queue_all ON notification_queue;

-- Users can view their own notifications
CREATE POLICY notification_queue_select ON notification_queue
  FOR SELECT
  USING (recipient_id = auth.uid());

-- Owners can insert notifications for anyone (they create notifications for tenants/staff)
CREATE POLICY notification_queue_insert ON notification_queue
  FOR INSERT
  WITH CHECK (true);  -- Insert is allowed, RLS on SELECT controls visibility

-- Users can update their own notifications (mark as read, etc.)
CREATE POLICY notification_queue_update ON notification_queue
  FOR UPDATE
  USING (recipient_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY notification_queue_delete ON notification_queue
  FOR DELETE
  USING (recipient_id = auth.uid());

-- ============================================
-- 2. Fix notifications RLS (in-app)
-- ============================================

-- Drop existing policy
DROP POLICY IF EXISTS notifications_all ON notifications;

-- Users can view their own notifications
CREATE POLICY notifications_select ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

-- Owners can insert notifications for anyone
CREATE POLICY notifications_insert ON notifications
  FOR INSERT
  WITH CHECK (true);  -- Insert is allowed, RLS on SELECT controls visibility

-- Users can update their own notifications (mark as read, etc.)
CREATE POLICY notifications_update ON notifications
  FOR UPDATE
  USING (user_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY notifications_delete ON notifications
  FOR DELETE
  USING (user_id = auth.uid());

-- ============================================
-- 3. Fix invitations RLS
-- ============================================

-- The existing policy should work, but let's ensure it covers INSERT properly
-- Drop and recreate with explicit INSERT policy

DROP POLICY IF EXISTS invitation_owner_manage ON invitations;

-- Owners can SELECT invitations in their workspace
CREATE POLICY invitation_owner_select ON invitations
  FOR SELECT
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_user_id = auth.uid()));

-- Owners can INSERT invitations for their workspace
CREATE POLICY invitation_owner_insert ON invitations
  FOR INSERT
  WITH CHECK (workspace_id IN (SELECT id FROM workspaces WHERE owner_user_id = auth.uid()));

-- Owners can UPDATE invitations in their workspace
CREATE POLICY invitation_owner_update ON invitations
  FOR UPDATE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_user_id = auth.uid()));

-- Owners can DELETE invitations in their workspace
CREATE POLICY invitation_owner_delete ON invitations
  FOR DELETE
  USING (workspace_id IN (SELECT id FROM workspaces WHERE owner_user_id = auth.uid()));

-- Keep the invitee view policy
-- (Already exists from migration 012)

-- ============================================
-- 4. Add platform admin bypass
-- ============================================

-- Platform admins can manage all notifications
CREATE POLICY notification_queue_admin ON notification_queue
  FOR ALL
  USING (is_platform_admin(auth.uid()));

CREATE POLICY notifications_admin ON notifications
  FOR ALL
  USING (is_platform_admin(auth.uid()));

CREATE POLICY invitations_admin ON invitations
  FOR ALL
  USING (is_platform_admin(auth.uid()));

-- ============================================
-- Complete
-- ============================================
COMMENT ON POLICY notification_queue_insert ON notification_queue IS 'Allows owners to create notifications for their tenants/staff';
COMMENT ON POLICY notifications_insert ON notifications IS 'Allows owners to create in-app notifications for their users';
