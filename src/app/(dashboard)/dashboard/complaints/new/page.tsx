"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, MessageSquare, Loader2, Building2, AlertTriangle } from "lucide-react"
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

interface TenantRaw {
  id: string
  name: string
  property_id: string
  room_id: string
  room: { room_number: string }[] | null
  property: { name: string }[] | null
}

interface Tenant {
  id: string
  name: string
  property_id: string
  room_id: string
  room: {
    room_number: string
  } | null
  property: {
    name: string
  } | null
}

const categories = [
  { value: "electrical", label: "Electrical" },
  { value: "plumbing", label: "Plumbing" },
  { value: "furniture", label: "Furniture" },
  { value: "cleanliness", label: "Cleanliness" },
  { value: "appliances", label: "Appliances" },
  { value: "security", label: "Security" },
  { value: "noise", label: "Noise/Disturbance" },
  { value: "other", label: "Other" },
]

const priorities = [
  { value: "low", label: "Low", description: "Can be addressed within a week" },
  { value: "medium", label: "Medium", description: "Should be addressed within 2-3 days" },
  { value: "high", label: "High", description: "Needs attention within 24 hours" },
  { value: "urgent", label: "Urgent", description: "Requires immediate attention" },
]

function NewComplaintForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedTenantId = searchParams.get("tenant")

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [properties, setProperties] = useState<Property[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([])

  const [formData, setFormData] = useState({
    property_id: "",
    room_id: "",
    tenant_id: preselectedTenantId || "",
    category: "other",
    priority: "medium",
    title: "",
    description: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [propertiesRes, roomsRes, tenantsRes] = await Promise.all([
        supabase.from("properties").select("id, name").order("name"),
        supabase.from("rooms").select("id, room_number, property_id").order("room_number"),
        supabase
          .from("tenants")
          .select("id, name, property_id, room_id, room:rooms(room_number), property:properties(name)")
          .eq("status", "active")
          .order("name"),
      ])

      if (propertiesRes.data) setProperties(propertiesRes.data)
      if (roomsRes.data) setRooms(roomsRes.data)
      if (tenantsRes.data) {
        // Transform Supabase array joins to single objects
        const transformedTenants: Tenant[] = (tenantsRes.data as TenantRaw[]).map((t) => ({
          id: t.id,
          name: t.name,
          property_id: t.property_id,
          room_id: t.room_id,
          room: t.room && t.room.length > 0 ? t.room[0] : null,
          property: t.property && t.property.length > 0 ? t.property[0] : null,
        }))
        setTenants(transformedTenants)

        // If preselected tenant, set property and room
        if (preselectedTenantId) {
          const tenant = transformedTenants.find((t) => t.id === preselectedTenantId)
          if (tenant) {
            setFormData((prev) => ({
              ...prev,
              property_id: tenant.property_id,
              room_id: tenant.room_id,
            }))
          }
        }
      }

      setLoadingData(false)
    }

    fetchData()
  }, [preselectedTenantId])

  // Filter rooms when property changes
  useEffect(() => {
    if (formData.property_id) {
      setFilteredRooms(rooms.filter((r) => r.property_id === formData.property_id))
      setFilteredTenants(tenants.filter((t) => t.property_id === formData.property_id))
    } else {
      setFilteredRooms([])
      setFilteredTenants(tenants)
    }
  }, [formData.property_id, rooms, tenants])

  // Filter tenants when room changes
  useEffect(() => {
    if (formData.room_id) {
      setFilteredTenants(tenants.filter((t) => t.room_id === formData.room_id))
    } else if (formData.property_id) {
      setFilteredTenants(tenants.filter((t) => t.property_id === formData.property_id))
    }
  }, [formData.room_id, formData.property_id, tenants])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const newData = { ...prev, [name]: value }

      // Reset dependent fields
      if (name === "property_id") {
        newData.room_id = ""
        newData.tenant_id = ""
      }
      if (name === "room_id") {
        newData.tenant_id = ""
      }

      return newData
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.property_id || !formData.title || !formData.category) {
      toast.error("Please fill in all required fields")
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

      const { error } = await supabase.from("complaints").insert({
        owner_id: user.id,
        property_id: formData.property_id,
        room_id: formData.room_id || null,
        tenant_id: formData.tenant_id || null,
        category: formData.category,
        priority: formData.priority,
        title: formData.title,
        description: formData.description || null,
        status: "open",
        created_by: user.id,
      })

      if (error) {
        console.error("Error creating complaint:", error)
        toast.error(`Failed to create complaint: ${error.message}`)
        return
      }

      toast.success("Complaint logged successfully")
      router.push("/dashboard/complaints")
    } catch (error: any) {
      console.error("Error:", error)
      toast.error(error?.message || "Failed to create complaint")
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

  if (properties.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/complaints">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Log Complaint</h1>
            <p className="text-muted-foreground">Report an issue or problem</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No properties found</h3>
            <p className="text-muted-foreground text-center mb-4">
              You need to add a property before logging complaints
            </p>
            <Link href="/dashboard/properties/new">
              <Button>Add Property First</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/complaints">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Log Complaint</h1>
          <p className="text-muted-foreground">Report an issue or problem</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Location</CardTitle>
                <CardDescription>Where is the issue?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="property_id">Property *</Label>
                <select
                  id="property_id"
                  name="property_id"
                  value={formData.property_id}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  required
                  disabled={loading}
                >
                  <option value="">Select property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="room_id">Room (Optional)</Label>
                <select
                  id="room_id"
                  name="room_id"
                  value={formData.room_id}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  disabled={loading || !formData.property_id}
                >
                  <option value="">Select room</option>
                  {filteredRooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      Room {room.room_number}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenant_id">Reported By (Optional)</Label>
              <select
                id="tenant_id"
                name="tenant_id"
                value={formData.tenant_id}
                onChange={handleChange}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                disabled={loading}
              >
                <option value="">Select tenant</option>
                {filteredTenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name} - Room {tenant.room?.room_number}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Issue Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle>Issue Details</CardTitle>
                <CardDescription>Describe the problem</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <select
                  id="category"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  required
                  disabled={loading}
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  required
                  disabled={loading}
                >
                  {priorities.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                name="title"
                placeholder="Brief description of the issue"
                value={formData.title}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description</Label>
              <textarea
                id="description"
                name="description"
                placeholder="Provide more details about the issue..."
                value={formData.description}
                onChange={handleChange}
                disabled={loading}
                rows={4}
                className="w-full px-3 py-2 rounded-md border border-input bg-background text-sm resize-none"
              />
            </div>

            {/* Priority Info */}
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">Priority Guide:</p>
              <ul className="text-muted-foreground space-y-1 text-xs">
                {priorities.map((p) => (
                  <li key={p.value}>
                    <strong>{p.label}:</strong> {p.description}
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/dashboard/complaints">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <MessageSquare className="mr-2 h-4 w-4" />
                Log Complaint
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default function NewComplaintPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <NewComplaintForm />
    </Suspense>
  )
}
