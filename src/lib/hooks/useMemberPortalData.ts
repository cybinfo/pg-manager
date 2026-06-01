/**
 * useMemberPortalData Hook
 *
 * Centralized data fetching for the library member portal.
 * Handles auth check, member lookup, library details,
 * and current subscription resolution.
 *
 * Built on the shared usePortalData base hook for common portal patterns.
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

import type { User } from "@supabase/supabase-js"
import { usePortalData } from "./usePortalData"

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
  entity_id: string
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
// CONFIG
// ============================================================================

/**
 * Post-transform for member data.
 * Handles the nested assigned_seat.section join that the base hook's
 * flat joinFields cannot normalize automatically.
 */
function transformMemberData(data: Record<string, unknown>): MemberPortalMember {
  // Handle assigned_seat with nested section join
  let assignedSeat = data.assigned_seat as MemberPortalSeat | null
  if (assignedSeat && assignedSeat.section) {
    assignedSeat = {
      ...assignedSeat,
      section: Array.isArray(assignedSeat.section)
        ? assignedSeat.section[0] || null
        : assignedSeat.section,
    }
  }

  return {
    ...(data as unknown as MemberPortalMember),
    assigned_seat: assignedSeat,
  }
}

const MEMBER_PORTAL_CONFIG = {
  table: "entity_members" as const,
  select: `
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
    entity_id,
    library:libraries(id, name, phone, address, city, opening_time, closing_time),
    assigned_seat:entity_seats(seat_number, section:entity_sections(name)),
    locker:entity_lockers(locker_number),
    current_subscription:entity_memberships!library_members_current_subscription_id_fkey(
      id, plan_name, hours_included, hours_remaining, start_date, end_date, status
    ),
    person:people(name, photo_url)
  `,
  joinFields: ["library", "current_subscription", "person", "locker", "assigned_seat"],
  statusFilter: { column: "status", value: "active" },
  errorContext: "member portal",
  postTransform: transformMemberData,
}

// ============================================================================
// HOOK
// ============================================================================

export function useMemberPortalData(): UseMemberPortalDataReturn {
  const {
    data: member,
    user,
    loading,
    error,
    refresh,
  } = usePortalData<MemberPortalMember>(MEMBER_PORTAL_CONFIG)

  return {
    member,
    library: member?.library || null,
    membership: member?.current_subscription || null,
    user,
    loading,
    error,
    refresh,
  }
}
