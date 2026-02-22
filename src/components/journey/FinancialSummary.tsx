"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ChevronDown,
  ChevronUp,
  Wallet,
  Receipt,
  AlertCircle,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FinancialSummary as FinancialSummaryType } from "@/types/journey.types"

// ============================================
// Financial Summary Component
// ============================================

interface FinancialSummaryProps {
  financial: FinancialSummaryType
  tenantId: string
  defaultExpanded?: boolean
  className?: string
}

export function FinancialSummary({
  financial,
  tenantId,
  defaultExpanded = false,
  className,
}: FinancialSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const hasOutstanding = financial.total_outstanding > 0
  const hasOverdue = financial.total_overdue > 0

  return (
    <div
      className={cn(
        "bg-card rounded-xl border border-border overflow-hidden",
        className
      )}
    >
      {/* Header - Always visible */}
      <div
        className="px-4 py-3 cursor-pointer hover:bg-muted transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">Financial Summary</h3>
          </div>
          <Button variant="ghost" size="sm" className="-mr-2">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </Button>
        </div>

        {/* Quick summary when collapsed */}
        {!isExpanded && (
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-foreground">
              Paid: <span className="font-medium text-success">{formatCurrency(financial.total_paid)}</span>
            </span>
            {hasOutstanding && (
              <span className="text-foreground">
                Due: <span className="font-medium text-warning">{formatCurrency(financial.total_outstanding)}</span>
              </span>
            )}
            {hasOverdue && (
              <span className="text-destructive flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {formatCurrency(financial.total_overdue)} overdue
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* Main stats grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
            <StatBox
              label="Total Billed"
              value={formatCurrency(financial.total_billed)}
              icon={Receipt}
              color="slate"
            />
            <StatBox
              label="Total Paid"
              value={formatCurrency(financial.total_paid)}
              icon={ArrowUpRight}
              color="emerald"
            />
            <StatBox
              label="Outstanding"
              value={formatCurrency(financial.total_outstanding)}
              icon={ArrowDownRight}
              color={hasOutstanding ? "amber" : "slate"}
            />
            <StatBox
              label="Overdue"
              value={formatCurrency(financial.total_overdue)}
              icon={AlertCircle}
              color={hasOverdue ? "rose" : "slate"}
              highlight={hasOverdue}
            />
          </div>

          {/* Deposits section */}
          <div className="px-4 pb-4">
            <h4 className="text-sm font-medium text-foreground mb-2">Deposits & Advances</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Security Deposit</p>
                <p className="font-medium text-foreground">
                  {formatCurrency(financial.security_deposit_paid)}
                  {financial.security_deposit_expected > financial.security_deposit_paid && (
                    <span className="text-warning text-xs ml-1">
                      / {formatCurrency(financial.security_deposit_expected)}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Advance</p>
                <p className="font-medium text-foreground">{formatCurrency(financial.advance_amount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Advance Balance</p>
                <p className="font-medium text-foreground">{formatCurrency(financial.advance_balance)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Monthly Rent</p>
                <p className="font-medium text-primary">{formatCurrency(financial.current_monthly_rent)}</p>
              </div>
            </div>
          </div>

          {/* Refunds section */}
          {(financial.total_refunds_processed > 0 || financial.pending_refunds > 0) && (
            <div className="px-4 pb-4">
              <h4 className="text-sm font-medium text-foreground mb-2">Refunds</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Processed</p>
                  <p className="font-medium text-success">
                    {formatCurrency(financial.total_refunds_processed)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pending</p>
                  <p className="font-medium text-warning">
                    {formatCurrency(financial.pending_refunds)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Next due */}
          {financial.next_due_date && financial.next_due_amount && (
            <div className="px-4 pb-4">
              <div className="bg-primary/5 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary font-medium">Next Due</p>
                  <p className="text-sm text-foreground">
                    {formatCurrency(financial.next_due_amount)} on{" "}
                    {new Date(financial.next_due_date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <Link href={`/payments/new?tenant=${tenantId}`}>
                  <Button size="sm" variant="outline" className="text-primary border-primary/20">
                    Record Payment
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Breakdown by charge type */}
          {financial.breakdown.length > 0 && (
            <div className="px-4 pb-4">
              <h4 className="text-sm font-medium text-foreground mb-2">Breakdown by Type</h4>
              <div className="space-y-2">
                {financial.breakdown.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm py-2 border-b border-border last:border-0"
                  >
                    <span className="text-foreground">{item.charge_type}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-muted-foreground text-xs">
                        Billed: {formatCurrency(item.total_billed)}
                      </span>
                      <span className="font-medium text-foreground">
                        {item.balance > 0 ? (
                          <span className="text-warning">Due: {formatCurrency(item.balance)}</span>
                        ) : (
                          <span className="text-success">Paid</span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="px-4 py-3 bg-muted border-t border-border flex items-center gap-2">
            <Link href={`/tenants/${tenantId}/bills`}>
              <Button variant="outline" size="sm">
                View All Bills
              </Button>
            </Link>
            <Link href={`/tenants/${tenantId}/payments`}>
              <Button variant="outline" size="sm">
                View All Payments
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// Stat Box Component
// ============================================

interface StatBoxProps {
  label: string
  value: string
  icon: any
  color: string
  highlight?: boolean
}

function StatBox({ label, value, icon: Icon, color, highlight = false }: StatBoxProps) {
  const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
    slate: {
      bg: "bg-muted",
      text: "text-foreground",
      icon: "text-muted-foreground",
    },
    emerald: {
      bg: "bg-success/10",
      text: "text-success",
      icon: "text-success",
    },
    amber: {
      bg: "bg-warning/10",
      text: "text-warning",
      icon: "text-warning",
    },
    rose: {
      bg: "bg-destructive/10",
      text: "text-destructive",
      icon: "text-destructive",
    },
    teal: {
      bg: "bg-primary/10",
      text: "text-primary",
      icon: "text-primary",
    },
  }

  const colors = colorClasses[color] || colorClasses.slate

  return (
    <div
      className={cn(
        "rounded-lg p-3",
        highlight ? colors.bg : "bg-muted"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-4 h-4", colors.icon)} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn("text-lg font-semibold", highlight ? colors.text : "text-foreground")}>
        {value}
      </p>
    </div>
  )
}

// ============================================
// Compact Financial Card
// ============================================

interface CompactFinancialCardProps {
  financial: FinancialSummaryType
  className?: string
}

export function CompactFinancialCard({ financial, className }: CompactFinancialCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className={cn("bg-card rounded-lg border border-border p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-foreground">Financial</h4>
        <Wallet className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Paid</span>
          <span className="font-medium text-success">{formatCurrency(financial.total_paid)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Outstanding</span>
          <span className={cn("font-medium", financial.total_outstanding > 0 ? "text-warning" : "text-foreground")}>
            {formatCurrency(financial.total_outstanding)}
          </span>
        </div>
        {financial.total_overdue > 0 && (
          <div className="flex justify-between">
            <span className="text-destructive">Overdue</span>
            <span className="font-medium text-destructive">{formatCurrency(financial.total_overdue)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default FinancialSummary
