/**
 * Library Attendance Detail Page
 *
 * Shows attendance record details with member info.
 */

"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useDetailPage, LIBRARY_ATTENDANCE_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { useAuth } from "@/lib/auth"
import { softDelete } from "@/lib/audit"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { PermissionGate } from "@/components/auth"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  DetailPageTemplate,
} from "@/components/ui"
import { StatusBadge } from "@/components/ui/status-badge"
import { PageLoading } from "@/components/ui/loading"
import { Avatar } from "@/components/ui/avatar"
import {
  Clock,
  Users,
  Calendar,
  Armchair,
  LogIn,
  LogOut,
  Loader2,
  Trash2,
  Edit,
} from "lucide-react"
import { formatDate } from "@/lib/format"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getNowISO } from "@/lib/date-helpers"
import { handleClientError } from "@/lib/error-handler"
import type { LibraryAttendance } from "@/types/library.types"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { logger } from "@/lib/logger"

export default function LibraryAttendanceDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const [checkingOut, setCheckingOut] = useState(false)

  const {
    data: attendance,
    loading,
    refetch,
  } = useDetailPage<LibraryAttendance>({
    config: LIBRARY_ATTENDANCE_DETAIL_CONFIG,
    id: params.id as string,
  })

  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/library-attendance", defaultLabel: "All Attendance" })

  const handleCheckOut = async () => {
    if (!attendance) return

    setCheckingOut(true)
    try {
      const supabase = createClient()
      const checkOutTime = getNowISO()
      const checkInTime = new Date(attendance.check_in_time)
      const hoursSpent = (new Date(checkOutTime).getTime() - checkInTime.getTime()) / (1000 * 60 * 60)

      // Update attendance record
      const { error: attendanceError } = await supabase
        .from("library_attendance")
        .update({
          check_out_time: checkOutTime,
          hours_spent: Math.round(hoursSpent * 100) / 100, // Round to 2 decimal places
          updated_at: checkOutTime,
        })
        .eq("id", attendance.id)

      if (attendanceError) {
        logger.error("Error checking out:", { detail: attendanceError })
        showError(`Failed to check out: ${attendanceError.message}`)
        return
      }

      // Update member hours if they have hours balance
      if (attendance.member_id) {
        const { data: member } = await supabase
          .from("library_members")
          .select("hours_balance, hours_used")
          .eq("id", attendance.member_id)
          .single()

        if (member) {
          await supabase
            .from("library_members")
            .update({
              hours_used: (member.hours_used || 0) + hoursSpent,
              hours_balance: Math.max(0, (member.hours_balance || 0) - hoursSpent),
              updated_at: checkOutTime,
            })
            .eq("id", attendance.member_id)
        }

        // Update membership hours if applicable
        if (attendance.membership_id) {
          const { data: membership } = await supabase
            .from("library_memberships")
            .select("hours_used, hours_remaining")
            .eq("id", attendance.membership_id)
            .single()

          if (membership) {
            await supabase
              .from("library_memberships")
              .update({
                hours_used: (membership.hours_used || 0) + hoursSpent,
                hours_remaining: membership.hours_remaining !== null
                  ? Math.max(0, membership.hours_remaining - hoursSpent)
                  : null,
                updated_at: checkOutTime,
              })
              .eq("id", attendance.membership_id)
          }
        }
      }

      // Release seat if one was assigned
      if (attendance.seat_id) {
        await supabase
          .from("library_seats")
          .update({
            status: "available",
            current_member_id: null,
            updated_at: checkOutTime,
          })
          .eq("id", attendance.seat_id)
      }

      showSuccess(`Checked out successfully! Duration: ${hoursSpent.toFixed(1)} hours`)
      refetch()
    } catch (error) {
      handleClientError(error, "Checking out")
    } finally {
      setCheckingOut(false)
    }
  }

  if (loading) {
    return <PageLoading message="Loading attendance record..." />
  }

  if (!attendance) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-lg font-semibold">Not Found</h2>
          <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
        </div>
      )
  }

  const displayName = attendance.member?.person?.name || attendance.member?.name || "Unknown"
  const photoUrl = attendance.member?.person?.photo_url
  const isActive = !attendance.check_out_time

  // Format times
  const checkInTime = new Date(attendance.check_in_time).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  })
  const checkOutTime = attendance.check_out_time
    ? new Date(attendance.check_out_time).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
    : null

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={displayName}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span>{formatDate(attendance.attendance_date)}</span>
            {attendance.member?.member_code && (
              <span className="font-mono bg-muted px-2 py-0.5 rounded">
                {attendance.member.member_code}
              </span>
            )}
            {isActive ? (
              <StatusBadge status="success" label="Currently Checked In" size="sm" />
            ) : (
              <StatusBadge status="muted" label="Checked Out" size="sm" />
            )}
          </div>
        }
        backHref={backHref}
        backLabel={backLabel}
        status={isActive ? "success" : "muted"}
        avatar={
          <Avatar name={displayName} src={photoUrl} size="xl" />
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {isActive && (
              <Button size="sm" onClick={handleCheckOut} disabled={checkingOut}>
                {checkingOut ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking Out...
                  </>
                ) : (
                  <>
                    <LogOut className="mr-2 h-4 w-4" />
                    Check Out
                  </>
                )}
              </Button>
            )}
            {attendance.member && (
              <Link href={`/library-members/${attendance.member.id}`}>
                <Button variant="outline" size="sm">
                  <Users className="mr-2 h-4 w-4" />
                  View Member
                </Button>
              </Link>
            )}
            <PermissionGate permission="library_attendance.edit" hide>
              <Link href={`/library-attendance/${params.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate permission="library_attendance.edit" hide>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (!user?.id) return
                  confirm({
                    title: "Delete Attendance Record",
                    description: "Are you sure you want to delete this attendance record? This action cannot be undone.",
                    destructive: true,
                    onConfirm: async () => {
                      try {
                        const result = await softDelete("library_attendance", params.id as string, user.id)
                        if (!result.error) {
                          showSuccess("Attendance record deleted successfully")
                          router.push("/library-attendance")
                        } else {
                          showError(result.error.message || "Failed to delete attendance record")
                        }
                      } catch {
                        showError("Failed to delete attendance record")
                      }
                    },
                  })
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </PermissionGate>
          </div>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          label="Check In"
          value={checkInTime}
          icon={LogIn}
          variant="success"
        />
        <InfoCard
          label="Check Out"
          value={checkOutTime || "Still Active"}
          icon={LogOut}
          variant={isActive ? "warning" : "default"}
        />
        <InfoCard
          label="Duration"
          value={attendance.hours_spent ? `${attendance.hours_spent.toFixed(1)}h` : "—"}
          icon={Clock}
          variant="default"
        />
        <InfoCard
          label="Date"
          value={formatDate(attendance.attendance_date)}
          icon={Calendar}
          variant="default"
        />
      </div>

      <DetailPageTemplate layoutKey="library-attendance-detail" entityType="library_attendance" record={attendance}>
        {/* Member Info */}
        {attendance.member && (
          <DetailSection
            title="Member Information"
            description="Attendance for member"
            icon={Users}
          >
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <Avatar name={displayName} src={photoUrl} size="lg" />
              <div>
                <Link
                  href={`/library-members/${attendance.member.id}`}
                  className="font-semibold text-lg hover:text-primary hover:underline"
                >
                  {displayName}
                </Link>
                {attendance.member.member_code && (
                  <p className="text-sm text-muted-foreground font-mono">
                    {attendance.member.member_code}
                  </p>
                )}
              </div>
            </div>
          </DetailSection>
        )}

        {/* Attendance Details */}
        <DetailSection
          title="Attendance Details"
          description="Check-in and check-out times"
          icon={Clock}
        >
          <InfoRow
            label="Date"
            value={formatDate(attendance.attendance_date)}
            icon={Calendar}
          />
          <InfoRow
            label="Check In Time"
            value={checkInTime}
            icon={LogIn}
          />
          <InfoRow
            label="Check Out Time"
            value={checkOutTime || "Not checked out yet"}
            icon={LogOut}
          />
          <InfoRow
            label="Duration"
            value={attendance.hours_spent ? `${attendance.hours_spent.toFixed(2)} hours` : "In progress"}
            icon={Clock}
          />
          <InfoRow
            label="Status"
            value={
              <StatusBadge
                status={isActive ? "success" : "muted"}
                label={isActive ? "Active" : "Completed"}
                size="sm"
              />
            }
          />
        </DetailSection>

        {/* Seat Info */}
        {attendance.seat && (
          <DetailSection
            title="Seat Information"
            description="Assigned seat during visit"
            icon={Armchair}
          >
            <InfoRow
              label="Seat Number"
              value={attendance.seat.seat_number}
              icon={Armchair}
            />
          </DetailSection>
        )}

        {/* Notes */}
        {attendance.notes && (
          <DetailSection
            title="Notes"
            description="Additional information"
            icon={Clock}
          >
            <p className="text-sm whitespace-pre-wrap">{attendance.notes}</p>
          </DetailSection>
        )}
      </DetailPageTemplate>

      {ConfirmDialogElement}
    </div>
  )
}
