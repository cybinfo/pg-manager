"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { Button } from "@/components/ui/button"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
} from "@/components/ui/detail-components"
import { StatusBadge } from "@/components/ui/status-badge"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import {
  Users,
  Phone,
  Building2,
  Home,
  Clock,
  LogOut,
  Moon,
  Calendar,
  User,
  Trash2,
  Search,
  Wrench,
  Briefcase,
  Car,
  CreditCard,
  MessageSquare,
  CalendarCheck,
  UserPlus,
  TrendingUp,
  X,
  History,
  Star,
  Ban,
} from "lucide-react"
import { toast } from "sonner"
import { formatDateTime, formatDate } from "@/lib/format"
import { PermissionGate } from "@/components/auth"
import { Avatar } from "@/components/ui/avatar"
import {
  VisitorType,
  VISITOR_TYPE_LABELS,
  EnquiryStatus,
  ENQUIRY_STATUS_LABELS,
  ENQUIRY_SOURCE_LABELS,
  EnquirySource,
  VisitorContact,
} from "@/types/visitors.types"

interface Visitor {
  id: string
  visitor_name: string
  visitor_phone: string | null
  visitor_type: VisitorType
  visitor_contact_id: string | null
  relation: string | null
  purpose: string | null
  check_in_time: string
  check_out_time: string | null
  is_overnight: boolean
  overnight_charge: number | null
  num_nights: number | null
  charge_per_night: number | null
  expected_checkout_date: string | null
  company_name: string | null
  service_type: string | null
  enquiry_status: EnquiryStatus | null
  enquiry_source: EnquirySource | null
  rooms_interested: string[] | null
  follow_up_date: string | null
  converted_tenant_id: string | null
  notes: string | null
  id_type: string | null
  id_number: string | null
  vehicle_number: string | null
  host_name: string | null
  department: string | null
  created_at: string
  tenant: {
    id: string
    name: string
    phone: string
    photo_url: string | null
    profile_photo: string | null
    room?: { room_number: string } | null
  } | null
  property: {
    id: string
    name: string
    address: string | null
  } | null
  room: {
    room_number: string
  } | null
  visitor_contact?: VisitorContact | null
}

interface VisitHistoryEntry {
  id: string
  check_in_time: string
  check_out_time: string | null
  visitor_type: VisitorType
  purpose: string | null
  property: { name: string } | null
}

interface RawVisitor extends Omit<Visitor, 'tenant' | 'property' | 'room'> {
  tenant: {
    id: string
    name: string
    phone: string
    photo_url: string | null
    profile_photo: string | null
    room?: { room_number: string }[] | null
  }[] | null
  property: {
    id: string
    name: string
    address: string | null
  }[] | null
}

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

const VisitorTypeBadge = ({ type }: { type: VisitorType }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${VISITOR_TYPE_BADGE_COLORS[type]}`}>
    {VISITOR_TYPE_ICONS[type]}
    {VISITOR_TYPE_LABELS[type]}
  </span>
)

export default function VisitorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [visitor, setVisitor] = useState<Visitor | null>(null)
  const [visitHistory, setVisitHistory] = useState<VisitHistoryEntry[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const fetchVisitor = async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("visitors")
        .select(`
          *,
          tenant:tenants!tenant_id(id, name, phone, photo_url, profile_photo, room:rooms(room_number)),
          property:properties(id, name, address),
          visitor_contact:visitor_contacts(*)
        `)
        .eq("id", params.id)
        .single()

      if (error || !data) {
        console.error("Error fetching visitor:", error)
        toast.error("Visitor not found")
        router.push("/visitors")
        return
      }

      const rawData = data as RawVisitor & { visitor_contact: VisitorContact[] | null }
      const tenant = transformJoin(rawData.tenant)
      const property = transformJoin(rawData.property)
      const visitorContact = transformJoin(rawData.visitor_contact)

      const visitorData: Visitor = {
        ...rawData,
        tenant: tenant ? {
          ...tenant,
          room: transformJoin(tenant.room),
        } : null,
        property,
        room: tenant ? transformJoin(tenant.room) : null,
        visitor_contact: visitorContact,
      }
      setVisitor(visitorData)

      if (visitorData.visitor_contact_id) {
        const { data: historyData } = await supabase
          .from("visitors")
          .select(`
            id,
            check_in_time,
            check_out_time,
            visitor_type,
            purpose,
            property:properties(name)
          `)
          .eq("visitor_contact_id", visitorData.visitor_contact_id)
          .neq("id", params.id)
          .order("check_in_time", { ascending: false })
          .limit(10)

        if (historyData) {
          const transformedHistory = historyData.map((h: {
            id: string
            check_in_time: string
            check_out_time: string | null
            visitor_type: VisitorType
            purpose: string | null
            property: { name: string }[] | null
          }) => ({
            ...h,
            property: transformJoin(h.property),
          }))
          setVisitHistory(transformedHistory)
        }
      }

      setLoading(false)
    }

    fetchVisitor()
  }, [params.id, router])

  const getDuration = (checkIn: string, checkOut: string | null) => {
    const start = new Date(checkIn)
    const end = checkOut ? new Date(checkOut) : new Date()
    const diffMs = end.getTime() - start.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))

    if (diffHours > 24) {
      const days = Math.floor(diffHours / 24)
      const hours = diffHours % 24
      return `${days}d ${hours}h`
    }
    if (diffHours > 0) {
      return `${diffHours}h ${diffMins}m`
    }
    return `${diffMins}m`
  }

  const handleCheckOut = async () => {
    if (!visitor) return

    setActionLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("visitors")
      .update({ check_out_time: new Date().toISOString() })
      .eq("id", visitor.id)

    if (error) {
      toast.error("Failed to check out visitor")
    } else {
      toast.success("Visitor checked out successfully")
      setVisitor({ ...visitor, check_out_time: new Date().toISOString() })
    }
    setActionLoading(false)
  }

  const handleUpdateEnquiryStatus = async (newStatus: EnquiryStatus) => {
    if (!visitor) return

    setActionLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("visitors")
      .update({ enquiry_status: newStatus })
      .eq("id", visitor.id)

    if (error) {
      toast.error("Failed to update enquiry status")
    } else {
      toast.success(`Enquiry marked as ${ENQUIRY_STATUS_LABELS[newStatus]}`)
      setVisitor({ ...visitor, enquiry_status: newStatus })
    }
    setActionLoading(false)
  }

  const handleDelete = async () => {
    if (!visitor) return

    if (!confirm("Are you sure you want to delete this visitor record?")) {
      return
    }

    setActionLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("visitors")
      .delete()
      .eq("id", visitor.id)

    if (error) {
      toast.error("Failed to delete visitor")
      setActionLoading(false)
    } else {
      toast.success("Visitor record deleted")
      router.push("/visitors")
    }
  }

  if (loading) {
    return <PageLoading message="Loading visitor details..." />
  }

  if (!visitor) {
    return null
  }

  const isCheckedIn = !visitor.check_out_time

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={visitor.visitor_name}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <VisitorTypeBadge type={visitor.visitor_type} />
            {visitor.is_overnight && (
              <StatusBadge status="info" label="Overnight" size="sm" />
            )}
            <span>
              {visitor.visitor_type === "tenant_visitor" && visitor.tenant
                ? `Visiting ${visitor.tenant.name}`
                : visitor.visitor_type === "service_provider" && visitor.service_type
                ? `${visitor.service_type}${visitor.company_name ? ` - ${visitor.company_name}` : ""}`
                : visitor.visitor_type === "enquiry"
                ? "Prospective Tenant"
                : visitor.property?.name || "Visitor"
              }
            </span>
          </div>
        }
        backHref="/visitors"
        backLabel="All Visitors"
        status={isCheckedIn ? "active" : "muted"}
        avatar={
          <div className={`h-16 w-16 rounded-full flex items-center justify-center ${VISITOR_TYPE_BADGE_COLORS[visitor.visitor_type]}`}>
            {VISITOR_TYPE_ICONS[visitor.visitor_type]}
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {isCheckedIn && (
              <Button onClick={handleCheckOut} disabled={actionLoading}>
                <LogOut className="mr-2 h-4 w-4" />
                Check Out
              </Button>
            )}
            {visitor.visitor_type === "enquiry" && visitor.enquiry_status !== "converted" && (
              <Button
                variant="outline"
                onClick={() => router.push(`/tenants/new?from_enquiry=${visitor.id}&name=${encodeURIComponent(visitor.visitor_name)}&phone=${encodeURIComponent(visitor.visitor_phone || "")}`)}
                disabled={actionLoading}
              >
                <UserPlus className="mr-2 h-4 w-4" />
                Convert to Tenant
              </Button>
            )}
            <PermissionGate permission="visitors.delete" hide>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={actionLoading}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </PermissionGate>
          </div>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          label="Status"
          value={isCheckedIn ? "Checked In" : "Checked Out"}
          icon={Clock}
          variant={isCheckedIn ? "success" : "default"}
        />
        <InfoCard
          label="Duration"
          value={getDuration(visitor.check_in_time, visitor.check_out_time)}
          icon={Clock}
          variant="default"
        />
        {visitor.is_overnight && visitor.num_nights && (
          <InfoCard
            label="Nights"
            value={`${visitor.num_nights} night${visitor.num_nights > 1 ? "s" : ""}`}
            icon={Moon}
            variant="default"
          />
        )}
        {visitor.overnight_charge !== null && visitor.overnight_charge > 0 && (
          <InfoCard
            label="Charge"
            value={<Currency amount={visitor.overnight_charge} />}
            icon={CreditCard}
            variant="default"
          />
        )}
      </div>

      {/* Enquiry Status Card */}
      {visitor.visitor_type === "enquiry" && (
        <DetailSection
          title="Enquiry Status"
          description="Track this prospective tenant"
          icon={TrendingUp}
          className="border-purple-200 bg-purple-50/50"
        >
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Current Status</p>
              {visitor.enquiry_status && (
                <StatusBadge
                  status={
                    visitor.enquiry_status === "converted" ? "success" :
                    visitor.enquiry_status === "lost" ? "error" :
                    visitor.enquiry_status === "follow_up" ? "info" : "warning"
                  }
                  label={ENQUIRY_STATUS_LABELS[visitor.enquiry_status]}
                  size="sm"
                />
              )}
            </div>
            {visitor.enquiry_status !== "converted" && visitor.enquiry_status !== "lost" && (
              <div className="flex gap-2 ml-auto">
                {visitor.enquiry_status === "pending" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUpdateEnquiryStatus("follow_up")}
                    disabled={actionLoading}
                  >
                    <CalendarCheck className="mr-1 h-4 w-4" />
                    Mark Follow Up
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="text-green-600 border-green-300 hover:bg-green-50"
                  onClick={() => handleUpdateEnquiryStatus("converted")}
                  disabled={actionLoading}
                >
                  <UserPlus className="mr-1 h-4 w-4" />
                  Mark Converted
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  onClick={() => handleUpdateEnquiryStatus("lost")}
                  disabled={actionLoading}
                >
                  <X className="mr-1 h-4 w-4" />
                  Mark Lost
                </Button>
              </div>
            )}
          </div>
          {visitor.enquiry_source && (
            <InfoRow label="Source" value={ENQUIRY_SOURCE_LABELS[visitor.enquiry_source]} />
          )}
          {visitor.follow_up_date && (
            <InfoRow label="Follow-up Date" value={formatDate(visitor.follow_up_date)} icon={Calendar} />
          )}
        </DetailSection>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Visitor Details */}
        <DetailSection
          title="Visitor Details"
          description="Information about the visitor"
          icon={User}
        >
          <InfoRow label="Name" value={visitor.visitor_name} />
          {visitor.visitor_phone && (
            <InfoRow
              label="Phone"
              value={
                <a href={`tel:${visitor.visitor_phone}`} className="text-teal-600 hover:underline">
                  {visitor.visitor_phone}
                </a>
              }
              icon={Phone}
            />
          )}
          {visitor.visitor_type === "tenant_visitor" && visitor.relation && (
            <InfoRow label="Relation" value={visitor.relation} />
          )}
          {visitor.vehicle_number && (
            <InfoRow label="Vehicle" value={visitor.vehicle_number} icon={Car} />
          )}
          {visitor.id_type && (
            <InfoRow label={`ID (${visitor.id_type})`} value={visitor.id_number || "—"} icon={CreditCard} />
          )}
          {visitor.purpose && (
            <InfoRow label="Purpose" value={visitor.purpose} />
          )}
          {visitor.notes && (
            <InfoRow label="Notes" value={visitor.notes} icon={MessageSquare} />
          )}
        </DetailSection>

        {/* Visit Timing */}
        <DetailSection
          title="Visit Timing"
          description="Check-in and check-out times"
          icon={Calendar}
        >
          <InfoRow
            label="Check-in Time"
            value={formatDateTime(visitor.check_in_time)}
            icon={Clock}
          />
          <InfoRow
            label="Check-out Time"
            value={
              visitor.check_out_time
                ? formatDateTime(visitor.check_out_time)
                : <span className="text-green-600">Still here</span>
            }
            icon={LogOut}
          />
          {visitor.is_overnight && (
            <>
              <InfoRow
                label="Overnight Stay"
                value={`${visitor.num_nights} night${(visitor.num_nights || 1) > 1 ? "s" : ""}`}
                icon={Moon}
              />
              {visitor.overnight_charge !== null && visitor.overnight_charge > 0 && (
                <InfoRow
                  label="Overnight Charge"
                  value={<Currency amount={visitor.overnight_charge} />}
                />
              )}
            </>
          )}
        </DetailSection>

        {/* Service Provider Details */}
        {visitor.visitor_type === "service_provider" && (
          <DetailSection
            title="Service Details"
            description="Information about the service provider"
            icon={Wrench}
          >
            {visitor.service_type && (
              <InfoRow label="Service Type" value={visitor.service_type} />
            )}
            {visitor.company_name && (
              <InfoRow label="Company" value={visitor.company_name} icon={Briefcase} />
            )}
          </DetailSection>
        )}

        {/* General Visitor Details */}
        {visitor.visitor_type === "general" && (visitor.host_name || visitor.department) && (
          <DetailSection
            title="Visit Details"
            description="Additional visit information"
            icon={User}
          >
            {visitor.host_name && (
              <InfoRow label="Meeting With" value={visitor.host_name} />
            )}
            {visitor.department && (
              <InfoRow label="Department" value={visitor.department} />
            )}
          </DetailSection>
        )}

        {/* Tenant & Property */}
        <DetailSection
          title={visitor.visitor_type === "tenant_visitor" ? "Visiting" : "Property"}
          description={
            visitor.visitor_type === "tenant_visitor"
              ? "Tenant and property information"
              : "Property information"
          }
          icon={Building2}
          className="md:col-span-2"
        >
          <div className={`grid ${visitor.visitor_type === "tenant_visitor" && visitor.tenant ? "md:grid-cols-2" : "md:grid-cols-1"} gap-6`}>
            {visitor.visitor_type === "tenant_visitor" && visitor.tenant && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <Avatar name={visitor.tenant.name} src={visitor.tenant.profile_photo || visitor.tenant.photo_url} size="md" />
                  <div>
                    <p className="font-semibold">{visitor.tenant.name}</p>
                    <p className="text-sm text-muted-foreground">Tenant</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${visitor.tenant.phone}`} className="hover:text-primary">
                      {visitor.tenant.phone}
                    </a>
                  </div>
                  {visitor.room && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Home className="h-4 w-4" />
                      Room {visitor.room.room_number}
                    </div>
                  )}
                </div>
                <Link href={`/tenants/${visitor.tenant.id}`}>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    View Tenant Profile
                  </Button>
                </Link>
              </div>
            )}

            {visitor.property && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{visitor.property.name}</p>
                    <p className="text-sm text-muted-foreground">Property</p>
                  </div>
                </div>
                {visitor.property.address && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {visitor.property.address}
                  </p>
                )}
                <Link href={`/properties/${visitor.property.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Property
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </DetailSection>

        {/* Visitor Contact Info */}
        {visitor.visitor_contact && (
          <DetailSection
            title="Visitor Profile"
            description="Contact directory entry"
            icon={User}
            className="border-blue-200 bg-blue-50/30"
            actions={
              <div className="flex items-center gap-2">
                {visitor.visitor_contact.is_frequent && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium">
                    <Star className="h-3 w-3" />
                    Frequent
                  </span>
                )}
                {visitor.visitor_contact.is_blocked && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                    <Ban className="h-3 w-3" />
                    Blocked
                  </span>
                )}
              </div>
            }
          >
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-muted-foreground">Total Visits</p>
                <p className="text-2xl font-bold text-blue-600">{visitor.visitor_contact.visit_count}</p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-muted-foreground">First Visit</p>
                <p className="font-medium">{formatDate(visitor.visitor_contact.created_at)}</p>
              </div>
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-muted-foreground">Last Visit</p>
                <p className="font-medium">
                  {visitor.visitor_contact.last_visit_at
                    ? formatDate(visitor.visitor_contact.last_visit_at)
                    : "This visit"}
                </p>
              </div>
            </div>
            {visitor.visitor_contact.notes && (
              <div className="p-3 bg-white rounded-lg border">
                <p className="text-sm text-muted-foreground mb-1">Contact Notes</p>
                <p className="text-sm">{visitor.visitor_contact.notes}</p>
              </div>
            )}
            <Link href="/visitors/directory">
              <Button variant="outline" size="sm" className="mt-4">
                View in Directory
              </Button>
            </Link>
          </DetailSection>
        )}

        {/* Visit History */}
        {visitHistory.length > 0 && (
          <DetailSection
            title="Visit History"
            description={`Previous visits from this person (${visitHistory.length} total)`}
            icon={History}
          >
            <div className="space-y-3">
              {visitHistory.map((visit) => (
                <Link
                  key={visit.id}
                  href={`/visitors/${visit.id}`}
                  className="block p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${VISITOR_TYPE_BADGE_COLORS[visit.visitor_type]}`}>
                        {VISITOR_TYPE_ICONS[visit.visitor_type]}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatDate(visit.check_in_time)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${VISITOR_TYPE_BADGE_COLORS[visit.visitor_type]}`}>
                            {VISITOR_TYPE_LABELS[visit.visitor_type]}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {visit.property?.name || "Unknown Property"}
                          {visit.purpose && ` - ${visit.purpose}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {visit.check_out_time ? (
                        <span className="text-muted-foreground">
                          {getDuration(visit.check_in_time, visit.check_out_time)}
                        </span>
                      ) : (
                        <span className="text-green-600 font-medium">Currently here</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </DetailSection>
        )}
      </div>
    </div>
  )
}
