/**
 * Cron Job: Expire Library Memberships
 *
 * Runs daily to:
 * 1. Expire memberships where end_date < today
 * 2. Update member status to "expired" if their current subscription expired
 * 3. Reset hours balance if configured
 *
 * Schedule: Daily at midnight via Vercel cron
 */

import { validateCronRequest } from "@/lib/api-middleware"
import { cronLogger, extractErrorMeta } from "@/lib/logger"
import { apiSuccess, internalError } from "@/lib/api-response"
import { transformJoin } from "@/lib/supabase/transforms"

export async function GET(request: Request) {
  try {
    // SECURITY: Rate limiting + cron secret validation
    const { success, response, supabase: supabaseAdmin } = await validateCronRequest(request)
    if (!success || !supabaseAdmin) return response!

    const today = new Date().toISOString().split("T")[0]

    cronLogger.info("Library membership expiration started", { date: today })

    // 1. Find all active memberships that have expired
    const { data: expiredMemberships, error: membershipError } = await supabaseAdmin
      .from("library_memberships")
      .select(`
        id,
        member_id,
        plan_name,
        end_date,
        hours_remaining,
        member:library_members!library_memberships_member_id_fkey(
          id,
          name,
          library_id,
          current_subscription_id,
          owner_id,
          workspace_id
        )
      `)
      .eq("status", "active")
      .lt("end_date", today)

    if (membershipError) {
      cronLogger.error("Error fetching expired memberships", extractErrorMeta(membershipError))
      return internalError("Failed to fetch memberships")
    }

    let membershipsExpired = 0
    let membersUpdated = 0
    const errors: { membership_id: string; error: string }[] = []

    // Process each expired membership
    for (const membership of expiredMemberships || []) {
      try {
        const member = transformJoin(membership.member)

        // Update membership status to expired
        const { error: updateError } = await supabaseAdmin
          .from("library_memberships")
          .update({
            status: "expired",
            updated_at: new Date().toISOString(),
          })
          .eq("id", membership.id)

        if (updateError) {
          throw new Error(`Failed to update membership: ${updateError.message}`)
        }

        membershipsExpired++

        cronLogger.debug("Expired membership", {
          membershipId: membership.id,
          memberName: member?.name,
          endDate: membership.end_date,
          planName: membership.plan_name,
        })

        // If this was the member's current subscription, update member status
        if (member && member.current_subscription_id === membership.id) {
          // Check if member has another active membership
          const { data: otherActiveMemberships } = await supabaseAdmin
            .from("library_memberships")
            .select("id")
            .eq("member_id", membership.member_id)
            .eq("status", "active")
            .neq("id", membership.id)
            .limit(1)

          if (!otherActiveMemberships || otherActiveMemberships.length === 0) {
            // No other active memberships - expire the member
            const { error: memberUpdateError } = await supabaseAdmin
              .from("library_members")
              .update({
                status: "expired",
                current_subscription_id: null,
                hours_balance: 0, // Reset hours balance
                expiry_date: today,
                updated_at: new Date().toISOString(),
              })
              .eq("id", membership.member_id)

            if (memberUpdateError) {
              cronLogger.warn("Failed to update member status", {
                memberId: membership.member_id,
                error: memberUpdateError.message,
              })
            } else {
              membersUpdated++
              cronLogger.info("Member expired", {
                memberId: membership.member_id,
                memberName: member.name,
              })
            }

            // Log audit event
            if (member.workspace_id) {
              await supabaseAdmin.from("audit_events").insert({
                entity_type: "library_member",
                entity_id: membership.member_id,
                action: "update",
                actor_id: "system",
                actor_type: "system",
                workspace_id: member.workspace_id,
                metadata: {
                  operation: "auto_expire_membership",
                  membership_id: membership.id,
                  plan_name: membership.plan_name,
                  end_date: membership.end_date,
                },
                created_at: new Date().toISOString(),
              })
            }
          } else {
            // Set the next active membership as current
            const nextMembership = otherActiveMemberships[0]
            await supabaseAdmin
              .from("library_members")
              .update({
                current_subscription_id: nextMembership.id,
                updated_at: new Date().toISOString(),
              })
              .eq("id", membership.member_id)

            cronLogger.debug("Switched to next active membership", {
              memberId: membership.member_id,
              newMembershipId: nextMembership.id,
            })
          }
        }
      } catch (err) {
        cronLogger.error("Error processing membership", {
          membershipId: membership.id,
          ...extractErrorMeta(err),
        })
        errors.push({
          membership_id: membership.id,
          error: err instanceof Error ? err.message : "Unknown error",
        })
      }
    }

    // 2. Find members with expired expiry_date but still active status (safety check)
    const { data: staleMembers, error: staleMemberError } = await supabaseAdmin
      .from("library_members")
      .select("id, name, expiry_date, owner_id, workspace_id")
      .eq("status", "active")
      .not("expiry_date", "is", null)
      .lt("expiry_date", today)

    if (!staleMemberError && staleMembers && staleMembers.length > 0) {
      cronLogger.info("Found stale active members", { count: staleMembers.length })

      for (const member of staleMembers) {
        // Check if they have any active memberships
        const { data: activeMemberships } = await supabaseAdmin
          .from("library_memberships")
          .select("id")
          .eq("member_id", member.id)
          .eq("status", "active")
          .limit(1)

        if (!activeMemberships || activeMemberships.length === 0) {
          const { error: updateError } = await supabaseAdmin
            .from("library_members")
            .update({
              status: "expired",
              current_subscription_id: null,
              hours_balance: 0,
              updated_at: new Date().toISOString(),
            })
            .eq("id", member.id)

          if (!updateError) {
            membersUpdated++
            cronLogger.info("Fixed stale member status", {
              memberId: member.id,
              memberName: member.name,
            })

            // Log audit event
            if (member.workspace_id) {
              await supabaseAdmin.from("audit_events").insert({
                entity_type: "library_member",
                entity_id: member.id,
                action: "update",
                actor_id: "system",
                actor_type: "system",
                workspace_id: member.workspace_id,
                metadata: {
                  operation: "auto_expire_stale_member",
                  expiry_date: member.expiry_date,
                },
                created_at: new Date().toISOString(),
              })
            }
          }
        }
      }
    }

    cronLogger.info("Library membership expiration complete", {
      membershipsExpired,
      membersUpdated,
      errors: errors.length,
    })

    return apiSuccess(
      {
        membershipsExpired,
        membersUpdated,
        errors: errors.length > 0 ? errors : undefined,
      },
      {
        message: `Expired ${membershipsExpired} memberships, updated ${membersUpdated} members`,
      }
    )
  } catch (error) {
    cronLogger.error("Cron error", extractErrorMeta(error))
    return internalError("Internal server error")
  }
}
