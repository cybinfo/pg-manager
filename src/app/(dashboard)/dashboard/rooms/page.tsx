"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Home,
  Plus,
  Building2,
  Users,
  Pencil,
  Trash2,
  Loader2,
  Search,
  Bed,
  IndianRupee
} from "lucide-react"
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

const statusColors: Record<string, string> = {
  available: "bg-green-100 text-green-700",
  occupied: "bg-red-100 text-red-700",
  partially_occupied: "bg-yellow-100 text-yellow-700",
  maintenance: "bg-gray-100 text-gray-700",
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")

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
      toast.error("Failed to load rooms")
      setLoading(false)
      return
    }

    setRooms(data || [])
    setLoading(false)
  }

  const handleDelete = async (id: string, roomNumber: string) => {
    if (!confirm(`Are you sure you want to delete Room ${roomNumber}? This will also remove any tenant assignments.`)) {
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from("rooms").delete().eq("id", id)

    if (error) {
      console.error("Error deleting room:", error)
      toast.error("Failed to delete room. Make sure no tenants are assigned.")
      return
    }

    toast.success("Room deleted successfully")
    fetchRooms()
  }

  const filteredRooms = rooms.filter((room) =>
    room.room_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    room.property.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Rooms</h1>
          <p className="text-muted-foreground">
            Manage rooms across all your properties
          </p>
        </div>
        <Link href="/dashboard/rooms/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Room
          </Button>
        </Link>
      </div>

      {/* Search */}
      {rooms.length > 0 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search rooms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Rooms Grid */}
      {rooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Home className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No rooms yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Add rooms to your properties to start managing tenants
            </p>
            <Link href="/dashboard/rooms/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Room
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : filteredRooms.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No rooms found</h3>
            <p className="text-muted-foreground text-center">
              Try a different search term
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredRooms.map((room) => (
            <Card key={room.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Home className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Room {room.room_number}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        <Building2 className="h-3 w-3" />
                        {room.property.name}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Link href={`/dashboard/rooms/${room.id}/edit`}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(room.id, room.room_number)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[room.status] || statusColors.available}`}>
                      {room.status.replace("_", " ").replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                    <span className="text-sm text-muted-foreground capitalize">
                      {room.room_type}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-center gap-1.5">
                      <Bed className="h-4 w-4 text-muted-foreground" />
                      <span>{room.occupied_beds}/{room.total_beds} Beds</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <IndianRupee className="h-4 w-4 text-muted-foreground" />
                      <span>₹{room.rent_amount.toLocaleString("en-IN")}</span>
                    </div>
                  </div>

                  {/* Amenities */}
                  <div className="flex gap-2 flex-wrap">
                    {room.has_ac && (
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                        AC
                      </span>
                    )}
                    {room.has_attached_bathroom && (
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
                        Attached Bath
                      </span>
                    )}
                    {room.floor > 0 && (
                      <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                        Floor {room.floor}
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t">
                  <Link href={`/dashboard/rooms/${room.id}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
