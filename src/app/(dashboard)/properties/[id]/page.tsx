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
  Building2,
  MapPin,
  Phone,
  User,
  Home,
  Users,
  IndianRupee,
  Pencil,
  Plus,
  Bed,
  CheckCircle,
  AlertCircle,
  Globe,
  ExternalLink,
  FileText,
  CreditCard,
  Receipt,
  Calendar
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/format"
import { Avatar } from "@/components/ui/avatar"
import { PageLoader } from "@/components/ui/page-loader"
import { StatCard } from "@/components/ui/stat-card"

interface Property {
  id: string
  name: string
  address: string | null
  city: string
  state: string | null
  pincode: string | null
  manager_name: string | null
  manager_phone: string | null
  is_active: boolean
  created_at: string
  website_slug: string | null
  website_enabled: boolean
}

interface Room {
  id: string
  room_number: string
  room_type: string
  floor: number
  rent_amount: number
  total_beds: number
  occupied_beds: number
  status: string
  has_ac: boolean
  has_attached_bathroom: boolean
}

interface TenantRaw {
  id: string
  name: string
  phone: string
  photo_url: string | null
  profile_photo: string | null
  monthly_rent: number
  status: string
  room: { room_number: string }[] | null
}

interface Tenant {
  id: string
  name: string
  phone: string
  photo_url: string | null
  profile_photo: string | null
  monthly_rent: number
  status: string
  room: {
    room_number: string
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

interface Expense {
  id: string
  amount: number
  expense_date: string
  description: string | null
  expense_type: { name: string } | null
}

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  occupied: "bg-red-100 text-red-700",
  partially_occupied: "bg-yellow-100 text-yellow-700",
  maintenance: "bg-gray-100 text-gray-700",
}

export default function PropertyDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [property, setProperty] = useState<Property | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch property
      const { data: propertyData, error: propertyError } = await supabase
        .from("properties")
        .select("*")
        .eq("id", params.id)
        .single()

      if (propertyError || !propertyData) {
        console.error("Error fetching property:", propertyError)
        toast.error("Property not found")
        router.push("/properties")
        return
      }

      setProperty(propertyData)

      // Fetch rooms for this property
      const { data: roomsData } = await supabase
        .from("rooms")
        .select("*")
        .eq("property_id", params.id)
        .order("room_number")

      setRooms(roomsData || [])

      // Fetch tenants for this property
      const { data: tenantsData } = await supabase
        .from("tenants")
        .select(`
          id,
          name,
          phone,
          photo_url,
          profile_photo,
          monthly_rent,
          status,
          room:rooms(room_number)
        `)
        .eq("property_id", params.id)
        .neq("status", "checked_out")
        .order("name")

      // Transform tenant data
      const transformedTenants: Tenant[] = ((tenantsData as TenantRaw[]) || []).map((t) => ({
        ...t,
        room: transformJoin(t.room),
      }))
      setTenants(transformedTenants)

      // Fetch recent bills for this property
      const { data: billsData } = await supabase
        .from("bills")
        .select(`
          id, bill_number, bill_date, total_amount, balance_due, status,
          tenant:tenants(id, name)
        `)
        .eq("property_id", params.id)
        .order("bill_date", { ascending: false })
        .limit(5)

      const transformedBills = (billsData || []).map((b: any) => ({
        ...b,
        tenant: transformJoin(b.tenant),
      }))
      setBills(transformedBills)

      // Fetch recent payments for this property
      const { data: paymentsData } = await supabase
        .from("payments")
        .select(`
          id, amount, payment_date, payment_method,
          tenant:tenants(id, name)
        `)
        .eq("property_id", params.id)
        .order("payment_date", { ascending: false })
        .limit(5)

      const transformedPayments = (paymentsData || []).map((p: any) => ({
        ...p,
        tenant: transformJoin(p.tenant),
      }))
      setPayments(transformedPayments)

      // Fetch recent expenses for this property
      const { data: expensesData } = await supabase
        .from("expenses")
        .select(`
          id, amount, expense_date, description,
          expense_type:expense_types(name)
        `)
        .eq("property_id", params.id)
        .order("expense_date", { ascending: false })
        .limit(5)

      const transformedExpenses = (expensesData || []).map((e: any) => ({
        ...e,
        expense_type: transformJoin(e.expense_type),
      }))
      setExpenses(transformedExpenses)

      setLoading(false)
    }

    fetchData()
  }, [params.id, router])

  if (loading) {
    return <PageLoader />
  }

  if (!property) {
    return null
  }

  // Calculate stats
  const totalBeds = rooms.reduce((sum, r) => sum + r.total_beds, 0)
  const occupiedBeds = rooms.reduce((sum, r) => sum + r.occupied_beds, 0)
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0
  const monthlyRevenue = tenants.reduce((sum, t) => sum + t.monthly_rent, 0)
  const activeTenants = tenants.filter(t => t.status === "active").length
  const noticeTenants = tenants.filter(t => t.status === "notice_period").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/properties">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{property.name}</h1>
              <p className="text-muted-foreground flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {property.city}{property.state && `, ${property.state}`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {property.website_enabled && property.website_slug && (
            <Link href={`/pg/${property.website_slug}`} target="_blank">
              <Button variant="outline" className="text-teal-600 border-teal-200 hover:bg-teal-50">
                <Globe className="mr-2 h-4 w-4" />
                View Website
                <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          )}
          <Link href={`/properties/${property.id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Link href={`/rooms/new?property=${property.id}`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={Home}
          label="Total Rooms"
          value={rooms.length}
          color="blue"
        />
        <StatCard
          icon={Users}
          label="Active Tenants"
          value={activeTenants}
          color="green"
        />
        <StatCard
          icon={Bed}
          label={`Occupancy (${occupiedBeds}/${totalBeds})`}
          value={`${occupancyRate}%`}
          color="purple"
        />
        <StatCard
          icon={IndianRupee}
          label="Monthly Revenue"
          value={formatCurrency(monthlyRevenue)}
          color="orange"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Property Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Property Details</CardTitle>
                <CardDescription>Location and manager information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {property.address && (
              <div className="flex items-start gap-3 py-2 border-b">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-medium">{property.address}</p>
                </div>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground">City</span>
              <span className="font-medium">{property.city}</span>
            </div>
            {property.state && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">State</span>
                <span className="font-medium">{property.state}</span>
              </div>
            )}
            {property.pincode && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground">Pincode</span>
                <span className="font-medium">{property.pincode}</span>
              </div>
            )}
            {property.manager_name && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Manager
                </span>
                <span className="font-medium">{property.manager_name}</span>
              </div>
            )}
            {property.manager_phone && (
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Manager Phone
                </span>
                <a href={`tel:${property.manager_phone}`} className="font-medium text-primary hover:underline">
                  {property.manager_phone}
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tenants on Notice */}
        {noticeTenants > 0 && (
          <Card className="border-yellow-200 bg-yellow-50/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <CardTitle>Tenants on Notice</CardTitle>
                  <CardDescription>{noticeTenants} tenant(s) leaving soon</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {tenants.filter(t => t.status === "notice_period").map((tenant) => (
                  <Link key={tenant.id} href={`/tenants/${tenant.id}`}>
                    <div className="flex items-center justify-between p-2 rounded-lg hover:bg-yellow-100 transition-colors">
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-muted-foreground">Room {tenant.room?.room_number}</p>
                      </div>
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">
                        Notice Period
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Rooms List */}
        <Card className={noticeTenants === 0 ? "md:col-span-2" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Home className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Rooms</CardTitle>
                  <CardDescription>{rooms.length} rooms in this property</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/properties/${property.id}/rooms`}>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
                <Link href={`/rooms/new?property=${property.id}`}>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Room
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {rooms.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Home className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No rooms added yet</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                {rooms.map((room) => (
                  <Link key={room.id} href={`/rooms/${room.id}`}>
                    <div className="p-3 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold">Room {room.room_number}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColors[room.status] || statusColors.available}`}>
                          {room.status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Bed className="h-3 w-3" />
                          {room.occupied_beds}/{room.total_beds}
                        </span>
                        <span className="flex items-center gap-1">
                          <IndianRupee className="h-3 w-3" />
                          {formatCurrency(room.rent_amount)}
                        </span>
                      </div>
                      <div className="flex gap-1 mt-2">
                        {room.has_ac && (
                          <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">AC</span>
                        )}
                        {room.has_attached_bathroom && (
                          <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">Bath</span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Tenants */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <CardTitle>Active Tenants</CardTitle>
                  <CardDescription>{activeTenants} tenants currently staying</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/properties/${property.id}/tenants`}>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
                <Link href={`/tenants/new?property=${property.id}`}>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Tenant
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {tenants.filter(t => t.status === "active").length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active tenants</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {tenants.filter(t => t.status === "active").map((tenant) => (
                  <Link key={tenant.id} href={`/tenants/${tenant.id}`}>
                    <div className="p-3 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <Avatar name={tenant.name} src={tenant.profile_photo || tenant.photo_url} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{tenant.name}</p>
                          <p className="text-sm text-muted-foreground">
                            Room {tenant.room?.room_number} • {formatCurrency(tenant.monthly_rent)}/mo
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
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
                  <CardDescription>Latest billing activity</CardDescription>
                </div>
              </div>
              <Link href={`/bills?property=${property.id}`}>
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
                <p>No bills yet</p>
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
                  <CardDescription>Latest payment activity</CardDescription>
                </div>
              </div>
              <Link href={`/payments?property=${property.id}`}>
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
                <p>No payments yet</p>
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

        {/* Recent Expenses */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-rose-100 rounded-lg">
                  <Receipt className="h-5 w-5 text-rose-600" />
                </div>
                <div>
                  <CardTitle>Recent Expenses</CardTitle>
                  <CardDescription>Property-specific expenses</CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Link href={`/expenses?property=${property.id}`}>
                  <Button variant="outline" size="sm">
                    View All
                  </Button>
                </Link>
                <Link href={`/expenses/new?property=${property.id}`}>
                  <Button size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Expense
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No expenses recorded for this property</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-2">
                {expenses.map((expense) => (
                  <Link key={expense.id} href={`/expenses/${expense.id}`}>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{expense.expense_type?.name || "Expense"}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {expense.description || formatDate(expense.expense_date)}
                        </p>
                      </div>
                      <p className="font-semibold text-sm text-rose-600">-{formatCurrency(expense.amount)}</p>
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
