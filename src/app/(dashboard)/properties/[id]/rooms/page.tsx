"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { PermissionGuard } from "@/components/auth"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column } from "@/components/ui/data-table"
import { StatusBadge } from "@/components/ui/status-badge"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"
import { Button } from "@/components/ui/button"
import { Home, Plus, ArrowLeft, Building2 } from "lucide-react"

interface Room {
  id: string
  room_number: string
  floor: number | null
  room_type: string
  total_beds: number
  occupied_beds: number
  rent_amount: number
  status: string
}

interface Property {
  id: string
  name: string
  address: string
  type: string
}

export default function PropertyRoomsPage() {
  const params = useParams()
  const propertyId = params.id as string
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [property, setProperty] = useState<Property | null>(null)
  const [rooms, setRooms] = useState<Room[]>([])

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return
      const supabase = createClient()

      // Fetch property details
      const { data: propertyData } = await supabase
        .from("properties")
        .select("id, name, address, type")
        .eq("id", propertyId)
        .single()

      if (propertyData) {
        setProperty(propertyData)
      }

      // Fetch rooms in this property
      const { data: roomsData } = await supabase
        .from("rooms")
        .select("id, room_number, floor, room_type, total_beds, occupied_beds, rent_amount, status")
        .eq("property_id", propertyId)
        .order("room_number", { ascending: true })

      if (roomsData) {
        setRooms(roomsData)
      }

      setLoading(false)
    }

    fetchData()
  }, [user, propertyId])

  const totalBeds = rooms.reduce((sum, r) => sum + r.total_beds, 0)
  const occupiedBeds = rooms.reduce((sum, r) => sum + r.occupied_beds, 0)
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0

  const columns: Column<Room>[] = [
    {
      key: "room_number",
      header: "Room",
      render: (room) => (
        <Link href={`/rooms/${room.id}`} className="font-medium text-teal-600 hover:underline">
          {room.room_number}
        </Link>
      )
    },
    {
      key: "floor",
      header: "Floor",
      render: (room) => room.floor !== null ? `Floor ${room.floor}` : "-"
    },
    {
      key: "room_type",
      header: "Type",
      render: (room) => <span className="capitalize">{room.room_type.replace(/_/g, ' ')}</span>
    },
    {
      key: "occupancy",
      header: "Occupancy",
      render: (room) => (
        <span className={room.occupied_beds >= room.total_beds ? "text-amber-600" : "text-emerald-600"}>
          {room.occupied_beds}/{room.total_beds} beds
        </span>
      )
    },
    {
      key: "rent_amount",
      header: "Rent",
      render: (room) => <Currency amount={room.rent_amount} />
    },
    {
      key: "status",
      header: "Status",
      render: (room) => <StatusBadge status={room.status} />
    },
    {
      key: "actions",
      header: "",
      render: (room) => (
        <Link href={`/rooms/${room.id}/tenants`}>
          <Button variant="ghost" size="sm">View Tenants</Button>
        </Link>
      )
    }
  ]

  if (loading) return <PageLoading />

  if (!property) {
    return (
      <EmptyState
        icon={Building2}
        title="Property not found"
        description="The property you're looking for doesn't exist."
        action={{ label: "Back to Properties", href: "/properties" }}
      />
    )
  }

  return (
    <PermissionGuard permission="rooms.view">
      <div className="space-y-6">
        <PageHeader
          title={`Rooms in ${property.name}`}
          description={`${rooms.length} rooms • ${occupiedBeds}/${totalBeds} beds occupied (${occupancyRate}%)`}
          icon={Home}
          breadcrumbs={[
            { label: "Properties", href: "/properties" },
            { label: property.name, href: `/properties/${propertyId}` },
            { label: "Rooms" }
          ]}
          actions={
            <div className="flex gap-2">
              <Link href={`/properties/${propertyId}`}>
                <Button variant="outline" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Property
                </Button>
              </Link>
              <Link href={`/rooms/new?property_id=${propertyId}`}>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Room
                </Button>
              </Link>
            </div>
          }
        />

        {rooms.length === 0 ? (
          <EmptyState
            icon={Home}
            title="No rooms yet"
            description={`${property.name} has no rooms configured.`}
            action={{ label: "Add Room", href: `/rooms/new?property_id=${propertyId}` }}
          />
        ) : (
          <DataTable
            data={rooms}
            columns={columns}
            keyField="id"
            searchable
            searchFields={["room_number", "room_type"]}
            searchPlaceholder="Search rooms..."
          />
        )}
      </div>
    </PermissionGuard>
  )
}
