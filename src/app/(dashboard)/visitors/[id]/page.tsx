"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Users,
  Phone,
  Building2,
  Home,
  Clock,
  LogOut,
  Moon,
  IndianRupee,
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
import { formatDateTime, formatCurrency, formatDate } from "@/lib/format"
import { PermissionGate } from "@/components/auth"
import { Avatar } from "@/components/ui/avatar"
import { PageLoader } from "@/components/ui/page-loader"
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
  // Service provider fields
  company_name: string | null
  service_type: string | null
  // Enquiry fields
  enquiry_status: EnquiryStatus | null
  enquiry_source: EnquirySource | null
  rooms_interested: string[] | null
  follow_up_date: string | null
  converted_tenant_id: string | null
  // General visitor fields
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

// ============================================
// Visitor Type Badge Components
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

const VisitorTypeBadge = ({ type }: { type: VisitorType }) => (
  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${VISITOR_TYPE_BADGE_COLORS[type]}`}>
    {VISITOR_TYPE_ICONS[type]}
    {VISITOR_TYPE_LABELS[type]}
  </span>
)

const EnquiryStatusBadge = ({ status }: { status: EnquiryStatus }) => {
  const colorMap: Record<EnquiryStatus, string> = {
    pending: "bg-yellow-100 text-yellow-700",
    follow_up: "bg-blue-100 text-blue-700",
    converted: "bg-green-100 text-green-700",
    lost: "bg-red-100 text-red-700",
  }
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${colorMap[status]}`}>
      {ENQUIRY_STATUS_LABELS[status]}
    </span>
  )
}

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
          tenant:tenants(id, name, phone, photo_url, profile_photo, room:rooms(room_number)),
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

      // Transform the data from arrays to single objects
      const rawData = data as RawVisitor & { visitor_contact: VisitorContact[] | null }
      const tenant = transformJoin(rawData.tenant)
      const property = transformJoin(rawData.property)
      const visitorContact = transformJoin(rawData.visitor_contact)

      // Flatten the room data from tenant
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

      // Fetch visit history if there's a visitor contact
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
    return <PageLoader />
  }

  if (!visitor) {
    return null
  }

  const isCheckedIn = !visitor.check_out_time

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/visitors">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center ${VISITOR_TYPE_BADGE_COLORS[visitor.visitor_type]}`}>
              {VISITOR_TYPE_ICONS[visitor.visitor_type]}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl md:text-3xl font-bold">{visitor.visitor_name}</h1>
                <VisitorTypeBadge type={visitor.visitor_type} />
                {visitor.is_overnight && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                    Overnight
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">
                {visitor.visitor_type === "tenant_visitor" && visitor.tenant
                  ? `Visiting ${visitor.tenant.name}`
                  : visitor.visitor_type === "service_provider" && visitor.service_type
                  ? `${visitor.service_type}${visitor.company_name ? ` - ${visitor.company_name}` : ""}`
                  : visitor.visitor_type === "enquiry"
                  ? "Prospective Tenant"
                  : visitor.property?.name || "Visitor"
                }
              </p>
            </div>
          </div>
        </div>
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
      </div>

      {/* Status Card */}
      <Card className={isCheckedIn ? "border-green-200 bg-green-50/50" : ""}>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${isCheckedIn ? "bg-green-100" : "bg-gray-100"}`}>
                <Clock className={`h-6 w-6 ${isCheckedIn ? "text-green-600" : "text-gray-600"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className={`text-xl font-bold ${isCheckedIn ? "text-green-600" : "text-gray-600"}`}>
                  {isCheckedIn ? "Currently Checked In" : "Checked Out"}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Duration</p>
              <p className="text-xl font-bold">
                {getDuration(visitor.check_in_time, visitor.check_out_time)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Enquiry Status Card - Only for enquiries */}
      {visitor.visitor_type === "enquiry" && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Enquiry Status</CardTitle>
                <CardDescription>Track this prospective tenant</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Status</p>
                {visitor.enquiry_status && <EnquiryStatusBadge status={visitor.enquiry_status} />}
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
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Source</p>
                <p className="font-medium">{ENQUIRY_SOURCE_LABELS[visitor.enquiry_source]}</p>
              </div>
            )}
            {visitor.follow_up_date && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">Follow-up Date</p>
                <p className="font-medium">{formatDate(visitor.follow_up_date)}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Visitor Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Visitor Details</CardTitle>
                <CardDescription>Information about the visitor</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{visitor.visitor_name}</span>
            </div>
            {visitor.visitor_phone && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Phone
                </span>
                <a href={`tel:${visitor.visitor_phone}`} className="font-medium text-primary hover:underline">
                  {visitor.visitor_phone}
                </a>
              </div>
            )}
            {visitor.visitor_type === "tenant_visitor" && visitor.relation && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Relation</span>
                <span className="font-medium">{visitor.relation}</span>
              </div>
            )}
            {visitor.vehicle_number && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicle
                </span>
                <span className="font-medium">{visitor.vehicle_number}</span>
              </div>
            )}
            {visitor.id_type && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  ID ({visitor.id_type})
                </span>
                <span className="font-medium">{visitor.id_number || "—"}</span>
              </div>
            )}
            {visitor.purpose && (
              <div className="py-2">
                <p className="text-muted-foreground mb-1">Purpose of Visit</p>
                <p className="font-medium">{visitor.purpose}</p>
              </div>
            )}
            {visitor.notes && (
              <div className="py-2 border-t">
                <p className="text-muted-foreground mb-1 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Notes
                </p>
                <p className="font-medium">{visitor.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Visit Timing */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Visit Timing</CardTitle>
                <CardDescription>Check-in and check-out times</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Check-in Time
              </span>
              <span className="font-medium">{formatDateTime(visitor.check_in_time)}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground flex items-center gap-2">
                <LogOut className="h-4 w-4" />
                Check-out Time
              </span>
              <span className="font-medium">
                {visitor.check_out_time
                  ? formatDateTime(visitor.check_out_time)
                  : <span className="text-green-600">Still here</span>
                }
              </span>
            </div>
            {visitor.is_overnight && (
              <>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Overnight Stay
                  </span>
                  <span className="font-medium">
                    {visitor.num_nights} night{(visitor.num_nights || 1) > 1 ? "s" : ""}
                  </span>
                </div>
                {visitor.overnight_charge !== null && visitor.overnight_charge > 0 && (
                  <div className="flex items-center justify-between py-2">
                    <span className="text-muted-foreground flex items-center gap-2">
                      <IndianRupee className="h-4 w-4" />
                      Overnight Charge
                    </span>
                    <span className="font-medium">{formatCurrency(visitor.overnight_charge)}</span>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Service Provider Details - Only for service_provider type */}
        {visitor.visitor_type === "service_provider" && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Wrench className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <CardTitle>Service Details</CardTitle>
                  <CardDescription>Information about the service provider</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {visitor.service_type && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Service Type</span>
                  <span className="font-medium">{visitor.service_type}</span>
                </div>
              )}
              {visitor.company_name && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Company
                  </span>
                  <span className="font-medium">{visitor.company_name}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* General Visitor Details - Only for general type */}
        {visitor.visitor_type === "general" && (visitor.host_name || visitor.department) && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <User className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <CardTitle>Visit Details</CardTitle>
                  <CardDescription>Additional visit information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {visitor.host_name && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Meeting With</span>
                  <span className="font-medium">{visitor.host_name}</span>
                </div>
              )}
              {visitor.department && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Department</span>
                  <span className="font-medium">{visitor.department}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tenant & Property - Only show tenant if tenant_visitor */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>
                  {visitor.visitor_type === "tenant_visitor" ? "Visiting" : "Property"}
                </CardTitle>
                <CardDescription>
                  {visitor.visitor_type === "tenant_visitor"
                    ? "Tenant and property information"
                    : "Property information"
                  }
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`grid ${visitor.visitor_type === "tenant_visitor" && visitor.tenant ? "md:grid-cols-2" : "md:grid-cols-1"} gap-6`}>
              {/* Tenant Info - Only for tenant_visitor */}
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

              {/* Property Info */}
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
          </CardContent>
        </Card>

        {/* Visitor Contact Info - Only if linked to a contact */}
        {visitor.visitor_contact && (
          <Card className="border-blue-200 bg-blue-50/30">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <User className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1">
                  <CardTitle>Visitor Profile</CardTitle>
                  <CardDescription>Contact directory entry</CardDescription>
                </div>
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
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
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
                <div className="mt-4 p-3 bg-white rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Contact Notes</p>
                  <p className="text-sm">{visitor.visitor_contact.notes}</p>
                </div>
              )}
              <Link href="/visitors/directory">
                <Button variant="outline" size="sm" className="mt-4">
                  View in Directory
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Visit History - Only if there are previous visits */}
        {visitHistory.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <History className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Visit History</CardTitle>
                  <CardDescription>
                    Previous visits from this person ({visitHistory.length} total)
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
