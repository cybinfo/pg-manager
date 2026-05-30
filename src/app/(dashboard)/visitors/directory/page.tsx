/**
 * Visitor Directory Page
 *
 * Manage visitor contacts - view all unique visitors, mark as frequent/blocked,
 * see visit history statistics
 */

"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useVisitorDirectory } from "@/lib/hooks/useVisitorDirectory"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  Calendar,
  History,
  MoreVertical,
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getNowISO } from "@/lib/date-helpers"
import { formatDate } from "@/lib/format"
import { PermissionGuard } from "@/components/auth"
import { PageSkeleton } from "@/components/ui/loading"
import { PageHeader } from "@/components/ui"
import { Select } from "@/components/ui/form-components"
import { EmptyState } from "@/components/ui/empty-state"
import {
  VisitorType,
  VISITOR_TYPE_LABELS,
  VisitorContact,
} from "@/types/visitors.types"
import {
  VISITOR_TYPE_FILTER_OPTIONS,
  VISITOR_CONTACT_STATUS_OPTIONS,
} from "@/lib/constants/form-options"
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
  tenant_visitor: "bg-info/10 text-info",
  enquiry: "bg-purple-100 text-purple-700",
  service_provider: "bg-warning/10 text-warning",
  general: "bg-muted text-foreground",
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
  const {
    loading,
    contacts,
    searchQuery,
    setSearchQuery,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
    fetchContacts,
  } = useVisitorDirectory()
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const handleToggleFrequent = async (contact: VisitorContact) => {
    setActionLoading(contact.id)
    const supabase = createClient()

    const { error } = await supabase
      .from("visitor_contacts")
      .update({ is_frequent: !contact.is_frequent, updated_at: getNowISO() })
      .eq("id", contact.id)

    if (error) {
      showError("Failed to update contact")
    } else {
      showSuccess(contact.is_frequent ? "Removed from frequent" : "Marked as frequent")
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
        updated_at: getNowISO(),
      })
      .eq("id", contact.id)

    if (error) {
      showError("Failed to update contact")
    } else {
      showSuccess(contact.is_blocked ? "Contact unblocked" : "Contact blocked")
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
    return <PageSkeleton variant="list" />
  }

  return (
    <PermissionGuard permission="visitors.view">
      <div className="space-y-6">
        <PageHeader
          title="Visitor Directory"
          backHref="/visitors"
          breadcrumbs={[
            { label: "Visitors", href: "/visitors" },
            { label: "Visitor Directory" },
          ]}
        />
        <div className="flex justify-end">
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
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Star className="h-5 w-5 text-warning" />
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
                <div className="p-2 bg-warning/10 rounded-lg">
                  <Wrench className="h-5 w-5 text-warning" />
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
                <div className="p-2 bg-destructive/10 rounded-lg">
                  <Ban className="h-5 w-5 text-destructive" />
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
                options={VISITOR_TYPE_FILTER_OPTIONS}
              />
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                options={VISITOR_CONTACT_STATUS_OPTIONS}
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
                    ? "border-destructive/30 bg-destructive/5"
                    : contact.is_frequent
                    ? "border-warning/30 bg-warning/5"
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
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-warning/10 text-warning rounded-full text-xs font-medium">
                              <Star className="h-3 w-3" />
                              Frequent
                            </span>
                          )}
                          {contact.is_blocked && (
                            <span className="flex items-center gap-1 px-2 py-0.5 bg-destructive/10 text-destructive rounded-full text-xs font-medium">
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
                            className={contact.is_blocked ? "text-success" : "text-destructive"}
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
