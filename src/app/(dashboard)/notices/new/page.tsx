"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, FormField } from "@/components/ui/form-components"
import { requiredField } from "@/lib/validation"
import { NOTICE_TYPE_DISPLAY_CONFIG, NOTICE_AUDIENCE_OPTIONS } from "@/lib/status"
import {
  Bell,
  Loader2,
  Building2,
  Megaphone,
  Users,
  Library,
  Clock,
} from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading"
import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { withCreatedBy } from "@/lib/audit"
import { useFeatures } from "@/lib/features/use-features"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import type { PropertyOption } from "@/types/properties.types"
import { DetailHero, DetailSection, EmptyState } from "@/components/ui"
import { getNowISO } from "@/lib/date-helpers"

interface LibraryItem {
  id: string
  name: string
}

interface Room {
  id: string
  room_number: string
  entity_id: string
}

const NOTICE_TYPE_DESCRIPTIONS: Record<string, string> = {
  general: "General announcements",
  maintenance: "Scheduled maintenance",
  payment_reminder: "Payment due reminders",
  emergency: "Urgent notifications",
}

const noticeTypes = Object.entries(NOTICE_TYPE_DISPLAY_CONFIG).map(([value, cfg]) => ({
  value,
  label: cfg.label,
  description: NOTICE_TYPE_DESCRIPTIONS[value] ?? "",
  icon: cfg.icon,
  color: cfg.color,
}))

const AUDIENCE_DESCRIPTIONS: Record<string, string> = {
  all: "Everyone in the property",
  tenants_only: "Only registered tenants",
  specific_rooms: "Select specific rooms",
}

const audiences = NOTICE_AUDIENCE_OPTIONS.map((opt) => ({
  ...opt,
  description: AUDIENCE_DESCRIPTIONS[opt.value] ?? "",
}))

function NewNoticeContent() {
  const { isFeatureEnabled } = useFeatures()
  const [loadingData, setLoadingData] = useState(true)
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [libraries, setLibraries] = useState<LibraryItem[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [scheduleForLater, setScheduleForLater] = useState(false)

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
      entity_id: "",
      type: "general",
      target_audience: "all",
      title: "",
      content: "",
      expires_at: "",
      scheduled_at: "",
      is_active: true as boolean,
      is_published: true as boolean,
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
    transform: (data, userId) => {
      const isScheduled = scheduleForLater && !!data.scheduled_at
      return withCreatedBy({
        owner_id: userId,
        entity_id: data.entity_id || null,
        type: data.type,
        target_audience: data.target_audience,
        target_rooms: data.target_audience === "specific_rooms" ? selectedRooms : null,
        title: data.title,
        content: data.content,
        expires_at: data.expires_at || null,
        scheduled_at: isScheduled ? new Date(data.scheduled_at as string).toISOString() : null,
        is_active: data.is_active,
        is_published: !isScheduled,
      }, userId) as unknown as Record<string, unknown>
    },
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [propertiesRes, roomsRes, librariesRes] = await Promise.all([
        supabase.from("entities").select("id, name").eq("type", "pg").is("deleted_at", null).order("name"),
        supabase.from("rooms").select("id, room_number, entity_id").is("deleted_at", null).order("room_number"),
        supabase.from("entities").select("id, name").eq("type", "library").is("deleted_at", null).order("name"),
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
    if (formData.entity_id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilteredRooms(rooms.filter((r) => r.entity_id === formData.entity_id))
    } else {
      setFilteredRooms([])
    }
    setSelectedRooms([])
  }, [formData.entity_id, rooms])

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
        newData.entity_id = ""
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
      <DetailHero
        title="New Announcement"
        subtitle="Create an announcement for tenants and members"
        backHref="/notices"
        backLabel="All Notices"
        icon={Megaphone}
        breadcrumbs={[
          { label: "Notices", href: "/notices" },
          { label: "Add Notice" },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Notice Type */}
        <DetailSection title="Notice Type" description="Select the type of notice" icon={Bell}>
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
        </DetailSection>

        {/* Target Audience */}
        <DetailSection title="Target Audience" description="Who should see this notice?" icon={Users}>
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
            <FormField label="Property" htmlFor="entity_id" required>
              <Select
                id="entity_id"
                name="entity_id"
                value={formData.entity_id as string}
                onChange={handleFormChange}
                disabled={saving}
                required
                placeholder="Select Property"
                options={properties.map((property) => ({
                  value: property.id,
                  label: property.name,
                }))}
              />
            </FormField>
          )}

          {/* Library Selection */}
          {formData.entity_type === "library" && (
            <FormField label="Library" htmlFor="entity_id" required>
              <Select
                id="entity_id"
                name="entity_id"
                value={formData.entity_id as string}
                onChange={handleFormChange}
                disabled={saving}
                required
                placeholder="Select Library"
                options={libraries.map((library) => ({
                  value: library.id,
                  label: library.name,
                }))}
              />
            </FormField>
          )}

          {formData.entity_type === "all" && libraries.length === 0 && (
            <FormField label="Property" htmlFor="entity_id" hint="Leave empty to send to all properties">
              <Select
                id="entity_id"
                name="entity_id"
                value={formData.entity_id as string}
                onChange={handleFormChange}
                disabled={saving}
                placeholder="All Properties"
                options={properties.map((property) => ({
                  value: property.id,
                  label: property.name,
                }))}
              />
            </FormField>
          )}

          <div className="space-y-2">
            <Label>Audience</Label>
            <div className="space-y-2">
              {audiences.map((audience) => {
                const featureKey = audience.value === "specific_rooms" ? "targetedNotices" : "broadcastNotices"
                if (!isFeatureEnabled("notices", featureKey)) return null
                return (
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
                )
              })}
            </div>
          </div>

          {/* Room Selection - only for property */}
          <FeatureGuard module="notices" feature="targetedNotices">
          {formData.entity_type === "property" && formData.target_audience === "specific_rooms" && formData.entity_id && (
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
                <EmptyState variant="minimal" icon={Building2} title="No rooms found for this property" />
              )}
            </div>
          )}

          {formData.entity_type === "property" && formData.target_audience === "specific_rooms" && !formData.entity_id && (
            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              Please select a property first to choose specific rooms
            </p>
          )}
          </FeatureGuard>

          {formData.entity_type === "library" && (
            <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
              This notice will be visible to all members of the selected library
            </p>
          )}
        </DetailSection>

        {/* Notice Content */}
        <DetailSection title="Notice Content" description="Write your announcement" icon={Megaphone}>
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
            <Textarea
              id="content"
              name="content"
              placeholder="Write your notice content here..."
              value={formData.content as string}
              onChange={handleChange}
              onBlur={() => validateField("content")}
              disabled={saving}
              rows={6}
              className="resize-none"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Expires On" htmlFor="expires_at" hint="Leave empty for no expiration">
              <DatePicker
                id="expires_at"
                value={formData.expires_at as string}
                onChange={(val) => setFormData((prev) => ({ ...prev, expires_at: val }))}
                disabled={saving}
                placeholder="Pick a date"
              />
            </FormField>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-2 h-10">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active as boolean}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked === true }))}
                  disabled={saving}
                />
                <Label htmlFor="is_active" className="text-sm cursor-pointer">
                  Publish immediately
                </Label>
              </div>
            </div>
          </div>

          <FeatureGuard module="notices" feature="noticeScheduling">
            <div className="pt-4 border-t space-y-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="schedule_for_later"
                  checked={scheduleForLater}
                  onCheckedChange={(checked) => {
                    setScheduleForLater(checked as boolean)
                    if (!checked) {
                      setFormData((prev) => ({ ...prev, scheduled_at: "" }))
                    }
                  }}
                  disabled={saving}
                />
                <label htmlFor="schedule_for_later" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  Schedule for later
                </label>
              </div>
              {scheduleForLater && (
                <FormField label="Publish At" htmlFor="scheduled_at" hint="Notice will be published at this date and time">
                  <Input
                    id="scheduled_at"
                    name="scheduled_at"
                    type="datetime-local"
                    value={formData.scheduled_at as string}
                    onChange={handleChange}
                    disabled={saving}
                    min={getNowISO().slice(0, 16)}
                  />
                </FormField>
              )}
              {scheduleForLater && (
                <p className="text-xs text-muted-foreground p-2 bg-info/10 rounded-lg">
                  Notice will not be visible until the scheduled time. The cron job checks every 15 minutes.
                </p>
              )}
            </div>
          </FeatureGuard>
        </DetailSection>

        <div className="flex justify-end gap-3">
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
