"use client"

import { PortalStatCard, PortalStatCardProps } from "./PortalStatCard"

export interface PortalStatsGridProps {
  stats: PortalStatCardProps[]
}

export function PortalStatsGrid({ stats }: PortalStatsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <PortalStatCard key={index} {...stat} />
      ))}
    </div>
  )
}
