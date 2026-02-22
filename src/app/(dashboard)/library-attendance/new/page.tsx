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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { ArrowLeft, Clock, Loader2, Users, AlertCircle, Armchair } from "lucide-react"
import { PageLoading } from "@/components/ui/loading"
import { transformJoin } from "@/lib/supabase/transforms"

interface MemberOption {
  id: string
  name: string
  member_code: string | null
  status: string
  hours_balance: number
  library_id: string
  current_subscription_id: string | null
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
  const [loadingData, setLoadingData] = useState(true)
  const [members, setMembers] = useState<MemberOption[]>([])
  const [libraries, setLibraries] = useState<LibraryOption[]>([])
  const [seats, setSeats] = useState<SeatOption[]>([])
  const [loadingSeats, setLoadingSeats] = useState(false)
  const [selectedMember, setSelectedMember] = useState<MemberOption | null>(null)

  const {
    formData, setFormData,
    handleSubmit,
    saving,
    searchParams,
    workspaceId,
  } = useFormPage({
    table: "library_attendance",
    initialData: {
      member_id: "",
      library_id: "",
      seat_id: "",
      check_in_time: new Date().toISOString().slice(0, 16),
      notes: "",
    },
    redirectTo: "/library-attendance",
    successMessage: "Checked in successfully!",
    errorMessage: "Failed to check in",
    validate: (data) => {
      if (!data.member_id) {
        return "Please select a member"
      }
      if (!selectedMember) {
        return "Member not found"
      }
      if (selectedMember.hours_balance <= 0) {
        return "Member has no hours remaining. Please renew subscription first."
      }
      return null
    },
    customSubmit: async (data, userId, supabase): Promise<string | void> => {
      if (!selectedMember) {
        throw new Error("Member not found")
      }

      // Get owner_id from workspace
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("owner_user_id")
        .eq("id", workspaceId)
        .single()

      if (!workspace) {
        throw new Error("Workspace not found")
      }

      // Check if member already has an active check-in (no check-out)
      const { data: activeCheckIn } = await supabase
        .from("library_attendance")
        .select("id")
        .eq("member_id", data.member_id)
        .is("check_out_time", null)
        .is("deleted_at", null)
        .single()

      if (activeCheckIn) {
        throw new Error("Member already has an active check-in. Please check out first.")
      }

      const { withCreatedBy } = await import("@/lib/audit")

      // Create attendance record
      const checkInTime = new Date(data.check_in_time as string).toISOString()
      const attendanceDate = (data.check_in_time as string).split("T")[0]

      const attendanceData = withCreatedBy(
        {
          owner_id: workspace.owner_user_id,
          workspace_id: workspaceId,
          member_id: data.member_id,
          membership_id: selectedMember.current_subscription_id,
          attendance_date: attendanceDate,
          check_in_time: checkInTime,
          seat_id: data.seat_id || null,
          notes: data.notes || null,
        },
        userId
      )

      const { data: newAttendance, error } = await supabase
        .from("library_attendance")
        .insert(attendanceData)
        .select()
        .single()

      if (error) {
        throw new Error(error.message)
      }

      // If seat was assigned, update seat status to occupied
      if (data.seat_id) {
        const { error: seatError } = await supabase
          .from("library_seats")
          .update({
            status: "occupied",
            current_member_id: data.member_id,
            updated_at: new Date().toISOString(),
          })
          .eq("id", data.seat_id)

        if (seatError) {
          console.error("Error updating seat status:", seatError)
          // Don't fail the check-in, just log the error
        }
      }

      const selectedSeat = seats.find(s => s.id === data.seat_id)
      const seatInfo = selectedSeat ? ` at seat ${selectedSeat.seat_number}` : ""
      const { showSuccess } = await import("@/lib/toast-helpers")
      showSuccess(`${selectedMember.name} checked in${seatInfo} successfully!`)

      return `/library-attendance/${newAttendance.id}`
    },
  })

  const preselectedMember = searchParams.get("member")

  useEffect(() => {
    async function fetchData() {
      if (!workspaceId) return

      const supabase = createClient()

      // Fetch libraries
      const { data: librariesData } = await supabase
        .from("libraries")
        .select("id, name")
        .eq("workspace_id", workspaceId)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      setLibraries(librariesData || [])

      // Fetch active members
      const { data: membersData } = await supabase
        .from("library_members")
        .select("id, name, member_code, status, hours_balance, library_id, current_subscription_id")
        .eq("workspace_id", workspaceId)
        .eq("status", "active")
        .is("deleted_at", null)
        .order("name")

      setMembers(membersData || [])

      // If preselected member, set form data
      if (preselectedMember && membersData) {
        const member = membersData.find((m: MemberOption) => m.id === preselectedMember)
        if (member) {
          setSelectedMember(member)
          setFormData((prev) => ({
            ...prev,
            member_id: member.id,
            library_id: member.library_id,
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
        .from("library_seats")
        .select(`
          id,
          seat_number,
          has_power_outlet,
          section:library_sections!library_seats_section_id_fkey(
            id,
            name,
            is_ac,
            library_id
          )
        `)
        .eq("status", "available")
        .is("deleted_at", null)

      // Filter seats for this library and transform
      const availableSeats: SeatOption[] = (seatsData || [])
        .map((seat: { id: string; seat_number: string; has_power_outlet: boolean; section: { id: string; name: string; is_ac: boolean; library_id: string } | { id: string; name: string; is_ac: boolean; library_id: string }[] | null }) => {
          const section = transformJoin(seat.section)
          if (!section || section.library_id !== libraryId) return null
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
      console.error("Error fetching seats:", error)
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
      library_id: member?.library_id || prev.library_id,
      seat_id: "", // Reset seat when member changes
    }))

    // Fetch available seats for the member's library
    if (member?.library_id) {
      fetchAvailableSeats(member.library_id)
    } else {
      setSeats([])
    }
  }

  if (loadingData) {
    return <PageLoading message="Loading..." />
  }

  const memberOptions: ComboboxOption[] = members.map((m) => ({
    value: m.id,
    label: m.name + (m.member_code ? ` (${m.member_code})` : "") + ` - ${m.hours_balance.toFixed(1)}h remaining`,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/library-attendance">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Check In</h1>
          <p className="text-muted-foreground">
            Record member attendance
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Check-In Details</CardTitle>
                <CardDescription>
                  Select a member and record their check-in time
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Member Selection */}
            <div className="space-y-2">
              <Label htmlFor="member_id">Select Member *</Label>
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
            </div>

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
                    <p className="font-medium">{selectedMember.name}</p>
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
                      <Link href={`/library-members/${selectedMember.id}/renew`} className="text-sm text-primary hover:underline">
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
            <div className="space-y-2">
              <Label htmlFor="check_in_time">Check-In Time *</Label>
              <Input
                id="check_in_time"
                name="check_in_time"
                type="datetime-local"
                value={formData.check_in_time as string}
                onChange={(e) => setFormData((prev) => ({ ...prev, check_in_time: e.target.value }))}
                required
                disabled={saving}
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes..."
                value={formData.notes as string}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                disabled={saving}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href="/library-attendance">
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={saving || members.length === 0 || (selectedMember?.hours_balance ?? 0) <= 0}
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking In...
              </>
            ) : (
              "Check In"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
