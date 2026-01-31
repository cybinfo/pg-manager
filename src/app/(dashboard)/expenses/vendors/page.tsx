/**
 * Vendors List Page
 *
 * Part of the Enhanced Expense Module - manages vendor/supplier records
 * for bill payments and recurring expenses.
 */

"use client"

import { Building2, Check, X, Phone, CreditCard } from "lucide-react"
import { Column, TableBadge } from "@/components/ui/data-table"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { VENDOR_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { formatCurrency } from "@/lib/format"

// ============================================
// Types
// ============================================

interface VendorListItem {
  id: string
  name: string
  category_id: string | null
  contact_name: string | null
  phone: string | null
  email: string | null
  gstin: string | null
  pan: string | null
  upi_id: string | null
  is_active: boolean
  created_at: string
  category: { id: string; name: string; name_hi: string | null } | null
  total_paid?: number
  last_payment_date?: string
  display_name?: string
  status_label?: string
}

// ============================================
// Column Definitions
// ============================================

const columns: Column<VendorListItem>[] = [
  {
    key: "name",
    header: "Vendor",
    width: "primary",
    sortable: true,
    render: (vendor) => (
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
          <Building2 className="h-4 w-4 text-purple-600" />
        </div>
        <div>
          <div className="font-medium">{vendor.name}</div>
          {vendor.contact_name && (
            <div className="text-xs text-muted-foreground">{vendor.contact_name}</div>
          )}
        </div>
      </div>
    ),
  },
  {
    key: "category",
    header: "Category",
    width: "secondary",
    sortable: true,
    sortKey: "category.name",
    render: (vendor) => (
      <span>{vendor.category?.name || "Uncategorized"}</span>
    ),
  },
  {
    key: "phone",
    header: "Contact",
    width: "secondary",
    hideOnMobile: true,
    render: (vendor) => (
      <div className="flex items-center gap-2">
        {vendor.phone ? (
          <>
            <Phone className="h-3 w-3 text-muted-foreground" />
            <span>{vendor.phone}</span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    ),
  },
  {
    key: "gstin",
    header: "GST/PAN",
    width: "badge",
    hideOnMobile: true,
    render: (vendor) => (
      <div className="text-xs">
        {vendor.gstin ? (
          <div className="font-mono">{vendor.gstin.slice(0, 10)}...</div>
        ) : vendor.pan ? (
          <div className="font-mono">{vendor.pan}</div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    ),
  },
  {
    key: "upi_id",
    header: "UPI",
    width: "badge",
    hideOnMobile: true,
    render: (vendor) =>
      vendor.upi_id ? (
        <TableBadge variant="success">
          <CreditCard className="h-3 w-3 mr-1" />
          UPI
        </TableBadge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "is_active",
    header: "Status",
    width: "status",
    sortable: true,
    render: (vendor) =>
      vendor.is_active ? (
        <TableBadge variant="success">
          <Check className="h-3 w-3 mr-1" />
          Active
        </TableBadge>
      ) : (
        <TableBadge variant="error">
          <X className="h-3 w-3 mr-1" />
          Inactive
        </TableBadge>
      ),
  },
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "category_id",
    label: "Category",
    type: "select",
    placeholder: "All Categories",
  },
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
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "category.name", label: "Category" },
  { value: "is_active", label: "Status" },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<VendorListItem>[] = [
  {
    id: "total",
    label: "Total Vendors",
    icon: Building2,
    compute: (items, total) => total,
    format: "number",
  },
  {
    id: "active",
    label: "Active",
    icon: Check,
    compute: (items) => items.filter((v) => v.is_active).length,
    format: "number",
    serverFilter: {
      column: "is_active",
      operator: "eq",
      value: true,
    },
  },
  {
    id: "with_gstin",
    label: "With GSTIN",
    icon: Building2,
    compute: (items) => items.filter((v) => v.gstin).length,
    format: "number",
  },
  {
    id: "with_upi",
    label: "With UPI",
    icon: CreditCard,
    compute: (items) => items.filter((v) => v.upi_id).length,
    format: "number",
  },
]

// ============================================
// Page Component
// ============================================

export default function VendorsPage() {
  return (
    <ListPageTemplate
      tableKey="vendors"
      title="Vendors"
      description="Manage vendors and suppliers for bill payments"
      icon={Building2}
      permission="expenses.view"
      feature="expenses"
      config={VENDOR_LIST_CONFIG}
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search vendor name, contact, phone..."
      createHref="/expenses/vendors/new"
      createLabel="Add Vendor"
      createPermission="expenses.create"
      detailHref={(vendor) => `/expenses/vendors/${vendor.id}`}
      emptyTitle="No vendors found"
      emptyDescription="Add vendors to track bill payments and recurring expenses"
    />
  )
}
