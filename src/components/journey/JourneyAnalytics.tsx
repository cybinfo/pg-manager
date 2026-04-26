"use client"

import {
  Calendar,
  CreditCard,
  TrendingUp,
  Star,
  FileText,
  AlertTriangle,
  Users,
  ArrowRightLeft,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { JourneyAnalytics as JourneyAnalyticsType } from "@/types/journey.types"
import { formatCurrencyCompact } from "@/lib/format"

// ============================================
// Journey Analytics Component
// ============================================

interface JourneyAnalyticsProps {
  analytics: JourneyAnalyticsType
  className?: string
}

export function JourneyAnalytics({ analytics, className }: JourneyAnalyticsProps) {
  const formatDays = (days: number) => {
    if (days >= 365) {
      const years = Math.floor(days / 365)
      const months = Math.floor((days % 365) / 30)
      if (months === 0) return `${years}y`
      return `${years}y ${months}m`
    }
    if (days >= 30) {
      return `${Math.floor(days / 30)}m`
    }
    return `${days}d`
  }

  const cards = [
    {
      title: "Total Stay",
      value: formatDays(analytics.total_stay_days),
      subtitle: analytics.total_stays > 1 ? `${analytics.total_stays} stays` : "Current stay",
      icon: Calendar,
      color: "teal",
    },
    {
      title: "Total Revenue",
      value: formatCurrencyCompact(analytics.total_revenue),
      subtitle: `${analytics.total_payments} payments`,
      icon: CreditCard,
      color: "emerald",
    },
    {
      title: "Payment Score",
      value: calculatePaymentScore(analytics),
      subtitle: getPaymentScoreLabel(analytics),
      icon: TrendingUp,
      color: getPaymentScoreColor(analytics),
    },
    {
      title: "Events",
      value: getTotalEvents(analytics),
      subtitle: getEventsBreakdown(analytics),
      icon: Star,
      color: "violet",
    },
  ]

  return (
    <div className={cn("grid grid-cols-2 md:grid-cols-4 gap-4", className)}>
      {cards.map((card, index) => (
        <AnalyticsCard key={index} {...card} />
      ))}
    </div>
  )
}

// ============================================
// Analytics Card
// ============================================

interface AnalyticsCardProps {
  title: string
  value: string
  subtitle: string
  icon: LucideIcon
  color: string
}

function AnalyticsCard({ title, value, subtitle, icon: Icon, color }: AnalyticsCardProps) {
  const colorClasses: Record<string, { bg: string; text: string; icon: string }> = {
    teal: {
      bg: "bg-primary/5",
      text: "text-primary",
      icon: "text-primary",
    },
    emerald: {
      bg: "bg-success/10",
      text: "text-success",
      icon: "text-success",
    },
    amber: {
      bg: "bg-warning/5",
      text: "text-warning",
      icon: "text-warning",
    },
    rose: {
      bg: "bg-destructive/10",
      text: "text-destructive",
      icon: "text-destructive",
    },
    violet: {
      bg: "bg-primary/10",
      text: "text-primary",
      icon: "text-primary",
    },
    sky: {
      bg: "bg-info/10",
      text: "text-info",
      icon: "text-info",
    },
  }

  const colors = colorClasses[color] || colorClasses.teal

  return (
    <div className="bg-card rounded-xl border border-border p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <p className={cn("text-2xl font-bold mt-1", colors.text)}>{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className={cn("p-2 rounded-lg", colors.bg)}>
          <Icon className={cn("w-5 h-5", colors.icon)} />
        </div>
      </div>
    </div>
  )
}

// ============================================
// Detailed Analytics Grid
// ============================================

interface DetailedAnalyticsProps {
  analytics: JourneyAnalyticsType
  className?: string
}

export function DetailedAnalytics({ analytics, className }: DetailedAnalyticsProps) {
  const sections = [
    {
      title: "Financial",
      icon: CreditCard,
      stats: [
        { label: "Total Revenue", value: formatCurrencyCompact(analytics.total_revenue) },
        { label: "Total Bills", value: analytics.total_bills_generated.toString() },
        { label: "Bills Paid", value: analytics.total_bills_paid.toString() },
        { label: "Avg Days to Pay", value: `${analytics.average_days_to_pay} days` },
      ],
    },
    {
      title: "Payment Pattern",
      icon: TrendingUp,
      stats: [
        { label: "On Time", value: analytics.bills_paid_on_time.toString(), color: "emerald" },
        { label: "Late", value: analytics.bills_paid_late.toString(), color: "rose" },
        {
          label: "On-Time Rate",
          value:
            analytics.total_bills_paid > 0
              ? `${Math.round((analytics.bills_paid_on_time / analytics.total_bills_paid) * 100)}%`
              : "N/A",
        },
      ],
    },
    {
      title: "Engagement",
      icon: Users,
      stats: [
        { label: "Complaints", value: analytics.total_complaints.toString() },
        { label: "Resolved", value: analytics.complaints_resolved.toString() },
        { label: "Visitors", value: analytics.total_visitors.toString() },
        { label: "Transfers", value: analytics.total_room_transfers.toString() },
      ],
    },
    {
      title: "Compliance",
      icon: FileText,
      stats: [
        {
          label: "Police Verification",
          value: analytics.police_verification_status === "verified" ? "Done" : "Pending",
          color: analytics.police_verification_status === "verified" ? "emerald" : "amber",
        },
        {
          label: "Agreement",
          value: analytics.agreement_status === "signed" ? "Signed" : "Pending",
          color: analytics.agreement_status === "signed" ? "emerald" : "amber",
        },
      ],
    },
  ]

  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", className)}>
      {sections.map((section, index) => (
        <div
          key={index}
          className="bg-card rounded-xl border border-border p-4"
        >
          <div className="flex items-center gap-2 mb-3">
            <section.icon className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-foreground">{section.title}</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {section.stats.map((stat, statIndex) => (
              <div key={statIndex}>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
                <p
                  className={cn(
                    "text-lg font-semibold",
                    stat.color === "emerald" && "text-success",
                    stat.color === "rose" && "text-destructive",
                    stat.color === "amber" && "text-warning",
                    !stat.color && "text-foreground"
                  )}
                >
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ============================================
// Helper Functions
// ============================================

function calculatePaymentScore(analytics: JourneyAnalyticsType): string {
  if (analytics.total_bills_paid === 0) {
    return "N/A"
  }
  const onTimeRate = analytics.bills_paid_on_time / analytics.total_bills_paid
  const score = Math.round(onTimeRate * 100)
  return `${score}%`
}

function getPaymentScoreLabel(analytics: JourneyAnalyticsType): string {
  if (analytics.total_bills_paid === 0) {
    return "No payments yet"
  }
  const onTimeRate = analytics.bills_paid_on_time / analytics.total_bills_paid
  if (onTimeRate >= 0.9) return "Excellent"
  if (onTimeRate >= 0.7) return "Good"
  if (onTimeRate >= 0.5) return "Fair"
  return "Needs attention"
}

function getPaymentScoreColor(analytics: JourneyAnalyticsType): string {
  if (analytics.total_bills_paid === 0) return "sky"
  const onTimeRate = analytics.bills_paid_on_time / analytics.total_bills_paid
  if (onTimeRate >= 0.9) return "emerald"
  if (onTimeRate >= 0.7) return "teal"
  if (onTimeRate >= 0.5) return "amber"
  return "rose"
}

function getTotalEvents(analytics: JourneyAnalyticsType): string {
  const total =
    analytics.total_bills_generated +
    analytics.total_payments +
    analytics.total_complaints +
    analytics.total_room_transfers +
    analytics.total_visitors +
    analytics.total_stays

  return total.toString()
}

function getEventsBreakdown(analytics: JourneyAnalyticsType): string {
  const parts: string[] = []
  if (analytics.total_bills_generated > 0) {
    parts.push(`${analytics.total_bills_generated} bills`)
  }
  if (analytics.total_payments > 0) {
    parts.push(`${analytics.total_payments} payments`)
  }
  if (parts.length === 0) {
    return "Journey started"
  }
  return parts.join(", ")
}

export default JourneyAnalytics
