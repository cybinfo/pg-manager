"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column } from "@/components/ui/data-table"
import { PageLoader } from "@/components/ui/page-loader"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Gauge, Plus, ArrowLeft, Home, Zap, Droplets, Calendar } from "lucide-react"
import { formatDate } from "@/lib/format"

interface MeterReading {
  id: string
  reading_date: string
  reading_value: number
  previous_reading: number | null
  units_consumed: number | null
  notes: string | null
  charge_type: { id: string; name: string } | null
}

interface Room {
  id: string
  room_number: string
  room_type: string
  property: { id: string; name: string } | null
}

const meterTypeConfig: Record<string, { icon: typeof Zap; color: string; bgColor: string; unit: string }> = {
  electricity: { icon: Zap, color: "text-yellow-700", bgColor: "bg-yellow-100", unit: "kWh" },
  water: { icon: Droplets, color: "text-blue-700", bgColor: "bg-blue-100", unit: "L" },
  gas: { icon: Gauge, color: "text-orange-700", bgColor: "bg-orange-100", unit: "m³" },
}

export default function RoomMeterReadingsPage() {
  const params = useParams()
  const roomId = params.id as string

  const [loading, setLoading] = useState(true)
  const [room, setRoom] = useState<Room | null>(null)
  const [readings, setReadings] = useState<MeterReading[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch room details
      const { data: roomData } = await supabase
        .from("rooms")
        .select(`
          id, room_number, room_type,
          property:properties(id, name)
        `)
        .eq("id", roomId)
        .single()

      if (roomData) {
        const r = roomData as {
          id: string; room_number: string; room_type: string;
          property: { id: string; name: string }[] | null
        }
        setRoom({
          ...r,
          property: Array.isArray(r.property) ? r.property[0] : r.property
        })
      }

      // Fetch meter readings for this room
      const { data: readingsData } = await supabase
        .from("meter_readings")
        .select(`
          id, reading_date, reading_value, previous_reading, units_consumed, notes,
          charge_type:charge_types(id, name)
        `)
        .eq("room_id", roomId)
        .order("reading_date", { ascending: false })

      if (readingsData) {
        const transformed = readingsData.map((r: {
          id: string; reading_date: string; reading_value: number;
          previous_reading: number | null; units_consumed: number | null; notes: string | null;
          charge_type: { id: string; name: string }[] | { id: string; name: string } | null
        }) => ({
          ...r,
          charge_type: Array.isArray(r.charge_type) ? r.charge_type[0] : r.charge_type
        }))
        setReadings(transformed)
      }

      setLoading(false)
    }

    fetchData()
  }, [roomId])

  const columns: Column<MeterReading>[] = [
    {
      key: "type",
      header: "Type",
      width: "primary",
      render: (row) => {
        const meterType = row.charge_type?.name?.toLowerCase() || "electricity"
        const config = meterTypeConfig[meterType] || meterTypeConfig.electricity
        const Icon = config.icon
        return (
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <Icon className={`h-4 w-4 ${config.color}`} />
            </div>
            <span className="font-medium capitalize">{meterType}</span>
          </div>
        )
      }
    },
    {
      key: "reading_value",
      header: "Reading",
      render: (row) => (
        <span className="font-semibold tabular-nums">{row.reading_value.toLocaleString()}</span>
      )
    },
    {
      key: "previous_reading",
      header: "Previous",
      render: (row) => (
        <span className="text-muted-foreground tabular-nums">
          {row.previous_reading?.toLocaleString() || "-"}
        </span>
      )
    },
    {
      key: "units_consumed",
      header: "Consumed",
      render: (row) => {
        if (row.units_consumed === null) return <span className="text-muted-foreground">-</span>
        return (
          <span className="font-medium text-orange-600">
            +{row.units_consumed.toLocaleString()}
          </span>
        )
      }
    },
    {
      key: "reading_date",
      header: "Date",
      render: (row) => (
        <div className="flex items-center gap-1 text-muted-foreground">
          <Calendar className="h-3 w-3" />
          {formatDate(row.reading_date)}
        </div>
      )
    },
  ]

  if (loading) return <PageLoader />

  if (!room) {
    return (
      <EmptyState
        icon={Home}
        title="Room not found"
        description="The room you're looking for doesn't exist."
        action={{ label: "Back to Rooms", href: "/rooms" }}
      />
    )
  }

  return (
    <FeatureGuard feature="meterReadings">
      <PermissionGuard permission="meter_readings.view">
        <div className="space-y-6">
          <PageHeader
            title={`Meter Readings - Room ${room.room_number}`}
            description={`${room.property?.name || ''} • ${room.room_type}`}
            icon={Gauge}
            breadcrumbs={[
              { label: "Rooms", href: "/rooms" },
              { label: `Room ${room.room_number}`, href: `/rooms/${roomId}` },
              { label: "Meter Readings" }
            ]}
            actions={
              <div className="flex gap-2">
                <Link href={`/rooms/${roomId}`}>
                  <Button variant="outline" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Room
                  </Button>
                </Link>
                <Link href={`/meter-readings/new?room=${roomId}`}>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Record Reading
                  </Button>
                </Link>
              </div>
            }
          />

          {readings.length === 0 ? (
            <EmptyState
              icon={Gauge}
              title="No meter readings"
              description={`Room ${room.room_number} has no meter readings recorded.`}
              action={{ label: "Record Reading", href: `/meter-readings/new?room=${roomId}` }}
            />
          ) : (
            <DataTable
              data={readings}
              columns={columns}
              keyField="id"
              href={(row) => `/meter-readings/${row.id}`}
              searchable
              searchFields={["notes"]}
              searchPlaceholder="Search readings..."
            />
          )}
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
