/**
 * Library Locker Detail Page
 *
 * Shows locker details with assignment history.
 */

"use client"

import { useState } from "react"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useDetailPage, LIBRARY_LOCKER_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { useAuth } from "@/lib/auth"
import { softDelete } from "@/lib/audit"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { PermissionGate, FeatureGuard } from "@/components/auth"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  DetailListSection,
  DetailPageTemplate,
} from "@/components/ui"
import { StatusBadge } from "@/components/ui/status-badge"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Lock,
  Users,
  Calendar,
  Pencil,
  Trash2,
  MapPin,
  Wallet,
  Package,
  UserPlus,
  UserMinus,
  Loader2,
} from "lucide-react"
import { formatDate } from "@/lib/format"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import {
  LIBRARY_LOCKER_STATUS_CONFIG,
  LIBRARY_LOCKER_SIZE_CONFIG,
} from "@/types/library.types"
import type { LibraryLocker, LibraryLockerAssignment } from "@/types/library.types"
import { getTodayISO, getNowISO } from "@/lib/date-helpers"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { logger } from "@/lib/logger"

export default function LibraryLockerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const searchParams = useSearchParams()
  const forMemberId = searchParams.get("for_member")
  const [unassigning, setUnassigning] = useState(false)

  const {
    data: locker,
    related,
    loading,
    refetch,
  } = useDetailPage<LibraryLocker>({
    config: LIBRARY_LOCKER_DETAIL_CONFIG,
    id: params.id as string,
  })

  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/library-lockers", defaultLabel: "All Lockers" })

  const handleUnassign = async () => {
    if (!locker?.current_member_id) return

    setUnassigning(true)
    try {
      const supabase = createClient()

      // End the current assignment
      const { error: assignmentError } = await supabase
        .from("library_locker_assignments")
        .update({
          status: "ended",
          end_date: getTodayISO(),
          updated_at: getNowISO(),
        })
        .eq("locker_id", locker.id)
        .eq("member_id", locker.current_member_id)
        .eq("status", "active")

      if (assignmentError) {
        logger.error("Error ending assignment:", { detail: assignmentError })
        showError(`Failed to end assignment: ${assignmentError.message}`)
        return
      }

      // Update locker status
      const { error: lockerError } = await supabase
        .from("library_lockers")
        .update({
          status: "available",
          current_member_id: null,
          assigned_from: null,
          assigned_until: null,
          updated_at: getNowISO(),
        })
        .eq("id", locker.id)

      if (lockerError) {
        logger.error("Error updating locker:", { detail: lockerError })
        showError(`Failed to update locker: ${lockerError.message}`)
        return
      }

      // Remove locker from member
      const { error: memberError } = await supabase
        .from("library_members")
        .update({
          locker_id: null,
          updated_at: getNowISO(),
        })
        .eq("id", locker.current_member_id)

      if (memberError) {
        logger.error("Error updating member:", { detail: memberError })
        // Don't fail the whole operation
      }

      showSuccess("Locker unassigned successfully!")
      refetch()
    } catch (error) {
      handleClientError(error, "Unassigning locker")
    } finally {
      setUnassigning(false)
    }
  }

  if (loading) {
    return <PageLoading message="Loading locker details..." />
  }

  if (!locker) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-lg font-semibold">Not Found</h2>
          <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
        </div>
      )
  }

  const assignments = (related.assignments || []) as LibraryLockerAssignment[]
  const statusConfig = LIBRARY_LOCKER_STATUS_CONFIG[locker.status as keyof typeof LIBRARY_LOCKER_STATUS_CONFIG]
  const sizeConfig = LIBRARY_LOCKER_SIZE_CONFIG[locker.size as keyof typeof LIBRARY_LOCKER_SIZE_CONFIG]

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={`Locker #${locker.locker_number}`}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {locker.library?.name && (
              <Link href={`/library/${locker.library.id}`} className="hover:text-primary hover:underline">
                {locker.library.name}
              </Link>
            )}
            {locker.section && (
              <span>Section: {locker.section}</span>
            )}
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
              locker.size === "large" ? "bg-info/10 text-info" :
              locker.size === "medium" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" :
              "bg-muted text-muted-foreground"
            }`}>
              {sizeConfig?.label || locker.size}
            </span>
          </div>
        }
        backHref={backHref}
        backLabel={backLabel}
        status={statusConfig?.variant || "muted"}
        avatar={
          <div className={`p-3 rounded-xl ${
            locker.status === "available" ? "bg-success/10" :
            locker.status === "occupied" ? "bg-info/10" : "bg-muted"
          }`}>
            <Lock className={`h-8 w-8 ${
              locker.status === "available" ? "text-success" :
              locker.status === "occupied" ? "text-info" : "text-muted-foreground"
            }`} />
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {locker.status === "available" && (
              <Link href={`/library-lockers/${locker.id}/assign${forMemberId ? `?member=${forMemberId}` : ""}`}>
                <Button size="sm">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Assign
                </Button>
              </Link>
            )}
            {locker.status === "occupied" && locker.current_member_id && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" disabled={unassigning}>
                    {unassigning ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <UserMinus className="mr-2 h-4 w-4" />
                    )}
                    Unassign
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Unassign Locker?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will remove the locker from {locker.current_member?.name || "the current member"}.
                      The assignment will be marked as ended.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleUnassign}>
                      Unassign
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <PermissionGate permission="library_lockers.edit" hide>
              <Link href={`/library-lockers/${locker.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate permission="library_lockers.edit" hide>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (!user?.id) return
                  confirm({
                    title: "Delete Locker",
                    description: "Are you sure you want to delete this locker? This action cannot be undone.",
                    destructive: true,
                    onConfirm: async () => {
                      try {
                        const result = await softDelete("library_lockers", params.id as string, user.id)
                        if (!result.error) {
                          showSuccess("Locker deleted successfully")
                          router.push("/library-lockers")
                        } else {
                          showError(result.error.message || "Failed to delete locker")
                        }
                      } catch (error) {
                        logger.error("Failed to load locker data", { error: String(error) })
                        showError("Failed to delete locker")
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
          label="Status"
          value={statusConfig?.label || locker.status}
          icon={Lock}
          variant={statusConfig?.variant || "default"}
        />
        <InfoCard
          label="Size"
          value={sizeConfig?.label || locker.size}
          icon={Package}
          variant="default"
        />
        <InfoCard
          label="Monthly Rent"
          value={locker.monthly_rent ? <Currency amount={locker.monthly_rent} /> : "—"}
          icon={Wallet}
          variant="default"
        />
        <InfoCard
          label="Deposit"
          value={locker.deposit_amount ? <Currency amount={locker.deposit_amount} /> : "—"}
          icon={Wallet}
          variant="default"
        />
      </div>

      <DetailPageTemplate layoutKey="library-locker-detail" entityType="library_locker" record={locker}>
        {/* Locker Details */}
        <DetailSection
          title="Locker Details"
          description="Location and pricing"
          icon={Lock}
        >
          <InfoRow label="Locker Number" value={`#${locker.locker_number}`} icon={Lock} />
          <InfoRow label="Size" value={sizeConfig?.label || locker.size} icon={Package} />
          <InfoRow label="Floor" value={locker.floor === 0 ? "Ground Floor" : `Floor ${locker.floor}`} icon={MapPin} />
          {locker.section && (
            <InfoRow label="Section" value={locker.section} icon={MapPin} />
          )}
          {locker.library && (
            <InfoRow
              label="Library"
              value={
                <Link href={`/library/${locker.library.id}`} className="text-primary hover:underline">
                  {locker.library.name}
                </Link>
              }
            />
          )}
        </DetailSection>

        {/* Pricing */}
        <DetailSection
          title="Pricing"
          description="Rent and deposit"
          icon={Wallet}
        >
          <InfoRow
            label="Monthly Rent"
            value={locker.monthly_rent ? <Currency amount={locker.monthly_rent} /> : "Not set"}
            icon={Wallet}
          />
          <InfoRow
            label="Deposit Amount"
            value={locker.deposit_amount ? <Currency amount={locker.deposit_amount} /> : "Not set"}
            icon={Wallet}
          />
        </DetailSection>

        {/* Current Assignment */}
        {locker.status === "occupied" && locker.current_member && (
          <DetailSection
            title="Current Assignment"
            description="Currently assigned to"
            icon={Users}
          >
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Link
                  href={`/library-members/${locker.current_member.id}`}
                  className="font-semibold hover:text-primary hover:underline"
                >
                  {locker.current_member.name}
                </Link>
                {locker.current_member.member_code && (
                  <p className="text-sm text-muted-foreground font-mono">
                    {locker.current_member.member_code}
                  </p>
                )}
              </div>
            </div>
            {locker.assigned_from && (
              <InfoRow
                label="Assigned From"
                value={formatDate(locker.assigned_from)}
                icon={Calendar}
              />
            )}
            {locker.assigned_until && (
              <InfoRow
                label="Assigned Until"
                value={formatDate(locker.assigned_until)}
                icon={Calendar}
              />
            )}
          </DetailSection>
        )}

        {/* Assignment History */}
        <FeatureGuard module="lockers" feature="lockerHistory">
          <DetailListSection
            title="Assignment History"
            description="Past and current assignments"
            icon={Users}
            items={assignments}
            keyExtractor={(assignment) => assignment.id}
            renderItem={(assignment) => (
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div>
                  <p className="font-medium text-sm">
                    {(assignment.member as { name?: string })?.name || "Unknown Member"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(assignment.start_date)}
                    {assignment.end_date && ` - ${formatDate(assignment.end_date)}`}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge
                    status={assignment.status === "active" ? "success" : "muted"}
                    label={assignment.status}
                    size="sm"
                  />
                  {assignment.rent_amount && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <Currency amount={assignment.rent_amount} />/mo
                    </p>
                  )}
                </div>
              </div>
            )}
            initialLimit={5}
            viewAllMode="expand"
            emptyIcon={Users}
            emptyText="No assignment history"
          />
        </FeatureGuard>
      </DetailPageTemplate>

      {ConfirmDialogElement}
    </div>
  )
}
