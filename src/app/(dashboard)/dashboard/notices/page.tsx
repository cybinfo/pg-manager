"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Bell,
  Plus,
  Search,
  Loader2,
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
  Clock
} from "lucide-react"
import { toast } from "sonner"

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

const typeConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
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

export default function NoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [actionMenuOpen, setActionMenuOpen] = useState<string | null>(null)

  const fetchNotices = async () => {
    const supabase = createClient()

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

  const toggleActive = async (notice: Notice) => {
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

  const deleteNotice = async (notice: Notice) => {
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

  const filteredNotices = notices.filter((notice) => {
    const matchesSearch =
      notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      notice.content.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesType = typeFilter === "all" || notice.type === typeFilter

    let matchesStatus = true
    if (statusFilter === "active") {
      matchesStatus = notice.is_active && !isExpired(notice.expires_at)
    } else if (statusFilter === "inactive") {
      matchesStatus = !notice.is_active || isExpired(notice.expires_at)
    }

    return matchesSearch && matchesType && matchesStatus
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    return "Just now"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Notices</h1>
          <p className="text-muted-foreground">Announcements and notifications for tenants</p>
        </div>
        <Link href="/dashboard/notices/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Notice
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Bell className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notices.length}</p>
                <p className="text-xs text-muted-foreground">Total Notices</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeCount}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{emergencyCount}</p>
                <p className="text-xs text-muted-foreground">Emergency</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{expiringCount}</p>
                <p className="text-xs text-muted-foreground">Expiring Soon</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search notices..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm min-w-[160px]"
            >
              <option value="all">All Types</option>
              <option value="general">General</option>
              <option value="maintenance">Maintenance</option>
              <option value="payment_reminder">Payment Reminder</option>
              <option value="emergency">Emergency</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm min-w-[140px]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive/Expired</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Notices List */}
      {filteredNotices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No notices found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {notices.length === 0
                ? "Create your first notice to communicate with tenants"
                : "No notices match your search criteria"}
            </p>
            {notices.length === 0 && (
              <Link href="/dashboard/notices/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Notice
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotices.map((notice) => {
            const TypeIcon = typeConfig[notice.type]?.icon || Megaphone
            const expired = isExpired(notice.expires_at)
            const isActive = notice.is_active && !expired

            return (
              <Card
                key={notice.id}
                className={`transition-all ${!isActive ? "opacity-60" : ""}`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-start gap-4">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg shrink-0 ${typeConfig[notice.type]?.bgColor || "bg-gray-100"}`}>
                      <TypeIcon className={`h-5 w-5 ${typeConfig[notice.type]?.color || "text-gray-600"}`} />
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeConfig[notice.type]?.bgColor} ${typeConfig[notice.type]?.color}`}>
                          {typeConfig[notice.type]?.label || notice.type}
                        </span>
                        {!isActive && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                            {expired ? "Expired" : "Inactive"}
                          </span>
                        )}
                        {notice.property && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {notice.property.name}
                          </span>
                        )}
                      </div>

                      <Link href={`/dashboard/notices/${notice.id}`}>
                        <h3 className="font-semibold hover:text-primary transition-colors">
                          {notice.title}
                        </h3>
                      </Link>

                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {notice.content}
                      </p>

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {audienceLabels[notice.target_audience] || notice.target_audience}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {getTimeAgo(notice.created_at)}
                        </span>
                        {notice.expires_at && (
                          <span className={`flex items-center gap-1 ${expired ? "text-red-500" : ""}`}>
                            <Clock className="h-3 w-3" />
                            {expired ? "Expired" : `Expires ${formatDate(notice.expires_at)}`}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setActionMenuOpen(actionMenuOpen === notice.id ? null : notice.id)}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>

                      {actionMenuOpen === notice.id && (
                        <>
                          <div
                            className="fixed inset-0 z-10"
                            onClick={() => setActionMenuOpen(null)}
                          />
                          <div className="absolute right-0 top-full mt-1 w-48 bg-popover border rounded-md shadow-lg z-20">
                            <Link
                              href={`/dashboard/notices/${notice.id}`}
                              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                              onClick={() => setActionMenuOpen(null)}
                            >
                              <Edit className="h-4 w-4" />
                              Edit Notice
                            </Link>
                            <button
                              onClick={() => toggleActive(notice)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted transition-colors"
                            >
                              {notice.is_active ? (
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
                              onClick={() => deleteNotice(notice)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
