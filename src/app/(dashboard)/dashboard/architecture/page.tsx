"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { PageHeader } from "@/components/ui/page-header"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { PermissionGuard } from "@/components/auth"
import {
  Building2, Home, Bed, Users, Loader2, ChevronRight,
  CheckCircle, XCircle, AlertCircle, ArrowLeft, User
} from "lucide-react"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"

interface Property {
  id: string
  name: string
  address: string
  total_rooms: number
  total_beds: number
  occupied_beds: number
}

interface Room {
  id: string
  room_number: string
  room_type: string
  floor: number
  total_beds: number
  occupied_beds: number
  rent_amount: number
  status: string
  property_id: string
}

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
  const [properties, setProperties] = useState<Property[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("properties")
  const [filter, setFilter] = useState<"all" | "available" | "occupied">("all")

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    // Fetch properties with aggregated room/bed counts
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
      const transformedProperties = (propertiesData || []).map(p => {
        const rooms = Array.isArray(p.rooms) ? p.rooms : []
        return {
          id: p.id,
          name: p.name,
          address: p.address || "",
          total_rooms: rooms.length,
          total_beds: rooms.reduce((sum: number, r: { total_beds: number }) => sum + (r.total_beds || 0), 0),
          occupied_beds: rooms.reduce((sum: number, r: { occupied_beds: number }) => sum + (r.occupied_beds || 0), 0),
        }
      })
      setProperties(transformedProperties)
    }

    // Fetch all rooms
    const { data: roomsData, error: roomsError } = await supabase
      .from("rooms")
      .select("id, room_number, room_type, floor, total_beds, occupied_beds, rent_amount, status, property_id")
      .order("floor")
      .order("room_number")

    if (!roomsError) {
      setRooms(roomsData || [])
    }

    // Fetch active tenants
    const { data: tenantsData, error: tenantsError } = await supabase
      .from("tenants")
      .select("id, name, phone, room_id, check_in_date")
      .eq("status", "active")

    if (!tenantsError) {
      setTenants(tenantsData || [])
    }

    setLoading(false)
  }

  const handlePropertyClick = (property: Property) => {
    setSelectedProperty(property)
    setSelectedRoom(null)
    setViewMode("rooms")
  }

  const handleRoomClick = (room: Room) => {
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

  // Get tenants for selected room
  const roomTenants = selectedRoom
    ? tenants.filter(t => t.room_id === selectedRoom.id)
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
    <PermissionGuard permission="properties.view">
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Property Architecture"
          description="Visual overview of all properties, rooms, and bed availability"
          icon={Building2}
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

        {/* Properties Grid */}
        {viewMode === "properties" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProperties.map(property => {
              const availableBeds = property.total_beds - property.occupied_beds
              const occupancy = property.total_beds > 0
                ? Math.round((property.occupied_beds / property.total_beds) * 100)
                : 0

              return (
                <Card
                  key={property.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md hover:border-primary/50",
                    availableBeds === 0 && "opacity-75"
                  )}
                  onClick={() => handlePropertyClick(property)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          availableBeds > 0 ? "bg-green-100" : "bg-rose-100"
                        )}>
                          <Building2 className={cn(
                            "h-5 w-5",
                            availableBeds > 0 ? "text-green-600" : "text-rose-600"
                          )} />
                        </div>
                        <div>
                          <CardTitle className="text-base">{property.name}</CardTitle>
                          <CardDescription className="text-xs truncate max-w-[200px]">
                            {property.address || "No address"}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge variant={availableBeds > 0 ? "default" : "secondary"}>
                        {availableBeds > 0 ? `${availableBeds} free` : "Full"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Home className="h-4 w-4" />
                          {property.total_rooms} rooms
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Bed className="h-4 w-4" />
                          {property.total_beds} beds
                        </span>
                      </div>
                      <span className="font-medium">{occupancy}%</span>
                    </div>
                    {/* Occupancy bar */}
                    <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full transition-all",
                          occupancy >= 90 ? "bg-rose-500" :
                          occupancy >= 70 ? "bg-amber-500" : "bg-green-500"
                        )}
                        style={{ width: `${occupancy}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {filteredProperties.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No properties match your filter</p>
              </div>
            )}
          </div>
        )}

        {/* Rooms Grid */}
        {viewMode === "rooms" && selectedProperty && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {filteredRooms.map(room => {
              const availableBeds = room.total_beds - room.occupied_beds
              const isFull = availableBeds === 0

              return (
                <Card
                  key={room.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md",
                    isFull ? "border-rose-200 bg-rose-50/50" : "border-green-200 bg-green-50/50 hover:border-green-400"
                  )}
                  onClick={() => handleRoomClick(room)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">{room.room_number}</span>
                      <Badge variant={isFull ? "destructive" : "default"} className="text-xs">
                        {availableBeds}/{room.total_beds}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mb-2">
                      Floor {room.floor} | {room.room_type}
                    </div>
                    <div className="flex gap-1 flex-wrap">
                      {Array.from({ length: room.total_beds }).map((_, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "w-6 h-6 rounded flex items-center justify-center",
                            idx < room.occupied_beds
                              ? "bg-rose-500 text-white"
                              : "bg-green-500 text-white"
                          )}
                        >
                          <Bed className="h-3 w-3" />
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs font-medium text-muted-foreground">
                      {formatCurrency(room.rent_amount)}/mo
                    </div>
                  </CardContent>
                </Card>
              )
            })}

            {filteredRooms.length === 0 && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No rooms match your filter</p>
              </div>
            )}
          </div>
        )}

        {/* Beds/Tenants View */}
        {viewMode === "beds" && selectedRoom && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Room {selectedRoom.room_number}</CardTitle>
                    <CardDescription>
                      Floor {selectedRoom.floor} | {selectedRoom.room_type} | {formatCurrency(selectedRoom.rent_amount)}/month
                    </CardDescription>
                  </div>
                  <Badge variant={selectedRoom.occupied_beds < selectedRoom.total_beds ? "default" : "destructive"}>
                    {selectedRoom.occupied_beds}/{selectedRoom.total_beds} beds occupied
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from({ length: selectedRoom.total_beds }).map((_, idx) => {
                    const tenant = roomTenants[idx]
                    const isOccupied = idx < roomTenants.length

                    return (
                      <Card
                        key={idx}
                        className={cn(
                          "relative",
                          isOccupied
                            ? "border-rose-200 bg-rose-50"
                            : "border-green-200 bg-green-50 border-dashed"
                        )}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "p-2 rounded-full",
                              isOccupied ? "bg-rose-100" : "bg-green-100"
                            )}>
                              {isOccupied ? (
                                <User className="h-5 w-5 text-rose-600" />
                              ) : (
                                <Bed className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                            <div>
                              <div className="font-medium text-sm">
                                Bed {idx + 1}
                              </div>
                              {isOccupied && tenant ? (
                                <div className="text-xs text-muted-foreground">
                                  {tenant.name}
                                </div>
                              ) : (
                                <div className="text-xs text-green-600 font-medium">
                                  Available
                                </div>
                              )}
                            </div>
                          </div>
                          {isOccupied && tenant && (
                            <div className="mt-3 pt-3 border-t text-xs text-muted-foreground">
                              <div>{tenant.phone}</div>
                              <div>Since: {new Date(tenant.check_in_date).toLocaleDateString()}</div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </PermissionGuard>
  )
}
