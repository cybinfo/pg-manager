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

  const initials = journey.tenant_name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)

  const stayDuration = calculateStayDuration(journey.check_in_date)

  const statusMap: Record<string, { label: string; variant: string }> = {
    active: { label: "Active", variant: "active" },
    notice_period: { label: "Notice Period", variant: "notice_period" },
    checked_out: { label: "Checked Out", variant: "moved_out" },
    moved_out: { label: "Moved Out", variant: "moved_out" },
  }

  const statusInfo = statusMap[journey.tenant_status] || statusMap.active

  return (
    <div className={cn("space-y-4", className)}>
      {/* Back navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-slate-600 hover:text-slate-900 -ml-2"
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
            <h1 className="text-2xl font-bold text-slate-900 truncate">
              {journey.tenant_name}&apos;s Journey
            </h1>
            <StatusBadge status={statusInfo.variant as any} label={statusInfo.label} />
          </div>

          <div className="flex items-center gap-4 mt-1 text-sm text-slate-600 flex-wrap">
            <span>
              Joined{" "}
              {new Date(journey.check_in_date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-medium text-teal-600">{stayDuration}</span>
            {journey.property && (
              <>
                <span className="text-slate-300">•</span>
                <Link
                  href={`/properties/${journey.property.id}`}
                  className="hover:text-teal-600 hover:underline"
                >
                  {journey.property.name}
                </Link>
              </>
            )}
            {journey.room && (
              <>
                <span className="text-slate-300">•</span>
                <Link
                  href={`/rooms/${journey.room.id}`}
                  className="hover:text-teal-600 hover:underline"
                >
                  Room {journey.room.room_number}
                </Link>
              </>
            )}
          </div>

          {/* Pre-tenant visit info */}
          {journey.pre_tenant_visits && journey.pre_tenant_visits.length > 0 && (
            <div className="mt-2 text-sm text-violet-600 bg-violet-50 px-3 py-1.5 rounded-full inline-flex items-center gap-1">
              <span className="w-2 h-2 bg-violet-500 rounded-full" />
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
// Helper Functions
// ============================================

function calculateStayDuration(checkInDate: string): string {
  const startDate = new Date(checkInDate)
  const today = new Date()
  const diffTime = Math.abs(today.getTime() - startDate.getTime())
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 30) {
    return `${diffDays} days`
  }

  const months = Math.floor(diffDays / 30)
  const remainingDays = diffDays % 30

  if (months < 12) {
    if (remainingDays === 0) {
      return `${months} month${months > 1 ? "s" : ""}`
    }
    return `${months} month${months > 1 ? "s" : ""}`
  }

  const years = Math.floor(months / 12)
  const remainingMonths = months % 12

  if (remainingMonths === 0) {
    return `${years} year${years > 1 ? "s" : ""}`
  }

  return `${years} year${years > 1 ? "s" : ""} ${remainingMonths} month${remainingMonths > 1 ? "s" : ""}`
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
        <h2 className="font-semibold text-slate-900 truncate">{journey.tenant_name}</h2>
        <p className="text-xs text-slate-500 truncate">
          {journey.property?.name} • Room {journey.room?.room_number}
        </p>
      </div>
    </div>
  )
}

export default JourneyHeader
