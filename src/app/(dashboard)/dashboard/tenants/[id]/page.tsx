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
  User,
  Phone,
  Mail,
  Building2,
  Home,
  Calendar,
  IndianRupee,
  Pencil,
  Shield,
  MapPin,
  Users,
  FileText,
  CreditCard,
  AlertCircle,
  CheckCircle,
  Clock,
  LogOut,
  Bell
} from "lucide-react"
import { toast } from "sonner"

interface TenantRaw {
  id: string
  name: string
  email: string | null
  phone: string
  photo_url: string | null
  check_in_date: string
  check_out_date: string | null
  expected_exit_date: string | null
  monthly_rent: number
  security_deposit: number
  status: string
  police_verification_status: string
  agreement_signed: boolean
  notes: string | null
  custom_fields: Record<string, string>
  created_at: string
  property: { id: string; name: string; address: string }[] | null
  room: { id: string; room_number: string; room_type: string }[] | null
}

interface Tenant {
  id: string
  name: string
  email: string | null
  phone: string
  photo_url: string | null
  check_in_date: string
  check_out_date: string | null
  expected_exit_date: string | null
  monthly_rent: number
  security_deposit: number
  status: string
  police_verification_status: string
  agreement_signed: boolean
  notes: string | null
  custom_fields: Record<string, string>
  created_at: string
  property: {
    id: string
    name: string
    address: string
  } | null
  room: {
    id: string
    room_number: string
    room_type: string
  } | null
}

interface PaymentRaw {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  for_period: string | null
  charge_type: { name: string }[] | null
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  for_period: string | null
  charge_type: {
    name: string
  } | null
}

interface ChargeRaw {
  id: string
  amount: number
  due_date: string
  status: string
  for_period: string
  charge_type: { name: string }[] | null
}

interface Charge {
  id: string
  amount: number
  due_date: string
  status: string
  for_period: string
  charge_type: {
    name: string
  } | null
}

const statusColors: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
  notice_period: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Notice Period" },
  checked_out: { bg: "bg-gray-100", text: "text-gray-700", label: "Checked Out" },
}

const verificationColors: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Pending" },
  submitted: { bg: "bg-blue-100", text: "text-blue-700", label: "Submitted" },
  verified: { bg: "bg-green-100", text: "text-green-700", label: "Verified" },
  na: { bg: "bg-gray-100", text: "text-gray-700", label: "N/A" },
}

export default function TenantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [charges, setCharges] = useState<Charge[]>([])
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    const fetchTenant = async () => {
      const supabase = createClient()

      // Fetch tenant details
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select(`
          *,
          property:properties(id, name, address),
          room:rooms(id, room_number, room_type)
        `)
        .eq("id", params.id)
        .single()

      if (tenantError || !tenantData) {
        console.error("Error fetching tenant:", tenantError)
        toast.error("Tenant not found")
        router.push("/dashboard/tenants")
        return
      }

      // Transform tenant data
      const rawTenant = tenantData as TenantRaw
      const transformedTenant: Tenant = {
        ...rawTenant,
        property: rawTenant.property && rawTenant.property.length > 0 ? rawTenant.property[0] : null,
        room: rawTenant.room && rawTenant.room.length > 0 ? rawTenant.room[0] : null,
      }
      setTenant(transformedTenant)

      // Fetch recent payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select(`
          id,
          amount,
          payment_date,
          payment_method,
          for_period,
          charge_type:charge_types(name)
        `)
        .eq("tenant_id", params.id)
        .order("payment_date", { ascending: false })
        .limit(5)

      // Transform payments
      const transformedPayments: Payment[] = ((paymentsData as PaymentRaw[]) || []).map((p) => ({
        ...p,
        charge_type: p.charge_type && p.charge_type.length > 0 ? p.charge_type[0] : null,
      }))
      setPayments(transformedPayments)

      // Fetch pending charges
      const { data: chargesData } = await supabase
        .from("charges")
        .select(`
          id,
          amount,
          due_date,
          status,
          for_period,
          charge_type:charge_types(name)
        `)
        .eq("tenant_id", params.id)
        .in("status", ["pending", "partial", "overdue"])
        .order("due_date", { ascending: true })

      // Transform charges
      const transformedCharges: Charge[] = ((chargesData as ChargeRaw[]) || []).map((c) => ({
        ...c,
        charge_type: c.charge_type && c.charge_type.length > 0 ? c.charge_type[0] : null,
      }))
      setCharges(transformedCharges)
      setLoading(false)
    }

    fetchTenant()
  }, [params.id, router])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`
  }

  const handlePutOnNotice = async () => {
    if (!tenant) return

    const expectedExitDate = prompt("Enter expected exit date (YYYY-MM-DD):")
    if (!expectedExitDate) return

    setActionLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("tenants")
      .update({
        status: "notice_period",
        expected_exit_date: expectedExitDate,
      })
      .eq("id", tenant.id)

    if (error) {
      toast.error("Failed to update tenant status")
    } else {
      toast.success("Tenant put on notice period")
      setTenant({ ...tenant, status: "notice_period", expected_exit_date: expectedExitDate })
    }
    setActionLoading(false)
  }

  const handleInitiateCheckout = () => {
    router.push(`/dashboard/exit-clearance/new?tenant=${tenant?.id}`)
  }

  const totalDues = charges.reduce((sum, c) => sum + c.amount, 0)
  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!tenant) {
    return null
  }

  const status = statusColors[tenant.status] || statusColors.active
  const verification = verificationColors[tenant.police_verification_status] || verificationColors.pending

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/tenants">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
              {tenant.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{tenant.name}</h1>
              <p className="text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {tenant.phone}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/dashboard/tenants/${tenant.id}/edit`}>
            <Button variant="outline">
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          {tenant.status === "active" && (
            <Button variant="outline" onClick={handlePutOnNotice} disabled={actionLoading}>
              <Bell className="mr-2 h-4 w-4" />
              Put on Notice
            </Button>
          )}
          {(tenant.status === "active" || tenant.status === "notice_period") && (
            <Button onClick={handleInitiateCheckout} disabled={actionLoading}>
              <LogOut className="mr-2 h-4 w-4" />
              Initiate Checkout
            </Button>
          )}
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${status.bg}`}>
                <User className={`h-5 w-5 ${status.text}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className={`font-semibold ${status.text}`}>{status.label}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <IndianRupee className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Monthly Rent</p>
                <p className="font-semibold">{formatCurrency(tenant.monthly_rent)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${totalDues > 0 ? "bg-red-100" : "bg-green-100"}`}>
                <CreditCard className={`h-5 w-5 ${totalDues > 0 ? "text-red-600" : "text-green-600"}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Dues</p>
                <p className={`font-semibold ${totalDues > 0 ? "text-red-600" : "text-green-600"}`}>
                  {formatCurrency(totalDues)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Security Deposit</p>
                <p className="font-semibold">{formatCurrency(tenant.security_deposit || 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
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
                <CardDescription>Current accommodation</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Property
              </span>
              <span className="font-medium">{tenant.property?.name || "N/A"}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground flex items-center gap-2">
                <Home className="h-4 w-4" />
                Room
              </span>
              <span className="font-medium">
                Room {tenant.room?.room_number || "N/A"}
                {tenant.room?.room_type && ` (${tenant.room.room_type})`}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Check-in Date
              </span>
              <span className="font-medium">{formatDate(tenant.check_in_date)}</span>
            </div>
            {tenant.expected_exit_date && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Expected Exit
                </span>
                <span className="font-medium text-yellow-600">
                  {formatDate(tenant.expected_exit_date)}
                </span>
              </div>
            )}
            {tenant.check_out_date && (
              <div className="flex items-center justify-between py-2">
                <span className="text-muted-foreground flex items-center gap-2">
                  <LogOut className="h-4 w-4" />
                  Check-out Date
                </span>
                <span className="font-medium">{formatDate(tenant.check_out_date)}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact & Documents */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Contact & Documents</CardTitle>
                <CardDescription>Personal information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </span>
              <a href={`tel:${tenant.phone}`} className="font-medium text-primary hover:underline">
                {tenant.phone}
              </a>
            </div>
            {tenant.email && (
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email
                </span>
                <a href={`mailto:${tenant.email}`} className="font-medium text-primary hover:underline">
                  {tenant.email}
                </a>
              </div>
            )}
            <div className="flex items-center justify-between py-2 border-b">
              <span className="text-muted-foreground flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Police Verification
              </span>
              <span className={`px-2 py-1 rounded text-xs font-medium ${verification.bg} ${verification.text}`}>
                {verification.label}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Agreement
              </span>
              <span className={`flex items-center gap-1 ${tenant.agreement_signed ? "text-green-600" : "text-yellow-600"}`}>
                {tenant.agreement_signed ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Signed
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4" />
                    Pending
                  </>
                )}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Additional Details */}
        {Object.keys(tenant.custom_fields || {}).length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Additional Details</CardTitle>
                  <CardDescription>Family & ID information</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {tenant.custom_fields.parent_name && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Parent/Guardian Name</span>
                  <span className="font-medium">{tenant.custom_fields.parent_name}</span>
                </div>
              )}
              {tenant.custom_fields.parent_phone && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">Parent Phone</span>
                  <a href={`tel:${tenant.custom_fields.parent_phone}`} className="font-medium text-primary hover:underline">
                    {tenant.custom_fields.parent_phone}
                  </a>
                </div>
              )}
              {tenant.custom_fields.id_proof_type && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">ID Proof Type</span>
                  <span className="font-medium">{tenant.custom_fields.id_proof_type}</span>
                </div>
              )}
              {tenant.custom_fields.id_proof_number && (
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">ID Proof Number</span>
                  <span className="font-medium">{tenant.custom_fields.id_proof_number}</span>
                </div>
              )}
              {tenant.custom_fields.permanent_address && (
                <div className="py-2">
                  <span className="text-muted-foreground flex items-center gap-2 mb-2">
                    <MapPin className="h-4 w-4" />
                    Permanent Address
                  </span>
                  <p className="font-medium">{tenant.custom_fields.permanent_address}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Pending Dues */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <CardTitle>Pending Dues</CardTitle>
                  <CardDescription>Outstanding payments</CardDescription>
                </div>
              </div>
              <Link href={`/dashboard/payments/new?tenant=${tenant.id}`}>
                <Button size="sm">Record Payment</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {charges.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                <p>No pending dues</p>
              </div>
            ) : (
              <div className="space-y-3">
                {charges.map((charge) => (
                  <div key={charge.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{charge.charge_type?.name || "Charge"}</p>
                      <p className="text-sm text-muted-foreground">{charge.for_period}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">{formatCurrency(charge.amount)}</p>
                      <p className="text-xs text-muted-foreground">Due: {formatDate(charge.due_date)}</p>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between pt-3 font-semibold">
                  <span>Total Dues</span>
                  <span className="text-red-600">{formatCurrency(totalDues)}</span>
                </div>
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
                  <CardDescription>Last 5 transactions</CardDescription>
                </div>
              </div>
              <Link href={`/dashboard/payments?tenant=${tenant.id}`}>
                <Button variant="outline" size="sm">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No payments recorded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{payment.charge_type?.name || "Payment"}</p>
                      <p className="text-sm text-muted-foreground">
                        {payment.for_period || formatDate(payment.payment_date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(payment.amount)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{payment.payment_method}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notes */}
      {tenant.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">{tenant.notes}</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
