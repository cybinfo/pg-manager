"use client"

import { Button } from "@/components/ui/button"
import { DetailSection, InfoRow } from "@/components/ui"
import { Bell, Calendar, LogOut, Clock, Undo2 } from "lucide-react"
import { formatDate } from "@/lib/format"

interface NoticePeriodSectionProps {
  noticeDate: string | null
  expectedExitDate: string | null
  actionLoading: boolean
  onCancelNotice: () => void
}

export function NoticePeriodSection({
  noticeDate,
  expectedExitDate,
  actionLoading,
  onCancelNotice,
}: NoticePeriodSectionProps) {
  return (
    <DetailSection
      title="Notice Period"
      description="Tenant has given notice to vacate"
      icon={Bell}
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={onCancelNotice}
          disabled={actionLoading}
        >
          <Undo2 className="mr-1 h-3 w-3" />
          Cancel Notice
        </Button>
      }
    >
      <InfoRow
        label="Notice Given"
        value={noticeDate ? formatDate(noticeDate) : "Not recorded"}
        icon={Calendar}
      />
      <InfoRow
        label="Expected Exit"
        value={
          expectedExitDate ? (
            <span className="text-amber-600 font-medium">{formatDate(expectedExitDate)}</span>
          ) : (
            "Not set"
          )
        }
        icon={LogOut}
      />
      {noticeDate && expectedExitDate && (
        <InfoRow
          label="Days Remaining"
          value={(() => {
            const today = new Date()
            const exitDate = new Date(expectedExitDate)
            const diffTime = exitDate.getTime() - today.getTime()
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            if (diffDays < 0) {
              return <span className="text-rose-600 font-medium">Overdue by {Math.abs(diffDays)} days</span>
            } else if (diffDays === 0) {
              return <span className="text-amber-600 font-medium">Today</span>
            } else {
              return <span className="text-amber-600 font-medium">{diffDays} days</span>
            }
          })()}
          icon={Clock}
        />
      )}
    </DetailSection>
  )
}
