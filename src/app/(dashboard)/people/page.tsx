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
  Phone,
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
import { ListPageTemplate } from "@/components/shared/ListPageTemplate"
import { PEOPLE_LIST_CONFIG, MetricConfig, GroupByOption } from "@/lib/hooks/useListPage"
import { FilterConfig } from "@/components/ui/list-page-filters"
import { Avatar } from "@/components/ui/avatar"
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

const TAG_COLORS: Record<string, string> = {
  tenant: "bg-blue-100 text-blue-700",
  staff: "bg-green-100 text-green-700",
  visitor: "bg-purple-100 text-purple-700",
  service_provider: "bg-orange-100 text-orange-700",
  frequent: "bg-yellow-100 text-yellow-700",
  vip: "bg-amber-100 text-amber-700",
}

const TAG_ICONS: Record<string, React.ReactNode> = {
  tenant: <Home className="h-3 w-3" />,
  staff: <Briefcase className="h-3 w-3" />,
  visitor: <UserCircle className="h-3 w-3" />,
  service_provider: <Wrench className="h-3 w-3" />,
  frequent: <Star className="h-3 w-3" />,
  vip: <Star className="h-3 w-3" />,
}

const TagBadge = ({ tag }: { tag: string }) => (
  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${TAG_COLORS[tag] || "bg-slate-100 text-slate-700"}`}>
    {TAG_ICONS[tag]}
    {tag.replace("_", " ")}
  </span>
)

// ============================================
// Column Definitions
// ============================================

const columns: Column<Person>[] = [
  {
    key: "name",
    header: "Person",
    width: "primary",
    sortable: true,
    render: (person) => (
      <div className="flex items-center gap-3">
        <Avatar
          name={person.name}
          src={person.photo_url}
          size="sm"
          className={person.is_blocked ? "opacity-50" : ""}
        />
        <div className="min-w-0">
          <div className="font-medium flex items-center gap-2">
            {person.name}
            {person.is_verified && (
              <BadgeCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            )}
            {person.is_blocked && (
              <Ban className="h-4 w-4 text-red-600 shrink-0" />
            )}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            {person.phone && (
              <>
                <Phone className="h-3 w-3" />
                {person.phone}
              </>
            )}
          </div>
        </div>
      </div>
    ),
  },
  {
    key: "email",
    header: "Contact",
    width: "secondary",
    hideOnMobile: true,
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
    render: (person) => (
      <StatusDot
        status={person.is_blocked ? "error" : person.is_verified ? "success" : "muted"}
        label={person.is_blocked ? "Blocked" : person.is_verified ? "Verified" : "Active"}
      />
    ),
  },
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
  {
    id: "status",
    label: "Status",
    type: "select",
    placeholder: "All Status",
    options: [
      { value: "verified", label: "Verified" },
      { value: "blocked", label: "Blocked" },
    ],
  },
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
// Metrics Configuration
// ============================================

const metrics: MetricConfig<Person>[] = [
  {
    id: "total",
    label: "Total",
    icon: Users,
    compute: (items) => items.length,
  },
  {
    id: "tenants",
    label: "Tenants",
    icon: Home,
    compute: (items) => items.filter((p) => p.tags?.includes("tenant")).length,
  },
  {
    id: "staff",
    label: "Staff",
    icon: Briefcase,
    compute: (items) => items.filter((p) => p.tags?.includes("staff")).length,
  },
  {
    id: "visitors",
    label: "Visitors",
    icon: UserCircle,
    compute: (items) => items.filter((p) => p.tags?.includes("visitor")).length,
  },
  {
    id: "verified",
    label: "Verified",
    icon: BadgeCheck,
    compute: (items) => items.filter((p) => p.is_verified).length,
  },
  {
    id: "blocked",
    label: "Blocked",
    icon: Ban,
    compute: (items) => items.filter((p) => p.is_blocked).length,
    highlight: (value) => (value as number) > 0,
  },
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
      // Actions
      createHref="/people/new"
      createLabel="Add Person"
      createPermission="tenants.create"
      headerActions={
        <div className="flex gap-2">
          {duplicateCount > 0 && (
            <Link href="/people/duplicates">
              <Button variant="outline" className="border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-700">
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
