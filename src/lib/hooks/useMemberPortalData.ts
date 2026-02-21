/**
 * useMemberPortalData Hook
 *
 * Centralized data fetching for the library member portal.
 * Handles auth check, member lookup, library details,
 * and current subscription resolution.
 *
 * Eliminates duplicated data fetching across 4 member portal pages:
 * - member/page.tsx (dashboard)
 * - member/profile/page.tsx
 * - member/attendance/page.tsx
 * - member/payments/page.tsx
 *
 * @example
 * const { member, library, membership, user, loading } = useMemberPortalData()
 *
 * if (loading) return <PageSkeleton variant="detail" />
 * if (!member) return <NoActiveMembership />
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import type { User } from "@supabase/supabase-js"

// ============================================================================
// TYPES
// ============================================================================

export interface MemberPortalLibrary {
  id: string
  name: string
  phone: string | null
  address: string | null
  city: string | null
  opening_time: string | null
  closing_time: string | null
}

export interface MemberPortalMembership {
  id: string
  plan_name: string
  hours_included: number | null
  hours_remaining: number | null
  start_date: string
  end_date: string
  status: string
}

export interface MemberPortalSeat {
  seat_number: string
  section: {
    name: string
  } | null
}

export interface MemberPortalLocker {
  locker_number: string
}

export interface MemberPortalPerson {
  name: string
  photo_url: string | null
}

export interface MemberPortalMember {
  id: string
  name: string
  phone: string | null
  email: string | null
  member_code: string | null
  hours_balance: number
  hours_used: number
  preferred_slot: string | null
  join_date: string
  expiry_date: string | null
  status: string
  id_proof_type: string | null
  id_proof_number: string | null
  notes: string | null
  library_id: string
  library: MemberPortalLibrary | null
  current_subscription: MemberPortalMembership | null
  assigned_seat: MemberPortalSeat | null
  locker: MemberPortalLocker | null
  person: MemberPortalPerson | null
}

export interface UseMemberPortalDataReturn {
  /** Full member record with joined library, subscription, seat, locker data */
  member: MemberPortalMember | null
  /** The library associated with this member (convenience alias for member.library) */
  library: MemberPortalLibrary | null
  /** The current active membership/subscription (convenience alias) */
  membership: MemberPortalMembership | null
  /** The authenticated Supabase user */
  user: User | null
  /** Whether data is currently loading */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Re-fetch all data */
  refresh: () => Promise<void>
}

// ============================================================================
// HOOK
// ============================================================================

export function useMemberPortalData(): UseMemberPortalDataReturn {
  const [member, setMember] = useState<MemberPortalMember | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        setLoading(false)
        setError("Not authenticated")
        return
      }

      setUser(authUser)

      // Fetch member with all related data
      const { data: memberData, error: memberError } = await supabase
        .from("library_members")
        .select(`
          id,
          name,
          phone,
          email,
          member_code,
          hours_balance,
          hours_used,
          preferred_slot,
          join_date,
          expiry_date,
          status,
          id_proof_type,
          id_proof_number,
          notes,
          library_id,
          library:libraries(id, name, phone, address, city, opening_time, closing_time),
          assigned_seat:library_seats(seat_number, section:library_sections(name)),
          locker:library_lockers(locker_number),
          current_subscription:library_memberships!library_members_current_subscription_id_fkey(
            id, plan_name, hours_included, hours_remaining, start_date, end_date, status
          ),
          person:people(name, photo_url)
        `)
        .eq("user_id", authUser.id)
        .eq("status", "active")
        .single()

      if (memberError || !memberData) {
        setMember(null)
        setLoading(false)
        return
      }

      // Transform all joins (Supabase may return arrays for single relations)
      const library = transformJoin(memberData.library) as MemberPortalLibrary | null
      const currentSubscription = transformJoin(memberData.current_subscription) as MemberPortalMembership | null
      const person = transformJoin(memberData.person) as MemberPortalPerson | null
      const locker = transformJoin(memberData.locker) as MemberPortalLocker | null

      // Handle assigned_seat with nested section join
      let assignedSeat = transformJoin(memberData.assigned_seat) as MemberPortalSeat | null
      if (assignedSeat && assignedSeat.section) {
        assignedSeat = {
          ...assignedSeat,
          section: Array.isArray(assignedSeat.section)
            ? assignedSeat.section[0] || null
            : assignedSeat.section,
        }
      }

      const normalizedMember: MemberPortalMember = {
        ...memberData,
        library,
        current_subscription: currentSubscription,
        assigned_seat: assignedSeat,
        locker,
        person,
      }

      setMember(normalizedMember)
    } catch (err) {
      console.error("Error fetching member portal data:", err)
      setError(err instanceof Error ? err.message : "Failed to load member data")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    member,
    library: member?.library || null,
    membership: member?.current_subscription || null,
    user,
    loading,
    error,
    refresh: fetchData,
  }
}
