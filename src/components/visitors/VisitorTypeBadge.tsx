"use client"

import { Users, Search, Wrench, User } from "lucide-react"
import {
  VisitorType,
  VISITOR_TYPE_LABELS,
  VISITOR_TYPE_BADGE_COLORS,
} from "@/types/visitors.types"

interface VisitorTypeBadgeProps {
  type: VisitorType
  /** "sm" = compact list style (default), "md" = detail page style */
  size?: "sm" | "md"
}

const ICONS_SM: Record<VisitorType, React.ReactNode> = {
  tenant_visitor: <Users className="h-3 w-3" />,
  enquiry: <Search className="h-3 w-3" />,
  service_provider: <Wrench className="h-3 w-3" />,
  general: <User className="h-3 w-3" />,
}

const ICONS_MD: Record<VisitorType, React.ReactNode> = {
  tenant_visitor: <Users className="h-4 w-4" />,
  enquiry: <Search className="h-4 w-4" />,
  service_provider: <Wrench className="h-4 w-4" />,
  general: <User className="h-4 w-4" />,
}

export const VisitorTypeBadge = ({ type, size = "sm" }: VisitorTypeBadgeProps) => {
  const isMd = size === "md"
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${VISITOR_TYPE_BADGE_COLORS[type]} ${
        isMd ? "gap-1.5 px-3 py-1 text-sm" : "gap-1 px-2 py-0.5 text-xs"
      }`}
    >
      {isMd ? ICONS_MD[type] : ICONS_SM[type]}
      {VISITOR_TYPE_LABELS[type]}
    </span>
  )
}
