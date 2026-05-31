"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { useDetailPage, NOTICE_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { Label } from "@/components/ui/label"
import { Select, FormField } from "@/components/ui/form-components"
import {
  DetailHero,
  DetailSection,
  InfoRow,
  DetailPageTemplate,
  NotFoundState,
} from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Megaphone,
  Loader2,
  Calendar,
  Eye,
  EyeOff,
  Edit,
  Save,
  Trash2,
  Clock,
  FileText,
  Target,
} from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { getNowISO } from "@/lib/date-helpers"
import { formatDateTime } from "@/lib/format"
import { PermissionGate } from "@/components/auth"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import { Notice, NoticeType } from "@/types/notices.types"
import { NOTICE_AUDIENCE_OPTIONS, NOTICE_TYPE_DISPLAY_CONFIG } from "@/lib/status"
import type { PropertyOption } from "@/types/properties.types"

interface Room {
  id: string
  room_number: string
  entity_id: string
}

export default function NoticeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/notices", defaultLabel: "All Announcements" })
  const [rooms, setRooms] = useState<Room[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [formInitialized, setFormInitialized] = useState(false)

  const [formData, setFormData] = useState({
    entity_id: "",
    type: "general" as NoticeType,
    target_audience: "all",
    title: "",
    content: "",
    expires_at: "",
    is_active: true as boolean,
  })

  const {
    data: notice,
    loading,
    deleteRecord,
    updateField,
    isDeleting,
  } = useDetailPage<Notice>({
    config: NOTICE_DETAIL_CONFIG,
    id: params.id as string,
  })

  // Initialize form data when notice loads
  useEffect(() => {
    if (notice && !formInitialized) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFormData({
        entity_id: notice.entity_id || "",
        type: notice.type,
        target_audience: notice.target_audience,
        title: notice.title,
        content: notice.content,
        expires_at: notice.expires_at ? notice.expires_at.split("T")[0] : "",
        is_active: notice.is_active,
      })
      setSelectedRooms(notice.target_rooms || [])
      setFormInitialized(true)
    }
  }, [notice, formInitialized])

  // Fetch properties and rooms for form
  useEffect(() => {
    const fetchFormData = async () => {
      const supabase = createClient()

      const [propertiesRes, roomsRes] = await Promise.all([
        supabase.from("entities").select("id, name").eq("type", "pg").order("name"),
        supabase.from("rooms").select("id, room_number, entity_id").order("room_number"),
      ])

      if (propertiesRes.data) setProperties(propertiesRes.data)
      if (roomsRes.data) setRooms(roomsRes.data)
    }

    fetchFormData()
  }, [])

  // Filter rooms when property changes
  useEffect(() => {
    if (formData.entity_id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilteredRooms(rooms.filter((r) => r.entity_id === formData.entity_id))
    } else {
       
      setFilteredRooms([])
    }
  }, [formData.entity_id, rooms])

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

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      showError("Please fill in title and content")
      return
    }

    if (formData.target_audience === "specific_rooms" && selectedRooms.length === 0) {
      showError("Please select at least one room")
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("notices")
        .update({
          entity_id: formData.entity_id || null,
          type: formData.type,
          target_audience: formData.target_audience,
          target_rooms: formData.target_audience === "specific_rooms" ? selectedRooms : null,
          title: formData.title,
          content: formData.content,
          expires_at: formData.expires_at || null,
          is_active: formData.is_active,
          updated_at: getNowISO(),
        })
        .eq("id", params.id)

      if (error) {
        showError("Failed to update notice")
        return
      }

      showSuccess("Notice updated successfully")
      router.push("/notices")
    } catch {
      showError("Failed to update notice")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async () => {
    setSaving(true)
    const success = await updateField("is_active", !formData.is_active)
    if (success) {
      setFormData((prev) => ({ ...prev, is_active: !prev.is_active }))
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    await deleteRecord({ confirm: true })
  }

  const isExpired = () => {
    if (!formData.expires_at) return false
    return new Date(formData.expires_at) < new Date()
  }

  if (loading) {
    return <PageLoading message="Loading notice..." />
  }

  if (!notice) {
    return <NotFoundState title="Notice not found" backHref="/notices" backLabel="All Notices" />
  }

  const typeConfig = NOTICE_TYPE_DISPLAY_CONFIG[formData.type] || NOTICE_TYPE_DISPLAY_CONFIG.general
  const TypeIcon = typeConfig.icon

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hero Header */}
      <DetailHero
        title="Edit Notice"
        subtitle={typeConfig.label}
        backHref={backHref}
        backLabel={backLabel}
        breadcrumbs={[
          { label: "Announcements", href: "/notices" },
          { label: notice.title || "Edit Notice" },
        ]}
        avatar={
          <div className={`p-3 rounded-lg ${typeConfig.bgColor}`}>
            <TypeIcon className={`h-8 w-8 ${typeConfig.color}`} />
          </div>
        }
        status={
          <div className="flex items-center gap-2">
            {!formData.is_active && (
              <StatusBadge variant="muted" label="Inactive" />
            )}
            {isExpired() && (
              <StatusBadge variant="error" label="Expired" />
            )}
            {formData.is_active && !isExpired() && (
              <StatusBadge variant="success" label="Active" />
            )}
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <PermissionGate permission="notices.edit" hide>
              <Link href={`/notices/${params.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            <Button
              variant="outline"
              size="sm"
              onClick={toggleActive}
              disabled={saving}
            >
              {formData.is_active ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Deactivate
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Activate
                </>
              )}
            </Button>
            <PermissionGate permission="notices.delete" hide>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={saving || isDeleting}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </PermissionGate>
          </div>
        }
      />

      <DetailPageTemplate layoutKey="notice-detail" entityType="notice" record={notice}>
        {/* Metadata */}
        <DetailSection
        title="Record Info"
        description="Creation and update timestamps"
        icon={Clock}
      >
        <div className="flex flex-wrap gap-4 text-sm">
          <InfoRow
            label="Created"
            value={formatDateTime(notice.created_at)}
            icon={Calendar}
          />
          {notice.updated_at !== notice.created_at && (
            <InfoRow
              label="Updated"
              value={formatDateTime(notice.updated_at)}
              icon={Clock}
            />
          )}
        </div>
      </DetailSection>

      {/* Notice Type */}
      <DetailSection
        title="Notice Type"
        description="Select the type of notice"
        icon={Megaphone}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Object.entries(NOTICE_TYPE_DISPLAY_CONFIG).map(([value, type]) => {
            const Icon = type.icon
            const isSelected = formData.type === value
            return (
              <button
                key={value}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, type: value as NoticeType }))}
                className={`p-3 rounded-lg border text-left transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-input hover:border-primary/50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${type.color}`} />
                  <span className="font-medium text-sm">{type.label}</span>
                </div>
              </button>
            )
          })}
        </div>
      </DetailSection>

      {/* Target Audience */}
      <DetailSection
        title="Target Audience"
        description="Who should see this notice"
        icon={Target}
      >
        <div className="space-y-4">
          <FormField label="Property" htmlFor="entity_id">
            <Select
              id="entity_id"
              name="entity_id"
              value={formData.entity_id}
              onChange={handleChange}
              disabled={saving}
              placeholder="All Properties"
              options={properties.map((property) => ({
                value: property.id,
                label: property.name,
              }))}
            />
          </FormField>

          <FormField label="Audience">
            <Select
              name="target_audience"
              value={formData.target_audience}
              onChange={handleChange}
              disabled={saving}
              options={NOTICE_AUDIENCE_OPTIONS}
            />
          </FormField>

          {/* Room Selection */}
          {formData.target_audience === "specific_rooms" && formData.entity_id && (
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
            </div>
          )}
        </div>
      </DetailSection>

      {/* Notice Content */}
      <DetailSection
        title="Notice Content"
        description="Title and message"
        icon={FileText}
      >
        <div className="space-y-4">
          <FormField label="Title" htmlFor="title" required>
            <Input
              id="title"
              name="title"
              placeholder="Notice title"
              value={formData.title}
              onChange={handleChange}
              required
              disabled={saving}
            />
          </FormField>

          <FormField label="Content" htmlFor="content" required>
            <Textarea
              id="content"
              name="content"
              placeholder="Write your notice content here..."
              value={formData.content}
              onChange={handleChange}
              required
              disabled={saving}
              rows={6}
              className="resize-none"
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Expires On" htmlFor="expires_at">
              <DatePicker
                id="expires_at"
                value={formData.expires_at}
                onChange={(val) => setFormData((prev) => ({ ...prev, expires_at: val }))}
                disabled={saving}
              />
            </FormField>

            <div className="space-y-2">
              <Label>Status</Label>
              <div className="flex items-center gap-2 h-10">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active as boolean}
                  onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, is_active: checked === true }))}
                />
                <label htmlFor="is_active" className="text-sm">
                  Active
                </label>
              </div>
            </div>
          </div>
        </div>
      </DetailSection>

      </DetailPageTemplate>

      <div className="flex justify-end gap-4">
        <Link href="/notices">
          <Button type="button" variant="outline" disabled={saving}>
            Cancel
          </Button>
        </Link>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
