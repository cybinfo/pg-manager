/**
 * Entity Seat Detail Page
 *
 * Shows seat details with current assignment.
 */

"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useDetailPage, LIBRARY_SEAT_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { useAuth } from "@/lib/auth"
import { softDelete, withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { PermissionGate, FeatureGuard } from "@/components/auth"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  DetailPageTemplate,
  NotFoundState,
  EmptyState,
} from "@/components/ui"
import { StatusBadge } from "@/components/ui/status-badge"
import { TableBadge } from "@/components/ui/data-table"
import { PageLoading } from "@/components/ui/loading"
import {
  Armchair,
  Users,
  Grid3X3,
  Pencil,
  Trash2,
  Zap,
  Lightbulb,
  Square,
  CalendarPlus,
  X,
  Loader2,
  Phone,
} from "lucide-react"
import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { formatDate } from "@/lib/format"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { LIBRARY_SEAT_STATUS_CONFIG } from "@/types/library.types"
import type { LibrarySeat } from "@/types/library.types"
import { logger } from "@/lib/logger"
import { getTodayISO } from "@/lib/date-helpers"

interface Reservation {
  id: string
  reserved_date: string
  start_time: string | null
  end_time: string | null
  status: string
  member: { id: string; name: string; member_code: string | null } | null
}

interface MemberOption {
  id: string
  name: string
  member_code: string | null
}

export default function EntitySeatDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { workspaceId } = useAuthContext()
  const { confirm, ConfirmDialogElement } = useConfirmDialog()

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [reservationMembers, setReservationMembers] = useState<MemberOption[]>([])
  const [showReserveForm, setShowReserveForm] = useState(false)
  const [reservationLoading, setReservationLoading] = useState(false)
  const [newReservation, setNewReservation] = useState({
    member_id: "",
    reserved_date: "",
    start_time: "",
    end_time: "",
  })

  const fetchReservations = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from("entity_seat_reservations")
      .select("id, reserved_date, start_time, end_time, status, member:entity_members(id, name, member_code)")
      .eq("seat_id", params.id as string)
      .is("deleted_at", null)
      .gte("reserved_date", getTodayISO())
      .order("reserved_date", { ascending: true })
      .limit(20)
    setReservations((data || []) as unknown as Reservation[])
  }

  useEffect(() => {
    if (!workspaceId) return
    const supabase = createClient()
    supabase
      .from("entity_members")
      .select("id, name, member_code")
      .eq("workspace_id", workspaceId)
      .eq("status", "active")
      .is("deleted_at", null)
      .order("name")
      .then(({ data }: { data: MemberOption[] | null }) => setReservationMembers(data || []))

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReservations()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workspaceId, params.id])

  const handleAddReservation = async () => {
    if (!user?.id || !workspaceId || !newReservation.member_id || !newReservation.reserved_date) {
      showError("Member and date are required")
      return
    }
    setReservationLoading(true)
    const supabase = createClient()
    const { error } = await supabase
      .from("entity_seat_reservations")
      .insert(withCreatedBy({
        workspace_id: workspaceId,
        seat_id: params.id as string,
        member_id: newReservation.member_id,
        reserved_date: newReservation.reserved_date,
        start_time: newReservation.start_time || null,
        end_time: newReservation.end_time || null,
        status: "confirmed",
      }, user.id))
    if (error) {
      showError(error.message)
    } else {
      showSuccess("Reservation added")
      setShowReserveForm(false)
      setNewReservation({ member_id: "", reserved_date: "", start_time: "", end_time: "" })
      fetchReservations()
    }
    setReservationLoading(false)
  }

  const handleCancelReservation = async (reservationId: string) => {
    const supabase = createClient()
    const { error } = await supabase
      .from("entity_seat_reservations")
      .update({ status: "cancelled" })
      .eq("id", reservationId)
    if (error) {
      showError(error.message)
    } else {
      showSuccess("Reservation cancelled")
      fetchReservations()
    }
  }

  const handleDelete = () => {
    if (!user?.id) return
    confirm({
      title: "Delete Seat",
      description: "Are you sure you want to delete this seat? This action cannot be undone.",
      destructive: true,
      onConfirm: async () => {
        try {
          const result = await softDelete("entity_seats", params.id as string, user.id)
          if (!result.error) {
            showSuccess("Seat deleted successfully")
            router.push("/entity-seats")
          } else {
            showError(result.error.message || "Failed to delete seat")
          }
        } catch (error) {
          logger.error("Failed to load seat data", { error: String(error) })
          showError("Failed to delete seat")
        }
      },
    })
  }

  const {
    data: seat,
    loading,
  } = useDetailPage<LibrarySeat>({
    config: LIBRARY_SEAT_DETAIL_CONFIG,
    id: params.id as string,
  })

  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/entity-seats", defaultLabel: "All Seats" })

  if (loading) {
    return <PageLoading message="Loading seat details..." />
  }

  if (!seat) {
    return <NotFoundState title="Seat not found" backHref="/entity-seats" backLabel="All Seats" />
  }

  const statusConfig = LIBRARY_SEAT_STATUS_CONFIG[seat.status as keyof typeof LIBRARY_SEAT_STATUS_CONFIG]

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={`Seat ${seat.seat_number}`}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {seat.section?.name && (
              <Link href={`/entity-sections/${seat.section.id}`} className="hover:text-primary hover:underline">
                {seat.section.name}
              </Link>
            )}
            {seat.row_number && (
              <span>Row: {seat.row_number}</span>
            )}
          </div>
        }
        backHref={backHref}
        backLabel={backLabel}
        breadcrumbs={[
          { label: "Library Seats", href: "/entity-seats" },
          { label: `Seat ${seat.seat_number}` },
        ]}
        status={statusConfig?.variant || "muted"}
        avatar={
          <div className={`p-3 rounded-xl ${
            seat.status === "available" ? "bg-success/10" :
            seat.status === "occupied" ? "bg-info/10" :
            seat.status === "reserved" ? "bg-warning/10" : "bg-muted"
          }`}>
            <Armchair className={`h-8 w-8 ${
              seat.status === "available" ? "text-success" :
              seat.status === "occupied" ? "text-info" :
              seat.status === "reserved" ? "text-warning" : "text-muted-foreground"
            }`} />
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <PermissionGate permission="entity_seats.edit" hide>
              <Link href={`/entity-seats/${seat.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate permission="entity_seats.edit" hide>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
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
          value={statusConfig?.label || seat.status}
          icon={Armchair}
          variant={statusConfig?.variant || "default"}
        />
        <InfoCard
          label="Row"
          value={seat.row_number || "—"}
          icon={Grid3X3}
          variant="default"
        />
        <InfoCard
          label="Power Outlet"
          value={seat.has_power_outlet ? "Yes" : "No"}
          icon={Zap}
          variant={seat.has_power_outlet ? "success" : "muted"}
        />
        <InfoCard
          label="Window Seat"
          value={seat.is_window_seat ? "Yes" : "No"}
          icon={Square}
          variant={seat.is_window_seat ? "success" : "muted"}
        />
      </div>

      <DetailPageTemplate layoutKey="library-seat-detail" entityType="library_seat" record={seat}>
        {/* Seat Details */}
        <DetailSection
          title="Seat Details"
          description="Location and identification"
          icon={Armchair}
        >
          <InfoRow label="Seat Number" value={seat.seat_number} icon={Armchair} />
          {seat.row_number && (
            <InfoRow label="Row" value={seat.row_number} icon={Grid3X3} />
          )}
          {seat.section && (
            <InfoRow
              label="Section"
              value={
                <Link href={`/entity-sections/${seat.section.id}`} className="text-primary hover:underline">
                  {seat.section.name}
                </Link>
              }
              icon={Grid3X3}
            />
          )}
          <InfoRow
            label="Status"
            value={
              <StatusBadge
                status={statusConfig?.variant || "muted"}
                label={statusConfig?.label || seat.status}
                size="sm"
              />
            }
          />
        </DetailSection>

        {/* Features */}
        <DetailSection
          title="Features"
          description="Seat amenities"
          icon={Zap}
        >
          <InfoRow
            label="Power Outlet"
            value={seat.has_power_outlet ? "Available" : "Not available"}
            icon={Zap}
          />
          <InfoRow
            label="Desk Lamp"
            value={seat.has_lamp ? "Available" : "Not available"}
            icon={Lightbulb}
          />
          <InfoRow
            label="Window Seat"
            value={seat.is_window_seat ? "Yes" : "No"}
            icon={Square}
          />
        </DetailSection>

        {/* Current Assignment */}
        {seat.status === "occupied" && seat.current_member && (
          <FeatureGuard module="seats" feature="seatAssignment">
            <DetailSection
              title="Current Assignment"
              description="Currently assigned to"
              icon={Users}
            >
              <Link href={`/entity-members/${seat.current_member.id}`}>
                <div className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={seat.current_member.person?.name || seat.current_member.name}
                      src={seat.current_member.person?.photo_url}
                      size="md"
                    />
                    <div>
                      <p className="font-medium">
                        {seat.current_member.person?.name || seat.current_member.name}
                      </p>
                      {(seat.current_member.person?.phone || seat.current_member.phone) && (
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {seat.current_member.person?.phone || seat.current_member.phone}
                        </p>
                      )}
                      {seat.current_member.member_code && (
                        <p className="text-xs text-muted-foreground font-mono">
                          {seat.current_member.member_code}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            </DetailSection>
          </FeatureGuard>
        )}
        {/* Seat Reservations */}
        <FeatureGuard module="seats" feature="seatReservation">
          <DetailSection
            title="Upcoming Reservations"
            description="Advance seat bookings"
            icon={CalendarPlus}
            actions={
              <PermissionGate permission="entity_seats.edit" hide>
                <Button size="sm" variant="outline" onClick={() => setShowReserveForm((v) => !v)}>
                  <CalendarPlus className="h-4 w-4 mr-1" />
                  Reserve Seat
                </Button>
              </PermissionGate>
            }
          >
            {showReserveForm && (
              <div className="mb-4 p-4 border rounded-lg bg-muted/30 space-y-3">
                <Label className="text-sm font-medium">New Reservation</Label>
                <Combobox
                  options={reservationMembers.map((m): ComboboxOption => ({
                    value: m.id,
                    label: m.name + (m.member_code ? ` (${m.member_code})` : ""),
                  }))}
                  value={newReservation.member_id}
                  onValueChange={(v) => setNewReservation((p) => ({ ...p, member_id: v }))}
                  placeholder="Select member..."
                  disabled={reservationLoading}
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <DatePicker
                      value={newReservation.reserved_date}
                      onChange={(val) => setNewReservation((p) => ({ ...p, reserved_date: val }))}
                      disabled={reservationLoading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Start Time (Optional)</Label>
                    <Input
                      type="time"
                      value={newReservation.start_time}
                      onChange={(e) => setNewReservation((p) => ({ ...p, start_time: e.target.value }))}
                      disabled={reservationLoading}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End Time (Optional)</Label>
                    <Input
                      type="time"
                      value={newReservation.end_time}
                      onChange={(e) => setNewReservation((p) => ({ ...p, end_time: e.target.value }))}
                      disabled={reservationLoading}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddReservation} disabled={reservationLoading}>
                    {reservationLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Confirm Reservation
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowReserveForm(false)} disabled={reservationLoading}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
            {reservations.length === 0 ? (
              <EmptyState variant="minimal" icon={CalendarPlus} title="No upcoming reservations" />
            ) : (
              <div className="space-y-2">
                {reservations.map((r) => (
                  <div key={r.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium text-sm">{(r.member as MemberOption | null)?.name || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(r.reserved_date)}
                        {r.start_time && r.end_time && ` · ${r.start_time}–${r.end_time}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <TableBadge variant={r.status === "confirmed" ? "success" : "muted"}>
                        {r.status}
                      </TableBadge>
                      {r.status === "confirmed" && (
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive" onClick={() => handleCancelReservation(r.id)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </DetailSection>
        </FeatureGuard>

      </DetailPageTemplate>

      {ConfirmDialogElement}
    </div>
  )
}
