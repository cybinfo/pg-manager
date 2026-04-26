"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, FormField } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { requiredField } from "@/lib/validation"
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
  Library
} from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading"
import { getTodayISO } from "@/lib/date-helpers"
import { PermissionGuard } from "@/components/auth"

interface Property {
  id: string
  name: string
}

interface LibraryItem {
  id: string
  name: string
}

interface Room {
  id: string
  room_number: string
  property_id: string
}

const noticeTypes = [
  { value: "general", label: "General", description: "General announcements", icon: Megaphone, color: "text-info" },
  { value: "maintenance", label: "Maintenance", description: "Scheduled maintenance", icon: Wrench, color: "text-warning" },
  { value: "payment_reminder", label: "Payment Reminder", description: "Payment due reminders", icon: CreditCard, color: "text-success" },
  { value: "emergency", label: "Emergency", description: "Urgent notifications", icon: AlertTriangle, color: "text-destructive" },
]

const audiences = [
  { value: "all", label: "All Residents", description: "Everyone in the property" },
  { value: "tenants_only", label: "Tenants Only", description: "Only registered tenants" },
  { value: "specific_rooms", label: "Specific Rooms", description: "Select specific rooms" },
]

function NewNoticeContent() {
  const [loadingData, setLoadingData] = useState(true)
  const [properties, setProperties] = useState<Property[]>([])
  const [libraries, setLibraries] = useState<LibraryItem[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    saving,
    errors,
    validateField,
  } = useFormPage({
    table: "notices",
    initialData: {
      entity_type: "all" as string,
      property_id: "",
      library_id: "",
      type: "general",
      target_audience: "all",
      title: "",
      content: "",
      expires_at: "",
      is_active: true,
    },
    redirectTo: "/notices",
    successMessage: "Notice created successfully",
    errorMessage: "Failed to create notice",
    useCreatedBy: false,
    addOwnerId: false,
    validationSchema: {
      title: requiredField("Title"),
      content: requiredField("Content"),
    },
    validate: (data) => {
      if (data.target_audience === "specific_rooms" && selectedRooms.length === 0) {
        return "Please select at least one room"
      }
      return null
    },
    transform: (data, userId) => ({
      owner_id: userId,
      created_by: userId,
      property_id: data.entity_type === "property" ? data.property_id : null,
      library_id: data.entity_type === "library" ? data.library_id : null,
      type: data.type,
      target_audience: data.target_audience,
      target_rooms: data.target_audience === "specific_rooms" ? selectedRooms : null,
      title: data.title,
      content: data.content,
      expires_at: data.expires_at || null,
      is_active: data.is_active,
    }),
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [propertiesRes, roomsRes, librariesRes] = await Promise.all([
        supabase.from("properties").select("id, name").is("deleted_at", null).order("name"),
        supabase.from("rooms").select("id, room_number, property_id").is("deleted_at", null).order("room_number"),
        supabase.from("libraries").select("id, name").is("deleted_at", null).order("name"),
      ])

      if (propertiesRes.data) setProperties(propertiesRes.data)
      if (roomsRes.data) setRooms(roomsRes.data)
      if (librariesRes.data) setLibraries(librariesRes.data)

      setLoadingData(false)
    }

    fetchData()
  }, [])

  // Filter rooms when property changes
  useEffect(() => {
    if (formData.property_id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilteredRooms(rooms.filter((r) => r.property_id === formData.property_id))
    } else {
      setFilteredRooms([])
    }
    setSelectedRooms([])
  }, [formData.property_id, rooms])

  // Custom handleChange that resets dependent fields
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => {
      const newData = {
        ...prev,
        [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
      }

      // Reset dependent fields when entity_type changes
      if (name === "entity_type") {
        newData.property_id = ""
        newData.library_id = ""
        newData.target_audience = value === "library" ? "all" : prev.target_audience
      }

      return newData
    })
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

  if (loadingData) {
    return <PageSkeleton variant="form" />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/notices">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              <div className="p-2 bg-info/10 rounded-lg">
                <Users className="h-5 w-5 text-info" />
              </div>
              <div>
                <CardTitle>Target Audience</CardTitle>
                <CardDescription>Who should see this notice?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Entity Type Selection */}
            {libraries.length > 0 && (
              <div className="space-y-2">
                <Label>Notice For</Label>
                <div className="flex gap-3 flex-wrap">
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border rounded-lg hover:bg-muted/50">
                    <input
                      type="radio"
                      name="entity_type"
                      value="all"
                      checked={formData.entity_type === "all"}
                      onChange={handleFormChange}
                      className="h-4 w-4"
                    />
                    <Users className="h-4 w-4" />
                    <span className="text-sm">All</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border rounded-lg hover:bg-muted/50">
                    <input
                      type="radio"
                      name="entity_type"
                      value="property"
                      checked={formData.entity_type === "property"}
                      onChange={handleFormChange}
                      className="h-4 w-4"
                    />
                    <Building2 className="h-4 w-4" />
                    <span className="text-sm">Property/PG</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer px-3 py-2 border rounded-lg hover:bg-muted/50">
                    <input
                      type="radio"
                      name="entity_type"
                      value="library"
                      checked={formData.entity_type === "library"}
                      onChange={handleFormChange}
                      className="h-4 w-4"
                    />
                    <Library className="h-4 w-4" />
                    <span className="text-sm">Library</span>
                  </label>
                </div>
              </div>
            )}

            {/* Property Selection */}
            {formData.entity_type === "property" && (
              <div className="space-y-2">
                <Label htmlFor="property_id">Property *</Label>
                <Select
                  id="property_id"
                  name="property_id"
                  value={formData.property_id as string}
                  onChange={handleFormChange}
                  disabled={saving}
                  required
                  placeholder="Select Property"
                  options={properties.map((property) => ({
                    value: property.id,
                    label: property.name,
                  }))}
                />
              </div>
            )}

            {/* Library Selection */}
            {formData.entity_type === "library" && (
              <div className="space-y-2">
                <Label htmlFor="library_id">Library *</Label>
                <Select
                  id="library_id"
                  name="library_id"
                  value={formData.library_id as string}
                  onChange={handleFormChange}
                  disabled={saving}
                  required
                  placeholder="Select Library"
                  options={libraries.map((library) => ({
                    value: library.id,
                    label: library.name,
                  }))}
                />
              </div>
            )}

            {formData.entity_type === "all" && libraries.length === 0 && (
              <div className="space-y-2">
                <Label htmlFor="property_id">Property (Optional)</Label>
                <Select
                  id="property_id"
                  name="property_id"
                  value={formData.property_id as string}
                  onChange={handleFormChange}
                  disabled={saving}
                  placeholder="All Properties"
                  options={properties.map((property) => ({
                    value: property.id,
                    label: property.name,
                  }))}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty to send to all properties
                </p>
              </div>
            )}

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

            {/* Room Selection - only for property */}
            {formData.entity_type === "property" && formData.target_audience === "specific_rooms" && formData.property_id && (
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
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 border rounded-lg">
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

            {formData.entity_type === "property" && formData.target_audience === "specific_rooms" && !formData.property_id && (
              <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                Please select a property first to choose specific rooms
              </p>
            )}

            {formData.entity_type === "library" && (
              <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                This notice will be visible to all members of the selected library
              </p>
            )}
          </CardContent>
        </Card>

        {/* Notice Content */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Megaphone className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle>Notice Content</CardTitle>
                <CardDescription>Write your announcement</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField label="Title" htmlFor="title" required error={errors.title}>
              <Input
                id="title"
                name="title"
                placeholder="Notice title"
                value={formData.title as string}
                onChange={handleChange}
                onBlur={() => validateField("title")}
                disabled={saving}
              />
            </FormField>

            <FormField label="Content" htmlFor="content" required error={errors.content}>
              <textarea
                id="content"
                name="content"
                placeholder="Write your notice content here..."
                value={formData.content as string}
                onChange={handleChange}
                onBlur={() => validateField("content")}
                disabled={saving}
                rows={6}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
              />
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expires_at">Expires On (Optional)</Label>
                <Input
                  id="expires_at"
                  name="expires_at"
                  type="date"
                  value={formData.expires_at as string}
                  onChange={handleChange}
                  disabled={saving}
                  min={getTodayISO()}
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
                    checked={formData.is_active as boolean}
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
          <Link href="/notices">
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
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

export default function NewNoticePage() {
  return (
    <PermissionGuard permission="notices.create">
      <NewNoticeContent />
    </PermissionGuard>
  )
}
