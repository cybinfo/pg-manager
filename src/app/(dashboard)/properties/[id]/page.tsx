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
  Globe,
  ExternalLink,
  FileText,
  CreditCard,
  Receipt,
  Calendar,
  MessageSquare,
  UserCheck,
  Clock,
  AlertCircle,
} from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, formatDate } from "@/lib/format"
import { Avatar } from "@/components/ui/avatar"

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

interface Complaint {
  id: string
  title: string
  description: string | null
  status: string
  priority: string
  created_at: string
  tenant: { id: string; name: string } | null
  room: { id: string; room_number: string } | null
}

interface Visitor {
  id: string
  visitor_name: string
  purpose: string | null
  check_in_time: string
  check_out_time: string | null
  is_overnight: boolean
  tenant: { id: string; name: string } | null
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
  const [complaints, setComplaints] = useState<Complaint[]>([])
  const [visitors, setVisitors] = useState<Visitor[]>([])

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

      // Fetch recent complaints for this property
      const { data: complaintsData } = await supabase
        .from("complaints")
        .select(`
          id, title, description, status, priority, created_at,
          tenant:tenants(id, name),
          room:rooms(id, room_number)
        `)
        .eq("property_id", params.id)
        .order("created_at", { ascending: false })
        .limit(5)

      const transformedComplaints = (complaintsData || []).map((c: any) => ({
        ...c,
        tenant: transformJoin(c.tenant),
        room: transformJoin(c.room),
      }))
      setComplaints(transformedComplaints)

      // Fetch recent visitors to this property
      const { data: visitorsData } = await supabase
        .from("visitors")
        .select(`
          id, visitor_name, purpose, check_in_time, check_out_time, is_overnight,
          tenant:tenants(id, name)
        `)
        .eq("property_id", params.id)
        .order("check_in_time", { ascending: false })
        .limit(5)

      const transformedVisitors = (visitorsData || []).map((v: any) => ({
        ...v,
        tenant: transformJoin(v.tenant),
      }))
      setVisitors(transformedVisitors)

      setLoading(false)
    }

    fetchData()
  }, [params.id, router])

  if (loading) {
    return <PageLoading message="Loading property details..." />
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
      {/* Hero Header */}
      <DetailHero
        title={property.name}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <MapPin className="h-4 w-4" />
              {property.city}{property.state && `, ${property.state}`}
            </span>
            {property.address && (
              <span className="flex items-center gap-1">
                {property.address}
              </span>
            )}
          </div>
        }
        backHref="/properties"
        backLabel="All Properties"
        status={property.is_active ? "active" : "inactive"}
        avatar={
          <div className="p-3 bg-primary/10 rounded-lg">
            <Building2 className="h-8 w-8 text-primary" />
          </div>
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {property.website_enabled && property.website_slug && (
              <Link href={`/pg/${property.website_slug}`} target="_blank">
                <Button variant="outline" size="sm" className="text-teal-600 border-teal-200 hover:bg-teal-50">
                  <Globe className="mr-2 h-4 w-4" />
                  View Website
                  <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </Link>
            )}
            <Link href={`/properties/${property.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Link href={`/rooms/new?property=${property.id}`}>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Room
              </Button>
            </Link>
          </div>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          label="Total Rooms"
          value={rooms.length}
          icon={Home}
          variant="default"
        />
        <InfoCard
          label="Active Tenants"
          value={activeTenants}
          icon={Users}
          variant="success"
        />
        <InfoCard
          label={`Occupancy (${occupiedBeds}/${totalBeds})`}
          value={`${occupancyRate}%`}
          icon={Bed}
          variant="default"
        />
        <InfoCard
          label="Monthly Revenue"
          value={<Currency amount={monthlyRevenue} />}
          icon={IndianRupee}
          variant="default"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Property Details */}
        <DetailSection
          title="Property Details"
          description="Location and manager information"
          icon={Building2}
        >
          {property.address && (
            <InfoRow label="Address" value={property.address} icon={MapPin} />
          )}
          <InfoRow label="City" value={property.city} />
          {property.state && (
            <InfoRow label="State" value={property.state} />
          )}
          {property.pincode && (
            <InfoRow label="Pincode" value={property.pincode} />
          )}
          {property.manager_name && (
            <InfoRow label="Manager" value={property.manager_name} icon={User} />
          )}
          {property.manager_phone && (
            <InfoRow
              label="Manager Phone"
              value={
                <a href={`tel:${property.manager_phone}`} className="text-teal-600 hover:underline">
                  {property.manager_phone}
                </a>
              }
              icon={Phone}
            />
          )}
        </DetailSection>

        {/* Tenants on Notice */}
        {noticeTenants > 0 && (
          <DetailSection
            title="Tenants on Notice"
            description={`${noticeTenants} tenant(s) leaving soon`}
            icon={AlertCircle}
            className="border-yellow-200 bg-yellow-50/50"
          >
            <div className="space-y-2">
              {tenants.filter(t => t.status === "notice_period").map((tenant) => (
                <Link key={tenant.id} href={`/tenants/${tenant.id}`}>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-yellow-100 transition-colors">
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-sm text-muted-foreground">Room {tenant.room?.room_number}</p>
                    </div>
                    <StatusBadge status="warning" label="Notice Period" size="sm" />
                  </div>
                </Link>
              ))}
            </div>
          </DetailSection>
        )}

        {/* Rooms List */}
        <DetailSection
          title="Rooms"
          description={`${rooms.length} rooms in this property`}
          icon={Home}
          className={noticeTenants === 0 ? "md:col-span-2" : ""}
          actions={
            <div className="flex gap-2">
              <Link href={`/properties/${property.id}/rooms`}>
                <Button variant="outline" size="sm">View All</Button>
              </Link>
              <Link href={`/rooms/new?property=${property.id}`}>
                <Button size="sm">
                  <Plus className="mr-1 h-3 w-3" />
                  Add Room
                </Button>
              </Link>
            </div>
          }
        >
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
        </DetailSection>

        {/* Active Tenants */}
        <DetailSection
          title="Active Tenants"
          description={`${activeTenants} tenants currently staying`}
          icon={Users}
          className="md:col-span-2"
          actions={
            <div className="flex gap-2">
              <Link href={`/properties/${property.id}/tenants`}>
                <Button variant="outline" size="sm">View All</Button>
              </Link>
              <Link href={`/tenants/new?property=${property.id}`}>
                <Button size="sm">
                  <Plus className="mr-1 h-3 w-3" />
                  Add Tenant
                </Button>
              </Link>
            </div>
          }
        >
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
        </DetailSection>

        {/* Recent Bills */}
        <DetailSection
          title="Recent Bills"
          description="Latest billing activity"
          icon={FileText}
          actions={
            <Link href={`/bills?property=${property.id}`}>
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          }
        >
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
        </DetailSection>

        {/* Recent Payments */}
        <DetailSection
          title="Recent Payments"
          description="Latest payment activity"
          icon={CreditCard}
          actions={
            <Link href={`/payments?property=${property.id}`}>
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          }
        >
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
        </DetailSection>

        {/* Recent Expenses */}
        <DetailSection
          title="Recent Expenses"
          description="Property-specific expenses"
          icon={Receipt}
          className="md:col-span-2"
          actions={
            <div className="flex gap-2">
              <Link href={`/expenses?property=${property.id}`}>
                <Button variant="outline" size="sm">View All</Button>
              </Link>
              <Link href={`/expenses/new?property=${property.id}`}>
                <Button size="sm">
                  <Plus className="mr-1 h-3 w-3" />
                  Add Expense
                </Button>
              </Link>
            </div>
          }
        >
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
        </DetailSection>

        {/* Recent Complaints */}
        <DetailSection
          title="Recent Complaints"
          description="Issues reported by tenants"
          icon={MessageSquare}
          actions={
            <Link href={`/complaints?property=${property.id}`}>
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          }
        >
          {complaints.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No complaints for this property</p>
            </div>
          ) : (
            <div className="space-y-2">
              {complaints.map((complaint) => (
                <Link key={complaint.id} href={`/complaints/${complaint.id}`}>
                  <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{complaint.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {complaint.tenant?.name}
                        {complaint.room && ` • Room ${complaint.room.room_number}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <StatusBadge
                        status={
                          complaint.status === "open" ? "error" :
                          complaint.status === "in_progress" ? "warning" : "success"
                        }
                        label={complaint.status.replace("_", " ")}
                        size="sm"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDate(complaint.created_at)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </DetailSection>

        {/* Recent Visitors */}
        <DetailSection
          title="Recent Visitors"
          description="Visitor log for this property"
          icon={UserCheck}
          actions={
            <Link href={`/visitors?property=${property.id}`}>
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          }
        >
          {visitors.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <UserCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No visitors recorded for this property</p>
            </div>
          ) : (
            <div className="space-y-2">
              {visitors.map((visitor) => (
                <div key={visitor.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{visitor.visitor_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      Visiting {visitor.tenant?.name}
                      {visitor.purpose && ` • ${visitor.purpose}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" />
                      {formatDate(visitor.check_in_time)}
                    </p>
                    {visitor.is_overnight && (
                      <StatusBadge status="info" label="Overnight" size="sm" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DetailSection>
      </div>
    </div>
  )
}
