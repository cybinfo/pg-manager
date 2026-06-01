/**
 * New Library Attendance Page (Check-In)
 *
 * Form to check in a library member.
 */

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { FormField } from "@/components/ui/form-components"
import type { ValidatorResult } from "@/lib/validation"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { Clock, Loader2, Users, AlertCircle, Armchair } from "lucide-react"
import { PageLoading } from "@/components/ui/loading"
import { DetailHero, DetailSection } from "@/components/ui"
import { transformJoin } from "@/lib/supabase/transforms"
import { PermissionGuard } from "@/components/auth"
import { logger } from "@/lib/logger"
import { checkInLibraryMember } from "@/lib/services/library-attendance"
import { getNowISO } from "@/lib/date-helpers"

interface MemberOption {
  id: string
  name: string
  member_code: string | null
  status: string
  hours_balance: number
  entity_id: string
  current_subscription_id: string | null
  time_slot?: string | null
  person?: { name: string } | null
}

/** Get display name from person (live) or member (fallback) */
function getMemberDisplayName(m: MemberOption): string {
  return m.person?.name || m.name
}

interface LibraryOption {
  id: string
  name: string
}

interface SeatOption {
  id: string
  seat_number: string
  section_name: string
  section_id: string
  is_ac: boolean
  has_power_outlet: boolean
}

export default function NewLibraryAttendancePage() {
  return (
    <PermissionGuard permission="entity_attendance.create">
      <NewLibraryAttendanceContent />
    </PermissionGuard>
  )
}

function NewLibraryAttendanceContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/entity-attendance" })
  const [loadingData, setLoadingData] = useState(true)
  const [members, setMembers] = useState<MemberOption[]>([])
  const [_libraries, setLibraries] = useState<LibraryOption[]>([])
  const [seats, setSeats] = useState<SeatOption[]>([])
  const [loadingSeats, setLoadingSeats] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null)

  const {
    formData, setFormData,
    handleSubmit,
    saving,
    errors,
    searchParams,
    workspaceId,
  } = useFormPage({
    table: "entity_attendance",
    initialData: {
      member_id: "",
      entity_id: "",
      seat_id: "",
      check_in_time: getNowISO().slice(0, 16),
      notes: "",
    },
    redirectTo: "/entity-attendance",
    successMessage: "Checked in successfully!",
    errorMessage: "Failed to check in",
    validationSchema: {
      member_id: (value: unknown): ValidatorResult => {
        if (!value) return { isValid: false, error: "Please select a member" }
        if (!selectedMember) return { isValid: false, error: "Member not found" }
        if (selectedMember.hours_balance <= 0) return { isValid: false, error: "Member has no hours remaining. Please renew subscription first." }
        return null
      },
    },
    customSubmit: async (data, userId, supabase): Promise<string | void> => {
      if (!selectedMember) {
        throw new Error("Member not found")
      }

      const result = await checkInLibraryMember(
        supabase,
        {
          memberId: data.member_id as string,
          libraryId: data.entity_id as string,
          workspaceId,
          seatId: (data.seat_id as string) || null,
          checkInTime: data.check_in_time as string,
          notes: (data.notes as string) || null,
          membershipId: selectedMember.current_subscription_id,
          memberTimeSlot: selectedMember.time_slot ?? null,
        },
        userId
      )

      if (!result.success) {
        throw new Error(result.error || "Check-in failed")
      }

      const selectedSeat = seats.find((s) => s.id === data.seat_id)
      const seatInfo = selectedSeat ? ` at seat ${selectedSeat.seat_number}` : ""
      const { showSuccess } = await import("@/lib/toast-helpers")
      showSuccess(`${getMemberDisplayName(selectedMember)} checked in${seatInfo} successfully!`)

      return `/library-attendance/${result.attendanceId}`
    },
  })

  const preselectedMember = searchParams.get("member")

  useEffect(() => {
    async function fetchData() {
      if (!workspaceId) return

      const supabase = createClient()

      // Fetch libraries
      const { data: librariesData } = await supabase
        .from("entities").eq("type", "library")
        .select("id, name")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      setLibraries(librariesData || [])

      // Fetch active members with person data for live name
      const { data: membersData } = await supabase
        .from("entity_members")
        .select("id, name, member_code, status, hours_balance, entity_id, current_subscription_id, time_slot, person:people(name)")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("name")

      // Transform person joins for live name data
      const transformedMembers = (membersData || []).map((m: Record<string, unknown>) => ({
        ...m,
        person: transformJoin(m.person as Record<string, unknown> | Record<string, unknown>[] | null),
      })) as unknown as MemberOption[]
      setMembers(transformedMembers)

      // If preselected member, set form data
      if (preselectedMember && membersData) {
        const member = membersData.find((m: MemberOption) => m.id === preselectedMember)
        if (member) {
          setSelectedMember(member)
          setFormData((prev) => ({
            ...prev,
            member_id: member.id,
            entity_id: member.entity_id,
          }))
        }
      }

      setLoadingData(false)
    }

    fetchData()
  }, [workspaceId, preselectedMember, setFormData])

  // Fetch available seats for a library
  const fetchAvailableSeats = async (libraryId: string) => {
    if (!libraryId) {
      setSeats([])
      return
    }

    setLoadingSeats(true)
    try {
      const supabase = createClient()
      const { data: seatsData } = await supabase
        .from("entity_seats")
        .select(`
          id,
          seat_number,
          has_power_outlet,
          section:entity_sections!library_seats_section_id_fkey(
            id,
            name,
            is_ac,
            entity_id
          )
        `)
        .eq("status", "available")
        .is("deleted_at", null)

      // Filter seats for this library and transform
      const availableSeats: SeatOption[] = (seatsData || [])
        .map((seat: { id: string; seat_number: string; has_power_outlet: boolean; section: { id: string; name: string; is_ac: boolean; entity_id: string } | { id: string; name: string; is_ac: boolean; entity_id: string }[] | null }) => {
          const section = transformJoin(seat.section)
          if (!section || section.entity_id !== libraryId) return null
          return {
            id: seat.id,
            seat_number: seat.seat_number,
            section_name: section.name,
            section_id: section.id,
            is_ac: section.is_ac,
            has_power_outlet: seat.has_power_outlet,
          }
        })
        .filter((s: SeatOption | null): s is SeatOption => s !== null)
        .sort((a: SeatOption, b: SeatOption) => a.seat_number.localeCompare(b.seat_number, undefined, { numeric: true }))

      setSeats(availableSeats)
    } catch (error) {
      logger.error("Error fetching seats:", { detail: error })
      setSeats([])
    } finally {
      setLoadingSeats(false)
    }
  }

  const handleMemberChange = (memberId: string) => {
    const member = members.find((m) => m.id === memberId)
    setSelectedMember(member || null)
    setFormData((prev) => ({
      ...prev,
      member_id: memberId,
      entity_id: member?.entity_id || prev.entity_id,
      seat_id: "", // Reset seat when member changes
    }))

    // Fetch available seats for the member's library
    if (member?.entity_id) {
      fetchAvailableSeats(member.entity_id)
    } else {
      setSeats([])
    }
  }

  if (loadingData) {
    return <PageLoading message="Loading..." />
  }

  const memberOptions: ComboboxOption[] = members.map((m) => ({
    value: m.id,
    label: getMemberDisplayName(m) + (m.member_code ? ` (${m.member_code})` : "") + ` - ${m.hours_balance.toFixed(1)}h remaining`,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Check In"
        subtitle="Record member attendance"
        backHref={backHref}
        backLabel="Back to Attendance"
        icon={Clock}
        breadcrumbs={[
          { label: "Attendance", href: "/entity-attendance" },
          { label: "Check In" },
        ]}
      />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Check-In Details" description="Select a member and record their check-in time" icon={Clock}>
          <div className="space-y-6">
            {/* Member Selection */}
            <FormField label="Select Member" htmlFor="member_id" required error={errors.member_id}>
              {members.length > 0 ? (
                <Combobox
                  options={memberOptions}
                  value={formData.member_id as string}
                  onValueChange={handleMemberChange}
                  placeholder="Search for a member..."
                  emptyText="No active members found"
                  disabled={saving}
                />
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No active members found
                  </p>
                </div>
              )}
            </FormField>

            {/* Member Info */}
            {selectedMember && (
              <div className={`p-4 rounded-lg border ${
                selectedMember.hours_balance <= 0
                  ? "bg-destructive/10 border-destructive/20"
                  : selectedMember.hours_balance <= 2
                    ? "bg-warning/10 border-warning/20"
                    : "bg-success/10 border-success/20"
              }`}>
                <div className="flex items-start gap-3">
                  {selectedMember.hours_balance <= 0 ? (
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                  ) : (
                    <Clock className="h-5 w-5 text-success mt-0.5" />
                  )}
                  <div>
                    <p className="font-medium">{getMemberDisplayName(selectedMember)}</p>
                    {selectedMember.member_code && (
                      <p className="text-sm text-muted-foreground font-mono">{selectedMember.member_code}</p>
                    )}
                    <p className={`text-sm font-medium mt-1 ${
                      selectedMember.hours_balance <= 0
                        ? "text-destructive"
                        : selectedMember.hours_balance <= 2
                          ? "text-warning"
                          : "text-success"
                    }`}>
                      {selectedMember.hours_balance.toFixed(1)} hours remaining
                    </p>
                    {selectedMember.hours_balance <= 0 && (
                      <Link href={`/entity-members/${selectedMember.id}/renew`} className="text-sm text-primary hover:underline">
                        Renew subscription →
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Seat Assignment */}
            {selectedMember && (
              <div className="space-y-2">
                <Label htmlFor="seat_id" className="flex items-center gap-2">
                  <Armchair className="h-4 w-4" />
                  Assign Seat (Optional)
                </Label>
                {loadingSeats ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading available seats...
                  </div>
                ) : seats.length > 0 ? (
                  <>
                    <Combobox
                      options={seats.map((s) => ({
                        value: s.id,
                        label: `${s.seat_number} - ${s.section_name}${s.is_ac ? " (AC)" : ""}${s.has_power_outlet ? " ⚡" : ""}`,
                      }))}
                      value={formData.seat_id as string}
                      onValueChange={(seatId) => setFormData((prev) => ({ ...prev, seat_id: seatId }))}
                      placeholder="Select a seat..."
                      emptyText="No seats available"
                      disabled={saving}
                    />
                    <p className="text-xs text-muted-foreground">
                      {seats.length} seat{seats.length !== 1 ? "s" : ""} available
                    </p>
                  </>
                ) : (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <p className="text-sm text-warning">
                      No available seats in this library. Member can still check in without seat assignment.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Check-in Time */}
            <FormField label="Check-In Time" required>
              <Input
                id="check_in_time"
                name="check_in_time"
                type="datetime-local"
                value={formData.check_in_time as string}
                onChange={(e) => setFormData((prev) => ({ ...prev, check_in_time: e.target.value }))}
                required
                disabled={saving}
              />
            </FormField>

            {/* Notes */}
            <FormField label="Notes (Optional)">
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes..."
                value={formData.notes as string}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                disabled={saving}
                rows={2}
              />
            </FormField>
          </div>
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href="/entity-attendance">
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={saving || members.length === 0 || (selectedMember?.hours_balance ?? 0) <= 0}
          >
            {saving ? "Checking In..." : "Check In"}
          </Button>
        </div>
      </form>
    </div>
  )
}
