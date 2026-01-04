"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { DataTable, Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { ListPageFilters, FilterConfig } from "@/components/ui/list-page-filters"
import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { PageLoader } from "@/components/ui/page-loader"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Bell,
  Plus,
  Megaphone,
  AlertTriangle,
  Wrench,
  CreditCard,
  Building2,
  Calendar,
  Users,
  Eye,
  EyeOff,
  MoreVertical,
  Edit,
  Trash2,
  Clock,
  Layers,
  ChevronDown
} from "lucide-react"
import { PropertyLink } from "@/components/ui/entity-link"
import { toast } from "sonner"
import { formatDate, formatTimeAgo } from "@/lib/format"

interface Notice {
  id: string
  title: string
  content: string
  type: string
  target_audience: string
  target_rooms: string[] | null
  is_active: boolean
  expires_at: string | null
  created_at: string
  property: {
    id: string
    name: string
  } | null
}

const typeConfig: Record<string, { label: string; color: string; bgColor: string; icon: typeof Megaphone }> = {
  general: { label: "General", color: "text-blue-700", bgColor: "bg-blue-100", icon: Megaphone },
  maintenance: { label: "Maintenance", color: "text-orange-700", bgColor: "bg-orange-100", icon: Wrench },
  payment_reminder: { label: "Payment Reminder", color: "text-green-700", bgColor: "bg-green-100", icon: CreditCard },
  emergency: { label: "Emergency", color: "text-red-700", bgColor: "bg-red-100", icon: AlertTriangle },
}

const audienceLabels: Record<string, string> = {
  all: "All Residents",
  tenants_only: "Tenants Only",
  specific_rooms: "Specific Rooms",
}

interface Property {
  id: string
  name: string
}

// Group by options for notices
const noticeGroupByOptions = [
  { value: "property.name", label: "Property" },
  { value: "type", label: "Type" },
  { value: "is_active", label: "Active" },
]

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false)

  const fetchNotices = async () => {
    const supabase = createClient()

    // Fetch properties for filter
    const { data: propertiesData } = await supabase
      .from("properties")
      .select("id, name")
      .order("name")
    setProperties(propertiesData || [])

    const { data, error } = await supabase
      .from("notices")
      .select(`
        *,
        property:properties(id, name)
      `)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching notices:", error)
      toast.error("Failed to load notices")
    } else {
      setNotices(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchNotices()
  }, [])

  const toggleActive = async (e: React.MouseEvent, notice: Notice) => {
    e.stopPropagation()
    const supabase = createClient()

    const { error } = await supabase
      .from("notices")
      .update({ is_active: !notice.is_active })
      .eq("id", notice.id)

    if (error) {
      toast.error("Failed to update notice")
      return
    }

    setNotices(notices.map((n) =>
      n.id === notice.id ? { ...n, is_active: !n.is_active } : n
    ))
    toast.success(notice.is_active ? "Notice deactivated" : "Notice activated")
    setActionMenuOpen(null)
  }

  const deleteNotice = async (e: React.MouseEvent, notice: Notice) => {
    e.stopPropagation()
    if (!confirm("Are you sure you want to delete this notice?")) return

    const supabase = createClient()

    const { error } = await supabase
      .from("notices")
      .delete()
      .eq("id", notice.id)

    if (error) {
      toast.error("Failed to delete notice")
      return
    }

    setNotices(notices.filter((n) => n.id !== notice.id))
    toast.success("Notice deleted")
    setActionMenuOpen(null)
  }

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return false
    return new Date(expiresAt) < new Date()
  }

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      id: "property",
      label: "Property",
      type: "select",
      placeholder: "All Properties",
      options: properties.map(p => ({ value: p.id, label: p.name })),
    },
    {
      id: "type",
      label: "Type",
      type: "select",
      placeholder: "All Types",
      options: [
        { value: "general", label: "General" },
        { value: "maintenance", label: "Maintenance" },
        { value: "payment_reminder", label: "Payment Reminder" },
        { value: "emergency", label: "Emergency" },
      ],
    },
    {
      id: "status",
      label: "Status",
      type: "select",
      placeholder: "All Status",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive/Expired" },
      ],
    },
  ]

  const filteredNotices = notices.filter((notice) => {
    if (filters.property && filters.property !== "all" && notice.property?.id !== filters.property) {
      return false
    }
    if (filters.type && filters.type !== "all" && notice.type !== filters.type) {
      return false
    }
    if (filters.status && filters.status !== "all") {
      const isActive = notice.is_active && !isExpired(notice.expires_at)
      if (filters.status === "active" && !isActive) return false
      if (filters.status === "inactive" && isActive) return false
    }
    return true
  })

  // Stats
  const activeCount = notices.filter((n) => n.is_active && !isExpired(n.expires_at)).length
  const emergencyCount = notices.filter((n) => n.type === "emergency" && n.is_active).length
  const expiringCount = notices.filter((n) => {
    if (!n.expires_at || !n.is_active) return false
    const expiresAt = new Date(n.expires_at)
    const now = new Date()
    const threeDays = 3 * 24 * 60 * 60 * 1000
    return expiresAt > now && expiresAt.getTime() - now.getTime() < threeDays
  }).length

  const metricsItems: MetricItem[] = [
    { label: "Total Notices", value: notices.length, icon: Bell },
    { label: "Active", value: activeCount, icon: Eye },
    { label: "Emergency", value: emergencyCount, icon: AlertTriangle, highlight: emergencyCount > 0 },
    { label: "Expiring Soon", value: expiringCount, icon: Clock },
  ]

  const columns: Column<Notice>[] = [
    {
      key: "title",
      header: "Notice",
      width: "primary",
      render: (row) => {
        const TypeIcon = typeConfig[row.type]?.icon || Megaphone
        const expired = isExpired(row.expires_at)
        const isActive = row.is_active && !expired
        return (
          <div className={`flex items-start gap-3 ${!isActive ? "opacity-60" : ""}`}>
            <div className={`p-2 rounded-lg shrink-0 ${typeConfig[row.type]?.bgColor || "bg-gray-100"}`}>
              <TypeIcon className={`h-4 w-4 ${typeConfig[row.type]?.color || "text-gray-600"}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <TableBadge variant={row.type === "emergency" ? "error" : "default"}>
                  {typeConfig[row.type]?.label || row.type}
                </TableBadge>
                {!isActive && (
                  <TableBadge variant="muted">
                    {expired ? "Expired" : "Inactive"}
                  </TableBadge>
                )}
              </div>
              <div className="font-medium truncate">{row.title}</div>
              <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                {row.content}
              </p>
            </div>
          </div>
        )
      },
    },
    {
      key: "property",
      header: "Property",
      width: "tertiary",
      hideOnMobile: true,
      render: (row) => row.property ? (
        <PropertyLink id={row.property.id} name={row.property.name} size="sm" />
      ) : (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Building2 className="h-3 w-3" />
          All
        </div>
      ),
    },
    {
      key: "target_audience",
      header: "Audience",
      width: "tertiary",
      hideOnMobile: true,
      render: (row) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Users className="h-3 w-3" />
          {audienceLabels[row.target_audience] || row.target_audience}
        </div>
      ),
    },
    {
      key: "created_at",
      header: "Posted",
      width: "date",
      hideOnMobile: true,
      render: (row) => (
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatTimeAgo(row.created_at)}
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "iconAction",
      render: (row) => (
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation()
              setActionMenuOpen(actionMenuOpen === row.id ? null : row.id)
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>

          {actionMenuOpen === row.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  setActionMenuOpen(null)
                }}
              />
              <div className="absolute right-0 top-full mt-1 w-40 bg-popover border rounded-md shadow-lg z-20">
                <Link
                  href={`/notices/${row.id}`}
                  className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Edit className="h-4 w-4" />
                  Edit
                </Link>
                <button
                  onClick={(e) => toggleActive(e, row)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  {row.is_active ? (
                    <>
                      <EyeOff className="h-4 w-4" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Eye className="h-4 w-4" />
                      Activate
                    </>
                  )}
                </button>
                <button
                  onClick={(e) => deleteNotice(e, row)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      ),
    },
  ]

  if (loading) {
    return <PageLoader />
  }

  return (
    <FeatureGuard feature="notices">
      <PermissionGuard permission="notices.view">
        <div className="space-y-6">
      <PageHeader
        title="Notices"
        description="Announcements and notifications for tenants"
        icon={Bell}
        breadcrumbs={[{ label: "Notices" }]}
        actions={
          <Link href="/notices/new">
            <Button variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              New Notice
            </Button>
          </Link>
        }
      />

      <MetricsBar items={metricsItems} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <ListPageFilters
            filters={filterConfigs}
            values={filters}
            onChange={(id, value) => setFilters(prev => ({ ...prev, [id]: value }))}
            onClear={() => setFilters({})}
          />
        </div>

        {/* Group By Multi-Select */}
        <div className="relative">
          <button
            onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-2 hover:bg-slate-50"
          >
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span>
              {selectedGroups.length === 0
                ? "Group by..."
                : selectedGroups.length === 1
                  ? noticeGroupByOptions.find(o => o.value === selectedGroups[0])?.label
                  : `${selectedGroups.length} levels`}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${groupDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {groupDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setGroupDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-56 bg-white border rounded-lg shadow-lg z-20 py-1">
                <div className="px-3 py-2 border-b">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Group by (select order)
                  </p>
                </div>
                {noticeGroupByOptions.map((opt) => {
                  const isSelected = selectedGroups.includes(opt.value)
                  const orderIndex = selectedGroups.indexOf(opt.value)

                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedGroups([...selectedGroups, opt.value])
                          } else {
                            setSelectedGroups(selectedGroups.filter(v => v !== opt.value))
                          }
                        }}
                      />
                      <span className="text-sm flex-1">{opt.label}</span>
                      {isSelected && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                          {orderIndex + 1}
                        </span>
                      )}
                    </label>
                  )
                })}
                {selectedGroups.length > 0 && (
                  <div className="border-t mt-1 pt-1 px-3 py-2">
                    <button
                      onClick={() => {
                        setSelectedGroups([])
                        setGroupDropdownOpen(false)
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear grouping
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredNotices}
        keyField="id"
        href={(row) => `/notices/${row.id}`}
        searchable
        searchPlaceholder="Search notices..."
        searchFields={["title", "content"] as (keyof Notice)[]}
        groupBy={selectedGroups.length > 0 ? selectedGroups.map(key => ({
          key,
          label: noticeGroupByOptions.find(o => o.value === key)?.label
        })) : undefined}
        emptyState={
          <div className="flex flex-col items-center py-8">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No notices found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {notices.length === 0
                ? "Create your first notice to communicate with tenants"
                : "No notices match your search criteria"}
            </p>
            {notices.length === 0 && (
              <Link href="/notices/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Notice
                </Button>
              </Link>
            )}
          </div>
        }
      />
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
