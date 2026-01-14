/**
 * Visitor Directory Page
 *
 * Manage visitor contacts - view all unique visitors, mark as frequent/blocked,
 * see visit history statistics
 */

"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Users,
  Search,
  Wrench,
  User,
  Star,
  StarOff,
  Ban,
  Check,
  Phone,
  Building2,
  ArrowLeft,
  Calendar,
  History,
  Filter,
  MoreVertical,
} from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/format"
import { PermissionGuard } from "@/components/auth"
import { PageLoader } from "@/components/ui/page-loader"
import { Select } from "@/components/ui/form-components"
import { EmptyState } from "@/components/ui/empty-state"
import {
  VisitorType,
  VISITOR_TYPE_LABELS,
  VisitorContact,
} from "@/types/visitors.types"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ============================================
// Badge Colors & Icons
// ============================================

const VISITOR_TYPE_BADGE_COLORS: Record<VisitorType, string> = {
  tenant_visitor: "bg-blue-100 text-blue-700",
  enquiry: "bg-purple-100 text-purple-700",
  service_provider: "bg-orange-100 text-orange-700",
  general: "bg-slate-100 text-slate-700",
}

const VISITOR_TYPE_ICONS: Record<VisitorType, React.ReactNode> = {
  tenant_visitor: <Users className="h-4 w-4" />,
  enquiry: <Search className="h-4 w-4" />,
  service_provider: <Wrench className="h-4 w-4" />,
  general: <User className="h-4 w-4" />,
}

// ============================================
// Page Component
// ============================================

export default function VisitorDirectoryPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [contacts, setContacts] = useState<VisitorContact[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterType, setFilterType] = useState<string>("")
  const [filterStatus, setFilterStatus] = useState<string>("")
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchContacts = useCallback(async () => {
    const supabase = createClient()

    let query = supabase
      .from("visitor_contacts")
      .select("*")
      .order("visit_count", { ascending: false })
      .order("last_visit_at", { ascending: false, nullsFirst: false })

    if (filterType) {
      query = query.eq("visitor_type", filterType)
    }

    if (filterStatus === "frequent") {
      query = query.eq("is_frequent", true)
    } else if (filterStatus === "blocked") {
      query = query.eq("is_blocked", true)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching contacts:", error)
      toast.error("Failed to load visitor directory")
      return
    }

    // Filter by search query client-side
    let filteredData: VisitorContact[] = data || []
    if (searchQuery) {
      const search = searchQuery.toLowerCase()
      filteredData = filteredData.filter(
        (c: VisitorContact) =>
          c.name.toLowerCase().includes(search) ||
          c.phone?.toLowerCase().includes(search) ||
          c.company_name?.toLowerCase().includes(search)
      )
    }

    setContacts(filteredData)
    setLoading(false)
  }, [searchQuery, filterType, filterStatus])

  useEffect(() => {
    fetchContacts()
  }, [fetchContacts])

  const handleToggleFrequent = async (contact: VisitorContact) => {
    setActionLoading(contact.id)
    const supabase = createClient()

    const { error } = await supabase
      .from("visitor_contacts")
      .update({ is_frequent: !contact.is_frequent, updated_at: new Date().toISOString() })
      .eq("id", contact.id)

    if (error) {
      toast.error("Failed to update contact")
    } else {
      toast.success(contact.is_frequent ? "Removed from frequent" : "Marked as frequent")
      fetchContacts()
    }
    setActionLoading(null)
  }

  const handleToggleBlocked = async (contact: VisitorContact) => {
    setActionLoading(contact.id)
    const supabase = createClient()

    const { error } = await supabase
      .from("visitor_contacts")
      .update({
        is_blocked: !contact.is_blocked,
        blocked_reason: contact.is_blocked ? null : "Blocked by admin",
        updated_at: new Date().toISOString(),
      })
      .eq("id", contact.id)

    if (error) {
      toast.error("Failed to update contact")
    } else {
      toast.success(contact.is_blocked ? "Contact unblocked" : "Contact blocked")
      fetchContacts()
    }
    setActionLoading(null)
  }

  const metrics = {
    total: contacts.length,
    frequent: contacts.filter((c) => c.is_frequent).length,
    blocked: contacts.filter((c) => c.is_blocked).length,
    serviceProviders: contacts.filter((c) => c.visitor_type === "service_provider").length,
  }

  if (loading) {
    return <PageLoader />
  }

  return (
    <PermissionGuard permission="visitors.view">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/visitors">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Visitor Directory</h1>
              <p className="text-muted-foreground">
                Manage all unique visitors and their contact information
              </p>
            </div>
          </div>
          <Link href="/visitors/new">
            <Button>
              <User className="mr-2 h-4 w-4" />
              Check In Visitor
            </Button>
          </Link>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.total}</p>
                  <p className="text-sm text-muted-foreground">Total Contacts</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Star className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.frequent}</p>
                  <p className="text-sm text-muted-foreground">Frequent</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Wrench className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.serviceProviders}</p>
                  <p className="text-sm text-muted-foreground">Service Providers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <Ban className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{metrics.blocked}</p>
                  <p className="text-sm text-muted-foreground">Blocked</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                options={[
                  { value: "", label: "All Types" },
                  { value: "tenant_visitor", label: "Tenant Visitors" },
                  { value: "enquiry", label: "Enquiries" },
                  { value: "service_provider", label: "Service Providers" },
                  { value: "general", label: "General" },
                ]}
              />
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={[
                  { value: "", label: "All Status" },
                  { value: "frequent", label: "Frequent Visitors" },
                  { value: "blocked", label: "Blocked" },
                ]}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contact List */}
        {contacts.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No contacts found"
            description={searchQuery || filterType || filterStatus
              ? "Try adjusting your search or filters"
              : "Visitor contacts will appear here after check-ins"}
          />
        ) : (
          <div className="grid gap-4">
            {contacts.map((contact) => (
              <Card
                key={contact.id}
                className={
                  contact.is_blocked
                    ? "border-red-200 bg-red-50/30"
                    : contact.is_frequent
                    ? "border-yellow-200 bg-yellow-50/30"
                    : ""
                }
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0 ${VISITOR_TYPE_BADGE_COLORS[contact.visitor_type]}`}>
                        {VISITOR_TYPE_ICONS[contact.visitor_type]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{contact.name}</h3>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${VISITOR_TYPE_BADGE_COLORS[contact.visitor_type]}`}>
                            {VISITOR_TYPE_LABELS[contact.visitor_type]}
                          </span>
                          {contact.is_frequent && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                              <Star className="h-3 w-3" />
                              Frequent
                            </span>
                          )}
                          {contact.is_blocked && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                              <Ban className="h-3 w-3" />
                              Blocked
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                          {contact.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {contact.phone}
                            </span>
                          )}
                          {contact.company_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              {contact.company_name}
                            </span>
                          )}
                          {contact.service_type && (
                            <span className="flex items-center gap-1">
                              <Wrench className="h-3 w-3" />
                              {contact.service_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right hidden sm:block">
                        <div className="flex items-center gap-1 text-sm">
                          <History className="h-3 w-3" />
                          <span className="font-semibold">{contact.visit_count}</span>
                          <span className="text-muted-foreground">visits</span>
                        </div>
                        {contact.last_visit_at && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            Last: {formatDate(contact.last_visit_at)}
                          </div>
                        )}
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={actionLoading === contact.id}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/visitors/new?contact_id=${contact.id}`)}
                          >
                            <User className="mr-2 h-4 w-4" />
                            Check In
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleToggleFrequent(contact)}>
                            {contact.is_frequent ? (
                              <>
                                <StarOff className="mr-2 h-4 w-4" />
                                Remove Frequent
                              </>
                            ) : (
                              <>
                                <Star className="mr-2 h-4 w-4" />
                                Mark Frequent
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleBlocked(contact)}
                            className={contact.is_blocked ? "text-green-600" : "text-red-600"}
                          >
                            {contact.is_blocked ? (
                              <>
                                <Check className="mr-2 h-4 w-4" />
                                Unblock
                              </>
                            ) : (
                              <>
                                <Ban className="mr-2 h-4 w-4" />
                                Block
                              </>
                            )}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
