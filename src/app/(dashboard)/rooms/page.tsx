"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/page-header"
import { DataTable, Column, StatusDot, TableBadge } from "@/components/ui/data-table"
import { MetricsBar, MetricItem } from "@/components/ui/metrics-bar"
import { ListPageFilters, FilterConfig } from "@/components/ui/list-page-filters"
import { PermissionGuard } from "@/components/auth"
import { PageLoader } from "@/components/ui/page-loader"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Home,
  Plus,
  Bed,
  Building2,
  CheckCircle,
  AlertCircle,
  Layers,
  ChevronDown
} from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { toast } from "sonner"

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

interface Property {
  id: string
  name: string
}

// Group by options for rooms
const roomGroupByOptions = [
  { value: "property.name", label: "Property" },
  { value: "status", label: "Status" },
  { value: "room_type", label: "Room Type" },
  { value: "floor", label: "Floor" },
]

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [properties, setProperties] = useState<Property[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [groupDropdownOpen, setGroupDropdownOpen] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    // Fetch properties for filter
    const { data: propertiesData } = await supabase
      .from("properties")
      .select("id, name")
      .order("name")
    setProperties(propertiesData || [])

    // Fetch rooms
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
      toast.error("Failed to load rooms")
      setLoading(false)
      return
    }

    // Transform Supabase joins from arrays to objects
    const transformed = (data || []).map((room) => ({
      ...room,
      property: Array.isArray(room.property) ? room.property[0] : room.property,
    }))

    setRooms(transformed)
    setLoading(false)
  }

  const getStatusInfo = (status: string): { status: "success" | "warning" | "error" | "muted"; label: string } => {
    switch (status) {
      case "available":
        return { status: "success", label: "Available" }
      case "occupied":
        return { status: "error", label: "Occupied" }
      case "partially_occupied":
      case "partial": // Handle both old and new status values
        return { status: "warning", label: "Partial" }
      case "maintenance":
        return { status: "muted", label: "Maintenance" }
      default:
        return { status: "muted", label: status }
    }
  }

  // Get unique floors for filter
  const uniqueFloors = [...new Set(rooms.map(r => r.floor))].sort((a, b) => a - b)

  // Filter configuration
  const filterConfigs: FilterConfig[] = [
    {
      id: "property",
      label: "Property",
      type: "select",
      placeholder: "All Properties",
      options: properties.map(p => ({ value: p.id, label: p.name })),
    },
    {
      id: "status",
      label: "Status",
      type: "select",
      placeholder: "All Status",
      options: [
        { value: "available", label: "Available" },
        { value: "occupied", label: "Occupied" },
        { value: "partially_occupied", label: "Partially Occupied" },
        { value: "maintenance", label: "Maintenance" },
      ],
    },
    {
      id: "room_type",
      label: "Room Type",
      type: "select",
      placeholder: "All Types",
      options: [
        { value: "single", label: "Single" },
        { value: "double", label: "Double" },
        { value: "triple", label: "Triple" },
        { value: "dormitory", label: "Dormitory" },
      ],
    },
    {
      id: "floor",
      label: "Floor",
      type: "select",
      placeholder: "All Floors",
      options: uniqueFloors.map(f => ({ value: String(f), label: `Floor ${f}` })),
    },
  ]

  // Apply filters
  const filteredRooms = rooms.filter((room) => {
    if (filters.property && filters.property !== "all" && room.property?.id !== filters.property) {
      return false
    }
    if (filters.status && filters.status !== "all") {
      // Handle both 'partial' and 'partially_occupied' as equivalent
      const normalizedRoomStatus = room.status === "partial" ? "partially_occupied" : room.status
      if (normalizedRoomStatus !== filters.status) {
        return false
      }
    }
    if (filters.room_type && filters.room_type !== "all" && room.room_type !== filters.room_type) {
      return false
    }
    if (filters.floor && filters.floor !== "all" && room.floor !== parseInt(filters.floor)) {
      return false
    }
    return true
  })

  // Stats (based on all rooms)
  const totalBeds = rooms.reduce((sum, r) => sum + r.total_beds, 0)
  const occupiedBeds = rooms.reduce((sum, r) => sum + r.occupied_beds, 0)
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
      width: "primary",
      render: (room) => (
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-violet-100 flex items-center justify-center">
            <Home className="h-4 w-4 text-violet-600" />
          </div>
          <div>
            <div className="font-medium">Room {room.room_number}</div>
            {room.property && (
              <Link
                href={`/properties/${room.property.id}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs text-muted-foreground flex items-center gap-1 hover:text-primary transition-colors"
              >
                <Building2 className="h-3 w-3" />
                {room.property.name}
              </Link>
            )}
          </div>
        </div>
      ),
    },
    {
      key: "room_type",
      header: "Type",
      width: "badge",
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
      width: "count",
      render: (room) => (
        <span className="tabular-nums">{room.occupied_beds}/{room.total_beds}</span>
      ),
    },
    {
      key: "rent_amount",
      header: "Rent",
      width: "amount",
      render: (room) => (
        <span className="font-medium tabular-nums">{formatCurrency(room.rent_amount)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "status",
      render: (room) => {
        const info = getStatusInfo(room.status)
        return <StatusDot status={info.status} label={info.label} />
      },
    },
  ]

  if (loading) {
    return <PageLoader />
  }

  return (
    <PermissionGuard permission="rooms.view">
    <div className="space-y-6">
      <PageHeader
        title="Rooms"
        description="Manage rooms across all your properties"
        icon={Home}
        breadcrumbs={[{ label: "Rooms" }]}
        actions={
          <Link href="/rooms/new">
            <Button variant="gradient">
              <Plus className="mr-2 h-4 w-4" />
              Add Room
            </Button>
          </Link>
        }
      />

      {rooms.length > 0 && <MetricsBar items={metricsItems} />}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <ListPageFilters
            filters={filterConfigs}
            values={filters}
            onChange={(id, value) => setFilters(prev => ({ ...prev, [id]: value }))}
            onClear={() => setFilters({})}
          />
        </div>

        {/* Group By Multi-Select */}
        <div className="relative">
          <button
            onClick={() => setGroupDropdownOpen(!groupDropdownOpen)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm flex items-center gap-2 hover:bg-slate-50"
          >
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span>
              {selectedGroups.length === 0
                ? "Group by..."
                : selectedGroups.length === 1
                  ? roomGroupByOptions.find(o => o.value === selectedGroups[0])?.label
                  : `${selectedGroups.length} levels`}
            </span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${groupDropdownOpen ? "rotate-180" : ""}`} />
          </button>

          {groupDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setGroupDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-1 w-56 bg-white border rounded-lg shadow-lg z-20 py-1">
                <div className="px-3 py-2 border-b">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                    Group by (select order)
                  </p>
                </div>
                {roomGroupByOptions.map((opt) => {
                  const isSelected = selectedGroups.includes(opt.value)
                  const orderIndex = selectedGroups.indexOf(opt.value)

                  return (
                    <label
                      key={opt.value}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 cursor-pointer"
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedGroups([...selectedGroups, opt.value])
                          } else {
                            setSelectedGroups(selectedGroups.filter(v => v !== opt.value))
                          }
                        }}
                      />
                      <span className="text-sm flex-1">{opt.label}</span>
                      {isSelected && (
                        <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">
                          {orderIndex + 1}
                        </span>
                      )}
                    </label>
                  )
                })}
                {selectedGroups.length > 0 && (
                  <div className="border-t mt-1 pt-1 px-3 py-2">
                    <button
                      onClick={() => {
                        setSelectedGroups([])
                        setGroupDropdownOpen(false)
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Clear grouping
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredRooms}
        keyField="id"
        href={(room) => `/rooms/${room.id}`}
        searchable
        searchPlaceholder="Search by room number, property..."
        searchFields={["room_number"]}
        groupBy={selectedGroups.length > 0 ? selectedGroups.map(key => ({
          key,
          label: roomGroupByOptions.find(o => o.value === key)?.label
        })) : undefined}
        emptyState={
          <div className="flex flex-col items-center py-8">
            <Home className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No rooms found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {rooms.length === 0
                ? "Add rooms to your properties to start managing tenants"
                : "No rooms match your filters"}
            </p>
            {rooms.length === 0 && (
              <Link href="/rooms/new">
                <Button variant="gradient">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Room
                </Button>
              </Link>
            )}
          </div>
        }
      />
    </div>
    </PermissionGuard>
  )
}
