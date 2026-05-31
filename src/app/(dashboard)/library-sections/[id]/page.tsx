/**
 * Library Section Detail Page
 *
 * Shows section information with all seats.
 */

"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useDetailPage, LIBRARY_SECTION_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { useAuth } from "@/lib/auth"
import { softDelete } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { PermissionGate, FeatureGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  DetailListSection,
  DetailPageTemplate,
  NotFoundState,
} from "@/components/ui"
import { Currency } from "@/components/ui/currency"
import { StatusBadge } from "@/components/ui/status-badge"
import { TableBadge } from "@/components/ui/data-table"
import { Avatar } from "@/components/ui/avatar"
import { PageLoading } from "@/components/ui/loading"
import {
  Grid3X3,
  Armchair,
  Plus,
  Pencil,
  Trash2,
  Plug,
  Lightbulb,
} from "lucide-react"
import { OCCUPANCY_STATUS_COLORS } from "@/lib/status"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import type { LibrarySection, LibrarySeat } from "@/types/library.types"

export default function LibrarySectionDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { confirm, ConfirmDialogElement } = useConfirmDialog()

  const handleDelete = () => {
    if (!user?.id) return
    confirm({
      title: "Delete Section",
      description: "Are you sure you want to delete this section? This action cannot be undone.",
      destructive: true,
      onConfirm: async () => {
        try {
          const result = await softDelete("library_sections", params.id as string, user.id)
          if (!result.error) {
            showSuccess("Section deleted successfully")
            router.push("/library-sections")
          } else {
            showError(result.error.message || "Failed to delete section")
          }
        } catch {
          showError("Failed to delete section")
        }
      },
    })
  }

  const {
    data: section,
    related,
    loading,
  } = useDetailPage<LibrarySection>({
    config: LIBRARY_SECTION_DETAIL_CONFIG,
    id: params.id as string,
  })

  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/library-sections", defaultLabel: "All Sections" })

  if (loading) {
    return <PageLoading message="Loading section details..." />
  }

  if (!section) {
    return <NotFoundState title="Section not found" backHref="/library-sections" backLabel="All Sections" />
  }

  const seats = (related.seats || []) as LibrarySeat[]

  // Calculate stats
  const availableSeats = section.total_seats - section.occupied_seats
  const occupancyRate = section.total_seats > 0
    ? Math.round((section.occupied_seats / section.total_seats) * 100)
    : 0

  // Group seats by row
  const seatsByRow = seats.reduce((acc, seat) => {
    const row = seat.row_number || "Unassigned"
    if (!acc[row]) acc[row] = []
    acc[row].push(seat)
    return acc
  }, {} as Record<string, LibrarySeat[]>)

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={section.name}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {section.library?.name && (
              <Link href={`/library/${section.library.id}`} className="hover:text-primary hover:underline">
                {section.library.name}
              </Link>
            )}
            {section.floor > 0 && <span>Floor {section.floor}</span>}
            <TableBadge variant={section.is_ac ? "info" : "muted"}>
              {section.is_ac ? "AC" : "Non-AC"}
            </TableBadge>
          </div>
        }
        backHref={backHref}
        backLabel={backLabel}
        breadcrumbs={[
          { label: "Library Sections", href: "/library-sections" },
          { label: section.name || "Details" },
        ]}
        status={section.is_active ? "active" : "inactive"}
        avatar={
          <div className="p-3 bg-primary/10 rounded-lg">
            <Grid3X3 className="h-8 w-8 text-primary" />
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <PermissionGate permission="library_sections.edit" hide>
              <Link href={`/library-sections/${section.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate permission="library_sections.delete" hide>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </PermissionGate>
            <Link href={`/library-sections/${section.id}/seats/new`}>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Seats
              </Button>
            </Link>
          </div>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          label="Total Seats"
          value={section.total_seats}
          icon={Armchair}
          variant="default"
        />
        <InfoCard
          label="Available"
          value={availableSeats}
          icon={Armchair}
          variant={availableSeats > 0 ? "success" : "warning"}
        />
        <InfoCard
          label="Occupied"
          value={section.occupied_seats}
          icon={Armchair}
          variant="warning"
        />
        <InfoCard
          label="Occupancy"
          value={`${occupancyRate}%`}
          icon={Grid3X3}
          variant={occupancyRate >= 80 ? "warning" : "default"}
        />
      </div>

      <DetailPageTemplate layoutKey="section-detail" entityType="library_section" record={section}>
        {/* Section Details */}
        <DetailSection
          title="Section Details"
          description="Configuration and pricing"
          icon={Grid3X3}
        >
          <InfoRow label="Section Number" value={section.section_number || "—"} />
          <InfoRow label="Floor" value={section.floor === 0 ? "Ground Floor" : `Floor ${section.floor}`} />
          <InfoRow
            label="Power Outlets"
            value={section.has_power_outlets ? "Yes" : "No"}
            icon={Plug}
          />
          {section.hourly_rate && (
            <InfoRow label="Hourly Rate" value={<Currency amount={section.hourly_rate} />} />
          )}
          {section.monthly_rate && (
            <InfoRow label="Monthly Rate" value={<Currency amount={section.monthly_rate} />} />
          )}
        </DetailSection>

        {/* Capacity Tracking */}
        <FeatureGuard module="sections" feature="sectionCapacity">
          <DetailSection
            title="Capacity"
            description="Seat availability and occupancy"
            icon={Armchair}
          >
            <InfoRow label="Total Seats" value={section.total_seats} icon={Armchair} />
            <InfoRow label="Occupied Seats" value={section.occupied_seats} icon={Armchair} />
            <InfoRow label="Available Seats" value={availableSeats} icon={Armchair} />
            <InfoRow
              label="Occupancy"
              value={
                <div className="flex items-center gap-2">
                  <span className="font-medium">{occupancyRate}%</span>
                  <div className="w-24 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        occupancyRate >= 90 ? "bg-destructive" :
                        occupancyRate >= 70 ? "bg-warning" : "bg-success"
                      }`}
                      style={{ width: `${occupancyRate}%` }}
                    />
                  </div>
                </div>
              }
              icon={Grid3X3}
            />
            <InfoRow
              label="Confirmed Occupied"
              value={seats.filter(s => s.status === "occupied").length}
              icon={Armchair}
            />
          </DetailSection>
        </FeatureGuard>

        {/* AC / Non-AC Classification */}
        <FeatureGuard module="sections" feature="acNonAcTracking">
          <DetailSection
            title="AC Classification"
            description="Comfort level and cooling type"
            icon={Grid3X3}
          >
            <InfoRow
              label="Air Conditioning"
              value={section.is_ac ? "AC" : "Non-AC"}
            />
          </DetailSection>
        </FeatureGuard>

        {/* Seats List */}
        <DetailListSection
          title="Seats"
          description={`${seats.length} seats in this section`}
          icon={Armchair}
          items={seats}
          keyExtractor={(seat) => seat.id}
          renderItem={(seat) => (
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${OCCUPANCY_STATUS_COLORS[seat.status]}`}>
                  <span className="text-xs font-bold">{seat.seat_number}</span>
                </div>
                <div>
                  <p className="font-medium text-sm">Seat {seat.seat_number}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {seat.row_number && <span>Row {seat.row_number}</span>}
                    {seat.has_power_outlet && <Plug className="h-3 w-3" />}
                    {seat.has_lamp && <Lightbulb className="h-3 w-3" />}
                    {seat.is_window_seat && <span>Window</span>}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <StatusBadge
                  status={
                    seat.status === "available" ? "success" :
                    seat.status === "occupied" ? "warning" :
                    seat.status === "reserved" ? "info" : "muted"
                  }
                  label={seat.status}
                  size="sm"
                />
                {seat.current_member && (
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <Avatar name={(seat.current_member as { name?: string })?.name || ""} size="xs" />
                    <span className="text-xs text-muted-foreground">
                      {(seat.current_member as { name?: string })?.name}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
          initialLimit={10}
          viewAllMode="expand"
          emptyIcon={Armchair}
          emptyText="No seats added yet"
          actions={
            <Link href={`/library-sections/${section.id}/seats/new`}>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Add Seats
              </Button>
            </Link>
          }
        />

        {/* Seats by Row Visualization */}
        {Object.keys(seatsByRow).length > 0 && (
          <DetailSection
            title="Seat Map"
            description="Visual layout by row"
            icon={Grid3X3}
          >
            <div className="space-y-4">
              {Object.entries(seatsByRow).sort().map(([row, rowSeats]) => (
                <div key={row}>
                  <p className="text-sm font-medium text-muted-foreground mb-2">
                    Row {row}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {rowSeats.sort((a, b) => a.seat_number.localeCompare(b.seat_number)).map((seat) => (
                      <div
                        key={seat.id}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold cursor-default ${OCCUPANCY_STATUS_COLORS[seat.status]}`}
                        title={`Seat ${seat.seat_number} - ${seat.status}${seat.current_member ? ` (${(seat.current_member as { name?: string })?.name})` : ""}`}
                      >
                        {seat.seat_number.slice(-2)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-success/20 border border-success/30"></div>
                <span>Available</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-info/20 border border-info/30"></div>
                <span>Occupied</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-warning/20 border border-warning/30"></div>
                <span>Reserved</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded bg-muted border border-border"></div>
                <span>Maintenance</span>
              </div>
            </div>
          </DetailSection>
        )}
      </DetailPageTemplate>

      {ConfirmDialogElement}
    </div>
  )
}
