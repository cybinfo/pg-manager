"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Loader2,
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
  Pencil,
  Trash2
} from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/lib/auth"
import { PermissionGate } from "@/components/auth"

interface Visitor {
  id: string
  visitor_name: string
  visitor_phone: string | null
  relation: string | null
  purpose: string | null
  check_in_time: string
  check_out_time: string | null
  is_overnight: boolean
  overnight_charge: number | null
  created_at: string
  tenant: {
    id: string
    name: string
    phone: string
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
}

interface RawVisitor {
  id: string
  visitor_name: string
  visitor_phone: string | null
  relation: string | null
  purpose: string | null
  check_in_time: string
  check_out_time: string | null
  is_overnight: boolean
  overnight_charge: number | null
  created_at: string
  tenant: {
    id: string
    name: string
    phone: string
    room?: { room_number: string }[] | null
  }[] | null
  property: {
    id: string
    name: string
    address: string | null
  }[] | null
}

export default function VisitorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [visitor, setVisitor] = useState<Visitor | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const fetchVisitor = async () => {
      const supabase = createClient()

      const { data, error } = await supabase
        .from("visitors")
        .select(`
          *,
          tenant:tenants(id, name, phone, room:rooms(room_number)),
          property:properties(id, name, address)
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
      const rawData = data as RawVisitor
      const tenant = rawData.tenant && rawData.tenant.length > 0 ? rawData.tenant[0] : null
      const property = rawData.property && rawData.property.length > 0 ? rawData.property[0] : null

      // Flatten the room data from tenant
      const visitorData: Visitor = {
        ...rawData,
        tenant: tenant ? {
          ...tenant,
          room: tenant.room && tenant.room.length > 0 ? tenant.room[0] : null,
        } : null,
        property,
        room: tenant?.room && tenant.room.length > 0 ? tenant.room[0] : null,
      }
      setVisitor(visitorData)
      setLoading(false)
    }

    fetchVisitor()
  }, [params.id, router])

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`
  }

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
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
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
            <div className={`h-16 w-16 rounded-full flex items-center justify-center ${isCheckedIn ? "bg-green-100" : "bg-gray-100"}`}>
              <Users className={`h-8 w-8 ${isCheckedIn ? "text-green-600" : "text-gray-600"}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold">{visitor.visitor_name}</h1>
                {visitor.is_overnight && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                    Overnight
                  </span>
                )}
              </div>
              <p className="text-muted-foreground">
                Visiting {visitor.tenant?.name}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isCheckedIn && (
            <Button onClick={handleCheckOut} disabled={actionLoading}>
              <LogOut className="mr-2 h-4 w-4" />
              Check Out
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
            {visitor.relation && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Relation</span>
                <span className="font-medium">{visitor.relation}</span>
              </div>
            )}
            {visitor.purpose && (
              <div className="py-2">
                <p className="text-muted-foreground mb-1">Purpose of Visit</p>
                <p className="font-medium">{visitor.purpose}</p>
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
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                    Yes
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

        {/* Tenant & Property */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Visiting</CardTitle>
                <CardDescription>Tenant and property information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Tenant Info */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                    {visitor.tenant?.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold">{visitor.tenant?.name}</p>
                    <p className="text-sm text-muted-foreground">Tenant</p>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-4 w-4" />
                    <a href={`tel:${visitor.tenant?.phone}`} className="hover:text-primary">
                      {visitor.tenant?.phone}
                    </a>
                  </div>
                  {visitor.room && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Home className="h-4 w-4" />
                      Room {visitor.room.room_number}
                    </div>
                  )}
                </div>
                <Link href={`/tenants/${visitor.tenant?.id}`}>
                  <Button variant="outline" size="sm" className="w-full mt-3">
                    View Tenant Profile
                  </Button>
                </Link>
              </div>

              {/* Property Info */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold">{visitor.property?.name}</p>
                    <p className="text-sm text-muted-foreground">Property</p>
                  </div>
                </div>
                {visitor.property?.address && (
                  <p className="text-sm text-muted-foreground mb-3">
                    {visitor.property.address}
                  </p>
                )}
                <Link href={`/properties/${visitor.property?.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Property
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
