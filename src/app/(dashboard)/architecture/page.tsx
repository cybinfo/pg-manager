"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { PermissionGuard, FeatureGuard } from "@/components/auth"
import {
  Building2, Home, Bed, Users, Loader2, ChevronRight,
  CheckCircle, XCircle, AlertCircle, ArrowLeft,
} from "lucide-react"
import { PropertyGrid, RoomGrid, BedView } from "./_components"
import type { ArchProperty } from "./_components"
import type { ArchRoom } from "./_components"

interface Tenant {
  id: string
  name: string
  phone: string
  room_id: string
  check_in_date: string
}

type ViewMode = "properties" | "rooms" | "beds"

export default function ArchitecturePage() {
  const [loading, setLoading] = useState(true)
  const [properties, setProperties] = useState<ArchProperty[]>([])
  const [rooms, setRooms] = useState<ArchRoom[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedProperty, setSelectedProperty] = useState<ArchProperty | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<ArchRoom | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("properties")
  const [filter, setFilter] = useState<"all" | "available" | "occupied">("all")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    const { data: propertiesData, error: propertiesError } = await supabase
      .from("properties")
      .select(`
        id, name, address,
        rooms(id, total_beds, occupied_beds)
      `)
      .order("name")

    if (propertiesError) {
      console.error("Error fetching properties:", propertiesError)
    } else {
      const transformedProperties = (propertiesData || []).map((p: { id: string; name: string; address?: string | null; rooms: unknown }) => {
        const pRooms = Array.isArray(p.rooms) ? p.rooms : []
        return {
          id: p.id,
          name: p.name,
          address: p.address || "",
          total_rooms: pRooms.length,
          total_beds: pRooms.reduce((sum: number, r: { total_beds: number }) => sum + (r.total_beds || 0), 0),
          occupied_beds: pRooms.reduce((sum: number, r: { occupied_beds: number }) => sum + (r.occupied_beds || 0), 0),
        }
      })
      setProperties(transformedProperties)
    }

    const { data: roomsData, error: roomsError } = await supabase
      .from("rooms")
      .select("id, room_number, room_type, floor, total_beds, occupied_beds, rent_amount, status, property_id")
      .order("floor")
      .order("room_number")

    if (!roomsError) {
      setRooms(roomsData || [])
    }

    const { data: tenantsData, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name, phone, room_id, check_in_date")
      .eq("status", "active")

    if (!tenantsError) {
      setTenants(tenantsData || [])
    }

    setLoading(false)
  }

  const handlePropertyClick = (property: ArchProperty) => {
    setSelectedProperty(property)
    setSelectedRoom(null)
    setViewMode("rooms")
  }

  const handleRoomClick = (room: ArchRoom) => {
    setSelectedRoom(room)
    setViewMode("beds")
  }

  const handleBack = () => {
    if (viewMode === "beds") {
      setSelectedRoom(null)
      setViewMode("rooms")
    } else if (viewMode === "rooms") {
      setSelectedProperty(null)
      setViewMode("properties")
    }
  }

  // Get rooms for selected property
  const propertyRooms = selectedProperty
    ? rooms.filter(r => r.property_id === selectedProperty.id)
    : []

  // Filter based on availability
  const filteredProperties = properties.filter(p => {
    if (filter === "all") return true
    if (filter === "available") return p.total_beds > p.occupied_beds
    if (filter === "occupied") return p.occupied_beds === p.total_beds
    return true
  })

  const filteredRooms = propertyRooms.filter(r => {
    if (filter === "all") return true
    if (filter === "available") return r.occupied_beds < r.total_beds
    if (filter === "occupied") return r.occupied_beds >= r.total_beds
    return true
  })

  // Calculate metrics
  const totalBeds = properties.reduce((sum, p) => sum + p.total_beds, 0)
  const occupiedBeds = properties.reduce((sum, p) => sum + p.occupied_beds, 0)
  const availableBeds = totalBeds - occupiedBeds
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0

  const metrics: MetricItem[] = [
    { label: "Properties", value: properties.length, icon: Building2 },
    { label: "Total Beds", value: totalBeds, icon: Bed },
    { label: "Occupied", value: occupiedBeds, icon: Users },
    { label: "Available", value: availableBeds, icon: CheckCircle },
    { label: "Occupancy", value: `${occupancyRate}%`, icon: AlertCircle },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <FeatureGuard feature="architectureView">
      <PermissionGuard permission="properties.view">
        <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Property Architecture"
          description="Visual overview of all properties, rooms, and bed availability"
          icon={Building2}
          breadcrumbs={[{ label: "Architecture" }]}
        />

        {/* Metrics */}
        <MetricsBar items={metrics} />

        {/* Breadcrumb & Filter */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Button
              variant={viewMode === "properties" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => { setSelectedProperty(null); setSelectedRoom(null); setViewMode("properties") }}
            >
              <Building2 className="h-4 w-4 mr-1" />
              Properties
            </Button>
            {selectedProperty && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant={viewMode === "rooms" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => { setSelectedRoom(null); setViewMode("rooms") }}
                >
                  <Home className="h-4 w-4 mr-1" />
                  {selectedProperty.name}
                </Button>
              </>
            )}
            {selectedRoom && (
              <>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Button variant="secondary" size="sm">
                  <Bed className="h-4 w-4 mr-1" />
                  Room {selectedRoom.room_number}
                </Button>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={filter === "all" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "available" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFilter("available")}
              className="text-green-600"
            >
              <CheckCircle className="h-4 w-4 mr-1" />
              Available
            </Button>
            <Button
              variant={filter === "occupied" ? "secondary" : "outline"}
              size="sm"
              onClick={() => setFilter("occupied")}
              className="text-rose-600"
            >
              <XCircle className="h-4 w-4 mr-1" />
              Full
            </Button>
          </div>
        </div>

        {/* Back Button for nested views */}
        {viewMode !== "properties" && (
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        )}

        {/* View Content */}
        {viewMode === "properties" && (
          <PropertyGrid
            properties={filteredProperties}
            onPropertyClick={handlePropertyClick}
          />
        )}

        {viewMode === "rooms" && selectedProperty && (
          <RoomGrid
            rooms={filteredRooms}
            onRoomClick={handleRoomClick}
          />
        )}

        {viewMode === "beds" && selectedRoom && (
          <BedView
            room={selectedRoom}
            tenants={tenants}
          />
        )}
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
