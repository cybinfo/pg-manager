"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useDetailPage, TENANT_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Tenant, TenantStay, RoomTransfer } from "@/types/tenants.types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
} from "@/components/ui/detail-components"
import { StatusBadge } from "@/components/ui/status-badge"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
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
  ExternalLink,
  Briefcase,
  Heart,
} from "lucide-react"
import { toast } from "sonner"
import { formatDate, formatCurrency } from "@/lib/format"
import { useAuth } from "@/lib/auth"
import { PermissionGate } from "@/components/auth"
import { Avatar } from "@/components/ui/avatar"

// Types for related data
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

export default function TenantDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { hasPermission } = useAuth()

  // Use centralized hook for data fetching
  const {
    data: tenant,
    related,
    loading,
    refetch,
    updateFields,
    deleteRecord,
    isDeleting,
  } = useDetailPage<Tenant>({
    config: TENANT_DETAIL_CONFIG,
    id: params.id as string,
  })

  // Action state
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

  // Get related data from hook
  const payments = (related.payments || []) as Payment[]
  const charges = (related.charges || []) as Charge[]
  const stays = (related.stays || []) as TenantStay[]
  const transfers = (related.transfers || []) as RoomTransfer[]
  const bills = (related.bills || []) as Bill[]

  // Computed values
  const totalDues = useMemo(() => charges.reduce((sum, c) => sum + c.amount, 0), [charges])

  const openNoticeDialog = () => {
    const today = new Date().toISOString().split("T")[0]
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
    const noticeDate = new Date(noticeData.notice_date)
    const noteDateStr = noticeDate.toLocaleDateString("en-IN")

    const success = await updateFields({
      status: "notice_period",
      notice_date: noticeData.notice_date,
      expected_exit_date: noticeData.expected_exit_date,
      notes: tenant.notes
        ? `${tenant.notes}\n\n[Notice Period - ${noteDateStr}]: ${noticeData.notice_notes || "Put on notice"}`
        : `[Notice Period - ${noteDateStr}]: ${noticeData.notice_notes || "Put on notice"}`
    })

    if (success) {
      toast.success("Tenant put on notice period")
      setShowNoticeDialog(false)
      refetch()
    }
    setActionLoading(false)
  }

  const handleInitiateCheckout = () => {
    router.push(`/exit-clearance/new?tenant=${tenant?.id}`)
  }

  const handleDelete = async () => {
    await deleteRecord({ confirm: false })
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
        title={tenant.person?.name || tenant.name}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <span className="flex items-center gap-1">
              <Phone className="h-4 w-4" />
              {tenant.person?.phone || tenant.phone}
            </span>
            {(tenant.person?.email || tenant.email) && (
              <span className="flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {tenant.person?.email || tenant.email}
              </span>
            )}
          </div>
        }
        backHref="/tenants"
        backLabel="All Tenants"
        status={getStatusKey(tenant.status)}
        avatar={
          <Avatar
            name={tenant.person?.name || tenant.name}
            src={tenant.person?.photo_url || tenant.profile_photo || tenant.photo_url}
            size="xl"
            className="h-16 w-16 text-2xl shadow-lg shadow-teal-500/20"
            clickable
          />
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {tenant.person_id && (
              <Link href={`/people/${tenant.person_id}`}>
                <Button variant="outline" size="sm">
                  <User className="mr-2 h-4 w-4" />
                  View Person
                </Button>
              </Link>
            )}
            <Link href={`/tenants/${tenant.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit Tenancy
              </Button>
            </Link>
            <Link href={`/tenants/${tenant.id}/journey`}>
              <Button variant="outline" size="sm">
                <History className="mr-2 h-4 w-4" />
                Journey
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
                ? `Room ${tenant.room.room_number}${tenant.room.room_type ? ` (${tenant.room.room_type})` : ""}`
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

        {/* Personal Information (from People module - read only) */}
        <DetailSection
          title="Personal Information"
          description="From People module"
          icon={User}
          actions={
            tenant.person_id && (
              <Link href={`/people/${tenant.person_id}/edit`}>
                <Button variant="outline" size="sm">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Edit in People
                </Button>
              </Link>
            )
          }
        >
          <InfoRow
            label="Phone"
            value={
              <a href={`tel:${tenant.person?.phone || tenant.phone}`} className="text-teal-600 hover:underline">
                {tenant.person?.phone || tenant.phone}
              </a>
            }
            icon={Phone}
          />
          {(tenant.person?.email || tenant.email) && (
            <InfoRow
              label="Email"
              value={
                <a href={`mailto:${tenant.person?.email || tenant.email}`} className="text-teal-600 hover:underline">
                  {tenant.person?.email || tenant.email}
                </a>
              }
              icon={Mail}
            />
          )}
          {tenant.person?.date_of_birth && (
            <InfoRow label="Date of Birth" value={formatDate(tenant.person.date_of_birth)} icon={Calendar} />
          )}
          {tenant.person?.gender && (
            <InfoRow label="Gender" value={tenant.person.gender} />
          )}
          {(tenant.person?.occupation || tenant.person?.company_name) && (
            <InfoRow
              label="Occupation"
              value={[tenant.person?.occupation, tenant.person?.company_name].filter(Boolean).join(" at ")}
              icon={Briefcase}
            />
          )}
          {tenant.person?.blood_group && (
            <InfoRow label="Blood Group" value={tenant.person.blood_group} icon={Heart} />
          )}
          {tenant.person?.permanent_address && (
            <InfoRow
              label="Permanent Address"
              value={[
                tenant.person.permanent_address,
                tenant.person.permanent_city,
                tenant.person.permanent_state,
                tenant.person.permanent_pincode
              ].filter(Boolean).join(", ")}
              icon={MapPin}
            />
          )}
          {tenant.person?.aadhaar_number && (
            <InfoRow label="Aadhaar" value={`XXXX-XXXX-${tenant.person.aadhaar_number.slice(-4)}`} icon={Shield} />
          )}
          {tenant.person?.pan_number && (
            <InfoRow label="PAN" value={tenant.person.pan_number} icon={FileText} />
          )}
          {tenant.person?.is_verified && (
            <InfoRow
              label="Verification"
              value={
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle className="h-4 w-4" /> Verified
                </span>
              }
            />
          )}
        </DetailSection>

        {/* Emergency Contacts (from People) */}
        {tenant.person?.emergency_contacts && tenant.person.emergency_contacts.length > 0 && (
          <DetailSection
            title="Emergency Contacts"
            description="From People module"
            icon={Users}
            actions={
              tenant.person_id && (
                <Link href={`/people/${tenant.person_id}/edit`}>
                  <Button variant="ghost" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </Link>
              )
            }
          >
            {tenant.person.emergency_contacts.map((contact, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-dashed last:border-0">
                <div>
                  <p className="font-medium">{contact.name}</p>
                  <p className="text-xs text-muted-foreground">{contact.relation}</p>
                </div>
                <a href={`tel:${contact.phone}`} className="text-teal-600 hover:underline text-sm">
                  {contact.phone}
                </a>
              </div>
            ))}
          </DetailSection>
        )}

        {/* Guardian Contacts (tenant-specific, legacy) */}
        {tenant.guardian_contacts && tenant.guardian_contacts.length > 0 && (
          <DetailSection title="Guardian Contacts" description="Tenant-specific contacts" icon={Users}>
            {tenant.guardian_contacts.map((guardian, idx) => (
              <div key={idx} className="flex items-center justify-between py-2 border-b border-dashed last:border-0">
                <div>
                  <p className="font-medium">{guardian.name}</p>
                  <p className="text-xs text-muted-foreground">{guardian.relation}</p>
                </div>
                <a href={`tel:${guardian.phone}`} className="text-teal-600 hover:underline text-sm">
                  {guardian.phone}
                </a>
              </div>
            ))}
          </DetailSection>
        )}

        {/* Tenancy Verification Status */}
        <DetailSection title="Verification Status" description="Tenancy verification" icon={Shield}>
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
        loading={actionLoading || isDeleting}
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
