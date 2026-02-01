/**
 * Library Plans List Page
 *
 * Displays all subscription plans for library management.
 */

"use client"

import { CreditCard, Clock, Calendar, CheckCircle } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_PLAN_LIST_CONFIG, MetricConfig } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
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
          plan.is_active ? "bg-green-100" : "bg-gray-100"
        }`}>
          <CreditCard className={`h-4 w-4 ${
            plan.is_active ? "text-green-600" : "text-gray-600"
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
  {
    id: "is_active",
    label: "Status",
    type: "select",
    placeholder: "All Status",
    options: [
      { value: "true", label: "Active" },
      { value: "false", label: "Inactive" },
    ],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<PlanItem>[] = [
  {
    id: "total",
    label: "Total Plans",
    icon: CreditCard,
    compute: (_items, total) => total,
  },
  {
    id: "active",
    label: "Active",
    icon: CheckCircle,
    compute: (items) => items.filter((p) => p.is_active).length,
  },
  {
    id: "avg_hours",
    label: "Avg Hours",
    icon: Clock,
    compute: (items) => {
      const withHours = items.filter((p) => p.hours_included)
      if (withHours.length === 0) return "—"
      const avg = withHours.reduce((sum, p) => sum + (p.hours_included || 0), 0) / withHours.length
      return `${avg.toFixed(0)}h`
    },
  },
  {
    id: "avg_validity",
    label: "Avg Validity",
    icon: Calendar,
    compute: (items) => {
      if (items.length === 0) return "—"
      const avg = items.reduce((sum, p) => sum + p.validity_days, 0) / items.length
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
