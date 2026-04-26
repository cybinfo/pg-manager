/**
 * Platform Admin Capabilities
 *
 * Documents what platform admins (entries in the `platform_admins` table) can
 * and cannot do across the ManageKar platform. This is the authoritative
 * reference for any code that branches on `isPlatformAdmin`.
 *
 * CAN:
 * - Access /admin               — workspace explorer (view all workspaces + owners)
 * - Access /admin/admins        — manage platform admins (grant/revoke access)
 * - Bypass all workspace permission checks — `isPlatformAdmin` short-circuits
 *                                  `hasPermission()` to always return true
 * - Access any workspace dashboard without being a member of that workspace
 * - View audit logs across all workspaces (activity log pages)
 * - Read all data in any workspace: tenants, members, bills, payments, etc.
 *
 * CANNOT:
 * - Revoke their own platform admin access (UI-enforced guard; prevents lockout)
 * - Modify tenant/member financial data on behalf of owners (read-only intent;
 *   no explicit DB block, but platform admins should only read — not write —
 *   workspace data during investigations)
 * - Send WhatsApp/email communications on behalf of owners or workspaces
 * - Access /tenant or /member self-service portals (those check tenant/member
 *   auth separately, not workspace membership)
 * - Create new workspaces on behalf of owners (that flow requires owner auth)
 *
 * Enforcement:
 * - `isPlatformAdmin` flag in `useCurrentContext()` — derived from
 *   `checkPlatformAdmin(userId)` on auth context load
 * - DB check: `is_platform_admin(auth.uid())` function used in RLS policies
 * - `platform_admins` table has NO `is_active` column — presence = active
 *
 * Audit:
 * - Grant actions logged to `audit_events` with action="create",
 *   entity_type="platform_admin", metadata.event="platform_admin.granted"
 * - Revoke actions logged to `audit_events` with action="delete",
 *   entity_type="platform_admin", metadata.event="platform_admin.revoked"
 * - Both audit entries use workspace_id=null (platform-level, not workspace-scoped)
 *
 * Table:
 * - `platform_admins` columns: user_id, created_at, created_by, notes
 * - Soft delete is NOT used for platform_admins — revoke = hard delete
 *   (this is intentional: presence in the table = active admin)
 */

// This file is documentation-only. No runtime exports needed.
// If you need to check platform admin status at runtime, use:
//
//   import { useCurrentContext } from "@/lib/auth"
//   const { isPlatformAdmin } = useCurrentContext()
//
// Or in SQL/RLS:
//   is_platform_admin(auth.uid())
export {}
