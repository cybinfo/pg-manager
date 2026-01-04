"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Home,
  Building2,
  Bed,
  IndianRupee,
  Pencil,
  Users,
  Phone,
  Plus,
  Thermometer,
  Bath,
  Layers,
  Gauge,
  Zap,
  Droplets,
  Calendar,
  FileText,
  CreditCard
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/format"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar } from "@/components/ui/avatar"
import { PageLoader } from "@/components/ui/page-loader"
import { StatCard } from "@/components/ui/stat-card"

interface Room {
  id: string
  room_number: string
  room_type: string
  floor: number
  rent_amount: number
  deposit_amount: number
  total_beds: number
  occupied_beds: number
  status: string
  has_ac: boolean
  has_attached_bathroom: boolean
  amenities: string[] | null
  created_at: string
  property: {
    id: string
    name: string
    address: string | null
  }
}

interface Tenant {
  id: string
  name: string
  phone: string
  email: string | null
  photo_url: string | null
  profile_photo: string | null
  monthly_rent: number
  status: string
  check_in_date: string
}

interface MeterReading {
  id: string
  reading_date: string
  reading_value: number
  units_consumed: number | null
  charge_type: {
    id: string
    name: string
  } | null
}

interface Bill {
  id: string
  bill_number: string
  bill_date: string
  total_amount: number
  balance_due: number
  status: string
  tenant: { id: string; name: string } | null
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  tenant: { id: string; name: string } | null
}

const meterTypeConfig: Record<string, { icon: typeof Zap; color: string; bgColor: string }> = {
  electricity: { icon: Zap, color: "text-yellow-700", bgColor: "bg-yellow-100" },
  water: { icon: Droplets, color: "text-blue-700", bgColor: "bg-blue-100" },
  gas: { icon: Gauge, color: "text-orange-700", bgColor: "bg-orange-100" },
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  available: { bg: "bg-green-100", text: "text-green-700", label: "Available" },
  occupied: { bg: "bg-red-100", text: "text-red-700", label: "Occupied" },
  partially_occupied: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Partially Occupied" },
  maintenance: { bg: "bg-gray-100", text: "text-gray-700", label: "Maintenance" },
}

export default function RoomDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [room, setRoom] = useState<Room | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch room
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select(`
          *,
          property:properties(id, name, address)
        `)
        .eq("id", params.id)
        .single()

      if (roomError || !roomData) {
        console.error("Error fetching room:", roomError)
        toast.error("Room not found")
        router.push("/rooms")
        return
      }

      setRoom(roomData)

      // Fetch tenants in this room
      const { data: tenantsData } = await supabase
        .from("tenants")
        .select("id, name, phone, email, photo_url, profile_photo, monthly_rent, status, check_in_date")
        .eq("room_id", params.id)
        .neq("status", "checked_out")
        .order("name")

      setTenants(tenantsData || [])

      // Fetch recent meter readings for this room
      const { data: readingsData } = await supabase
        .from("meter_readings")
        .select(`
          id, reading_date, reading_value, units_consumed,
          charge_type:charge_types(id, name)
        `)
        .eq("room_id", params.id)
        .order("reading_date", { ascending: false })
        .limit(5)

      const transformedReadings = (readingsData || []).map((r: { id: string; reading_date: string; reading_value: number; units_consumed: number | null; charge_type: { id: string; name: string }[] | { id: string; name: string } | null }) => ({
        ...r,
        charge_type: Array.isArray(r.charge_type) ? r.charge_type[0] : r.charge_type,
      }))
      setMeterReadings(transformedReadings)

      // Fetch recent bills for tenants in this room
      const { data: billsData } = await supabase
        .from("bills")
        .select(`
          id, bill_number, bill_date, total_amount, balance_due, status,
          tenant:tenants!inner(id, name, room_id)
        `)
        .eq("tenant.room_id", params.id)
        .order("bill_date", { ascending: false })
        .limit(5)

      const transformedBills = (billsData || []).map((b: any) => ({
        ...b,
        tenant: Array.isArray(b.tenant) ? b.tenant[0] : b.tenant,
      }))
      setBills(transformedBills)

      // Fetch recent payments for tenants in this room
      const { data: paymentsData } = await supabase
        .from("payments")
        .select(`
          id, amount, payment_date, payment_method,
          tenant:tenants!inner(id, name, room_id)
        `)
        .eq("tenant.room_id", params.id)
        .order("payment_date", { ascending: false })
        .limit(5)

      const transformedPayments = (paymentsData || []).map((p: any) => ({
        ...p,
        tenant: Array.isArray(p.tenant) ? p.tenant[0] : p.tenant,
      }))
      setPayments(transformedPayments)

      setLoading(false)
    }

    fetchData()
  }, [params.id, router])

  const handleStatusChange = async (newStatus: string) => {
    if (!room) return

    setUpdatingStatus(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("rooms")
      .update({ status: newStatus })
      .eq("id", room.id)

    if (error) {
      toast.error("Failed to update room status")
    } else {
      toast.success("Room status updated")
      setRoom({ ...room, status: newStatus })
    }
    setUpdatingStatus(false)
  }

  if (loading) {
    return <PageLoader />
  }

  if (!room) {
    return null
  }

  const status = statusColors[room.status] || statusColors.available
  const availableBeds = room.total_beds - room.occupied_beds

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/rooms">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Home className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Room {room.room_number}</h1>
              {room.property && (
                <Link href={`/properties/${room.property.id}`} className="text-muted-foreground hover:text-primary flex items-center gap-1">
                  <Building2 className="h-4 w-4" />
                  {room.property.name}
                </Link>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/rooms/${room.id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          {availableBeds > 0 && (
            <Link href={`/tenants/new?room=${room.id}`}>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Tenant
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${status.bg}`}>
                <Home className={`h-5 w-5 ${status.text}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className={`font-semibold ${status.text}`}>{status.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <StatCard icon={Bed} label="Occupancy" value={`${room.occupied_beds}/${room.total_beds} Beds`} color="blue" />

        <StatCard icon={IndianRupee} label="Rent" value={formatCurrency(room.rent_amount)} color="green" />

        <StatCard icon={IndianRupee} label="Deposit" value={formatCurrency(room.deposit_amount || 0)} color="purple" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Room Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Home className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Room Details</CardTitle>
                <CardDescription>Configuration and amenities</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Room Type</span>
              <span className="font-medium capitalize">{room.room_type}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Floor
              </span>
              <span className="font-medium">{room.floor === 0 ? "Ground Floor" : `Floor ${room.floor}`}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground flex items-center gap-2">
                <Bed className="h-4 w-4" />
                Total Beds
              </span>
              <span className="font-medium">{room.total_beds}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">Available Beds</span>
              <span className={`font-medium ${availableBeds > 0 ? "text-green-600" : "text-red-600"}`}>
                {availableBeds}
              </span>
            </div>

            {/* Amenities */}
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-3">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {room.has_ac && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                    <Thermometer className="h-3 w-3" />
                    Air Conditioned
                  </span>
                )}
                {room.has_attached_bathroom && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-sm">
                    <Bath className="h-3 w-3" />
                    Attached Bathroom
                  </span>
                )}
                {!room.has_ac && !room.has_attached_bathroom && (
                  <span className="text-muted-foreground text-sm">No special amenities</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Room Status</CardTitle>
            <CardDescription>Update room availability</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant={room.status === "available" ? "default" : "outline"}
                className="justify-start"
                onClick={() => handleStatusChange("available")}
                disabled={updatingStatus}
              >
                <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
                Available
              </Button>
              <Button
                variant={room.status === "occupied" ? "default" : "outline"}
                className="justify-start"
                onClick={() => handleStatusChange("occupied")}
                disabled={updatingStatus}
              >
                <div className="h-2 w-2 rounded-full bg-red-500 mr-2" />
                Occupied
              </Button>
              <Button
                variant={room.status === "partially_occupied" ? "default" : "outline"}
                className="justify-start"
                onClick={() => handleStatusChange("partially_occupied")}
                disabled={updatingStatus}
              >
                <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2" />
                Partial
              </Button>
              <Button
                variant={room.status === "maintenance" ? "default" : "outline"}
                className="justify-start"
                onClick={() => handleStatusChange("maintenance")}
                disabled={updatingStatus}
              >
                <div className="h-2 w-2 rounded-full bg-gray-500 mr-2" />
                Maintenance
              </Button>
            </div>

            <p className="text-xs text-muted-foreground mt-2">
              Note: Status is automatically updated when tenants are added or removed.
            </p>
          </CardContent>
        </Card>

        {/* Tenants */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Current Tenants</CardTitle>
                  <CardDescription>{tenants.length} tenant(s) in this room</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/rooms/${room.id}/tenants`}>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
                {availableBeds > 0 && (
                  <Link href={`/tenants/new?room=${room.id}`}>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Tenant
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {tenants.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tenants in this room</p>
                {availableBeds > 0 && (
                  <Link href={`/tenants/new?room=${room.id}`}>
                    <Button variant="outline" size="sm" className="mt-3">
                      Add First Tenant
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {tenants.map((tenant) => (
                  <Link key={tenant.id} href={`/tenants/${tenant.id}`}>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <Avatar name={tenant.name} src={tenant.profile_photo || tenant.photo_url} size="md" />
                        <div>
                          <p className="font-medium">{tenant.name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {tenant.phone}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(tenant.monthly_rent)}/mo</p>
                        <p className="text-xs text-muted-foreground">Since {formatDate(tenant.check_in_date)}</p>
                        {tenant.status === "notice_period" && (
                          <StatusBadge variant="warning" label="On Notice" />
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Meter Readings */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Gauge className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <CardTitle>Meter Readings</CardTitle>
                  <CardDescription>Recent electricity, water & gas readings</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/rooms/${room.id}/meter-readings`}>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
                <Link href={`/meter-readings/new?room=${room.id}`}>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Record Reading
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {meterReadings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Gauge className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No meter readings recorded</p>
                <Link href={`/meter-readings/new?room=${room.id}`}>
                  <Button variant="outline" size="sm" className="mt-3">
                    Record First Reading
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {meterReadings.map((reading) => {
                  const meterType = reading.charge_type?.name?.toLowerCase() || "electricity"
                  const config = meterTypeConfig[meterType] || meterTypeConfig.electricity
                  const Icon = config.icon
                  return (
                    <Link key={reading.id} href={`/meter-readings/${reading.id}`}>
                      <div className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${config.bgColor}`}>
                            <Icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div>
                            <p className="font-medium capitalize">{meterType}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(reading.reading_date)}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums">{reading.reading_value.toLocaleString()}</p>
                          {reading.units_consumed !== null && (
                            <p className="text-xs text-orange-600">+{reading.units_consumed} units</p>
                          )}
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bills */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Recent Bills</CardTitle>
                  <CardDescription>Bills for tenants in this room</CardDescription>
                </div>
              </div>
              <Link href={`/bills`}>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {bills.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No bills for this room</p>
              </div>
            ) : (
              <div className="space-y-2">
                {bills.map((bill) => (
                  <Link key={bill.id} href={`/bills/${bill.id}`}>
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{bill.bill_number}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {bill.tenant?.name} • {formatDate(bill.bill_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(bill.total_amount)}</p>
                        {bill.balance_due > 0 && (
                          <p className="text-xs text-red-600">Due: {formatCurrency(bill.balance_due)}</p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Recent Payments</CardTitle>
                  <CardDescription>Payments from tenants in this room</CardDescription>
                </div>
              </div>
              <Link href={`/payments`}>
                <Button variant="outline" size="sm">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No payments from this room</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map((payment) => (
                  <Link key={payment.id} href={`/payments/${payment.id}`}>
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{payment.tenant?.name}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(payment.payment_date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-green-600">+{formatCurrency(payment.amount)}</p>
                        <p className="text-xs text-muted-foreground capitalize">{payment.payment_method.replace("_", " ")}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
