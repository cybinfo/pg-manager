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

import { baseCronHandler, logCronAudit } from "@/lib/cron-handler"
import { cronLogger, extractErrorMeta } from "@/lib/logger"
import { transformJoin } from "@/lib/supabase/transforms"
import { getTodayISO, getNowISO } from "@/lib/date-helpers"
import { sendWaitlistSeatAvailableEmail } from "@/lib/email"

export const GET = (request: Request) =>
  baseCronHandler(request, {
    name: "expire-library-memberships",
    execute: async (supabaseAdmin, _) => {
      const todayStr = getTodayISO()

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
            workspace_id,
            person:people(name)
          )
        `)
        .eq("status", "active")
        .lt("end_date", todayStr)

      if (membershipError) {
        cronLogger.error("Error fetching expired memberships", extractErrorMeta(membershipError))
        throw new Error("Failed to fetch memberships")
      }

      let membershipsExpired = 0
      let membersUpdated = 0
      let waitlistNotificationsSent = 0
      const errors: { membership_id: string; error: string }[] = []

      // Batch query: find which members have other active memberships (not in the expired set)
      // This eliminates N+1 queries inside the loop
      const expiredIds = (expiredMemberships || []).map((m: { id: string }) => m.id)
      const memberIdsFromExpired = (expiredMemberships || []).map((m: { member_id: string }) => m.member_id)

      const membersWithOtherActiveMap = new Map<string, string>() // member_id -> first other active membership id
      if (memberIdsFromExpired.length > 0) {
        const { data: otherActiveMemberships } = await supabaseAdmin
          .from("library_memberships")
          .select("id, member_id")
          .in("member_id", memberIdsFromExpired)
          .eq("status", "active")
          .not("id", "in", `(${expiredIds.join(",")})`)

        if (otherActiveMemberships) {
          for (const m of otherActiveMemberships) {
            // Store the first active membership id per member (for switching current subscription)
            if (!membersWithOtherActiveMap.has(m.member_id)) {
              membersWithOtherActiveMap.set(m.member_id, m.id)
            }
          }
        }
      }

      // Process each expired membership
      for (const membership of expiredMemberships || []) {
        try {
          const member = transformJoin(membership.member)
          const memberPerson = member ? transformJoin(member.person) : null
          const memberDisplayName = (memberPerson?.name as string) || member?.name || "Unknown"

          // Update membership status to expired
          const { error: updateError } = await supabaseAdmin
            .from("library_memberships")
            .update({
              status: "expired",
              updated_at: getNowISO(),
            })
            .eq("id", membership.id)

          if (updateError) {
            throw new Error(`Failed to update membership: ${updateError.message}`)
          }

          membershipsExpired++

          cronLogger.debug("Expired membership", {
            membershipId: membership.id,
            memberName: memberDisplayName,
            endDate: membership.end_date,
            planName: membership.plan_name,
          })

          // If this was the member's current subscription, update member status
          if (member && member.current_subscription_id === membership.id) {
            // Use batched result instead of individual query
            const otherActiveMembershipId = membersWithOtherActiveMap.get(membership.member_id)

            if (!otherActiveMembershipId) {
              // No other active memberships - expire the member
              const { error: memberUpdateError } = await supabaseAdmin
                .from("library_members")
                .update({
                  status: "expired",
                  current_subscription_id: null,
                  hours_balance: 0, // Reset hours balance
                  expiry_date: todayStr,
                  updated_at: getNowISO(),
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
                  memberName: memberDisplayName,
                })
              }

              // Log audit event
              if (member.workspace_id) {
                await logCronAudit(supabaseAdmin, member.owner_id, {
                  entityType: "library_member",
                  entityId: membership.member_id,
                  action: "update",
                  metadata: {
                    operation: "auto_expire_membership",
                    membership_id: membership.id,
                    plan_name: membership.plan_name,
                    end_date: membership.end_date,
                  },
                })
              }
            } else {
              // Set the next active membership as current
              await supabaseAdmin
                .from("library_members")
                .update({
                  current_subscription_id: otherActiveMembershipId,
                  updated_at: getNowISO(),
                })
                .eq("id", membership.member_id)

              cronLogger.debug("Switched to next active membership", {
                memberId: membership.member_id,
                newMembershipId: otherActiveMembershipId,
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
        .lt("expiry_date", todayStr)

      if (!staleMemberError && staleMembers && staleMembers.length > 0) {
        cronLogger.info("Found stale active members", { count: staleMembers.length })

        // Batch query: find which stale members have any active memberships
        // This eliminates N+1 queries inside the loop
        const staleMemberIds = staleMembers.map((m: { id: string }) => m.id)
        const { data: staleMembersWithActive } = await supabaseAdmin
          .from("library_memberships")
          .select("member_id")
          .in("member_id", staleMemberIds)
          .eq("status", "active")

        const staleMembersWithActiveSet = new Set(
          staleMembersWithActive?.map((m: { member_id: string }) => m.member_id) || []
        )

        for (const member of staleMembers) {
          // Use batched result instead of individual query
          if (!staleMembersWithActiveSet.has(member.id)) {
            const { error: updateError } = await supabaseAdmin
              .from("library_members")
              .update({
                status: "expired",
                current_subscription_id: null,
                hours_balance: 0,
                updated_at: getNowISO(),
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
                await logCronAudit(supabaseAdmin, member.owner_id, {
                  entityType: "library_member",
                  entityId: member.id,
                  action: "update",
                  metadata: {
                    operation: "auto_expire_stale_member",
                    expiry_date: member.expiry_date,
                  },
                })
              }
            }
          }
        }
      }

      // 3. Notify waitlisted members when seats become available (members just expired)
      if (membersUpdated > 0) {
        try {
          // Get unique library IDs from expired members
          const libraryIdsFromExpired = new Set<string>()
          for (const membership of expiredMemberships || []) {
            const member = transformJoin(membership.member)
            if (member?.library_id) {
              libraryIdsFromExpired.add(member.library_id)
            }
          }

          for (const libraryId of libraryIdsFromExpired) {
            // Fetch waitlisted people for this library who have email
            const { data: waitlistEntries } = await supabaseAdmin
              .from("library_waitlist")
              .select(`
                id,
                queue_position,
                person:people(id, name, email),
                library:libraries(id, name, phone)
              `)
              .eq("library_id", libraryId)
              .eq("status", "waiting")
              .is("deleted_at", null)
              .order("queue_position", { ascending: true })
              .limit(5)

            if (waitlistEntries && waitlistEntries.length > 0) {
              for (const entry of waitlistEntries) {
                const person = transformJoin(entry.person)
                const library = transformJoin(entry.library)

                if (!person?.email || !library) continue

                try {
                  const result = await sendWaitlistSeatAvailableEmail({
                    to: person.email,
                    personName: person.name,
                    libraryName: library.name,
                    queuePosition: entry.queue_position || 1,
                    ownerPhone: library.phone || undefined,
                  })

                  if (result.success) {
                    waitlistNotificationsSent++
                    cronLogger.debug("Sent waitlist seat available email", {
                      personName: person.name,
                      libraryId,
                      queuePosition: entry.queue_position,
                    })
                  }
                } catch (err) {
                  cronLogger.warn("Failed to send waitlist email", {
                    waitlistId: entry.id,
                    ...extractErrorMeta(err),
                  })
                }
              }
            }
          }
        } catch (err) {
          cronLogger.warn("Error processing waitlist notifications", extractErrorMeta(err))
        }
      }

      return {
        data: {
          membershipsExpired,
          membersUpdated,
          waitlistNotificationsSent,
          errors: errors.length > 0 ? errors : undefined,
        },
        message: `Expired ${membershipsExpired} memberships, updated ${membersUpdated} members, sent ${waitlistNotificationsSent} waitlist notifications`,
      }
    },
  })
