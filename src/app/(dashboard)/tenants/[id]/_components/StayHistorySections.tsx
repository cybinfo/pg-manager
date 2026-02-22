"use client"

import { DetailListSection } from "@/components/ui"
import { StatusBadge } from "@/components/ui/status-badge"
import { Currency } from "@/components/ui/currency"
import { History, ArrowRightLeft } from "lucide-react"
import { formatDate } from "@/lib/format"
import type { TenantStay, RoomTransfer } from "@/types/tenants.types"

interface StayHistorySectionsProps {
  stays: TenantStay[]
  transfers: RoomTransfer[]
}

export function StayHistorySections({ stays, transfers }: StayHistorySectionsProps) {
  return (
    <>
      {/* Stay History */}
      {stays.length > 0 && (
        <DetailListSection
          title="Stay History"
          description="All tenures at your properties"
          icon={History}
          items={stays}
          keyExtractor={(stay, _idx) => stay.id}
          renderItem={(stay) => (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg mb-2 last:mb-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">Stay #{stay.stay_number}</span>
                  <StatusBadge
                    status={stay.status === "active" ? "active" : stay.status === "transferred" ? "info" : "muted"}
                    label={stay.status === "active" ? "Current" : stay.status === "transferred" ? "Transferred" : "Completed"}
                    size="sm"
                    dot
                  />
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {stay.property?.name} - Room {stay.room?.room_number}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(stay.join_date)} {stay.exit_date && `→ ${formatDate(stay.exit_date)}`}
                </p>
              </div>
              <Currency amount={stay.monthly_rent} className="font-semibold" />
            </div>
          )}
          initialLimit={3}
          viewAllMode="expand"
          emptyText="No stay history"
        />
      )}

      {/* Room Transfer History */}
      {transfers.length > 0 && (
        <DetailListSection
          title="Room Transfers"
          description="History of room changes"
          icon={ArrowRightLeft}
          items={transfers}
          keyExtractor={(transfer, _idx) => transfer.id}
          renderItem={(transfer) => (
            <div className="p-3 bg-muted rounded-lg mb-2 last:mb-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">
                  {transfer.from_property?.name} Room {transfer.from_room?.room_number}
                </span>
                <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {transfer.to_property?.name} Room {transfer.to_room?.room_number}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDate(transfer.transfer_date)}
                {transfer.reason && ` • ${transfer.reason}`}
              </p>
              {transfer.old_rent !== transfer.new_rent && (
                <p className="text-xs mt-1">
                  <span className="text-muted-foreground">Rent:</span>{" "}
                  <span className="line-through text-muted-foreground">
                    <Currency amount={transfer.old_rent} />
                  </span>{" "}
                  <Currency amount={transfer.new_rent} className="text-success" />
                </p>
              )}
            </div>
          )}
          initialLimit={3}
          viewAllMode="expand"
          emptyText="No room transfers"
        />
      )}
    </>
  )
}
