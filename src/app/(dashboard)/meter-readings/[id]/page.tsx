"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useDetailPage, METER_READING_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Button } from "@/components/ui/button"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  DetailListSection,
  DetailPageTemplate,
} from "@/components/ui"
import { StatusBadge } from "@/components/ui/status-badge"
import { PageLoading } from "@/components/ui/loading"
import {
  Gauge,
  Building2,
  Home,
  Calendar,
  Pencil,
  Trash2,
  Calculator,
  FileText,
  Clock,
  TrendingUp,
  Image as ImageIcon,
  IndianRupee,
  Receipt,
  User,
  CheckCircle,
  AlertCircle,
  Loader2,
} from "lucide-react"
import { METER_TYPE_ICON_CONFIG } from "@/types/meters.types"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { formatCurrency, formatDate, formatDateTime, formatMonthYear, formatNumber} from "@/lib/format"
import { PermissionGate } from "@/components/auth"
import { ConfirmDialog } from "@/components/ui/form-dialog"
import { transformJoin } from "@/lib/supabase/transforms"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"

interface MeterReading {
  id: string
  reading_date: string
  reading_value: number
  previous_reading: number | null
  units_consumed: number | null
  image_url: string | null
  notes: string | null
  created_at: string
  created_by: string | null
  property: { id: string; name: string; address: string } | null
  room: { id: string; room_number: string } | null
  charge_type: { id: string; name: string; calculation_config: Record<string, unknown> | null } | null
}

interface Charge {
  id: string
  amount: number
  due_date: string
  status: string
  for_period: string | null
  paid_amount: number
  calculation_details: Record<string, unknown> | null
  tenant: { id: string; name: string } | null
}

const meterTypeConfig: Record<string, typeof METER_TYPE_ICON_CONFIG[keyof typeof METER_TYPE_ICON_CONFIG]> = METER_TYPE_ICON_CONFIG

export default function MeterReadingDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/meter-readings", defaultLabel: "All Readings" })
  const [generating, setGenerating] = useState(false)
  const [charges, setCharges] = useState<Charge[]>([])
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

  const {
    data: reading,
    loading,
    deleteRecord,
    isDeleting,
  } = useDetailPage<MeterReading>({
    config: METER_READING_DETAIL_CONFIG,
    id: params.id as string,
  })

  // Fetch charges linked to this reading
  useEffect(() => {
    const fetchCharges = async () => {
      if (!reading) return

      const supabase = createClient()
      const { data: chargesData } = await supabase
        .from("charges")
        .select(`
          id,
          amount,
          due_date,
          status,
          for_period,
          paid_amount,
          calculation_details,
          tenant:tenants(id, name)
        `)
        .contains("calculation_details", { meter_reading_id: reading.id })
        .order("created_at", { ascending: false })

      if (chargesData) {
        const transformedCharges: Charge[] = chargesData.map((charge: {
          id: string
          amount: number
          due_date: string
          status: string
          for_period: string | null
          paid_amount: number
          calculation_details: Record<string, unknown> | null
          tenant: { id: string; name: string }[] | null
        }) => ({
          ...charge,
          tenant: transformJoin(charge.tenant),
        }))
        setCharges(transformedCharges)
      }
    }

    fetchCharges()
  }, [reading])

  const handleDelete = async () => {
    await deleteRecord({ confirm: false })
  }

  const handleGenerateCharges = async () => {
    if (!reading || !reading.units_consumed || reading.units_consumed <= 0) {
      showError("Cannot generate charges: No units consumed")
      return
    }

    const ratePerUnit = (reading.charge_type?.calculation_config as { rate_per_unit?: number; split_by?: string })?.rate_per_unit
    if (!ratePerUnit || ratePerUnit <= 0) {
      showError("Cannot generate charges: No rate configured for this meter type")
      return
    }

    setGenerating(true)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        showError("Session expired. Please login again.")
        router.push("/login")
        return
      }

      const { data: tenants, error: tenantsError } = await supabase
        .from("tenants")
        .select("id, name")
        .eq("room_id", reading.room?.id)
        .eq("status", "active")

      if (tenantsError) {
        showError("Failed to fetch tenants")
        return
      }

      if (!tenants || tenants.length === 0) {
        showError("No active tenants in this room")
        return
      }

      const splitByOccupants = (reading.charge_type?.calculation_config as { split_by?: string })?.split_by === "occupants"
      const totalAmount = reading.units_consumed * ratePerUnit
      const amountPerTenant = splitByOccupants ? totalAmount / tenants.length : totalAmount

      const readingDate = new Date(reading.reading_date)
      const dueDate = new Date(readingDate.getFullYear(), readingDate.getMonth() + 1, 0)
      const forPeriod = formatMonthYear(readingDate)

      const chargeInserts = tenants.map((tenant: { id: string; name: string }) => ({
        owner_id: user.id,
        tenant_id: tenant.id,
        property_id: reading.property?.id,
        charge_type_id: reading.charge_type?.id,
        amount: splitByOccupants ? amountPerTenant : totalAmount,
        due_date: dueDate.toISOString().split("T")[0],
        for_period: forPeriod,
        period_start: new Date(readingDate.getFullYear(), readingDate.getMonth(), 1).toISOString().split("T")[0],
        period_end: dueDate.toISOString().split("T")[0],
        calculation_details: {
          meter_reading_id: reading.id,
          units: reading.units_consumed,
          rate: ratePerUnit,
          total_amount: totalAmount,
          occupants: tenants.length,
          split_by: splitByOccupants ? "occupants" : "room",
          per_person: splitByOccupants ? amountPerTenant : totalAmount,
          method: "meter_reading",
        },
        status: "pending",
        notes: `Generated from meter reading on ${reading.reading_date}`,
      }))

      const { data: newCharges, error: chargeError } = await supabase
        .from("charges")
        .insert(chargeInserts)
        .select(`
          id,
          amount,
          due_date,
          status,
          for_period,
          paid_amount,
          calculation_details,
          tenant:tenants(id, name)
        `)

      if (chargeError) {
        showError("Failed to generate charges")
        return
      }

      if (newCharges) {
        const transformedCharges: Charge[] = newCharges.map((charge: {
          id: string
          amount: number
          due_date: string
          status: string
          for_period: string | null
          paid_amount: number
          calculation_details: Record<string, unknown> | null
          tenant: { id: string; name: string }[] | null
        }) => ({
          ...charge,
          tenant: transformJoin(charge.tenant),
        }))
        setCharges((prev) => [...transformedCharges, ...prev])
      }

      showSuccess(`${tenants.length} charge${tenants.length > 1 ? "s" : ""} generated successfully!`)
    } catch {
      showError("Failed to generate charges")
    } finally {
      setGenerating(false)
    }
  }

  if (loading) {
    return <PageLoading message="Loading meter reading..." />
  }

  if (!reading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-lg font-semibold">Not Found</h2>
          <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
        </div>
      )
  }

  const meterType = reading.charge_type?.name?.toLowerCase() || "electricity"
  const config = meterTypeConfig[meterType] || meterTypeConfig.electricity
  const Icon = config.icon
  const ratePerUnit = (reading.charge_type?.calculation_config as { rate_per_unit?: number })?.rate_per_unit
  const totalChargesAmount = charges.reduce((sum, c) => sum + c.amount, 0)
  const totalPaidAmount = charges.reduce((sum, c) => sum + (c.paid_amount || 0), 0)

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={`${config.label} Reading`}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {reading.property && (
              <Link href={`/properties/${reading.property.id}`} className="hover:text-primary flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                {reading.property.name}
              </Link>
            )}
            {reading.room && (
              <Link href={`/rooms/${reading.room.id}`} className="hover:text-primary flex items-center gap-1">
                <Home className="h-4 w-4" />
                Room {reading.room.room_number}
              </Link>
            )}
          </div>
        }
        backHref={backHref}
        backLabel={backLabel}
        breadcrumbs={[
          { label: "Meter Readings", href: "/meter-readings" },
          { label: `${config.label} Reading` },
        ]}
        avatar={
          <div className={`p-3 rounded-lg ${config.bgColor}`}>
            <Icon className={`h-8 w-8 ${config.color}`} />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/meter-readings/${reading.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <PermissionGate permission="meter_readings.delete" hide>
              <Button
                variant="destructive"
                size="sm"
                disabled={isDeleting}
                onClick={() => setDeleteDialogOpen(true)}
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
          label="Current Reading"
          value={formatNumber(reading.reading_value)}
          icon={Gauge}
        />
        <InfoCard
          label="Previous Reading"
          value={reading.previous_reading !== null ? formatNumber(reading.previous_reading) : "N/A"}
          icon={Gauge}
        />
        <InfoCard
          label="Units Consumed"
          value={reading.units_consumed !== null ? `${formatNumber(reading.units_consumed)} ${config.unit}` : "N/A"}
          icon={Calculator}
          variant="success"
        />
        <InfoCard
          label="Reading Date"
          value={formatDate(reading.reading_date)}
          icon={Calendar}
        />
      </div>

      <DetailPageTemplate layoutKey="meter-reading-detail" entityType="meter_reading" record={reading}>
        {/* Location Details */}
        <DetailSection title="Location" description="Property and room details" icon={Home}>
          {reading.property && (
            <InfoRow
              label="Property"
              value={
                <Link href={`/properties/${reading.property.id}`} className="text-primary hover:underline">
                  {reading.property.name}
                </Link>
              }
              icon={Building2}
            />
          )}
          {reading.property?.address && <InfoRow label="Address" value={reading.property.address} />}
          {reading.room && (
            <InfoRow
              label="Room"
              value={
                <Link href={`/rooms/${reading.room.id}`} className="text-primary hover:underline">
                  Room {reading.room.room_number}
                </Link>
              }
              icon={Home}
            />
          )}
        </DetailSection>

        {/* Meter Details */}
        <DetailSection title="Meter Details" description="Type and calculation info" icon={Icon}>
          <InfoRow
            label="Meter Type"
            value={
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bgColor} ${config.color}`}>
                {config.label}
              </span>
            }
          />
          <InfoRow label="Unit of Measurement" value={config.unit} />
          {ratePerUnit && <InfoRow label="Rate per Unit" value={formatCurrency(ratePerUnit)} />}
          {ratePerUnit && reading.units_consumed !== null && (
            <InfoRow
              label="Estimated Cost"
              value={<span className="font-bold text-primary">{formatCurrency(ratePerUnit * reading.units_consumed)}</span>}
              icon={TrendingUp}
            />
          )}
        </DetailSection>

        {/* Record Info */}
        <DetailSection title="Record Info" description="When this reading was recorded" icon={Clock}>
          <InfoRow label="Reading Date" value={formatDate(reading.reading_date)} icon={Calendar} />
          <InfoRow label="Recorded At" value={formatDateTime(reading.created_at)} icon={Clock} />
        </DetailSection>

        {/* Meter Image */}
        {reading.image_url && (
          <DetailSection title="Meter Photo" description="Captured meter image" icon={ImageIcon}>
            <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
              <Image src={reading.image_url} alt="Meter reading" fill className="object-cover" />
            </div>
          </DetailSection>
        )}

        {/* Notes */}
        {reading.notes && (
          <DetailSection title="Notes" description="Additional information" icon={FileText} className="md:col-span-2">
            <p className="text-muted-foreground whitespace-pre-wrap">{reading.notes}</p>
          </DetailSection>
        )}

        {/* Generated Charges */}
        <DetailListSection
          title="Generated Charges"
          description="Charges created from this meter reading"
          icon={Receipt}
          items={charges}
          keyExtractor={(charge, _idx) => charge.id}
          renderItem={(charge) => (
            <div className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  {charge.tenant ? (
                    <Link href={`/tenants/${charge.tenant.id}`} className="font-medium hover:text-primary transition-colors">
                      {charge.tenant.name}
                    </Link>
                  ) : (
                    <p className="font-medium">Unknown Tenant</p>
                  )}
                  <p className="text-sm text-muted-foreground">{charge.for_period || "No period specified"}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(charge.amount)}</p>
                  {charge.paid_amount > 0 && (
                    <p className="text-sm text-success">Paid: {formatCurrency(charge.paid_amount)}</p>
                  )}
                </div>
                <StatusBadge
                  status={
                    charge.status === "paid" ? "success" :
                    charge.status === "partial" ? "info" :
                    charge.status === "overdue" ? "error" : "warning"
                  }
                  label={charge.status}
                  size="sm"
                />
              </div>
            </div>
          )}
          initialLimit={10}
          viewAllMode="expand"
          emptyIcon={Receipt}
          emptyText={
            reading.units_consumed && reading.units_consumed > 0
              ? (ratePerUnit
                  ? "No charges generated from this reading. Click \"Generate Charges\" to create charges for active tenants."
                  : "No rate configured for this meter type. Update charge type settings first.")
              : "No units consumed - charges cannot be generated"
          }
          actions={
            charges.length > 0 ? (
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Amount</p>
                <p className="text-lg font-bold text-primary">{formatCurrency(totalChargesAmount)}</p>
              </div>
            ) : reading.units_consumed && reading.units_consumed > 0 && ratePerUnit ? (
              <Button onClick={handleGenerateCharges} disabled={generating} size="sm">
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <IndianRupee className="mr-2 h-4 w-4" />
                    Generate Charges
                  </>
                )}
              </Button>
            ) : undefined
          }
        />

        {/* Charges Summary Footer */}
        {charges.length > 1 && (
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 text-muted-foreground">
              <IndianRupee className="h-4 w-4" />
              <span>{charges.length} charge{charges.length > 1 ? "s" : ""} generated</span>
            </div>
            <div className="text-right">
              {totalPaidAmount > 0 && (
                <p className="text-sm text-success flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" />
                  {formatCurrency(totalPaidAmount)} paid
                </p>
              )}
              {totalChargesAmount - totalPaidAmount > 0 && (
                <p className="text-sm text-warning flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {formatCurrency(totalChargesAmount - totalPaidAmount)} pending
                </p>
              )}
            </div>
          </div>
        )}

      </DetailPageTemplate>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Meter Reading"
        description="Are you sure you want to delete this meter reading? This action cannot be undone."
        confirmText="Delete"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}
