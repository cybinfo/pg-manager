"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useDetailPage, ROOM_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Room, RoomTenant, RoomMeterAssignment, RoomComplaint } from "@/types/rooms.types"
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
  MessageSquare,
} from "lucide-react"
import { formatCurrency, formatDate } from "@/lib/format"
import { Avatar } from "@/components/ui/avatar"
import { METER_TYPE_CONFIG, METER_STATUS_CONFIG } from "@/types/meters.types"

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

const meterTypeConfig: Record<string, { icon: typeof Zap; color: string; bgColor: string }> = {
  electricity: { icon: Zap, color: "text-yellow-700", bgColor: "bg-yellow-100" },
  water: { icon: Droplets, color: "text-blue-700", bgColor: "bg-blue-100" },
  gas: { icon: Gauge, color: "text-orange-700", bgColor: "bg-orange-100" },
}

const statusConfig: Record<string, { status: "success" | "error" | "warning" | "muted"; label: string }> = {
  available: { status: "success", label: "Available" },
  occupied: { status: "error", label: "Occupied" },
  partially_occupied: { status: "warning", label: "Partially Occupied" },
  maintenance: { status: "muted", label: "Maintenance" },
}

export default function RoomDetailPage() {
  const params = useParams()

  const {
    data: room,
    related,
    loading,
    updateField,
    isSaving,
  } = useDetailPage<Room>({
    config: ROOM_DETAIL_CONFIG,
    id: params.id as string,
  })

  const handleStatusChange = async (newStatus: string) => {
    await updateField("status", newStatus)
  }

  if (loading) {
    return <PageLoading message="Loading room details..." />
  }

  if (!room) {
    return null
  }

  const tenants = (related.tenants || []) as RoomTenant[]
  const meterAssignments = (related.meterAssignments || []) as RoomMeterAssignment[]
  const meterReadings = (related.meterReadings || []) as MeterReading[]
  const complaints = (related.complaints || []) as RoomComplaint[]

  const status = statusConfig[room.status] || statusConfig.available
  const availableBeds = room.total_beds - room.occupied_beds

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={`Room ${room.room_number}`}
        subtitle={
          room.property && (
            <Link href={`/properties/${room.property.id}`} className="flex items-center gap-1 text-muted-foreground hover:text-primary">
              <Building2 className="h-4 w-4" />
              {room.property.name}
            </Link>
          )
        }
        backHref="/rooms"
        backLabel="All Rooms"
        status={status.status === "success" ? "active" : status.status === "error" ? "inactive" : status.status}
        avatar={
          <div className="p-3 bg-primary/10 rounded-lg">
            <Home className="h-8 w-8 text-primary" />
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Link href={`/rooms/${room.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
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
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          label="Status"
          value={status.label}
          icon={Home}
          variant={status.status}
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

      <div className="grid md:grid-cols-2 gap-6">
        {/* Room Details */}
        <DetailSection
          title="Room Details"
          description="Configuration and amenities"
          icon={Home}
        >
          <InfoRow label="Room Type" value={<span className="capitalize">{room.room_type}</span>} />
          <InfoRow
            label="Floor"
            value={room.floor === 0 ? "Ground Floor" : `Floor ${room.floor}`}
            icon={Layers}
          />
          <InfoRow label="Total Beds" value={room.total_beds} icon={Bed} />
          <InfoRow
            label="Available Beds"
            value={
              <span className={availableBeds > 0 ? "text-green-600" : "text-red-600"}>
                {availableBeds}
              </span>
            }
          />
          <div className="pt-2 mt-2 border-t">
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
        </DetailSection>

        {/* Room Status */}
        <DetailSection
          title="Room Status"
          description="Update room availability"
          icon={Home}
        >
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant={room.status === "available" ? "default" : "outline"}
              className="justify-start"
              onClick={() => handleStatusChange("available")}
              disabled={isSaving}
            >
              <div className="h-2 w-2 rounded-full bg-green-500 mr-2" />
              Available
            </Button>
            <Button
              variant={room.status === "occupied" ? "default" : "outline"}
              className="justify-start"
              onClick={() => handleStatusChange("occupied")}
              disabled={isSaving}
            >
              <div className="h-2 w-2 rounded-full bg-red-500 mr-2" />
              Occupied
            </Button>
            <Button
              variant={room.status === "partially_occupied" ? "default" : "outline"}
              className="justify-start"
              onClick={() => handleStatusChange("partially_occupied")}
              disabled={isSaving}
            >
              <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2" />
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

        {/* Current Tenants */}
        <DetailSection
          title="Current Tenants"
          description={`${tenants.length} tenant(s) in this room`}
          icon={Users}
          className="md:col-span-2"
          actions={
            <div className="flex gap-2">
              <Link href={`/rooms/${room.id}/tenants`}>
                <Button variant="outline" size="sm">View All</Button>
              </Link>
              {availableBeds > 0 && (
                <Link href={`/tenants/new?room=${room.id}`}>
                  <Button size="sm">
                    <Plus className="mr-1 h-3 w-3" />
                    Add Tenant
                  </Button>
                </Link>
              )}
            </div>
          }
        >
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
              ))}
            </div>
          )}
        </DetailSection>

        {/* Assigned Meters */}
        <DetailSection
          title="Assigned Meters"
          description={`${meterAssignments.length} meter(s) assigned to this room`}
          icon={Gauge}
          className="md:col-span-2"
          actions={
            <div className="flex gap-2">
              <Link href="/meters">
                <Button variant="outline" size="sm">View All Meters</Button>
              </Link>
              <Link href={`/meters/new?property_id=${room.property?.id}&room_id=${room.id}`}>
                <Button size="sm">
                  <Plus className="mr-1 h-3 w-3" />
                  Add Meter
                </Button>
              </Link>
            </div>
          }
        >
          {meterAssignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Gauge className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No meters assigned to this room</p>
              <Link href={`/meters/new?property_id=${room.property?.id}&room_id=${room.id}`}>
                <Button variant="outline" size="sm" className="mt-3">
                  Add First Meter
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {meterAssignments.map((assignment) => {
                if (!assignment.meter) return null
                const typeConfig = METER_TYPE_CONFIG[assignment.meter.meter_type as keyof typeof METER_TYPE_CONFIG] || METER_TYPE_CONFIG.electricity
                const meterStatusConfig = METER_STATUS_CONFIG[assignment.meter.status as keyof typeof METER_STATUS_CONFIG] || METER_STATUS_CONFIG.active
                const TypeIcon = meterTypeConfig[assignment.meter.meter_type]?.icon || Gauge
                return (
                  <Link key={assignment.id} href={`/meters/${assignment.meter.id}`}>
                    <div className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${typeConfig.bgColor}`}>
                          <TypeIcon className={`h-4 w-4 ${typeConfig.color}`} />
                        </div>
                        <div>
                          <p className="font-medium">{assignment.meter.meter_number}</p>
                          <p className="text-sm text-muted-foreground">{typeConfig.label}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <StatusBadge variant={meterStatusConfig.variant} label={meterStatusConfig.label} />
                        <p className="text-xs text-muted-foreground mt-1">Since {formatDate(assignment.start_date)}</p>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </DetailSection>

        {/* Meter Readings */}
        <DetailSection
          title="Meter Readings"
          description="Recent electricity, water & gas readings"
          icon={Gauge}
          className="md:col-span-2"
          actions={
            <div className="flex gap-2">
              <Link href={`/rooms/${room.id}/meter-readings`}>
                <Button variant="outline" size="sm">View All</Button>
              </Link>
              <Link href={`/meter-readings/new?room=${room.id}`}>
                <Button size="sm">
                  <Plus className="mr-1 h-3 w-3" />
                  Record Reading
                </Button>
              </Link>
            </div>
          }
        >
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
                const meterType = reading.meter?.meter_type || "electricity"
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
        </DetailSection>

        {/* Recent Complaints */}
        <DetailSection
          title="Recent Complaints"
          description="Issues reported for this room"
          icon={MessageSquare}
          className="md:col-span-2"
          actions={
            <Link href={`/complaints?room=${room.id}`}>
              <Button variant="outline" size="sm">View All</Button>
            </Link>
          }
        >
          {complaints.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No complaints for this room</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {complaints.map((complaint) => (
                <Link key={complaint.id} href={`/complaints/${complaint.id}`}>
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:shadow-md transition-shadow">
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
              ))}
            </div>
          )}
        </DetailSection>
      </div>
    </div>
  )
}
