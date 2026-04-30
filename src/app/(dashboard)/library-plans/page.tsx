/**
 * Library Plans List Page
 *
 * Displays all subscription plans with enrollment statistics.
 * Shows active vs total member enrollment counts per plan.
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { CreditCard, Clock, CheckCircle, Users, TrendingUp } from "lucide-react"
import { Column, StatusDot } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { LIBRARY_PLAN_LIST_CONFIG } from "@/lib/hooks/useListPage"
import { createTotalMetric, createBooleanMetric, createAverageMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { ACTIVE_STATUS_FILTER } from "@/lib/filter-presets"
import { Currency } from "@/components/ui/currency"
import { createClient } from "@/lib/supabase/client"
import { GroupByOption } from "@/lib/hooks/useListPage"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { textFilterColumn, numberFilterColumn, booleanFilterColumn, dateFilterColumn } from "@/lib/advanced-filter-builders"
import type { CSVColumn } from "@/lib/download-utils"
import { currencyExportColumn, dateExportColumn } from "@/lib/export-columns"

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
  // Enriched fields
  total_enrollments?: number
  active_enrollments?: number
}

// ============================================
// Enrollment Stats Hook
// ============================================

interface EnrollmentStats {
  plan_id: string
  total: number
  active: number
}

function useEnrollmentStats() {
  const [stats, setStats] = useState<Map<string, EnrollmentStats>>(new Map())

  const fetchStats = useCallback(async () => {
    const supabase = createClient()

    // Fetch all memberships with plan_id and member status
    const { data: memberships } = await supabase
      .from("library_memberships")
      .select("plan_id, status, member:library_members!library_memberships_member_id_fkey(status)")
      .not("plan_id", "is", null)
      .is("deleted_at", null)

    if (!memberships) return

    const statsMap = new Map<string, EnrollmentStats>()

    for (const ms of memberships) {
      const planId = ms.plan_id as string
      if (!planId) continue

      if (!statsMap.has(planId)) {
        statsMap.set(planId, { plan_id: planId, total: 0, active: 0 })
      }

      const entry = statsMap.get(planId)!
      entry.total++

      // Active = membership is active AND member is active
      const memberData = ms.member as { status?: string } | null
      if (ms.status === "active" && memberData?.status === "active") {
        entry.active++
      }
    }

    setStats(statsMap)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchStats()
  }, [fetchStats])

  return stats
}

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  textFilterColumn("name", "Plan Name", ["contains", "eq", "neq", "starts", "ends"]),
  numberFilterColumn("base_price", "Base Price"),
  numberFilterColumn("hours_included", "Hours Included"),
  numberFilterColumn("validity_days", "Validity Days"),
  booleanFilterColumn("is_active", "Status", { trueLabel: "Active", falseLabel: "Inactive" }),
  numberFilterColumn("sort_order", "Sort Order"),
  dateFilterColumn("created_at", "Added On"),
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "name", header: "Plan Name" },
  { key: "description", header: "Description", format: (v) => String(v ?? "") },
  { key: "hours_included", header: "Hours/Day", format: (v) => (v ? String(v) : "Unlimited") },
  { key: "validity_days", header: "Validity (Days)", format: (v) => String(v ?? "") },
  currencyExportColumn("base_price", "Price"),
  { key: "is_active", header: "Status", format: (v) => (v ? "Active" : "Inactive") },
  { key: "sort_order", header: "Sort Order", format: (v) => String(v ?? "") },
  dateExportColumn("created_at", "Added On"),
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "is_active", label: "Status" },
  { value: "validity_days", label: "Validity Period" },
]

// ============================================
// Page Component (wraps ListPageTemplate)
// ============================================

export default function LibraryPlansPage() {
  const enrollmentStats = useEnrollmentStats()

  // ============================================
  // Column Definitions (uses enrollment stats)
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
      defaultVisible: false,
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
      key: "active_enrollments",
      header: "Active",
      width: "count",
      sortable: false,
      canHide: true,
      defaultVisible: true,
      render: (plan) => {
        const stat = enrollmentStats.get(plan.id)
        const active = stat?.active || 0
        return active > 0 ? (
          <span className="inline-flex items-center gap-1.5 font-medium text-success">
            <Users className="h-3.5 w-3.5" />
            {active}
          </span>
        ) : (
          <span className="text-muted-foreground">0</span>
        )
      },
    },
    {
      key: "total_enrollments",
      header: "Total Enrolled",
      width: "count",
      sortable: false,
      canHide: true,
      defaultVisible: false,
      render: (plan) => {
        const stat = enrollmentStats.get(plan.id)
        const total = stat?.total || 0
        const active = stat?.active || 0
        return total > 0 ? (
          <div>
            <span className="font-medium">{total}</span>
            {active > 0 && (
              <span className="text-xs text-muted-foreground ml-1">
                ({active} active)
              </span>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">0</span>
        )
      },
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
    createAverageMetric("hours_included", "avg_hours", "Avg Hours", Clock, {
      suffix: "h",
      filterNulls: true,
    }),
    {
      id: "total_enrollments",
      label: "Total Enrollments",
      icon: TrendingUp,
      compute: () => {
        let total = 0
        for (const stat of enrollmentStats.values()) total += stat.total
        return total
      },
    },
    {
      id: "active_members",
      label: "Active Members",
      icon: Users,
      compute: () => {
        let active = 0
        for (const stat of enrollmentStats.values()) active += stat.active
        return active
      },
    },
  ]

  return (
    <ListPageTemplate
      tableKey="library-plans"
      title="Subscription Plans"
      description="Manage library subscription plans"
      icon={CreditCard}
      permission="library.view"
      module="plans"
      config={LIBRARY_PLAN_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by plan name..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      exportFilename="library-plans"
      createHref="/library-plans/new"
      createLabel="Add Plan"
      createPermission="library.create"
      detailHref={(plan) => `/library-plans/${plan.id}/edit`}
      emptyTitle="No plans found"
      emptyDescription="Create subscription plans for your library"
    />
  )
}
