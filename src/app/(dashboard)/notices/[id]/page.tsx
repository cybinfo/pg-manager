"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
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
  Calendar,
  Eye,
  EyeOff,
  Save,
  Trash2,
  Clock
} from "lucide-react"
import { toast } from "sonner"
import { formatDateTime } from "@/lib/format"
import { useAuth } from "@/lib/auth"
import { PermissionGate } from "@/components/auth"
import { StatusBadge } from "@/components/ui/status-badge"

interface Notice {
  id: string
  title: string
  content: string
  type: string
  target_audience: string
  target_rooms: string[] | null
  is_active: boolean
  expires_at: string | null
  created_at: string
  updated_at: string
  property_id: string | null
  property: {
    id: string
    name: string
  } | null
}

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

const audienceLabels: Record<string, string> = {
  all: "All Residents",
  tenants_only: "Tenants Only",
  specific_rooms: "Specific Rooms",
}

export default function NoticeDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [notice, setNotice] = useState<Notice | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

      const [noticeRes, propertiesRes, roomsRes] = await Promise.all([
        supabase
          .from("notices")
          .select(`*, property:properties(id, name)`)
          .eq("id", params.id)
          .single(),
        supabase.from("properties").select("id, name").order("name"),
        supabase.from("rooms").select("id, room_number, property_id").order("room_number"),
      ])

      if (noticeRes.error || !noticeRes.data) {
        console.error("Error fetching notice:", noticeRes.error)
        toast.error("Notice not found")
        router.push("/notices")
        return
      }

      const noticeData = noticeRes.data as Notice
      setNotice(noticeData)
      setFormData({
        property_id: noticeData.property_id || "",
        type: noticeData.type,
        target_audience: noticeData.target_audience,
        title: noticeData.title,
        content: noticeData.content,
        expires_at: noticeData.expires_at ? noticeData.expires_at.split("T")[0] : "",
        is_active: noticeData.is_active,
      })
      setSelectedRooms(noticeData.target_rooms || [])

      if (propertiesRes.data) setProperties(propertiesRes.data)
      if (roomsRes.data) setRooms(roomsRes.data)

      setLoading(false)
    }

    fetchData()
  }, [params.id, router])

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
    } catch (error) {
      toast.error("Failed to update notice")
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async () => {
    setSaving(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("notices")
        .update({ is_active: !formData.is_active })
        .eq("id", params.id)

      if (error) {
        toast.error("Failed to update notice")
        return
      }

      setFormData((prev) => ({ ...prev, is_active: !prev.is_active }))
      toast.success(formData.is_active ? "Notice deactivated" : "Notice activated")
    } catch (error) {
      toast.error("Failed to update notice")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this notice? This action cannot be undone.")) {
      return
    }

    setSaving(true)

    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("notices")
        .delete()
        .eq("id", params.id)

      if (error) {
        toast.error("Failed to delete notice")
        return
      }

      toast.success("Notice deleted")
      router.push("/notices")
    } catch (error) {
      toast.error("Failed to delete notice")
    } finally {
      setSaving(false)
    }
  }

  const isExpired = () => {
    if (!formData.expires_at) return false
    return new Date(formData.expires_at) < new Date()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!notice) {
    return null
  }

  const typeConfig = noticeTypes.find((t) => t.value === formData.type)
  const TypeIcon = typeConfig?.icon || Megaphone

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/notices">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeConfig?.bgColor} ${typeConfig?.color}`}>
                {typeConfig?.label || formData.type}
              </span>
              {!formData.is_active && (
                <StatusBadge variant="muted" label="Inactive" />
              )}
              {isExpired() && (
                <StatusBadge variant="error" label="Expired" />
              )}
            </div>
            <h1 className="text-2xl font-bold">Edit Notice</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
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
              onClick={handleDelete}
              disabled={saving}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </PermissionGate>
        </div>
      </div>

      {/* Metadata */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Created: {formatDateTime(notice.created_at)}
            </span>
            {notice.updated_at !== notice.created_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Updated: {formatDateTime(notice.updated_at)}
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <div className="space-y-6">
        {/* Notice Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notice Type</CardTitle>
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
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${type.color}`} />
                      <span className="font-medium text-sm">{type.label}</span>
                    </div>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Target Audience */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Target Audience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
          </CardContent>
        </Card>

        {/* Notice Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notice Content</CardTitle>
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
          </CardContent>
        </Card>

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
    </div>
  )
}
