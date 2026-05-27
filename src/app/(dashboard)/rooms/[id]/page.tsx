"use client"

import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useDetailPage, ROOM_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { useAuth } from "@/lib/auth"
import { softDelete } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { Room, RoomTenant, RoomMeterAssignment, RoomComplaint } from "@/types/rooms.types"
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
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import {
  Home,
  Building2,
  Bed,
  IndianRupee,
  Pencil,
  Trash2,
  Users,
  Phone,
  Plus,
  Thermometer,
  Bath,
  Layers,
  Gauge,
  Calendar,
  MessageSquare,
  Wrench,
} from "lucide-react"
import { METER_TYPE_ICON_CONFIG } from "@/types/meters.types"
import { formatCurrency, formatDate, formatNumber } from "@/lib/format"
import { Avatar } from "@/components/ui/avatar"
import { METER_TYPE_CONFIG, METER_STATUS_CONFIG } from "@/types/meters.types"
import { ROOM_STATUS } from "@/lib/status"
import { Progress } from "@/components/ui/progress"
import { PermissionGate, FeatureGuard } from "@/components/auth"
import { createClient } from "@/lib/supabase/client"
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface MeterReading {
  id: string
  reading_date: string
  reading_value: number
  units_consumed: number | null
  meter: {
    id: string
    meter_number: string
    meter_type: string
  } | null
}

const meterTypeConfig: Record<string, typeof METER_TYPE_ICON_CONFIG[keyof typeof METER_TYPE_ICON_CONFIG]> = METER_TYPE_ICON_CONFIG

export default function RoomDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const [togglingMaintenance, setTogglingMaintenance] = useState(false)
  const [maintenanceNotes, setMaintenanceNotes] = useState("")

  const handleDelete = () => {
    if (!user?.id) return
    confirm({
      title: "Delete Room",
      description: "Are you sure you want to delete this room? This action cannot be undone.",
      destructive: true,
      onConfirm: async () => {
        try {
          const result = await softDelete("rooms", params.id as string, user.id)
          if (!result.error) {
            showSuccess("Room deleted successfully")
            router.push("/rooms")
          } else {
            showError(result.error.message || "Failed to delete room")
          }
        } catch {
          showError("Failed to delete room")
        }
      },
    })
  }

  const {
    data: room,
    related,
    loading,
    updateField,
    isSaving,
    refetch,
  } = useDetailPage<Room>({
    config: ROOM_DETAIL_CONFIG,
    id: params.id as string,
  })

  const handleStatusChange = async (newStatus: string) => {
    await updateField("status", newStatus)
  }

  const handleMaintenanceToggle = async () => {
    if (!room) return
    setTogglingMaintenance(true)
    try {
      const supabase = createClient()
      const enabling = !room.is_under_maintenance
      const { error } = await supabase
        .from("rooms")
        .update({
          is_under_maintenance: enabling,
          maintenance_notes: enabling ? (maintenanceNotes || null) : null,
        })
        .eq("id", room.id)
      if (error) {
        showError(error.message || "Failed to update maintenance status")
      } else {
        showSuccess(enabling ? "Maintenance mode enabled" : "Maintenance mode disabled")
        setMaintenanceNotes("")
        refetch()
      }
    } catch {
      showError("Failed to update maintenance status")
    } finally {
      setTogglingMaintenance(false)
    }
  }

  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/rooms", defaultLabel: "All Rooms" })

  if (loading) {
    return <PageLoading message="Loading room details..." />
  }

  if (!room) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-lg font-semibold">Not Found</h2>
          <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
        </div>
      )
  }

  const tenants = (related.tenants || []) as RoomTenant[]
  const meterAssignments = (related.meterAssignments || []) as RoomMeterAssignment[]
  const meterReadings = (related.meterReadings || []) as MeterReading[]
  const complaints = (related.complaints || []) as RoomComplaint[]

  const status = ROOM_STATUS[room.status] || ROOM_STATUS.available
  const availableBeds = room.total_beds - room.occupied_beds

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={`Room ${room.room_number}`}
        subtitle={
          <div className="flex items-center gap-3 flex-wrap">
            {room.property && (
              <Link href={`/properties/${room.property.id}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
                <Building2 className="h-4 w-4" />
                {room.property.name}
              </Link>
            )}
            {room.is_under_maintenance && (
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-warning/15 text-warning border border-warning/30">
                <Wrench className="h-3 w-3" />
                Under Maintenance
              </span>
            )}
          </div>
        }
        backHref={backHref}
        backLabel={backLabel}
        breadcrumbs={[
          { label: "Rooms", href: "/rooms" },
          { label: `Room ${room.room_number}` },
        ]}
        status={status.variant === "success" ? "active" : status.variant === "error" ? "inactive" : status.variant}
        avatar={
          <div className="p-3 bg-primary/10 rounded-lg">
            <Home className="h-8 w-8 text-primary" />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <PermissionGate permission="rooms.edit" hide>
              <Link href={`/rooms/${room.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            <PermissionGate permission="rooms.edit" hide>
              <Button variant="destructive" size="sm" onClick={handleDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </PermissionGate>
            {availableBeds > 0 && (
              <Link href={`/tenants/new?room=${room.id}`}>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Tenant
                </Button>
              </Link>
            )}
          </div>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          label="Status"
          value={status.label}
          icon={Home}
          variant={status.variant}
        />
        <InfoCard
          label="Occupancy"
          value={`${room.occupied_beds}/${room.total_beds} Beds`}
          icon={Bed}
          variant="default"
        />
        <InfoCard
          label="Rent"
          value={<Currency amount={room.rent_amount} />}
          icon={IndianRupee}
          variant="default"
        />
        <InfoCard
          label="Deposit"
          value={<Currency amount={room.deposit_amount || 0} />}
          icon={IndianRupee}
          variant="default"
        />
      </div>

      <DetailPageTemplate layoutKey="room-detail" entityType="room" record={room}>
        {/* Room Details */}
        <DetailSection
          title="Room Details"
          description="Configuration and amenities"
          icon={Home}
        >
          <FeatureGuard module="rooms" feature="roomTypeClassification">
            <InfoRow label="Room Type" value={<span className="capitalize">{room.room_type}</span>} />
          </FeatureGuard>
          <InfoRow
            label="Floor"
            value={room.floor === 0 ? "Ground Floor" : `Floor ${room.floor}`}
            icon={Layers}
          />
          <InfoRow label="Total Beds" value={room.total_beds} icon={Bed} />
          <InfoRow
            label="Available Beds"
            value={
              <span className={availableBeds > 0 ? "text-success" : "text-destructive"}>
                {availableBeds}
              </span>
            }
          />
          <FeatureGuard module="rooms" feature="amenityTracking">
            <div className="pt-2 mt-2 border-t">
              <p className="text-sm text-muted-foreground mb-3">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {room.has_ac && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-info/10 text-info rounded text-sm">
                    <Thermometer className="h-3 w-3" />
                    Air Conditioned
                  </span>
                )}
                {room.has_attached_bathroom && (
                  <span className="flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300 rounded text-sm">
                    <Bath className="h-3 w-3" />
                    Attached Bathroom
                  </span>
                )}
                {!room.has_ac && !room.has_attached_bathroom && (
                  <span className="text-muted-foreground text-sm">No special amenities</span>
                )}
              </div>
            </div>
          </FeatureGuard>
        </DetailSection>

        {/* Bed Capacity */}
        <FeatureGuard module="rooms" feature="bedCapacityTracking">
          <DetailSection
            title="Bed Capacity"
            description="Occupancy breakdown for this room"
            icon={Bed}
          >
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-card rounded-lg border">
                  <p className="text-2xl font-bold">{room.total_beds}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total</p>
                </div>
                <div className="p-3 bg-card rounded-lg border">
                  <p className="text-2xl font-bold text-destructive">{room.occupied_beds}</p>
                  <p className="text-xs text-muted-foreground mt-1">Occupied</p>
                </div>
                <div className="p-3 bg-card rounded-lg border">
                  <p className={`text-2xl font-bold ${availableBeds > 0 ? "text-success" : "text-muted-foreground"}`}>{availableBeds}</p>
                  <p className="text-xs text-muted-foreground mt-1">Available</p>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Occupancy</span>
                  <span className="font-medium">{room.total_beds > 0 ? Math.round((room.occupied_beds / room.total_beds) * 100) : 0}%</span>
                </div>
                <Progress
                  value={room.occupied_beds}
                  max={room.total_beds}
                  className={`h-3 ${room.occupied_beds === room.total_beds ? "[&>div]:bg-destructive" : availableBeds <= 1 ? "[&>div]:bg-warning" : "[&>div]:bg-success"}`}
                />
              </div>
            </div>
          </DetailSection>
        </FeatureGuard>

        {/* Room Status */}
        <DetailSection
          title="Room Status"
          description="Update room availability"
          icon={Home}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Button
              variant={room.status === "available" ? "default" : "outline"}
              className="justify-start"
              onClick={() => handleStatusChange("available")}
              disabled={isSaving}
            >
              <div className="h-2 w-2 rounded-full bg-success mr-2" />
              Available
            </Button>
            <Button
              variant={room.status === "occupied" ? "default" : "outline"}
              className="justify-start"
              onClick={() => handleStatusChange("occupied")}
              disabled={isSaving}
            >
              <div className="h-2 w-2 rounded-full bg-destructive mr-2" />
              Occupied
            </Button>
            <Button
              variant={room.status === "partially_occupied" ? "default" : "outline"}
              className="justify-start"
              onClick={() => handleStatusChange("partially_occupied")}
              disabled={isSaving}
            >
              <div className="h-2 w-2 rounded-full bg-warning mr-2" />
              Partial
            </Button>
            <Button
              variant={room.status === "maintenance" ? "default" : "outline"}
              className="justify-start"
              onClick={() => handleStatusChange("maintenance")}
              disabled={isSaving}
            >
              <div className="h-2 w-2 rounded-full bg-gray-500 mr-2" />
              Maintenance
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Note: Status is automatically updated when tenants are added or removed.
          </p>
        </DetailSection>

        {/* Maintenance Mode */}
        <FeatureGuard module="properties" feature="maintenanceMode">
          <DetailSection
            title="Maintenance Mode"
            description="Mark room as under maintenance to block new tenant assignments"
            icon={Wrench}
            className={room.is_under_maintenance ? "border-warning/30 bg-warning/5" : undefined}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">
                    {room.is_under_maintenance ? "Under Maintenance" : "Available for Booking"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {room.is_under_maintenance
                      ? "New tenants cannot be assigned until maintenance is resolved"
                      : "Room is accepting new tenant assignments"}
                  </p>
                </div>
                <PermissionGate permission="rooms.edit" hide>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMaintenanceToggle}
                    disabled={togglingMaintenance}
                    className={room.is_under_maintenance ? "border-warning text-warning hover:bg-warning/10" : ""}
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    {togglingMaintenance
                      ? "Updating..."
                      : room.is_under_maintenance
                      ? "Disable Maintenance"
                      : "Enable Maintenance"}
                  </Button>
                </PermissionGate>
              </div>
              {room.is_under_maintenance && room.maintenance_notes && (
                <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <p className="text-sm text-warning font-medium mb-1">Maintenance Notes</p>
                  <p className="text-sm text-muted-foreground">{room.maintenance_notes}</p>
                </div>
              )}
              {!room.is_under_maintenance && (
                <div className="space-y-2">
                  <Label htmlFor="maintenance_notes" className="text-sm">
                    Maintenance Notes (optional)
                  </Label>
                  <Input
                    id="maintenance_notes"
                    placeholder="Describe the maintenance work..."
                    value={maintenanceNotes}
                    onChange={(e) => setMaintenanceNotes(e.target.value)}
                    disabled={togglingMaintenance}
                  />
                </div>
              )}
            </div>
          </DetailSection>
        </FeatureGuard>

        {/* Current Tenants */}
        <DetailListSection
          title="Current Tenants"
          description={`${tenants.length} tenant(s) in this room`}
          icon={Users}
          items={tenants}
          keyExtractor={(tenant, _idx) => tenant.id}
          renderItem={(tenant) => (
            <Link href={`/tenants/${tenant.id}`}>
              <div className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow mb-2 last:mb-0">
                <div className="flex items-center gap-3">
                  <Avatar name={tenant.name} src={tenant.person?.photo_url || tenant.profile_photo || tenant.photo_url} size="md" />
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
                    <StatusBadge status="warning" label="On Notice" size="sm" />
                  )}
                </div>
              </div>
            </Link>
          )}
          initialLimit={5}
          viewAllHref={`/rooms/${room.id}/tenants`}
          viewAllMode="auto"
          emptyIcon={Users}
          emptyText="No tenants in this room"
          emptyAction={availableBeds > 0 ? { label: "Add First Tenant", href: `/tenants/new?room=${room.id}` } : undefined}
          actions={
            availableBeds > 0 && (
              <Link href={`/tenants/new?room=${room.id}`}>
                <Button size="sm">
                  <Plus className="mr-1 h-3 w-3" />
                  Add Tenant
                </Button>
              </Link>
            )
          }
        />

        {/* Assigned Meters */}
        <FeatureGuard module="meters" feature="perRoomMetering">
          <DetailListSection
            title="Meter Assignment"
            description={`${meterAssignments.length} meter(s) assigned to this room`}
            icon={Gauge}
            items={meterAssignments.filter(a => a.meter)}
            keyExtractor={(assignment, _idx) => assignment.id}
            renderItem={(assignment) => {
              if (!assignment.meter) return null
              const typeConfig = METER_TYPE_CONFIG[assignment.meter.meter_type as keyof typeof METER_TYPE_CONFIG] || METER_TYPE_CONFIG.electricity
              const meterStatusConfig = METER_STATUS_CONFIG[assignment.meter.status as keyof typeof METER_STATUS_CONFIG] || METER_STATUS_CONFIG.active
              const TypeIcon = meterTypeConfig[assignment.meter.meter_type]?.icon || Gauge
              return (
                <Link href={`/meters/${assignment.meter.id}`}>
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow mb-2 last:mb-0">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${typeConfig.bgColor}`}>
                        <TypeIcon className={`h-4 w-4 ${typeConfig.color}`} />
                      </div>
                      <div>
                        <p className="font-medium">{assignment.meter.meter_number}</p>
                        <p className="text-sm text-muted-foreground capitalize">{typeConfig.label}</p>
                        <p className="text-xs text-muted-foreground">Since {formatDate(assignment.start_date)}</p>
                      </div>
                    </div>
                    <StatusBadge variant={meterStatusConfig.variant} label={meterStatusConfig.label} />
                  </div>
                </Link>
              )
            }}
            initialLimit={4}
            viewAllHref="/meters"
            viewAllMode="auto"
            emptyIcon={Gauge}
            emptyText="No meters assigned to this room"
            emptyAction={{ label: "Add First Meter", href: `/meters/new?property_id=${room.property?.id}&room_id=${room.id}` }}
            actions={
              <Link href={`/meters/new?property_id=${room.property?.id}&room_id=${room.id}`}>
                <Button size="sm">
                  <Plus className="mr-1 h-3 w-3" />
                  Add Meter
                </Button>
              </Link>
            }
          />
        </FeatureGuard>

        {/* Meter Readings */}
        <DetailListSection
          title="Meter Readings"
          description="Recent readings"
          icon={Gauge}
          items={meterReadings}
          keyExtractor={(reading, _idx) => reading.id}
          renderItem={(reading) => {
            const meterType = reading.meter?.meter_type || "electricity"
            const config = meterTypeConfig[meterType] || meterTypeConfig.electricity
            const Icon = config.icon
            return (
              <Link href={`/meter-readings/${reading.id}`}>
                <div className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow mb-2 last:mb-0">
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
                    <p className="font-semibold tabular-nums">{formatNumber(reading.reading_value)}</p>
                    {reading.units_consumed !== null && (
                      <p className="text-xs text-warning">+{reading.units_consumed} units</p>
                    )}
                  </div>
                </div>
              </Link>
            )
          }}
          initialLimit={5}
          viewAllHref={`/rooms/${room.id}/meter-readings`}
          viewAllMode="auto"
          emptyIcon={Gauge}
          emptyText="No meter readings recorded"
          emptyAction={{ label: "Record First Reading", href: `/meter-readings/new?room=${room.id}` }}
          actions={
            <Link href={`/meter-readings/new?room=${room.id}`}>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Record Reading
              </Button>
            </Link>
          }
        />

        {/* Recent Complaints */}
        <DetailListSection
          title="Recent Complaints"
          description="Issues reported for this room"
          icon={MessageSquare}
          items={complaints}
          keyExtractor={(complaint, _idx) => complaint.id}
          renderItem={(complaint) => (
            <Link href={`/complaints/${complaint.id}`}>
              <div className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow mb-2 last:mb-0">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{complaint.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {complaint.tenant?.name} • {formatDate(complaint.created_at)}
                  </p>
                </div>
                <StatusBadge
                  status={
                    complaint.status === "open" ? "error" :
                    complaint.status === "in_progress" ? "warning" : "success"
                  }
                  label={complaint.status.replace("_", " ")}
                  size="sm"
                />
              </div>
            </Link>
          )}
          initialLimit={5}
          viewAllHref={`/complaints?room=${room.id}`}
          viewAllMode="auto"
          emptyIcon={MessageSquare}
          emptyText="No complaints for this room"
        />

      </DetailPageTemplate>

      {ConfirmDialogElement}
    </div>
  )
}
