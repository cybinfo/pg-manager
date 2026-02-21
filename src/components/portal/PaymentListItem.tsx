"use client"

import { CheckCircle } from "lucide-react"
import { formatDate, formatCurrency } from "@/lib/format"

export interface PaymentListItemProps {
  /** Payment amount */
  amount: number
  /** Payment date (ISO string) */
  date: string
  /** Payment method label */
  method: string
  /** Label displayed below the amount (e.g. period or payment type) */
  label?: string
  /** Optional status badge color class. Defaults to emerald. */
  statusBgColor?: string
  /** Optional status icon color class. Defaults to emerald. */
  statusIconColor?: string
}

export function PaymentListItem({
  amount,
  date,
  method,
  label,
  statusBgColor = "bg-emerald-50",
  statusIconColor = "text-emerald-600",
}: PaymentListItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
      <div className="flex items-center gap-3">
        <div className={`p-2 ${statusBgColor} rounded-full`}>
          <CheckCircle className={`h-4 w-4 ${statusIconColor}`} />
        </div>
        <div>
          <p className="font-medium">{formatCurrency(amount)}</p>
          {label && (
            <p className="text-xs text-muted-foreground">{label}</p>
          )}
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm capitalize">{method}</p>
        <p className="text-xs text-muted-foreground">{formatDate(date)}</p>
      </div>
    </div>
  )
}
