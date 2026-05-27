/**
 * People Directory Page (Refactored)
 *
 * Central registry for all persons - tenants, staff, visitors, service providers
 * Now uses centralized ListPageTemplate for consistent UI
 */

"use client"

import Link from "next/link"
import {
  Users,
  Mail,
  Building2,
  BadgeCheck,
  Ban,
  Home,
  Briefcase,
  UserCircle,
  Wrench,
  Star,
  Merge,
  AlertTriangle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { dateColumn, personNameWithAvatarColumn, phoneColumn, emailColumn } from "@/lib/columns"
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { PEOPLE_LIST_CONFIG, GroupByOption } from "@/lib/hooks/useListPage"
import { createTotalMetric, createCountMetric, createBooleanMetric, MetricConfig } from "@/lib/metric-factories"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { createStatusFilter } from "@/lib/filter-presets"
import { FilterableColumn } from "@/components/ui/advanced-filter-builder"
import { PERSON_TAG_COLORS } from "@/lib/status-config"
import type { CSVColumn } from "@/lib/download-utils"
import { dateExportColumn } from "@/lib/export-columns"
import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"

// ============================================
// Types
// ============================================

interface Person {
  id: string
  name: string
  phone: string | null
  email: string | null
  photo_url: string | null
  company_name: string | null
  occupation: string | null
  tags: string[] | null
  is_verified: boolean
  is_blocked: boolean
  created_at: string
  // Computed fields
  status_label?: string
  primary_role?: string
}

// ============================================
// Tag Badge Component
// ============================================

// Use centralized configs from status-config.ts
const TAG_COLORS = PERSON_TAG_COLORS

const TAG_ICONS: Record<string, React.ReactNode> = {
  tenant: <Home className="h-3 w-3" />,
  staff: <Briefcase className="h-3 w-3" />,
  visitor: <UserCircle className="h-3 w-3" />,
  service_provider: <Wrench className="h-3 w-3" />,
  frequent: <Star className="h-3 w-3" />,
  vip: <Star className="h-3 w-3" />,
}

const TagBadge = ({ tag }: { tag: string }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TAG_COLORS[tag] || "bg-muted text-foreground"}`}>
    {TAG_ICONS[tag]}
    {tag.replace("_", " ")}
  </span>
)

// ============================================
// Column Definitions
// ============================================

const columns: Column<Person>[] = [
  personNameWithAvatarColumn("Person", {
    nameField: "name",
    personNameField: "name",
    photoField: "photo_url",
    subtitleField: "phone",
    editable: true,
    editType: "text",
    editValidation: { required: true },
  }),
  {
    key: "email",
    header: "Contact",
    width: "secondary",
    hideOnMobile: true,
    canHide: true,
    defaultVisible: true,
    render: (person) => (
      <div className="text-sm min-w-0">
        {person.email ? (
          <div className="flex items-center gap-1 text-muted-foreground truncate">
            <Mail className="h-3 w-3 shrink-0" />
            <span className="truncate">{person.email}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">-</span>
        )}
        {person.company_name && (
          <div className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
            <Building2 className="h-3 w-3 shrink-0" />
            <span className="truncate">{person.company_name}</span>
          </div>
        )}
      </div>
    ),
  },
  {
    key: "tags",
    header: "Roles",
    width: "secondary",
    canHide: true,
    defaultVisible: true,
    render: (person) => (
      <div className="flex flex-wrap gap-1">
        {person.tags && person.tags.length > 0 ? (
          person.tags.slice(0, 3).map((tag) => (
            <TagBadge key={tag} tag={tag} />
          ))
        ) : (
          <span className="text-sm text-muted-foreground">No roles</span>
        )}
        {person.tags && person.tags.length > 3 && (
          <TableBadge variant="muted">+{person.tags.length - 3}</TableBadge>
        )}
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    width: "status",
    sortable: true,
    sortKey: "is_blocked",
    canHide: true,
    defaultVisible: true,
    render: (person) => (
      <StatusDot
        status={person.is_blocked ? "error" : person.is_verified ? "success" : "muted"}
        label={person.is_blocked ? "Blocked" : person.is_verified ? "Verified" : "Active"}
      />
    ),
  },
  // Hidden by default columns
  phoneColumn("phone", "Phone", { defaultVisible: false, editable: true, editType: "text" }),
  emailColumn("email", "Email", { key: "email_only", defaultVisible: false, editable: true, editType: "text", editField: "email" }),
  {
    key: "company_name",
    header: "Company",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (person) => person.company_name || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "occupation",
    header: "Occupation",
    width: "secondary",
    canHide: true,
    defaultVisible: false,
    render: (person) => person.occupation || <span className="text-muted-foreground">—</span>,
  },
  {
    key: "is_verified",
    header: "Verified",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (person) => (
      <StatusDot
        status={person.is_verified ? "success" : "muted"}
        label={person.is_verified ? "Yes" : "No"}
      />
    ),
  },
  {
    key: "is_blocked",
    header: "Blocked",
    width: "badge",
    sortable: true,
    canHide: true,
    defaultVisible: false,
    render: (person) => (
      <StatusDot
        status={person.is_blocked ? "error" : "muted"}
        label={person.is_blocked ? "Yes" : "No"}
      />
    ),
  },
  dateColumn("created_at", "Added On", { defaultVisible: false }),
]

// ============================================
// Filter Configurations
// ============================================

const filters: FilterConfig[] = [
  {
    id: "tags",
    label: "Role",
    type: "select",
    placeholder: "All Roles",
    options: [
      { value: "tenant", label: "Tenants" },
      { value: "staff", label: "Staff" },
      { value: "visitor", label: "Visitors" },
      { value: "service_provider", label: "Service Providers" },
      { value: "vip", label: "VIP" },
    ],
  },
  createStatusFilter([
    { value: "verified", label: "Verified" },
    { value: "blocked", label: "Blocked" },
  ]),
]

// ============================================
// Group By Options
// ============================================

const groupByOptions: GroupByOption[] = [
  { value: "primary_role", label: "Role" },
  { value: "status_label", label: "Status" },
  { value: "created_month", label: "Added Month" },
  { value: "created_year", label: "Added Year" },
]

// ============================================
// Advanced Filter Columns
// ============================================

const advancedFilterColumns: FilterableColumn[] = [
  {
    key: "name",
    header: "Name",
    filterType: "text",
    filterOperators: ["contains", "eq", "neq", "starts", "ends"],
  },
  {
    key: "phone",
    header: "Phone",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "email",
    header: "Email",
    filterType: "text",
    filterOperators: ["contains", "eq", "starts"],
  },
  {
    key: "is_verified",
    header: "Verified",
    filterType: "select",
    filterOperators: ["eq"],
    filterOptions: [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ],
  },
  {
    key: "is_blocked",
    header: "Blocked",
    filterType: "select",
    filterOperators: ["eq"],
    filterOptions: [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ],
  },
]

// ============================================
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Record<string, unknown>>[] = [
  createTotalMetric({ icon: Users }),
  createCountMetric("tenants", "Tenants", Home,
    (p) => (p.tags as string[] | null)?.includes("tenant") ?? false,
    { serverFilter: { column: "tags", operator: "contains", value: ["tenant"] } }
  ),
  createCountMetric("staff", "Staff", Briefcase,
    (p) => (p.tags as string[] | null)?.includes("staff") ?? false,
    { serverFilter: { column: "tags", operator: "contains", value: ["staff"] } }
  ),
  createCountMetric("visitors", "Visitors", UserCircle,
    (p) => (p.tags as string[] | null)?.includes("visitor") ?? false,
    { serverFilter: { column: "tags", operator: "contains", value: ["visitor"] } }
  ),
  createBooleanMetric("is_verified", true, "Verified", BadgeCheck),
  createBooleanMetric("is_blocked", true, "Blocked", Ban, { highlight: true }),
]

// ============================================
// Export Columns
// ============================================

const exportColumns: CSVColumn<Record<string, unknown>>[] = [
  { key: "name", header: "Name" },
  { key: "phone", header: "Phone", format: (v) => String(v ?? "") },
  { key: "email", header: "Email", format: (v) => String(v ?? "") },
  { key: "occupation", header: "Occupation", format: (v) => String(v ?? "") },
  { key: "company_name", header: "Company", format: (v) => String(v ?? "") },
  { key: "tags", header: "Roles", format: (v) => (Array.isArray(v) ? (v as string[]).join(", ") : String(v ?? "")) },
  { key: "is_verified", header: "Verified", format: (v) => (v ? "Yes" : "No") },
  { key: "is_blocked", header: "Blocked", format: (v) => (v ? "Yes" : "No") },
  dateExportColumn("created_at", "Added On"),
]

// ============================================
// Duplicate Count Hook
// ============================================

function useDuplicateCount() {
  const [duplicateCount, setDuplicateCount] = useState(0)

  const fetchDuplicateCount = useCallback(async () => {
    const supabase = createClient()
    const { count, error } = await supabase
      .from("duplicate_people_summary")
      .select("*", { count: "exact", head: true })

    if (!error && count !== null) {
      setDuplicateCount(count)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchDuplicateCount()
  }, [fetchDuplicateCount])

  return duplicateCount
}

// ============================================
// Page Component
// ============================================

export default function PeoplePage() {
  const duplicateCount = useDuplicateCount()

  return (
    <ListPageTemplate
      tableKey="people"
      // Page info
      title="People Directory"
      description="Central registry for all persons - tenants, staff, visitors"
      icon={Users}
      permission="tenants.view"
      // Data config
      config={PEOPLE_LIST_CONFIG}
      // UI config
      filters={filters}
      groupByOptions={groupByOptions}
      metrics={metrics}
      columns={columns}
      searchPlaceholder="Search by name, phone, email, Aadhaar..."
      enableColumnManager={true}
      enableAdvancedFilters={true}
      advancedFilterColumns={advancedFilterColumns}
      enableInlineEdit={true}
      exportColumns={exportColumns}
      exportFilename="people"
      // Actions
      createHref="/people/new"
      createLabel="Add Person"
      createPermission="tenants.create"
      headerActions={
        <div className="flex gap-2">
          {duplicateCount > 0 && (
            <Link href="/people/duplicates">
              <Button variant="outline" className="border-warning/30 bg-warning/10 hover:bg-warning/20 text-warning">
                <AlertTriangle className="mr-2 h-4 w-4" />
                {duplicateCount} Duplicate{duplicateCount > 1 ? "s" : ""}
              </Button>
            </Link>
          )}
          <Link href="/people/merge">
            <Button variant="outline">
              <Merge className="mr-2 h-4 w-4" />
              Merge People
            </Button>
          </Link>
        </div>
      }
      // Navigation
      detailHref={(person) => `/people/${person.id}`}
      // Empty state
      emptyTitle="No people found"
      emptyDescription="People will appear here as you add tenants, staff, and visitors"
    />
  )
}
