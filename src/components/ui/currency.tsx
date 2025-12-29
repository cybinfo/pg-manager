"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

// ============================================
// Currency Display
// ============================================
interface CurrencyProps {
  amount: number
  currency?: string
  locale?: string
  showSign?: boolean
  compact?: boolean
  className?: string
}

export function Currency({
  amount,
  currency = "INR",
  locale = "en-IN",
  showSign = false,
  compact = false,
  className,
}: CurrencyProps) {
  const formattedAmount = React.useMemo(() => {
    const options: Intl.NumberFormatOptions = {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }

    if (compact && Math.abs(amount) >= 1000) {
      const formatted = new Intl.NumberFormat(locale, {
        ...options,
        notation: "compact",
        compactDisplay: "short",
      }).format(amount)
      return formatted
    }

    return new Intl.NumberFormat(locale, options).format(amount)
  }, [amount, currency, locale, compact])

  const isPositive = amount > 0
  const isNegative = amount < 0

  return (
    <span
      className={cn(
        "tabular-nums font-medium",
        showSign && isPositive && "text-emerald-600",
        showSign && isNegative && "text-rose-600",
        className
      )}
    >
      {showSign && isPositive && "+"}
      {formattedAmount}
    </span>
  )
}

// ============================================
// Amount with Label
// ============================================
interface AmountDisplayProps {
  label: string
  amount: number
  variant?: "default" | "success" | "warning" | "error"
  size?: "sm" | "default" | "lg"
  className?: string
}

export function AmountDisplay({
  label,
  amount,
  variant = "default",
  size = "default",
  className,
}: AmountDisplayProps) {
  const variants = {
    default: "text-slate-900",
    success: "text-emerald-600",
    warning: "text-amber-600",
    error: "text-rose-600",
  }

  const sizes = {
    sm: "text-lg",
    default: "text-2xl",
    lg: "text-3xl",
  }

  return (
    <div className={cn("space-y-1", className)}>
      <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
        {label}
      </p>
      <p className={cn("font-bold tabular-nums", sizes[size], variants[variant])}>
        <Currency amount={amount} />
      </p>
    </div>
  )
}

// ============================================
// Amount with Trend
// ============================================
interface AmountWithTrendProps {
  amount: number
  previousAmount: number
  label?: string
  showPercentage?: boolean
  className?: string
}

export function AmountWithTrend({
  amount,
  previousAmount,
  label,
  showPercentage = true,
  className,
}: AmountWithTrendProps) {
  const change = amount - previousAmount
  const percentageChange = previousAmount !== 0
    ? ((change / previousAmount) * 100).toFixed(1)
    : 0

  const isPositive = change > 0
  const isNegative = change < 0
  const isNeutral = change === 0

  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {label}
        </p>
      )}
      <div className="flex items-baseline gap-2">
        <Currency amount={amount} className="text-2xl font-bold" />
        <div
          className={cn(
            "flex items-center gap-0.5 text-xs font-medium",
            isPositive && "text-emerald-600",
            isNegative && "text-rose-600",
            isNeutral && "text-slate-500"
          )}
        >
          <TrendIcon className="h-3 w-3" />
          {showPercentage && <span>{Math.abs(Number(percentageChange))}%</span>}
        </div>
      </div>
    </div>
  )
}

// ============================================
// Dues Summary
// ============================================
interface DuesSummaryProps {
  totalDues: number
  collectedAmount: number
  pendingAmount: number
  className?: string
}

export function DuesSummary({
  totalDues,
  collectedAmount,
  pendingAmount,
  className,
}: DuesSummaryProps) {
  const collectedPercentage = totalDues > 0 ? (collectedAmount / totalDues) * 100 : 0

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Collection Progress</span>
        <span className="font-medium">{collectedPercentage.toFixed(0)}%</span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${Math.min(collectedPercentage, 100)}%` }}
        />
      </div>

      {/* Amounts */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <Currency amount={totalDues} className="text-sm font-semibold" />
        </div>
        <div>
          <p className="text-xs text-emerald-600">Collected</p>
          <Currency amount={collectedAmount} className="text-sm font-semibold text-emerald-600" />
        </div>
        <div>
          <p className="text-xs text-amber-600">Pending</p>
          <Currency amount={pendingAmount} className="text-sm font-semibold text-amber-600" />
        </div>
      </div>
    </div>
  )
}

// ============================================
// Bill/Payment Amount Display
// ============================================
interface PaymentAmountProps {
  amount: number
  status: "paid" | "pending" | "partial" | "overdue"
  paidAmount?: number
  className?: string
}

export function PaymentAmount({
  amount,
  status,
  paidAmount = 0,
  className,
}: PaymentAmountProps) {
  const statusColors = {
    paid: "text-emerald-600",
    pending: "text-amber-600",
    partial: "text-sky-600",
    overdue: "text-rose-600",
  }

  return (
    <div className={cn("space-y-0.5", className)}>
      <Currency
        amount={amount}
        className={cn("text-lg font-bold", statusColors[status])}
      />
      {status === "partial" && paidAmount > 0 && (
        <p className="text-xs text-muted-foreground">
          Paid: <Currency amount={paidAmount} className="text-emerald-600" />
        </p>
      )}
    </div>
  )
}
