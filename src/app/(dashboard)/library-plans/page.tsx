/**
 * Library Plans List Page
 *
 * Displays all subscription plans for library management.
 */

"use client"

import { CreditCard, Clock, Calendar, CheckCircle } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_PLAN_LIST_CONFIG } from "@/lib/hooks/useListPage"
import { createTotalMetric, createBooleanMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { ACTIVE_STATUS_FILTER } from "@/lib/filter-presets"
import { Currency } from "@/components/ui/currency"

// ============================================
// Types
// ============================================

interface PlanItem {
  id: string
  name: string
  description: string | null
  hours_included: number | null
  validity_days: number
  base_price: number
  allowed_slots: string[] | null
  is_active: boolean
  sort_order: number
  created_at: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<PlanItem>[] = [
  {
    key: "name",
    header: "Plan Name",
    width: "primary",
    sortable: true,
    canHide: false,
    render: (plan) => (
      <div className="flex items-center gap-3">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
          plan.is_active ? "bg-success/10" : "bg-muted"
        }`}>
          <CreditCard className={`h-4 w-4 ${
            plan.is_active ? "text-success" : "text-muted-foreground"
          }`} />
        </div>
        <div>
          <div className="font-medium">{plan.name}</div>
          {plan.description && (
            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
              {plan.description}
            </div>
          )}
        </div>
      </div>
    ),
  },
  {
    key: "hours_included",
    header: "Hours",
    width: "badge",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    render: (plan) => (
      <span className="font-medium">
        {plan.hours_included ? `${plan.hours_included}h` : "Unlimited"}
      </span>
    ),
  },
  {
    key: "validity_days",
    header: "Validity",
    width: "badge",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    render: (plan) => `${plan.validity_days} days`,
  },
  {
    key: "base_price",
    header: "Price",
    width: "amount",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: true,
    render: (plan) => (
      <span className="font-semibold">
        <Currency amount={plan.base_price} />
      </span>
    ),
  },
  {
    key: "is_active",
    header: "Status",
    width: "status",
    sortable: true,
    canHide: true,
    defaultVisible: true,
    render: (plan) => (
      <StatusDot
        status={plan.is_active ? "success" : "muted"}
        label={plan.is_active ? "Active" : "Inactive"}
      />
    ),
  },
  {
    key: "allowed_slots",
    header: "Time Slots",
    width: "tertiary",
    canHide: true,
    defaultVisible: false,
    render: (plan) => plan.allowed_slots?.length
      ? plan.allowed_slots.join(", ")
      : "All slots",
  },
  {
    key: "sort_order",
    header: "Order",
    width: "badge",
    sortable: true,
    sortType: "number",
    canHide: true,
    defaultVisible: false,
    render: (plan) => plan.sort_order,
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  ACTIVE_STATUS_FILTER,
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ label: "Total Plans", icon: CreditCard }),
  createBooleanMetric("is_active", true, "Active", CheckCircle, { id: "active" }),
  {
    // Custom: average computation
    id: "avg_hours",
    label: "Avg Hours",
    icon: Clock,
    compute: (items) => {
      const withHours = items.filter((p) => p.hours_included)
      if (withHours.length === 0) return "\u2014"
      const avg = withHours.reduce((sum: number, p) => sum + (Number(p.hours_included) || 0), 0) / withHours.length
      return `${avg.toFixed(0)}h`
    },
  },
  {
    // Custom: average computation
    id: "avg_validity",
    label: "Avg Validity",
    icon: Calendar,
    compute: (items) => {
      if (items.length === 0) return "\u2014"
      const avg = items.reduce((sum: number, p) => sum + (Number(p.validity_days) || 0), 0) / items.length
      return `${avg.toFixed(0)} days`
    },
  },
]

// ============================================
// Page Component
// ============================================

export default function LibraryPlansPage() {
  return (
    <ListPageTemplate
      tableKey="library-plans"
      title="Subscription Plans"
      description="Manage library subscription plans"
      icon={CreditCard}
      permission="library.view"
      feature="library"
      config={LIBRARY_PLAN_LIST_CONFIG}
      filters={filters}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by plan name..."
      enableColumnManager={true}
      createHref="/library-plans/new"
      createLabel="Add Plan"
      createPermission="library.create"
      detailHref={(plan) => `/library-plans/${plan.id}/edit`}
      emptyTitle="No plans found"
      emptyDescription="Create subscription plans for your library"
    />
  )
}
