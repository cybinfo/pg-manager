/**
 * Tenant Onboarding Service
 *
 * Handles post-workflow user linkage and invitation flow after a tenant
 * record has been created by the tenant workflow. Extracted from the
 * new-tenant page to keep page components thin.
 */

import { createClient } from "@/lib/supabase/client"
import { withCreatedBy } from "@/lib/audit"
import { sendInvitationEmail, sendTenantWelcomeEmail } from "@/lib/email"
import { getNowISO } from "@/lib/date-helpers"
import { logger } from "@/lib/logger"

export interface TenantOnboardingParams {
  tenantId: string
  tenantName: string
  tenantEmail: string | null
  tenantPhone: string | null
  workspaceOwnerId: string   // the logged-in owner's user ID
  /** Whether the "tenants > welcomeEmail" feature flag is enabled */
  welcomeEmailEnabled: boolean
  /** For the welcome email body */
  propertyName: string
  roomNumber: string
  moveInDate: Date
  monthlyRent: number
  /** The page origin (window.location.origin) for building the signup URL */
  origin: string
}

/**
 * After a tenant is created via the workflow, link the tenant to an existing
 * user account or create a portal invitation, then send the welcome email.
 *
 * Never throws — errors are logged and swallowed so that a failed email or
 * invitation does not roll back a successful tenant creation.
 */
export async function onboardTenantUser(params: TenantOnboardingParams): Promise<void> {
  const {
    tenantId,
    tenantName,
    tenantEmail,
    tenantPhone,
    workspaceOwnerId,
    welcomeEmailEnabled,
    propertyName,
    roomNumber,
    moveInDate,
    monthlyRent,
    origin,
  } = params

  const supabase = createClient()

  // ── Step 1: Check if a user account already exists for this email ──────────
  let existingUserId: string | null = null

  if (tenantEmail) {
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("user_id, name")
      .eq("email", tenantEmail.toLowerCase())
      .single()

    if (existingProfile?.user_id) {
      existingUserId = existingProfile.user_id
    }
  }

  // ── Step 2: Fetch owner workspace ──────────────────────────────────────────
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("owner_user_id", workspaceOwnerId)
    .single()

  if (!workspace) {
    logger.warn("Tenant onboarding: owner workspace not found", { workspaceOwnerId })
    return
  }

  if (existingUserId) {
    // ── Path A: User already exists — link tenant record and create context ──
    await supabase
      .from("tenants")
      .update({ user_id: existingUserId })
      .eq("id", tenantId)

    const { error: contextError } = await supabase
      .from("user_contexts")
      .insert(
        withCreatedBy({
          user_id: existingUserId,
          workspace_id: workspace.id,
          context_type: "tenant",
          entity_id: tenantId,
          is_active: true,
          is_default: false,
          invited_by: workspaceOwnerId,
          invited_at: getNowISO(),
          accepted_at: getNowISO(),
        }, workspaceOwnerId)
      )

    if (contextError) {
      logger.warn("Tenant onboarding: failed to create user context", {
        tenantId,
        existingUserId,
        error: String(contextError.message),
      })
    } else {
      logger.info("Tenant onboarding: linked to existing user", { tenantId, existingUserId })
    }
  } else if (tenantEmail) {
    // ── Path B: No account yet — create invitation and send email ───────────
    const { data: invitation, error: inviteError } = await supabase
      .from("invitations")
      .insert(
        withCreatedBy({
          workspace_id: workspace.id,
          invited_by: workspaceOwnerId,
          email: tenantEmail,
          phone: tenantPhone || null,
          name: tenantName,
          context_type: "tenant",
          entity_id: tenantId,
          status: "pending",
          message: `You've been added as a tenant at ${workspace.name}. Sign up to access your tenant portal.`,
        }, workspaceOwnerId)
      )
      .select("id, token")
      .single()

    if (inviteError || !invitation) {
      logger.warn("Tenant onboarding: failed to create invitation", {
        tenantId,
        email: tenantEmail,
        error: String(inviteError?.message),
      })
    } else {
      logger.info("Tenant onboarding: invitation created", { tenantId, invitationId: invitation.id })

      // Fetch inviter's display name for the email
      const { data: inviterProfile } = await supabase
        .from("user_profiles")
        .select("name")
        .eq("user_id", workspaceOwnerId)
        .single()

      const inviterName = inviterProfile?.name || "Property Owner"
      const signupUrl = `${origin}/register?invite=${invitation.token}&email=${encodeURIComponent(tenantEmail)}`

      const emailResult = await sendInvitationEmail({
        to: tenantEmail,
        inviteeName: tenantName,
        inviterName,
        workspaceName: workspace.name,
        contextType: "tenant",
        signupUrl,
        message: `You've been added as a tenant at ${workspace.name}. Sign up to access your tenant portal where you can view bills, payments, submit complaints, and more.`,
      })

      if (!emailResult.success) {
        logger.warn("Tenant onboarding: invitation email failed", {
          email: tenantEmail,
          error: String(emailResult.error),
        })
      }
    }
  }

  // ── Step 3: Welcome email (non-blocking, feature-gated) ───────────────────
  if (tenantEmail && welcomeEmailEnabled) {
    const { data: ownerProfile } = await supabase
      .from("user_profiles")
      .select("name, phone")
      .eq("user_id", workspaceOwnerId)
      .single()

    sendTenantWelcomeEmail({
      to: tenantEmail,
      tenantName,
      propertyName,
      roomNumber,
      moveInDate,
      monthlyRent,
      ownerName: ownerProfile?.name || "Property Owner",
      ownerPhone: ownerProfile?.phone || undefined,
    }).catch((err: unknown) => {
      logger.warn("Tenant onboarding: welcome email failed", {
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }
}
