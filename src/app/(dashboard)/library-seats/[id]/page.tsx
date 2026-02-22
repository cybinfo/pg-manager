/**
 * Library Seat Detail Page
 *
 * Shows seat details with current assignment.
 */

"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useDetailPage, LIBRARY_SEAT_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
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
import {
  Armchair,
  Users,
  Grid3X3,
  Pencil,
  Zap,
  Lightbulb,
  Square,
} from "lucide-react"
import { formatDate } from "@/lib/format"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { LIBRARY_SEAT_STATUS_CONFIG } from "@/types/library.types"
import type { LibrarySeat } from "@/types/library.types"

export default function LibrarySeatDetailPage() {
  const params = useParams()

  const {
    data: seat,
    loading,
  } = useDetailPage<LibrarySeat>({
    config: LIBRARY_SEAT_DETAIL_CONFIG,
    id: params.id as string,
  })

  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/library-seats", defaultLabel: "All Seats" })

  if (loading) {
    return <PageLoading message="Loading seat details..." />
  }

  if (!seat) {
    return null
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
              <Link href={`/library-sections/${seat.section.id}`} className="hover:text-primary hover:underline">
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
          { label: "Library Seats", href: "/library-seats" },
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
            <Link href={`/library-seats/${seat.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
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
                <Link href={`/library-sections/${seat.section.id}`} className="text-primary hover:underline">
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
          <DetailSection
            title="Current Assignment"
            description="Currently assigned to"
            icon={Users}
          >
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <div>
                <Link
                  href={`/library-members/${seat.current_member.id}`}
                  className="font-semibold hover:text-primary hover:underline"
                >
                  {seat.current_member.name}
                </Link>
                {seat.current_member.member_code && (
                  <p className="text-sm text-muted-foreground font-mono">
                    {seat.current_member.member_code}
                  </p>
                )}
              </div>
            </div>
          </DetailSection>
        )}
      </DetailPageTemplate>
    </div>
  )
}
