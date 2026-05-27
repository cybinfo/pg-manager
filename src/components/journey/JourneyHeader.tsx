"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Download, Share2, GitCompare, MoreVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar } from "@/components/ui/avatar"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TenantJourneyData } from "@/types/journey.types"
import type { StatusBadgeProps } from "@/components/ui/status-badge"
import { formatDate, formatDurationDaysVerbose } from "@/lib/format"
import { TENANT_STATUS } from "@/lib/status"

// ============================================
// Journey Header Component
// ============================================

interface JourneyHeaderProps {
  journey: TenantJourneyData
  onExport?: () => void
  onShare?: () => void
  onCompare?: () => void
  exporting?: boolean
  className?: string
}

export function JourneyHeader({
  journey,
  onExport,
  onShare,
  onCompare,
  exporting = false,
  className,
}: JourneyHeaderProps) {
  const router = useRouter()

  const _initials = journey.tenant_name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const startDate = new Date(journey.check_in_date)
  const today = new Date()
  const diffDays = Math.floor(Math.abs(today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const stayDuration = formatDurationDaysVerbose(diffDays)

  const statusConfig = TENANT_STATUS[journey.tenant_status] || TENANT_STATUS.active
  const statusVariant = journey.tenant_status === "checked_out" ? "moved_out" : journey.tenant_status
  const statusInfo = { label: statusConfig.label, variant: statusVariant }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-muted-foreground hover:text-foreground -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        {/* Desktop actions */}
        <div className="hidden md:flex items-center gap-2">
          {onCompare && (
            <Button variant="outline" size="sm" onClick={onCompare}>
              <GitCompare className="w-4 h-4 mr-2" />
              Compare
            </Button>
          )}
          {onShare && (
            <Button variant="outline" size="sm" onClick={onShare}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          )}
          {onExport && (
            <Button
              variant="default"
              size="sm"
              onClick={onExport}
              disabled={exporting}
              className="bg-gradient-to-r from-teal-500 to-cyan-500"
            >
              <Download className="w-4 h-4 mr-2" />
              {exporting ? "Exporting..." : "Export PDF"}
            </Button>
          )}
        </div>

        {/* Mobile actions dropdown */}
        <div className="md:hidden">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onExport && (
                <DropdownMenuItem onClick={onExport} disabled={exporting}>
                  <Download className="w-4 h-4 mr-2" />
                  {exporting ? "Exporting..." : "Export PDF"}
                </DropdownMenuItem>
              )}
              {onShare && (
                <DropdownMenuItem onClick={onShare}>
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </DropdownMenuItem>
              )}
              {onCompare && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onCompare}>
                    <GitCompare className="w-4 h-4 mr-2" />
                    Compare
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Header content */}
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <Avatar
          name={journey.tenant_name}
          src={journey.tenant_photo_url}
          size="xl"
          className="border-2 border-white shadow-md"
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-foreground truncate">
              {journey.tenant_name}&apos;s Journey
            </h1>
            <StatusBadge status={statusInfo.variant as StatusBadgeProps["status"]} label={statusInfo.label} />
          </div>

          <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground flex-wrap">
            <span>
              Joined{" "}
              {formatDate(journey.check_in_date)}
            </span>
            <span className="text-muted-foreground/50">•</span>
            <span className="font-medium text-primary">{stayDuration}</span>
            {journey.property && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <Link
                  href={`/properties/${journey.property.id}`}
                  className="hover:text-primary hover:underline"
                >
                  {journey.property.name}
                </Link>
              </>
            )}
            {journey.room && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <Link
                  href={`/rooms/${journey.room.id}`}
                  className="hover:text-primary hover:underline"
                >
                  Room {journey.room.room_number}
                </Link>
              </>
            )}
          </div>

          {/* Pre-tenant visit info */}
          {journey.pre_tenant_visits && journey.pre_tenant_visits.length > 0 && (
            <div className="mt-2 text-sm text-primary bg-primary/10 px-3 py-1.5 rounded-full inline-flex items-center gap-1">
              <span className="w-2 h-2 bg-primary rounded-full" />
              Visited as prospective tenant{" "}
              {journey.pre_tenant_visits[0].days_before_joining} days before joining
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Compact Header (for mobile)
// ============================================

interface CompactHeaderProps {
  journey: TenantJourneyData
  className?: string
}

export function CompactHeader({ journey, className }: CompactHeaderProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar
        name={journey.tenant_name}
        src={journey.tenant_photo_url}
        size="md"
      />
      <div className="flex-1 min-w-0">
        <h2 className="font-semibold text-foreground truncate">{journey.tenant_name}</h2>
        <p className="text-xs text-muted-foreground truncate">
          {journey.property?.name} • Room {journey.room?.room_number}
        </p>
      </div>
    </div>
  )
}

export default JourneyHeader
