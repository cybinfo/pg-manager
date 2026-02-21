"use client"

/**
 * PortalStatsGrid - Thin wrapper around the unified StatsGrid for portal pages.
 *
 * Maintains the portal-specific prop interface (bgColor/iconColor) while
 * delegating to the unified StatsGrid component.
 */

import { StatsGrid } from "@/components/ui/stat-card"
import type { PortalStatCardProps } from "./PortalStatCard"

export interface PortalStatsGridProps {
  stats: PortalStatCardProps[]
}

export function PortalStatsGrid({ stats }: PortalStatsGridProps) {
  return <StatsGrid stats={stats} columns={4} />
}
