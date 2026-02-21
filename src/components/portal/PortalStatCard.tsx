"use client"

/**
 * PortalStatCard - Thin wrapper around the unified StatCard for portal pages.
 *
 * Portal pages use custom bgColor/iconColor strings instead of named variants.
 * This re-exports StatCard with a portal-specific prop interface for
 * backwards compatibility.
 */

import { StatCard } from "@/components/ui/stat-card"
import type { LucideIcon } from "lucide-react"

export interface PortalStatCardProps {
  /** Icon to display */
  icon: LucideIcon
  /** Label/title for the stat */
  label: string
  /** Value to display */
  value: string | number
  /** Tailwind bg class for the icon container, e.g. "bg-primary/10" or "bg-emerald-50" */
  bgColor: string
  /** Tailwind text color class for the icon, e.g. "text-primary" or "text-emerald-600" */
  iconColor: string
}

export function PortalStatCard({
  icon,
  label,
  value,
  bgColor,
  iconColor,
}: PortalStatCardProps) {
  return (
    <StatCard
      icon={icon}
      label={label}
      value={value}
      bgColor={bgColor}
      iconColor={iconColor}
    />
  )
}
