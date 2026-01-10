"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  QuickActions,
} from "@/components/ui/detail-components"
import { StatusBadge } from "@/components/ui/status-badge"
import { Currency, PaymentAmount } from "@/components/ui/currency"
import { PageLoading, Skeleton } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import { ConfirmDialog } from "@/components/ui/confirm-dialog"
import { Select, FormField } from "@/components/ui/form-components"
import {
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
  Bell,
  ArrowRightLeft,
  History,
  Plus,
  Trash2,
  Gauge,
  Zap,
  Droplets,
} from "lucide-react"
import { toast } from "sonner"
import { formatDate, formatCurrency } from "@/lib/format"
import { useAuth } from "@/lib/auth"
import { PermissionGate } from "@/components/auth"
import { Avatar } from "@/components/ui/avatar"

// Types
interface Tenant {
  id: string
  name: string
  email: string | null
  phone: string
  photo_url: string | null
  profile_photo: string | null
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
  property: { id: string; name: string; address: string } | null
  room: { id: string; room_number: string; room_type: string } | null
}

interface Payment {
  id: string
  amount: number
  payment_date: string
  payment_method: string
  for_period: string | null
  charge_type: { name: string } | null
}

interface Charge {
  id: string
  amount: number
  due_date: string
  status: string
  for_period: string
  charge_type: { name: string } | null
}

interface TenantStay {
  id: string
  join_date: string
  exit_date: string | null
  monthly_rent: number
  status: string
  stay_number: number
  property: { name: string } | null
  room: { room_number: string } | null
}

interface RoomTransfer {
  id: string
  transfer_date: string
  reason: string | null
  old_rent: number
  new_rent: number
  from_property: { name: string } | null
  from_room: { room_number: string } | null
  to_property: { name: string } | null
  to_room: { room_number: string } | null
}

interface MeterReading {
  id: string
  reading_date: string
  reading_value: number
  units_consumed: number | null
  charge_type: { id: string; name: string } | null
}

interface Bill {
  id: string
  bill_number: string
  bill_date: string
  total_amount: number
  balance_due: number
  status: string
}

interface Room {
  id: string
  room_number: string
  rent_amount: number
  property_id: string
  total_beds: number
  occupied_beds: number
}

const meterTypeConfig: Record<string, { icon: typeof Zap; color: string; bgColor: string }> = {
  electricity: { icon: Zap, color: "text-yellow-700", bgColor: "bg-yellow-100" },
  water: { icon: Droplets, color: "text-blue-700", bgColor: "bg-blue-100" },
  gas: { icon: Gauge, color: "text-orange-700", bgColor: "bg-orange-100" },
}

export default function TenantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { hasPermission } = useAuth()
  const [loading, setLoading] = useState(true)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [charges, setCharges] = useState<Charge[]>([])
  const [stays, setStays] = useState<TenantStay[]>([])
  const [transfers, setTransfers] = useState<RoomTransfer[]>([])
  const [meterReadings, setMeterReadings] = useState<MeterReading[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [actionLoading, setActionLoading] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [availableRooms, setAvailableRooms] = useState<Room[]>([])
  const [transferData, setTransferData] = useState({
    to_room_id: "",
    new_rent: "",
    reason: "",
    notes: "",
  })
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showNoticeDialog, setShowNoticeDialog] = useState(false)
  const [noticeData, setNoticeData] = useState({
    notice_date: "",
    expected_exit_date: "",
    notice_notes: "",
  })

  useEffect(() => {
    const fetchTenant = async () => {
      const supabase = createClient()

      // Fetch tenant details
      const { data: tenantData, error: tenantError } = await supabase
        .from("tenants")
        .select(`*, property:properties(id, name, address), room:rooms(id, room_number, room_type)`)
        .eq("id", params.id)
        .single()

      if (tenantError || !tenantData) {
        toast.error("Tenant not found")
        router.push("/tenants")
        return
      }

      // Transform tenant data
      const transformedTenant: Tenant = {
        ...tenantData,
        property: Array.isArray(tenantData.property) ? tenantData.property[0] : tenantData.property,
        room: Array.isArray(tenantData.room) ? tenantData.room[0] : tenantData.room,
      }
      setTenant(transformedTenant)

      // Fetch recent payments
      const { data: paymentsData } = await supabase
        .from("payments")
        .select(`id, amount, payment_date, payment_method, for_period, charge_type:charge_types(name)`)
        .eq("tenant_id", params.id)
        .order("payment_date", { ascending: false })
        .limit(5)

      const transformedPayments: Payment[] = (paymentsData || []).map((p: any) => ({
        ...p,
        charge_type: Array.isArray(p.charge_type) ? p.charge_type[0] : p.charge_type,
      }))
      setPayments(transformedPayments)

      // Fetch pending charges
      const { data: chargesData } = await supabase
        .from("charges")
        .select(`id, amount, due_date, status, for_period, charge_type:charge_types(name)`)
        .eq("tenant_id", params.id)
        .in("status", ["pending", "partial", "overdue"])
        .order("due_date", { ascending: true })

      const transformedCharges: Charge[] = (chargesData || []).map((c: any) => ({
        ...c,
        charge_type: Array.isArray(c.charge_type) ? c.charge_type[0] : c.charge_type,
      }))
      setCharges(transformedCharges)

      // Fetch tenant stays history
      const { data: staysData } = await supabase
        .from("tenant_stays")
        .select(`id, join_date, exit_date, monthly_rent, status, stay_number, property:properties(name), room:rooms(room_number)`)
        .eq("tenant_id", params.id)
        .order("stay_number", { ascending: false })

      if (staysData) {
        const transformedStays: TenantStay[] = staysData.map((s: any) => ({
          ...s,
          property: Array.isArray(s.property) ? s.property[0] : s.property,
          room: Array.isArray(s.room) ? s.room[0] : s.room,
        }))
        setStays(transformedStays)
      }

      // Fetch room transfers
      const { data: transfersData } = await supabase
        .from("room_transfers")
        .select(`
          id, transfer_date, reason, old_rent, new_rent,
          from_property:properties!room_transfers_from_property_id_fkey(name),
          from_room:rooms!room_transfers_from_room_id_fkey(room_number),
          to_property:properties!room_transfers_to_property_id_fkey(name),
          to_room:rooms!room_transfers_to_room_id_fkey(room_number)
        `)
        .eq("tenant_id", params.id)
        .order("transfer_date", { ascending: false })

      if (transfersData) {
        const transformedTransfers: RoomTransfer[] = transfersData.map((t: any) => ({
          ...t,
          from_property: Array.isArray(t.from_property) ? t.from_property[0] : t.from_property,
          from_room: Array.isArray(t.from_room) ? t.from_room[0] : t.from_room,
          to_property: Array.isArray(t.to_property) ? t.to_property[0] : t.to_property,
          to_room: Array.isArray(t.to_room) ? t.to_room[0] : t.to_room,
        }))
        setTransfers(transformedTransfers)
      }

      // Fetch meter readings for tenant's room (if they have a room)
      if (transformedTenant.room?.id) {
        const { data: readingsData } = await supabase
          .from("meter_readings")
          .select(`
            id, reading_date, reading_value, units_consumed,
            charge_type:charge_types(id, name)
          `)
          .eq("room_id", transformedTenant.room.id)
          .order("reading_date", { ascending: false })
          .limit(5)

        const transformedReadings = (readingsData || []).map((r: any) => ({
          ...r,
          charge_type: Array.isArray(r.charge_type) ? r.charge_type[0] : r.charge_type,
        }))
        setMeterReadings(transformedReadings)
      }

      // Fetch recent bills for this tenant
      const { data: billsData } = await supabase
        .from("bills")
        .select(`id, bill_number, bill_date, total_amount, balance_due, status`)
        .eq("tenant_id", params.id)
        .order("bill_date", { ascending: false })
        .limit(5)

      setBills(billsData || [])

      setLoading(false)
    }

    fetchTenant()
  }, [params.id, router])

  const openNoticeDialog = () => {
    // Set default notice date as today
    const today = new Date().toISOString().split("T")[0]
    // Set default exit date to 30 days from notice date
    const defaultExitDate = new Date()
    defaultExitDate.setDate(defaultExitDate.getDate() + 30)
    setNoticeData({
      notice_date: today,
      expected_exit_date: defaultExitDate.toISOString().split("T")[0],
      notice_notes: "",
    })
    setShowNoticeDialog(true)
  }

  const handlePutOnNotice = async () => {
    if (!tenant || !noticeData.expected_exit_date || !noticeData.notice_date) {
      toast.error("Please fill in all required fields")
      return
    }

    setActionLoading(true)
    const supabase = createClient()

    const noticeDate = new Date(noticeData.notice_date)
    const noteDateStr = noticeDate.toLocaleDateString("en-IN")

    const { error } = await supabase
      .from("tenants")
      .update({
        status: "notice_period",
        notice_date: noticeData.notice_date,
        expected_exit_date: noticeData.expected_exit_date,
        notes: tenant.notes
          ? `${tenant.notes}\n\n[Notice Period - ${noteDateStr}]: ${noticeData.notice_notes || "Put on notice"}`
          : `[Notice Period - ${noteDateStr}]: ${noticeData.notice_notes || "Put on notice"}`
      })
      .eq("id", tenant.id)

    if (error) {
      toast.error("Failed to update tenant status")
    } else {
      toast.success("Tenant put on notice period")
      setTenant({
        ...tenant,
        status: "notice_period",
        expected_exit_date: noticeData.expected_exit_date
      })
      setShowNoticeDialog(false)
    }
    setActionLoading(false)
  }

  const handleInitiateCheckout = () => {
    router.push(`/exit-clearance/new?tenant=${tenant?.id}`)
  }

  const handleDelete = async () => {
    if (!tenant) return

    setActionLoading(true)
    const supabase = createClient()

    const { error } = await supabase
      .from("tenants")
      .delete()
      .eq("id", tenant.id)

    if (error) {
      console.error("Delete error:", error)
      toast.error("Failed to delete tenant: " + error.message)
      setActionLoading(false)
    } else {
      toast.success("Tenant deleted successfully")
      router.push("/tenants")
    }
  }

  const openTransferModal = async () => {
    if (!tenant) return

    const supabase = createClient()
    const { data: roomsData } = await supabase
      .from("rooms")
      .select("id, room_number, rent_amount, property_id, total_beds, occupied_beds")
      .neq("id", tenant.room?.id)
      .order("room_number")

    if (roomsData) {
      const available = roomsData.filter((r: Room) => r.occupied_beds < r.total_beds)
      setAvailableRooms(available)
    }

    setTransferData({ to_room_id: "", new_rent: "", reason: "", notes: "" })
    setShowTransferModal(true)
  }

  const handleRoomTransfer = async () => {
    if (!tenant || !transferData.to_room_id) {
      toast.error("Please select a room")
      return
    }

    setActionLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const selectedRoom = availableRooms.find((r) => r.id === transferData.to_room_id)
      if (!selectedRoom) return

      const newRent = parseFloat(transferData.new_rent) || selectedRoom.rent_amount

      // Create transfer record
      await supabase.from("room_transfers").insert({
        owner_id: user.id,
        tenant_id: tenant.id,
        from_property_id: tenant.property?.id,
        from_room_id: tenant.room?.id,
        to_property_id: selectedRoom.property_id,
        to_room_id: selectedRoom.id,
        transfer_date: new Date().toISOString().split("T")[0],
        reason: transferData.reason || null,
        notes: transferData.notes || null,
        old_rent: tenant.monthly_rent,
        new_rent: newRent,
      })

      // Update current stay
      await supabase
        .from("tenant_stays")
        .update({ status: "transferred", exit_date: new Date().toISOString().split("T")[0], exit_reason: "transferred" })
        .eq("tenant_id", tenant.id)
        .eq("status", "active")

      // Create new stay
      const stayNumber = stays.length > 0 ? Math.max(...stays.map((s) => s.stay_number)) + 1 : 1
      await supabase.from("tenant_stays").insert({
        owner_id: user.id,
        tenant_id: tenant.id,
        property_id: selectedRoom.property_id,
        room_id: selectedRoom.id,
        join_date: new Date().toISOString().split("T")[0],
        monthly_rent: newRent,
        security_deposit: tenant.security_deposit,
        status: "active",
        stay_number: stayNumber,
      })

      // Update tenant record
      await supabase
        .from("tenants")
        .update({ property_id: selectedRoom.property_id, room_id: selectedRoom.id, monthly_rent: newRent })
        .eq("id", tenant.id)

      toast.success("Room transfer completed!")
      setShowTransferModal(false)
      window.location.reload()
    } catch (error) {
      console.error("Error transferring room:", error)
      toast.error("Failed to transfer room")
    } finally {
      setActionLoading(false)
    }
  }

  const totalDues = charges.reduce((sum, c) => sum + c.amount, 0)

  if (loading) {
    return <PageLoading message="Loading tenant details..." />
  }

  if (!tenant) {
    return null
  }

  // Map status to StatusBadge status
  const getStatusKey = (status: string) => {
    const map: Record<string, string> = {
      active: "active",
      notice_period: "notice_period",
      checked_out: "moved_out",
      moved_out: "moved_out",
    }
    return map[status] || "active"
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={tenant.name}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              {tenant.phone}
            </span>
            {tenant.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {tenant.email}
              </span>
            )}
          </div>
        }
        backHref="/tenants"
        backLabel="All Tenants"
        status={getStatusKey(tenant.status)}
        avatar={
          <Avatar
            name={tenant.name}
            src={tenant.profile_photo || tenant.photo_url}
            size="xl"
            className="h-16 w-16 text-2xl shadow-lg shadow-teal-500/20"
          />
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/tenants/${tenant.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            {tenant.status === "active" && (
              <>
                <Button variant="outline" size="sm" onClick={openTransferModal} disabled={actionLoading}>
                  <ArrowRightLeft className="mr-2 h-4 w-4" />
                  Transfer
                </Button>
                <Button variant="gradient" size="sm" onClick={openNoticeDialog} disabled={actionLoading}>
                  <Bell className="mr-2 h-4 w-4" />
                  Put on Notice
                </Button>
              </>
            )}
            {tenant.status === "notice_period" && (
              <Button variant="gradient" size="sm" onClick={handleInitiateCheckout} disabled={actionLoading}>
                <LogOut className="mr-2 h-4 w-4" />
                Initiate Checkout
              </Button>
            )}
            <PermissionGate permission="tenants.delete" hide>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
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
          label="Monthly Rent"
          value={<Currency amount={tenant.monthly_rent} />}
          icon={IndianRupee}
          variant="default"
        />
        <InfoCard
          label="Security Deposit"
          value={<Currency amount={tenant.security_deposit || 0} />}
          icon={Shield}
          variant="default"
        />
        <InfoCard
          label="Pending Dues"
          value={<Currency amount={totalDues} />}
          icon={CreditCard}
          variant={totalDues > 0 ? "error" : "success"}
          href={`/payments/new?tenant=${tenant.id}`}
        />
        <InfoCard
          label="Check-in Date"
          value={formatDate(tenant.check_in_date)}
          icon={Calendar}
          variant="default"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Room Details */}
        <DetailSection
          title="Room Details"
          description="Current accommodation"
          icon={Home}
          actions={
            tenant.room && (
              <div className="flex gap-2">
                <Link href={`/rooms/${tenant.room.id}`}>
                  <Button variant="outline" size="sm">
                    <Home className="mr-1 h-3 w-3" />
                    View Room
                  </Button>
                </Link>
                <Link href={`/rooms/${tenant.room.id}/meter-readings`}>
                  <Button variant="outline" size="sm">
                    <Gauge className="mr-1 h-3 w-3" />
                    Meter Readings
                  </Button>
                </Link>
              </div>
            )
          }
        >
          <InfoRow label="Property" value={tenant.property?.name} icon={Building2} />
          <InfoRow
            label="Room"
            value={
              tenant.room
                ? `Room ${tenant.room.room_number} (${tenant.room.room_type})`
                : "N/A"
            }
            icon={Home}
          />
          <InfoRow label="Check-in Date" value={formatDate(tenant.check_in_date)} icon={Calendar} />
          {tenant.expected_exit_date && (
            <InfoRow
              label="Expected Exit"
              value={<span className="text-amber-600">{formatDate(tenant.expected_exit_date)}</span>}
              icon={Clock}
            />
          )}
          {tenant.check_out_date && (
            <InfoRow label="Check-out Date" value={formatDate(tenant.check_out_date)} icon={LogOut} />
          )}
        </DetailSection>

        {/* Contact & Documents */}
        <DetailSection title="Contact & Documents" description="Personal information" icon={FileText}>
          <InfoRow
            label="Phone"
            value={
              <a href={`tel:${tenant.phone}`} className="text-teal-600 hover:underline">
                {tenant.phone}
              </a>
            }
            icon={Phone}
          />
          {tenant.email && (
            <InfoRow
              label="Email"
              value={
                <a href={`mailto:${tenant.email}`} className="text-teal-600 hover:underline">
                  {tenant.email}
                </a>
              }
              icon={Mail}
            />
          )}
          <InfoRow
            label="Police Verification"
            value={<StatusBadge status={tenant.police_verification_status === "verified" ? "verified" : tenant.police_verification_status === "submitted" ? "pending" : "unverified"} size="sm" />}
            icon={Shield}
          />
          <InfoRow
            label="Agreement"
            value={
              tenant.agreement_signed ? (
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle className="h-4 w-4" /> Signed
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600">
                  <AlertCircle className="h-4 w-4" /> Pending
                </span>
              )
            }
            icon={FileText}
          />
        </DetailSection>

        {/* Additional Details (Custom Fields) */}
        {Object.keys(tenant.custom_fields || {}).length > 0 && (
          <DetailSection title="Additional Details" description="Family & ID information" icon={Users}>
            {tenant.custom_fields.parent_name && (
              <InfoRow label="Parent/Guardian" value={tenant.custom_fields.parent_name} icon={User} />
            )}
            {tenant.custom_fields.parent_phone && (
              <InfoRow
                label="Parent Phone"
                value={
                  <a href={`tel:${tenant.custom_fields.parent_phone}`} className="text-teal-600 hover:underline">
                    {tenant.custom_fields.parent_phone}
                  </a>
                }
                icon={Phone}
              />
            )}
            {tenant.custom_fields.id_proof_type && (
              <InfoRow label="ID Proof Type" value={tenant.custom_fields.id_proof_type} />
            )}
            {tenant.custom_fields.id_proof_number && (
              <InfoRow label="ID Proof Number" value={tenant.custom_fields.id_proof_number} />
            )}
            {tenant.custom_fields.permanent_address && (
              <InfoRow label="Permanent Address" value={tenant.custom_fields.permanent_address} icon={MapPin} />
            )}
          </DetailSection>
        )}

        {/* Pending Dues */}
        <DetailSection
          title="Pending Dues"
          description="Outstanding payments"
          icon={AlertCircle}
          actions={
            <div className="flex gap-2">
              <Link href={`/tenants/${tenant.id}/bills`}>
                <Button variant="outline" size="sm">
                  <FileText className="mr-1 h-3 w-3" />
                  All Bills
                </Button>
              </Link>
              <Link href={`/payments/new?tenant=${tenant.id}`}>
                <Button size="sm" variant="gradient">
                  <Plus className="mr-1 h-3 w-3" />
                  Record Payment
                </Button>
              </Link>
            </div>
          }
        >
          {charges.length === 0 ? (
            <div className="text-center py-4">
              <CheckCircle className="h-10 w-10 mx-auto mb-2 text-emerald-500" />
              <p className="text-muted-foreground">No pending dues</p>
            </div>
          ) : (
            <div className="space-y-3">
              {charges.map((charge) => (
                <div key={charge.id} className="flex items-center justify-between py-2 border-b border-dashed last:border-0">
                  <div>
                    <p className="font-medium">{charge.charge_type?.name || "Charge"}</p>
                    <p className="text-xs text-muted-foreground">{charge.for_period}</p>
                  </div>
                  <div className="text-right">
                    <Currency amount={charge.amount} className="text-rose-600 font-semibold" />
                    <p className="text-xs text-muted-foreground">Due: {formatDate(charge.due_date)}</p>
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 font-semibold">
                <span>Total Dues</span>
                <Currency amount={totalDues} className="text-rose-600" />
              </div>
            </div>
          )}
        </DetailSection>

        {/* Recent Payments */}
        <DetailSection
          title="Recent Payments"
          description="Last 5 transactions"
          icon={CreditCard}
          actions={
            <Link href={`/tenants/${tenant.id}/payments`}>
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          }
        >
          {payments.length === 0 ? (
            <div className="text-center py-4">
              <CreditCard className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-muted-foreground">No payments recorded</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between py-2 border-b border-dashed last:border-0">
                  <div>
                    <p className="font-medium">{payment.charge_type?.name || "Payment"}</p>
                    <p className="text-xs text-muted-foreground">
                      {payment.for_period || formatDate(payment.payment_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <Currency amount={payment.amount} className="text-emerald-600 font-semibold" />
                    <p className="text-xs text-muted-foreground capitalize">{payment.payment_method}</p>
                  </div>
                </div>
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
            <Link href={`/tenants/${tenant.id}/bills`}>
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          }
        >
          {bills.length === 0 ? (
            <div className="text-center py-4">
              <FileText className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-muted-foreground">No bills generated</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bills.map((bill) => (
                <Link key={bill.id} href={`/bills/${bill.id}`}>
                  <div className="flex items-center justify-between py-2 border-b border-dashed last:border-0 hover:bg-muted/50 transition-colors rounded px-1 -mx-1">
                    <div>
                      <p className="font-medium">{bill.bill_number}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(bill.bill_date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(bill.total_amount)}</p>
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

        {/* Meter Readings */}
        {tenant.room && (
          <DetailSection
            title="Meter Readings"
            description="Recent utility readings for your room"
            icon={Gauge}
            actions={
              <div className="flex gap-2">
                <Link href={`/rooms/${tenant.room.id}/meter-readings`}>
                  <Button variant="outline" size="sm">View All</Button>
                </Link>
                <Link href={`/meter-readings/new?room=${tenant.room.id}`}>
                  <Button size="sm" variant="gradient">
                    <Plus className="mr-1 h-3 w-3" />
                    Record
                  </Button>
                </Link>
              </div>
            }
          >
            {meterReadings.length === 0 ? (
              <div className="text-center py-4">
                <Gauge className="h-10 w-10 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-muted-foreground">No meter readings recorded</p>
              </div>
            ) : (
              <div className="space-y-3">
                {meterReadings.map((reading) => {
                  const meterType = reading.charge_type?.name?.toLowerCase() || "electricity"
                  const config = meterTypeConfig[meterType] || meterTypeConfig.electricity
                  const Icon = config.icon
                  return (
                    <Link key={reading.id} href={`/meter-readings/${reading.id}`}>
                      <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${config.bgColor}`}>
                            <Icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div>
                            <p className="font-medium capitalize">{meterType}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
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
          </DetailSection>
        )}
      </div>

      {/* Notes */}
      {tenant.notes && (
        <DetailSection title="Notes" icon={FileText}>
          <p className="text-muted-foreground whitespace-pre-wrap">{tenant.notes}</p>
        </DetailSection>
      )}

      {/* Stay History */}
      {stays.length > 0 && (
        <DetailSection title="Stay History" description="All tenures at your properties" icon={History}>
          <div className="space-y-3">
            {stays.map((stay) => (
              <div key={stay.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Stay #{stay.stay_number}</span>
                    <StatusBadge
                      status={stay.status === "active" ? "active" : stay.status === "transferred" ? "info" : "muted"}
                      label={stay.status === "active" ? "Current" : stay.status === "transferred" ? "Transferred" : "Completed"}
                      size="sm"
                      dot
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {stay.property?.name} - Room {stay.room?.room_number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(stay.join_date)} {stay.exit_date && `→ ${formatDate(stay.exit_date)}`}
                  </p>
                </div>
                <Currency amount={stay.monthly_rent} className="font-semibold" />
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {/* Room Transfer History */}
      {transfers.length > 0 && (
        <DetailSection title="Room Transfers" description="History of room changes" icon={ArrowRightLeft}>
          <div className="space-y-3">
            {transfers.map((transfer) => (
              <div key={transfer.id} className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium">
                    {transfer.from_property?.name} Room {transfer.from_room?.room_number}
                  </span>
                  <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">
                    {transfer.to_property?.name} Room {transfer.to_room?.room_number}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(transfer.transfer_date)}
                  {transfer.reason && ` • ${transfer.reason}`}
                </p>
                {transfer.old_rent !== transfer.new_rent && (
                  <p className="text-xs mt-1">
                    <span className="text-muted-foreground">Rent:</span>{" "}
                    <span className="line-through text-muted-foreground">
                      <Currency amount={transfer.old_rent} />
                    </span>{" "}
                    <Currency amount={transfer.new_rent} className="text-emerald-600" />
                  </p>
                )}
              </div>
            ))}
          </div>
        </DetailSection>
      )}

      {/* Room Transfer Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <Card className="w-full max-w-md animate-scale-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-5 w-5" />
                Transfer Room
              </CardTitle>
              <p className="text-sm text-muted-foreground">Move {tenant.name} to a different room</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg text-sm">
                <p className="text-muted-foreground">Current Room</p>
                <p className="font-medium">{tenant.property?.name} - Room {tenant.room?.room_number}</p>
                <p className="text-muted-foreground">Rent: <Currency amount={tenant.monthly_rent} /></p>
              </div>

              <FormField label="New Room" required>
                <Select
                  value={transferData.to_room_id}
                  onChange={(e) => {
                    const room = availableRooms.find((r) => r.id === e.target.value)
                    setTransferData({
                      ...transferData,
                      to_room_id: e.target.value,
                      new_rent: room ? room.rent_amount.toString() : "",
                    })
                  }}
                  options={availableRooms.map((room) => ({
                    value: room.id,
                    label: `Room ${room.room_number} (${room.occupied_beds}/${room.total_beds} beds) - ₹${room.rent_amount}`,
                  }))}
                  placeholder="Select a room"
                />
              </FormField>

              <FormField label="New Rent (₹)" hint="Leave blank to use room's default rent">
                <Input
                  type="number"
                  value={transferData.new_rent}
                  onChange={(e) => setTransferData({ ...transferData, new_rent: e.target.value })}
                  placeholder="Leave blank for default"
                />
              </FormField>

              <FormField label="Reason">
                <Select
                  value={transferData.reason}
                  onChange={(e) => setTransferData({ ...transferData, reason: e.target.value })}
                  options={[
                    { value: "upgrade", label: "Upgrade" },
                    { value: "downgrade", label: "Downgrade" },
                    { value: "request", label: "Tenant Request" },
                    { value: "maintenance", label: "Maintenance" },
                    { value: "other", label: "Other" },
                  ]}
                  placeholder="Select reason"
                />
              </FormField>

              <FormField label="Notes">
                <Input
                  value={transferData.notes}
                  onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })}
                  placeholder="Additional notes"
                />
              </FormField>
            </CardContent>
            <div className="flex justify-end gap-2 p-4 pt-0">
              <Button variant="outline" onClick={() => setShowTransferModal(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button variant="gradient" onClick={handleRoomTransfer} disabled={actionLoading || !transferData.to_room_id}>
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Transferring...
                  </>
                ) : (
                  <>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    Transfer
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Tenant"
        description={`Are you sure you want to delete "${tenant?.name}"? This will permanently remove the tenant and all associated data including payment history, charges, stay history, and room transfers. This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        loading={actionLoading}
        onConfirm={handleDelete}
      />

      {/* Notice Period Dialog */}
      {showNoticeDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <Card className="w-full max-w-md animate-scale-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                Put on Notice Period
              </CardTitle>
              <CardDescription>
                Set an expected exit date for {tenant.name}. This will move them to &ldquo;Notice Period&rdquo; status.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
                <p className="text-amber-800">
                  <strong>Note:</strong> This action will change the tenant&apos;s status to &ldquo;Notice Period&rdquo;.
                  You can later initiate the checkout process when they&apos;re ready to leave.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="notice_date">Notice Given Date *</Label>
                  <Input
                    id="notice_date"
                    type="date"
                    value={noticeData.notice_date}
                    onChange={(e) => {
                      const newNoticeDate = e.target.value
                      // Auto-update exit date to 30 days after notice date
                      const exitDate = new Date(newNoticeDate)
                      exitDate.setDate(exitDate.getDate() + 30)
                      setNoticeData({
                        ...noticeData,
                        notice_date: newNoticeDate,
                        expected_exit_date: exitDate.toISOString().split("T")[0]
                      })
                    }}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    When did/will the tenant give notice?
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expected_exit_date">Expected Exit Date *</Label>
                  <Input
                    id="expected_exit_date"
                    type="date"
                    value={noticeData.expected_exit_date}
                    onChange={(e) => setNoticeData({ ...noticeData, expected_exit_date: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Last day of stay
                  </p>
                </div>
              </div>

              {noticeData.notice_date && noticeData.expected_exit_date && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                  <p className="text-blue-800">
                    <strong>Notice Period:</strong>{" "}
                    {Math.ceil((new Date(noticeData.expected_exit_date).getTime() - new Date(noticeData.notice_date).getTime()) / (1000 * 60 * 60 * 24))} days
                    {" "}(from {new Date(noticeData.notice_date).toLocaleDateString("en-IN")} to {new Date(noticeData.expected_exit_date).toLocaleDateString("en-IN")})
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="notice_notes">Reason / Notes (Optional)</Label>
                <Input
                  id="notice_notes"
                  value={noticeData.notice_notes}
                  onChange={(e) => setNoticeData({ ...noticeData, notice_notes: e.target.value })}
                  placeholder="e.g., Job relocation, personal reasons..."
                />
              </div>
            </CardContent>
            <div className="flex justify-end gap-2 p-4 pt-0">
              <Button variant="outline" onClick={() => setShowNoticeDialog(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                onClick={handlePutOnNotice}
                disabled={actionLoading || !noticeData.expected_exit_date}
                className="bg-amber-500 hover:bg-amber-600 text-white"
              >
                {actionLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  <>
                    <Bell className="mr-2 h-4 w-4" />
                    Put on Notice
                  </>
                )}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
