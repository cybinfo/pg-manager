"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
  Bell,
  Loader2,
  Building2,
  Megaphone,
  AlertTriangle,
  Wrench,
  CreditCard,
  Users,
  Calendar
} from "lucide-react"
import { toast } from "sonner"

interface Property {
  id: string
  name: string
}

interface Room {
  id: string
  room_number: string
  property_id: string
}

const noticeTypes = [
  { value: "general", label: "General", description: "General announcements", icon: Megaphone, color: "text-blue-600" },
  { value: "maintenance", label: "Maintenance", description: "Scheduled maintenance", icon: Wrench, color: "text-orange-600" },
  { value: "payment_reminder", label: "Payment Reminder", description: "Payment due reminders", icon: CreditCard, color: "text-green-600" },
  { value: "emergency", label: "Emergency", description: "Urgent notifications", icon: AlertTriangle, color: "text-red-600" },
]

const audiences = [
  { value: "all", label: "All Residents", description: "Everyone in the property" },
  { value: "tenants_only", label: "Tenants Only", description: "Only registered tenants" },
  { value: "specific_rooms", label: "Specific Rooms", description: "Select specific rooms" },
]

export default function NewNoticePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [properties, setProperties] = useState<Property[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])

  const [formData, setFormData] = useState({
    property_id: "",
    type: "general",
    target_audience: "all",
    title: "",
    content: "",
    expires_at: "",
    is_active: true,
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [propertiesRes, roomsRes] = await Promise.all([
        supabase.from("properties").select("id, name").order("name"),
        supabase.from("rooms").select("id, room_number, property_id").order("room_number"),
      ])

      if (propertiesRes.data) setProperties(propertiesRes.data)
      if (roomsRes.data) setRooms(roomsRes.data)

      setLoadingData(false)
    }

    fetchData()
  }, [])

  // Filter rooms when property changes
  useEffect(() => {
    if (formData.property_id) {
      setFilteredRooms(rooms.filter((r) => r.property_id === formData.property_id))
    } else {
      setFilteredRooms([])
    }
    setSelectedRooms([])
  }, [formData.property_id, rooms])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleRoomToggle = (roomId: string) => {
    setSelectedRooms((prev) =>
      prev.includes(roomId)
        ? prev.filter((id) => id !== roomId)
        : [...prev, roomId]
    )
  }

  const selectAllRooms = () => {
    if (selectedRooms.length === filteredRooms.length) {
      setSelectedRooms([])
    } else {
      setSelectedRooms(filteredRooms.map((r) => r.id))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title || !formData.content) {
      toast.error("Please fill in title and content")
      return
    }

    if (formData.target_audience === "specific_rooms" && selectedRooms.length === 0) {
      toast.error("Please select at least one room")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        toast.error("Session expired. Please login again.")
        router.push("/login")
        return
      }

      const { error } = await supabase.from("notices").insert({
        owner_id: user.id,
        property_id: formData.property_id || null,
        type: formData.type,
        target_audience: formData.target_audience,
        target_rooms: formData.target_audience === "specific_rooms" ? selectedRooms : null,
        title: formData.title,
        content: formData.content,
        expires_at: formData.expires_at || null,
        is_active: formData.is_active,
      })

      if (error) {
        console.error("Error creating notice:", error)
        toast.error(`Failed to create notice: ${error.message}`)
        return
      }

      toast.success("Notice created successfully")
      router.push("/dashboard/notices")
    } catch (error: any) {
      console.error("Error:", error)
      toast.error(error?.message || "Failed to create notice")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/notices">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">New Notice</h1>
          <p className="text-muted-foreground">Create an announcement for tenants</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Notice Type */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Notice Type</CardTitle>
                <CardDescription>Select the type of notice</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {noticeTypes.map((type) => {
                const Icon = type.icon
                const isSelected = formData.type === type.value
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, type: type.value }))}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-input hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${type.color}`} />
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{type.description}</p>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Target Audience */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Target Audience</CardTitle>
                <CardDescription>Who should see this notice?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="property_id">Property (Optional)</Label>
              <select
                id="property_id"
                name="property_id"
                value={formData.property_id}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                disabled={loading}
              >
                <option value="">All Properties</option>
                {properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Leave empty to send to all properties
              </p>
            </div>

            <div className="space-y-2">
              <Label>Audience</Label>
              <div className="space-y-2">
                {audiences.map((audience) => (
                  <button
                    key={audience.value}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, target_audience: audience.value }))}
                    className={`w-full p-3 rounded-lg border text-left transition-all ${
                      formData.target_audience === audience.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary"
                        : "border-input hover:border-primary/50"
                    }`}
                  >
                    <span className="font-medium text-sm">{audience.label}</span>
                    <p className="text-xs text-muted-foreground">{audience.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Room Selection */}
            {formData.target_audience === "specific_rooms" && formData.property_id && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Select Rooms</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAllRooms}
                  >
                    {selectedRooms.length === filteredRooms.length ? "Deselect All" : "Select All"}
                  </Button>
                </div>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
                  {filteredRooms.map((room) => (
                    <button
                      key={room.id}
                      type="button"
                      onClick={() => handleRoomToggle(room.id)}
                      className={`p-2 rounded text-sm font-medium transition-colors ${
                        selectedRooms.includes(room.id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-muted/80"
                      }`}
                    >
                      {room.room_number}
                    </button>
                  ))}
                </div>
                {filteredRooms.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No rooms found for this property
                  </p>
                )}
              </div>
            )}

            {formData.target_audience === "specific_rooms" && !formData.property_id && (
              <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                Please select a property first to choose specific rooms
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notice Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Megaphone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle>Notice Content</CardTitle>
                <CardDescription>Write your announcement</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Notice title"
                value={formData.title}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Content *</Label>
              <textarea
                id="content"
                name="content"
                placeholder="Write your notice content here..."
                value={formData.content}
                onChange={handleChange}
                required
                disabled={loading}
                rows={6}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expires_at">Expires On (Optional)</Label>
                <Input
                  id="expires_at"
                  name="expires_at"
                  type="date"
                  value={formData.expires_at}
                  onChange={handleChange}
                  disabled={loading}
                  min={new Date().toISOString().split("T")[0]}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for no expiration
                </p>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <div className="flex items-center gap-2 h-10">
                  <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-input"
                  />
                  <label htmlFor="is_active" className="text-sm">
                    Publish immediately
                  </label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/dashboard/notices">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Bell className="mr-2 h-4 w-4" />
                Create Notice
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
