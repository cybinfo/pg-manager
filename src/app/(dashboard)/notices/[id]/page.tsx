"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useDetailPage, NOTICE_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DetailHero,
  DetailSection,
  InfoRow,
} from "@/components/ui/detail-components"
import { PageLoading } from "@/components/ui/loading"
import {
  Megaphone,
  Loader2,
  AlertTriangle,
  Wrench,
  CreditCard,
  Calendar,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Clock,
  FileText,
  Target,
} from "lucide-react"
import { toast } from "sonner"
import { formatDateTime } from "@/lib/format"
import { PermissionGate } from "@/components/auth"
import { StatusBadge } from "@/components/ui/status-badge"
import { Notice, NOTICE_TYPE_CONFIG, NoticeType } from "@/types/notices.types"

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
  { value: "general", label: "General", icon: Megaphone, color: "text-blue-600", bgColor: "bg-blue-100" },
  { value: "maintenance", label: "Maintenance", icon: Wrench, color: "text-orange-600", bgColor: "bg-orange-100" },
  { value: "payment_reminder", label: "Payment Reminder", icon: CreditCard, color: "text-green-600", bgColor: "bg-green-100" },
  { value: "emergency", label: "Emergency", icon: AlertTriangle, color: "text-red-600", bgColor: "bg-red-100" },
]

export default function NoticeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [formInitialized, setFormInitialized] = useState(false)

  const [formData, setFormData] = useState({
    property_id: "",
    type: "general" as NoticeType,
    target_audience: "all",
    title: "",
    content: "",
    expires_at: "",
    is_active: true,
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
      setFormData({
        property_id: notice.property_id || "",
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
        supabase.from("properties").select("id, name").order("name"),
        supabase.from("rooms").select("id, room_number, property_id").order("room_number"),
      ])

      if (propertiesRes.data) setProperties(propertiesRes.data)
      if (roomsRes.data) setRooms(roomsRes.data)
    }

    fetchFormData()
  }, [])

  // Filter rooms when property changes
  useEffect(() => {
    if (formData.property_id) {
      setFilteredRooms(rooms.filter((r) => r.property_id === formData.property_id))
    } else {
      setFilteredRooms([])
    }
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

  const handleSave = async () => {
    if (!formData.title || !formData.content) {
      toast.error("Please fill in title and content")
      return
    }

    if (formData.target_audience === "specific_rooms" && selectedRooms.length === 0) {
      toast.error("Please select at least one room")
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("notices")
        .update({
          property_id: formData.property_id || null,
          type: formData.type,
          target_audience: formData.target_audience,
          target_rooms: formData.target_audience === "specific_rooms" ? selectedRooms : null,
          title: formData.title,
          content: formData.content,
          expires_at: formData.expires_at || null,
          is_active: formData.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", params.id)

      if (error) {
        toast.error("Failed to update notice")
        return
      }

      toast.success("Notice updated successfully")
      router.push("/notices")
    } catch {
      toast.error("Failed to update notice")
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
    return null
  }

  const typeConfig = noticeTypes.find((t) => t.value === formData.type)
  const TypeIcon = typeConfig?.icon || Megaphone

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hero Header */}
      <DetailHero
        title="Edit Notice"
        subtitle={typeConfig?.label || formData.type}
        backHref="/notices"
        backLabel="All Notices"
        avatar={
          <div className={`p-3 rounded-lg ${typeConfig?.bgColor || "bg-blue-100"}`}>
            <TypeIcon className={`h-8 w-8 ${typeConfig?.color || "text-blue-600"}`} />
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
        <div className="grid grid-cols-2 gap-3">
          {noticeTypes.map((type) => {
            const Icon = type.icon
            const isSelected = formData.type === type.value
            return (
              <button
                key={type.value}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, type: type.value as NoticeType }))}
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
          <div className="space-y-2">
            <Label htmlFor="property_id">Property</Label>
            <select
              id="property_id"
              name="property_id"
              value={formData.property_id}
              onChange={handleChange}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              disabled={saving}
            >
              <option value="">All Properties</option>
              {properties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label>Audience</Label>
            <select
              name="target_audience"
              value={formData.target_audience}
              onChange={handleChange}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              disabled={saving}
            >
              <option value="all">All Residents</option>
              <option value="tenants_only">Tenants Only</option>
              <option value="specific_rooms">Specific Rooms</option>
            </select>
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
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              name="title"
              placeholder="Notice title"
              value={formData.title}
              onChange={handleChange}
              required
              disabled={saving}
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
              disabled={saving}
              rows={6}
              className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expires_at">Expires On</Label>
              <Input
                id="expires_at"
                name="expires_at"
                type="date"
                value={formData.expires_at}
                onChange={handleChange}
                disabled={saving}
              />
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
                  Active
                </label>
              </div>
            </div>
          </div>
        </div>
      </DetailSection>

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
