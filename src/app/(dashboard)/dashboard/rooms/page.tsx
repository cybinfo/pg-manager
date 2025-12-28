"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import {
  Home,
  Plus,
  Loader2,
  Bed,
  Building2,
  CheckCircle,
  AlertCircle
} from "lucide-react"

interface Room {
  id: string
  room_number: string
  room_type: string
  floor: number
  rent_amount: number
  deposit_amount: number
  total_beds: number
  occupied_beds: number
  status: string
  has_ac: boolean
  has_attached_bathroom: boolean
  property: {
    id: string
    name: string
  }
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    const supabase = createClient()

    const { data, error } = await supabase
      .from("rooms")
      .select(`
        *,
        property:properties(id, name)
      `)
      .order("property_id")
      .order("room_number")

    if (error) {
      console.error("Error fetching rooms:", error)
      setLoading(false)
      return
    }

    setRooms(data || [])
    setLoading(false)
  }

  const getStatusInfo = (status: string): { status: "success" | "warning" | "error" | "muted"; label: string } => {
    switch (status) {
      case "available":
        return { status: "success", label: "Available" }
      case "occupied":
        return { status: "error", label: "Occupied" }
      case "partially_occupied":
        return { status: "warning", label: "Partial" }
      case "maintenance":
        return { status: "muted", label: "Maintenance" }
      default:
        return { status: "muted", label: status }
    }
  }

  // Stats
  const totalBeds = rooms.reduce((sum, r) => sum + r.total_beds, 0)
  const occupiedBeds = rooms.reduce((sum, r) => sum + r.occupied_beds, 0)
  const availableBeds = totalBeds - occupiedBeds
  const availableRooms = rooms.filter(r => r.status === "available").length
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0

  const metricsItems: MetricItem[] = [
    { label: "Total Rooms", value: rooms.length, icon: Home },
    { label: "Available Rooms", value: availableRooms, icon: CheckCircle },
    { label: "Total Beds", value: totalBeds, icon: Bed },
    { label: "Occupied Beds", value: `${occupiedBeds} (${occupancyRate}%)`, icon: AlertCircle },
  ]

  const columns: Column<Room>[] = [
    {
      key: "room_number",
      header: "Room",
      width: "1.5fr",
      render: (room) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <Home className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <div className="font-medium">Room {room.room_number}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              {room.property.name}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "room_type",
      header: "Type",
      width: "100px",
      hideOnMobile: true,
      render: (room) => (
        <TableBadge variant="default">
          {room.room_type.charAt(0).toUpperCase() + room.room_type.slice(1)}
        </TableBadge>
      ),
    },
    {
      key: "beds",
      header: "Beds",
      width: "80px",
      render: (room) => (
        <span className="tabular-nums">{room.occupied_beds}/{room.total_beds}</span>
      ),
    },
    {
      key: "rent_amount",
      header: "Rent",
      width: "100px",
      render: (room) => (
        <span className="font-medium tabular-nums">₹{room.rent_amount.toLocaleString("en-IN")}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "100px",
      render: (room) => {
        const info = getStatusInfo(room.status)
        return <StatusDot status={info.status} label={info.label} />
      },
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rooms"
        description="Manage rooms across all your properties"
        icon={Home}
        actions={
          <Link href="/dashboard/rooms/new">
            <Button variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          </Link>
        }
      />

      {rooms.length > 0 && <MetricsBar items={metricsItems} />}

      <DataTable
        columns={columns}
        data={rooms}
        keyField="id"
        href={(room) => `/dashboard/rooms/${room.id}`}
        searchable
        searchPlaceholder="Search by room number, property..."
        searchFields={["room_number"]}
        emptyState={
          <div className="flex flex-col items-center py-8">
            <Home className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No rooms yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add rooms to your properties to start managing tenants
            </p>
            <Link href="/dashboard/rooms/new">
              <Button variant="gradient">
                <Plus className="mr-2 h-4 w-4" />
                Add Room
              </Button>
            </Link>
          </div>
        }
      />
    </div>
  )
}
