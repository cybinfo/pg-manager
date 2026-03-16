/**
 * Member Hours Balance Card
 *
 * Displays today's hours usage vs daily allowance with a visual progress bar.
 * Reflects the per-day hours model: each day the member gets a fresh allowance.
 * Shows warning when today's remaining hours are low.
 */

"use client"

import { Clock, AlertTriangle, Sun } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface MemberHoursCardProps {
  /** Cumulative hours used across entire membership (for analytics) */
  hoursUsed: number
  /** Today's remaining hours (daily_allowance - today's usage) */
  hoursRemaining: number
  /** Daily allowance from the active plan (e.g., 9h) */
  dailyAllowance?: number | null
  /** Today's hours used so far */
  todayUsed?: number
  /** Total hours used is kept for backward compat; prefer dailyAllowance + todayUsed */
  totalHours?: number
  memberName?: string
  variant?: "default" | "compact"
  className?: string
}

export function MemberHoursCard({
  hoursUsed,
  hoursRemaining,
  dailyAllowance,
  todayUsed,
  totalHours,
  memberName,
  variant = "default",
  className,
}: MemberHoursCardProps) {
  // Compute today's usage: prefer explicit todayUsed, else derive from allowance - remaining
  const effectiveDailyAllowance = dailyAllowance ?? totalHours ?? (hoursRemaining + (todayUsed ?? hoursUsed))
  const effectiveTodayUsed = todayUsed ?? (effectiveDailyAllowance ? effectiveDailyAllowance - hoursRemaining : 0)
  const isUnlimited = !dailyAllowance && !totalHours && hoursRemaining >= 999

  const usedPercentage = effectiveDailyAllowance && effectiveDailyAllowance > 0
    ? Math.min(100, (effectiveTodayUsed / effectiveDailyAllowance) * 100)
    : 0
  const isLow = hoursRemaining <= 2 && !isUnlimited
  const isCritical = hoursRemaining <= 0 && !isUnlimited

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-3 p-3 rounded-lg border", className)}>
        <div
          className={cn(
            "p-2 rounded-full",
            isCritical ? "bg-destructive/10" : isLow ? "bg-warning/10" : "bg-success/10"
          )}
        >
          <Clock
            className={cn(
              "h-4 w-4",
              isCritical ? "text-destructive" : isLow ? "text-warning" : "text-success"
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium truncate">
              {memberName || "Today's Hours"}
            </span>
            <span
              className={cn(
                "text-sm font-bold",
                isCritical ? "text-destructive" : isLow ? "text-warning" : "text-success"
              )}
            >
              {isUnlimited ? "Unlimited" : `${hoursRemaining.toFixed(1)}h left today`}
            </span>
          </div>
          {!isUnlimited && (
            <Progress
              value={usedPercentage}
              className={cn(
                "h-1.5",
                isCritical
                  ? "[&>div]:bg-destructive"
                  : isLow
                  ? "[&>div]:bg-warning"
                  : "[&>div]:bg-success"
              )}
            />
          )}
        </div>
      </div>
    )
  }

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "p-2 rounded-lg",
                isCritical ? "bg-destructive/10" : isLow ? "bg-warning/10" : "bg-success/10"
              )}
            >
              <Clock
                className={cn(
                  "h-5 w-5",
                  isCritical ? "text-destructive" : isLow ? "text-warning" : "text-success"
                )}
              />
            </div>
            <div>
              <CardTitle className="text-base">Today&apos;s Hours</CardTitle>
              {memberName && (
                <CardDescription className="text-xs">{memberName}</CardDescription>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {effectiveDailyAllowance && !isUnlimited && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                <Sun className="h-3 w-3" />
                {effectiveDailyAllowance}h/day
              </div>
            )}
            {(isLow || isCritical) && (
              <div
                className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                  isCritical
                    ? "bg-destructive/10 text-destructive"
                    : "bg-warning/10 text-warning"
                )}
              >
                <AlertTriangle className="h-3 w-3" />
                {isCritical ? "No Hours Left Today" : "Low Hours"}
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isUnlimited ? (
          <div className="text-center py-2 text-muted-foreground text-sm">
            Unlimited daily hours
          </div>
        ) : (
          <div className="space-y-2">
            <Progress
              value={usedPercentage}
              className={cn(
                "h-3",
                isCritical
                  ? "[&>div]:bg-destructive"
                  : isLow
                  ? "[&>div]:bg-warning"
                  : "[&>div]:bg-success"
              )}
            />

            {/* Stats */}
            <div className="flex justify-between text-sm">
              <div>
                <span className="text-muted-foreground">Used today: </span>
                <span className="font-medium">{effectiveTodayUsed.toFixed(1)}h</span>
              </div>
              <div>
                <span className="text-muted-foreground">Remaining: </span>
                <span
                  className={cn(
                    "font-bold",
                    isCritical ? "text-destructive" : isLow ? "text-warning" : "text-success"
                  )}
                >
                  {hoursRemaining.toFixed(1)}h
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Daily: </span>
                <span className="font-medium">{effectiveDailyAllowance?.toFixed(1) || "0"}h</span>
              </div>
            </div>

            {/* Cumulative stats */}
            <div className="pt-2 border-t text-xs text-muted-foreground">
              Total hours used (all time): {hoursUsed.toFixed(1)}h
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
