"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Bell } from "lucide-react"
import { getTodayISO } from "@/lib/date-helpers"
import { formatDate } from "@/lib/format"

interface NoticePeriodDialogProps {
  tenantName: string
  loading: boolean
  onClose: () => void
  onSubmit: (data: { notice_date: string; expected_exit_date: string; notice_notes: string }) => Promise<void>
}

export function NoticePeriodDialog({ tenantName, loading, onClose, onSubmit }: NoticePeriodDialogProps) {
  const today = getTodayISO()
  const defaultExitDate = new Date()
  defaultExitDate.setDate(defaultExitDate.getDate() + 30)

  const [noticeData, setNoticeData] = useState({
    notice_date: today,
    expected_exit_date: defaultExitDate.toISOString().split("T")[0],
    notice_notes: "",
  })

  const handleSubmit = async () => {
    await onSubmit(noticeData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
      <Card className="w-full max-w-md animate-scale-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-warning" />
            Put on Notice Period
          </CardTitle>
          <CardDescription>
            Set an expected exit date for {tenantName}. This will move them to &ldquo;Notice Period&rdquo; status.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm">
            <p className="text-warning">
              <strong>Note:</strong> This action will change the tenant&apos;s status to &ldquo;Notice Period&rdquo;.
              You can later initiate the checkout process when they&apos;re ready to leave.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="notice_date">Notice Given Date *</Label>
              <Input
                id="notice_date"
                type="date"
                value={noticeData.notice_date}
                onChange={(e) => {
                  const newNoticeDate = e.target.value
                  const exitDate = new Date(newNoticeDate)
                  exitDate.setDate(exitDate.getDate() + 30)
                  setNoticeData({
                    ...noticeData,
                    notice_date: newNoticeDate,
                    expected_exit_date: exitDate.toISOString().split("T")[0]
                  })
                }}
                required
              />
              <p className="text-xs text-muted-foreground">
                When did/will the tenant give notice?
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_exit_date">Expected Exit Date *</Label>
              <Input
                id="expected_exit_date"
                type="date"
                value={noticeData.expected_exit_date}
                onChange={(e) => setNoticeData({ ...noticeData, expected_exit_date: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">
                Last day of stay
              </p>
            </div>
          </div>

          {noticeData.notice_date && noticeData.expected_exit_date && (
            <div className="p-3 bg-info/10 border border-info/30 rounded-lg text-sm">
              <p className="text-info">
                <strong>Notice Period:</strong>{" "}
                {Math.ceil((new Date(noticeData.expected_exit_date).getTime() - new Date(noticeData.notice_date).getTime()) / (1000 * 60 * 60 * 24))} days
                {" "}(from {formatDate(noticeData.notice_date)} to {formatDate(noticeData.expected_exit_date)})
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notice_notes">Reason / Notes (Optional)</Label>
            <Input
              id="notice_notes"
              value={noticeData.notice_notes}
              onChange={(e) => setNoticeData({ ...noticeData, notice_notes: e.target.value })}
              placeholder="e.g., Job relocation, personal reasons..."
            />
          </div>
        </CardContent>
        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !noticeData.expected_exit_date}
            className="bg-warning hover:bg-warning/90 text-white"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Put on Notice
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
}
