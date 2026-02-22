"use client"

import { useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useDetailPage, TENANT_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Tenant, TenantStay, RoomTransfer } from "@/types/tenants.types"
import { Button } from "@/components/ui/button"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  DetailPageTemplate,
} from "@/components/ui"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import { ConfirmDialog } from "@/components/ui/form-dialog"
import {
  User,
  Phone,
  Mail,
  Building2,
  Home,
  Calendar,
  IndianRupee,
  Pencil,
  Shield,
  CreditCard,
  Clock,
  LogOut,
  Bell,
  ArrowRightLeft,
  History,
  Trash2,
  Gauge,
  FileText,
} from "lucide-react"
import { PrintButton } from "@/components/ui/print-button"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { formatDate } from "@/lib/format"
import { useAuth } from "@/lib/auth"
import { PermissionGate } from "@/components/auth"
import { Avatar } from "@/components/ui/avatar"

import {
  RoomTransferModal,
  NoticePeriodDialog,
  NoticePeriodSection,
  PersonalInfoSection,
  FinancialSections,
  StayHistorySections,
} from "./_components"
import type { TransferRoom } from "./_components"

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
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [availableRooms, setAvailableRooms] = useState<TransferRoom[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [noticeDialogOpen, setNoticeDialogOpen] = useState(false)
  const [cancelNoticeDialogOpen, setCancelNoticeDialogOpen] = useState(false)

  // Get related data from hook
  const payments = (related.payments || []) as Payment[]
  const charges = (related.charges || []) as Charge[]
  const stays = (related.stays || []) as TenantStay[]
  const transfers = (related.transfers || []) as RoomTransfer[]
  const bills = (related.bills || []) as Bill[]

  // Computed values
  const totalDues = useMemo(() => charges.reduce((sum, c) => sum + c.amount, 0), [charges])

  const handlePutOnNotice = async (data: { notice_date: string; expected_exit_date: string; notice_notes: string }) => {
    if (!tenant || !data.expected_exit_date || !data.notice_date) {
      showError("Please fill in all required fields")
      return
    }

    setActionLoading(true)
    const noticeDate = new Date(data.notice_date)
    const noteDateStr = noticeDate.toLocaleDateString("en-IN")

    const success = await updateFields({
      status: "notice_period",
      notice_date: data.notice_date,
      expected_exit_date: data.expected_exit_date,
      notes: tenant.notes
        ? `${tenant.notes}\n\n[Notice Period - ${noteDateStr}]: ${data.notice_notes || "Put on notice"}`
        : `[Notice Period - ${noteDateStr}]: ${data.notice_notes || "Put on notice"}`
    })

    if (success) {
      showSuccess("Tenant put on notice period")
      setNoticeDialogOpen(false)
      refetch()
    }
    setActionLoading(false)
  }

  const handleCancelNotice = async () => {
    if (!tenant) return

    setActionLoading(true)
    const today = new Date().toLocaleDateString("en-IN")

    const success = await updateFields({
      status: "active",
      notice_date: null,
      expected_exit_date: null,
      notes: tenant.notes
        ? `${tenant.notes}\n\n[Notice Cancelled - ${today}]: Tenant decided to continue staying`
        : `[Notice Cancelled - ${today}]: Tenant decided to continue staying`
    })

    if (success) {
      showSuccess("Notice cancelled - tenant is now active again")
      setCancelNoticeDialogOpen(false)
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
      const available = roomsData.filter((r: TransferRoom) => r.occupied_beds < r.total_beds)
      setAvailableRooms(available)
    }

    setTransferModalOpen(true)
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
        breadcrumbs={[
          { label: "Tenants", href: "/tenants" },
          { label: tenant.person?.name || tenant.name || "Details" },
        ]}
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
            <PrintButton />
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
                <Button variant="gradient" size="sm" onClick={() => setNoticeDialogOpen(true)} disabled={actionLoading}>
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
                onClick={() => setDeleteDialogOpen(true)}
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

      <DetailPageTemplate layoutKey="tenant-detail" entityType="tenant" record={tenant}>
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
              value={<span className="text-warning">{formatDate(tenant.expected_exit_date)}</span>}
              icon={Clock}
            />
          )}
          {tenant.check_out_date && (
            <InfoRow label="Check-out Date" value={formatDate(tenant.check_out_date)} icon={LogOut} />
          )}
        </DetailSection>

        {/* Notice Period Section - Only shown when tenant is on notice */}
        {tenant.status === "notice_period" && (
          <NoticePeriodSection
            noticeDate={tenant.notice_date}
            expectedExitDate={tenant.expected_exit_date}
            actionLoading={actionLoading}
            onCancelNotice={() => setCancelNoticeDialogOpen(true)}
          />
        )}

        {/* Personal Info, Emergency Contacts, Guardian Contacts, Verification */}
        <PersonalInfoSection tenant={tenant} />

        {/* Financial: Dues, Payments, Bills */}
        <FinancialSections
          tenantId={tenant.id}
          charges={charges}
          payments={payments}
          bills={bills}
        />

        {/* Notes */}
        {tenant.notes && (
          <DetailSection title="Notes" icon={FileText}>
            <p className="text-muted-foreground whitespace-pre-wrap">{tenant.notes}</p>
          </DetailSection>
        )}

        {/* Stay History & Transfer History */}
        <StayHistorySections stays={stays} transfers={transfers} />

      </DetailPageTemplate>

      {/* Room Transfer Modal */}
      {transferModalOpen && (
        <RoomTransferModal
          tenant={tenant}
          stays={stays}
          availableRooms={availableRooms}
          onClose={() => setTransferModalOpen(false)}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Tenant"
        description={`Are you sure you want to delete "${tenant?.name}"? This will permanently remove the tenant and all associated data including payment history, charges, stay history, and room transfers. This action cannot be undone.`}
        confirmText="Delete"
        variant="destructive"
        loading={actionLoading || isDeleting}
        onConfirm={handleDelete}
      />

      {/* Notice Period Dialog */}
      {noticeDialogOpen && (
        <NoticePeriodDialog
          tenantName={tenant.name}
          loading={actionLoading}
          onClose={() => setNoticeDialogOpen(false)}
          onSubmit={handlePutOnNotice}
        />
      )}

      {/* Cancel Notice Confirmation Dialog */}
      <ConfirmDialog
        open={cancelNoticeDialogOpen}
        onOpenChange={setCancelNoticeDialogOpen}
        title="Cancel Notice Period"
        description={`Are you sure you want to cancel the notice for "${tenant?.name}"? This will change their status back to "Active" and clear the expected exit date.`}
        confirmText="Cancel Notice"
        variant="default"
        loading={actionLoading}
        onConfirm={handleCancelNotice}
      />
    </div>
  )
}
