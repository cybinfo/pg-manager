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
        "bg-white rounded-xl border border-slate-200 overflow-hidden",
        className
      )}
    >
      {/* Header - Always visible */}
      <div
        className="px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-slate-500" />
            <h3 className="font-semibold text-slate-900">Financial Summary</h3>
          </div>
          <Button variant="ghost" size="sm" className="-mr-2">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </Button>
        </div>

        {/* Quick summary when collapsed */}
        {!isExpanded && (
          <div className="flex items-center gap-4 mt-2 text-sm">
            <span className="text-slate-600">
              Paid: <span className="font-medium text-emerald-600">{formatCurrency(financial.total_paid)}</span>
            </span>
            {hasOutstanding && (
              <span className="text-slate-600">
                Due: <span className="font-medium text-amber-600">{formatCurrency(financial.total_outstanding)}</span>
              </span>
            )}
            {hasOverdue && (
              <span className="text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {formatCurrency(financial.total_overdue)} overdue
              </span>
            )}
          </div>
        )}
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-slate-100">
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
            <h4 className="text-sm font-medium text-slate-700 mb-2">Deposits & Advances</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <p className="text-slate-500">Security Deposit</p>
                <p className="font-medium text-slate-900">
                  {formatCurrency(financial.security_deposit_paid)}
                  {financial.security_deposit_expected > financial.security_deposit_paid && (
                    <span className="text-amber-600 text-xs ml-1">
                      / {formatCurrency(financial.security_deposit_expected)}
                    </span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Advance</p>
                <p className="font-medium text-slate-900">{formatCurrency(financial.advance_amount)}</p>
              </div>
              <div>
                <p className="text-slate-500">Advance Balance</p>
                <p className="font-medium text-slate-900">{formatCurrency(financial.advance_balance)}</p>
              </div>
              <div>
                <p className="text-slate-500">Monthly Rent</p>
                <p className="font-medium text-teal-600">{formatCurrency(financial.current_monthly_rent)}</p>
              </div>
            </div>
          </div>

          {/* Refunds section */}
          {(financial.total_refunds_processed > 0 || financial.pending_refunds > 0) && (
            <div className="px-4 pb-4">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Refunds</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500">Processed</p>
                  <p className="font-medium text-emerald-600">
                    {formatCurrency(financial.total_refunds_processed)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Pending</p>
                  <p className="font-medium text-amber-600">
                    {formatCurrency(financial.pending_refunds)}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Next due */}
          {financial.next_due_date && financial.next_due_amount && (
            <div className="px-4 pb-4">
              <div className="bg-teal-50 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-teal-600 font-medium">Next Due</p>
                  <p className="text-sm text-slate-900">
                    {formatCurrency(financial.next_due_amount)} on{" "}
                    {new Date(financial.next_due_date).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                    })}
                  </p>
                </div>
                <Link href={`/payments/new?tenant=${tenantId}`}>
                  <Button size="sm" variant="outline" className="text-teal-600 border-teal-200">
                    Record Payment
                  </Button>
                </Link>
              </div>
            </div>
          )}

          {/* Breakdown by charge type */}
          {financial.breakdown.length > 0 && (
            <div className="px-4 pb-4">
              <h4 className="text-sm font-medium text-slate-700 mb-2">Breakdown by Type</h4>
              <div className="space-y-2">
                {financial.breakdown.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-slate-600">{item.charge_type}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-400 text-xs">
                        Billed: {formatCurrency(item.total_billed)}
                      </span>
                      <span className="font-medium text-slate-900">
                        {item.balance > 0 ? (
                          <span className="text-amber-600">Due: {formatCurrency(item.balance)}</span>
                        ) : (
                          <span className="text-emerald-600">Paid</span>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
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
      bg: "bg-slate-100",
      text: "text-slate-900",
      icon: "text-slate-500",
    },
    emerald: {
      bg: "bg-emerald-100",
      text: "text-emerald-700",
      icon: "text-emerald-500",
    },
    amber: {
      bg: "bg-amber-100",
      text: "text-amber-700",
      icon: "text-amber-500",
    },
    rose: {
      bg: "bg-rose-100",
      text: "text-rose-700",
      icon: "text-rose-500",
    },
    teal: {
      bg: "bg-teal-100",
      text: "text-teal-700",
      icon: "text-teal-500",
    },
  }

  const colors = colorClasses[color] || colorClasses.slate

  return (
    <div
      className={cn(
        "rounded-lg p-3",
        highlight ? colors.bg : "bg-slate-50"
      )}
    >
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn("w-4 h-4", colors.icon)} />
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <p className={cn("text-lg font-semibold", highlight ? colors.text : "text-slate-900")}>
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
    <div className={cn("bg-white rounded-lg border border-slate-200 p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-slate-900">Financial</h4>
        <Wallet className="w-4 h-4 text-slate-400" />
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-slate-500">Total Paid</span>
          <span className="font-medium text-emerald-600">{formatCurrency(financial.total_paid)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Outstanding</span>
          <span className={cn("font-medium", financial.total_outstanding > 0 ? "text-amber-600" : "text-slate-900")}>
            {formatCurrency(financial.total_outstanding)}
          </span>
        </div>
        {financial.total_overdue > 0 && (
          <div className="flex justify-between">
            <span className="text-rose-500">Overdue</span>
            <span className="font-medium text-rose-600">{formatCurrency(financial.total_overdue)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export default FinancialSummary
