/**
 * Member Hours Balance Card
 *
 * Displays hours used/remaining with a visual progress bar.
 * Shows warning when hours are low.
 */

"use client"

import { Clock, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

interface MemberHoursCardProps {
  hoursUsed: number
  hoursRemaining: number
  totalHours?: number
  memberName?: string
  variant?: "default" | "compact"
  className?: string
}

export function MemberHoursCard({
  hoursUsed,
  hoursRemaining,
  totalHours,
  memberName,
  variant = "default",
  className,
}: MemberHoursCardProps) {
  // Calculate total if not provided
  const total = totalHours || (hoursUsed + hoursRemaining)
  const usedPercentage = total > 0 ? (hoursUsed / total) * 100 : 0
  const isLow = hoursRemaining <= 2
  const isCritical = hoursRemaining <= 0

  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-3 p-3 rounded-lg border", className)}>
        <div
          className={cn(
            "p-2 rounded-full",
            isCritical ? "bg-red-100" : isLow ? "bg-amber-100" : "bg-green-100"
          )}
        >
          <Clock
            className={cn(
              "h-4 w-4",
              isCritical ? "text-red-600" : isLow ? "text-amber-600" : "text-green-600"
            )}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium truncate">
              {memberName || "Hours Balance"}
            </span>
            <span
              className={cn(
                "text-sm font-bold",
                isCritical ? "text-red-600" : isLow ? "text-amber-600" : "text-green-600"
              )}
            >
              {hoursRemaining.toFixed(1)}h left
            </span>
          </div>
          <Progress
            value={usedPercentage}
            className={cn(
              "h-1.5",
              isCritical
                ? "[&>div]:bg-red-500"
                : isLow
                ? "[&>div]:bg-amber-500"
                : "[&>div]:bg-green-500"
            )}
          />
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
                isCritical ? "bg-red-100" : isLow ? "bg-amber-100" : "bg-green-100"
              )}
            >
              <Clock
                className={cn(
                  "h-5 w-5",
                  isCritical ? "text-red-600" : isLow ? "text-amber-600" : "text-green-600"
                )}
              />
            </div>
            <div>
              <CardTitle className="text-base">Hours Balance</CardTitle>
              {memberName && (
                <CardDescription className="text-xs">{memberName}</CardDescription>
              )}
            </div>
          </div>
          {(isLow || isCritical) && (
            <div
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                isCritical
                  ? "bg-red-100 text-red-700"
                  : "bg-amber-100 text-amber-700"
              )}
            >
              <AlertTriangle className="h-3 w-3" />
              {isCritical ? "No Hours" : "Low Hours"}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress
            value={usedPercentage}
            className={cn(
              "h-3",
              isCritical
                ? "[&>div]:bg-red-500"
                : isLow
                ? "[&>div]:bg-amber-500"
                : "[&>div]:bg-green-500"
            )}
          />

          {/* Stats */}
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-muted-foreground">Used: </span>
              <span className="font-medium">{hoursUsed.toFixed(1)}h</span>
            </div>
            <div>
              <span className="text-muted-foreground">Remaining: </span>
              <span
                className={cn(
                  "font-bold",
                  isCritical ? "text-red-600" : isLow ? "text-amber-600" : "text-green-600"
                )}
              >
                {hoursRemaining.toFixed(1)}h
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Total: </span>
              <span className="font-medium">{total.toFixed(1)}h</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
