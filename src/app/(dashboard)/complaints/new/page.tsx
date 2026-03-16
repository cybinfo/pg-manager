"use client"

import { useState, useEffect, Suspense } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, FormField } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, MessageSquare, Loader2, Building2, AlertTriangle, Library } from "lucide-react"
import { requiredField } from "@/lib/validation"
import type { ValidatorResult } from "@/lib/hooks/useFormValidation"
import { PageSkeleton } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"

interface Property {
  id: string
  name: string
}

interface LibraryItem {
  id: string
  name: string
}

interface LibraryMember {
  id: string
  name: string
  member_code: string | null
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
  const [loadingData, setLoadingData] = useState(true)
  const [properties, setProperties] = useState<Property[]>([])
  const [libraries, setLibraries] = useState<LibraryItem[]>([])
  const [libraryMembers, setLibraryMembers] = useState<LibraryMember[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([])
  const [filteredMembers, setFilteredMembers] = useState<LibraryMember[]>([])

  const {
    formData, setFormData,
    handleSubmit,
    saving,
    searchParams,
    errors,
    validateField,
  } = useFormPage({
    table: "complaints",
    initialData: {
      entity_type: "property" as string,
      property_id: "",
      library_id: "",
      room_id: "",
      tenant_id: "",
      member_id: "",
      category: "other",
      priority: "medium",
      title: "",
      description: "",
    },
    redirectTo: "/complaints",
    successMessage: "Complaint logged successfully",
    errorMessage: "Failed to create complaint",
    useCreatedBy: false,
    validationSchema: {
      title: requiredField("Title"),
      property_id: (value: unknown, formData): ValidatorResult => {
        if (formData.entity_type === "property" && !String(value ?? "").trim()) {
          return { isValid: false, error: "Please select a property" }
        }
        return null
      },
      library_id: (value: unknown, formData): ValidatorResult => {
        if (formData.entity_type === "library" && !String(value ?? "").trim()) {
          return { isValid: false, error: "Please select a library" }
        }
        return null
      },
    },
    transform: (data, userId) => ({
      owner_id: userId,
      property_id: data.entity_type === "property" ? data.property_id : null,
      library_id: data.entity_type === "library" ? data.library_id : null,
      room_id: data.room_id || null,
      tenant_id: data.tenant_id || null,
      category: data.category,
      priority: data.priority,
      title: data.title,
      description: data.description || null,
      status: "open",
      created_by: userId,
    }),
    addOwnerId: false,
  })

  const preselectedTenantId = searchParams.get("tenant")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const newData = { ...prev, [name]: value }

      // Reset dependent fields
      if (name === "entity_type") {
        newData.property_id = ""
        newData.library_id = ""
        newData.room_id = ""
        newData.tenant_id = ""
        newData.member_id = ""
      }
      if (name === "property_id") {
        newData.room_id = ""
        newData.tenant_id = ""
      }
      if (name === "library_id") {
        newData.member_id = ""
      }
      if (name === "room_id") {
        newData.tenant_id = ""
      }

      return newData
    })
  }

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [propertiesRes, roomsRes, tenantsRes, librariesRes, membersRes] = await Promise.all([
        supabase.from("properties").select("id, name").is("deleted_at", null).order("name"),
        supabase.from("rooms").select("id, room_number, property_id").is("deleted_at", null).order("room_number"),
        supabase
          .from("tenants")
          .select("id, name, property_id, room_id, room:rooms(room_number), property:properties(name)")
          .eq("status", "active")
          .is("deleted_at", null)
          .order("name"),
        supabase.from("libraries").select("id, name").is("deleted_at", null).order("name"),
        supabase.from("library_members").select("id, name, member_code").eq("status", "active").is("deleted_at", null).order("name"),
      ])

      if (propertiesRes.data) setProperties(propertiesRes.data)
      if (roomsRes.data) setRooms(roomsRes.data)
      if (librariesRes.data) setLibraries(librariesRes.data)
      if (membersRes.data) setLibraryMembers(membersRes.data)
      if (tenantsRes.data) {
        // Transform Supabase array joins to single objects
        const transformedTenants: Tenant[] = (tenantsRes.data as TenantRaw[]).map((t) => ({
          id: t.id,
          name: t.name,
          property_id: t.property_id,
          room_id: t.room_id,
          room: transformJoin(t.room),
          property: transformJoin(t.property),
        }))
        setTenants(transformedTenants)

        // If preselected tenant, set property and room
        if (preselectedTenantId) {
          const tenant = transformedTenants.find((t) => t.id === preselectedTenantId)
          if (tenant) {
            setFormData((prev) => ({
              ...prev,
              tenant_id: preselectedTenantId,
              property_id: tenant.property_id,
              room_id: tenant.room_id,
            }))
          }
        }
      }

      setLoadingData(false)
    }

    fetchData()
  }, [preselectedTenantId, setFormData])

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

  if (loadingData) {
    return <PageSkeleton variant="form" />
  }

  if (properties.length === 0 && libraries.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/complaints">
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
            <h3 className="text-lg font-medium mb-2">No properties or libraries found</h3>
            <p className="text-muted-foreground text-center mb-4">
              You need to add a property or library before logging complaints
            </p>
            <div className="flex gap-3">
              <Link href="/properties/new">
                <Button>Add Property</Button>
              </Link>
              <Link href="/library/new">
                <Button variant="outline">Add Library</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/complaints">
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
                {formData.entity_type === "library" ? (
                  <Library className="h-5 w-5 text-primary" />
                ) : (
                  <Building2 className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <CardTitle>Location</CardTitle>
                <CardDescription>Where is the issue?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Entity Type Selection */}
            {libraries.length > 0 && (
              <div className="space-y-2">
                <Label>Complaint For *</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="entity_type"
                      value="property"
                      checked={formData.entity_type === "property"}
                      onChange={handleChange}
                      className="h-4 w-4"
                    />
                    <Building2 className="h-4 w-4" />
                    <span>Property/PG</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="entity_type"
                      value="library"
                      checked={formData.entity_type === "library"}
                      onChange={handleChange}
                      className="h-4 w-4"
                    />
                    <Library className="h-4 w-4" />
                    <span>Library</span>
                  </label>
                </div>
              </div>
            )}

            {/* Property Fields */}
            {formData.entity_type === "property" && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <FormField label="Property" htmlFor="property_id" required error={errors.property_id}>
                    <Select
                      id="property_id"
                      name="property_id"
                      value={formData.property_id as string}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="Select property"
                      options={properties.map((property) => ({
                        value: property.id,
                        label: property.name,
                      }))}
                    />
                  </FormField>
                  <div className="space-y-2">
                    <Label htmlFor="room_id">Room (Optional)</Label>
                    <Select
                      id="room_id"
                      name="room_id"
                      value={formData.room_id as string}
                      onChange={handleChange}
                      disabled={saving || !formData.property_id}
                      placeholder="Select room"
                      options={filteredRooms.map((room) => ({
                        value: room.id,
                        label: `Room ${room.room_number}`,
                      }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant_id">Reported By (Optional)</Label>
                  <Select
                    id="tenant_id"
                    name="tenant_id"
                    value={formData.tenant_id as string}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="Select tenant"
                    options={filteredTenants.map((tenant) => ({
                      value: tenant.id,
                      label: `${tenant.name} - Room ${tenant.room?.room_number}`,
                    }))}
                  />
                </div>
              </>
            )}

            {/* Library Fields */}
            {formData.entity_type === "library" && (
              <>
                <FormField label="Library" htmlFor="library_id" required error={errors.library_id}>
                  <Select
                    id="library_id"
                    name="library_id"
                    value={formData.library_id as string}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="Select library"
                    options={libraries.map((library) => ({
                      value: library.id,
                      label: library.name,
                    }))}
                  />
                </FormField>

                <div className="space-y-2">
                  <Label htmlFor="member_id">Reported By (Optional)</Label>
                  <Select
                    id="member_id"
                    name="member_id"
                    value={formData.member_id as string}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="Select member"
                    options={libraryMembers.map((member) => ({
                      value: member.id,
                      label: `${member.name}${member.member_code ? ` (${member.member_code})` : ""}`,
                    }))}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Issue Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-warning" />
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
                <Select
                  id="category"
                  name="category"
                  value={formData.category as string}
                  onChange={handleChange}
                  required
                  disabled={saving}
                  options={categories.map((cat) => ({
                    value: cat.value,
                    label: cat.label,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priority">Priority *</Label>
                <Select
                  id="priority"
                  name="priority"
                  value={formData.priority as string}
                  onChange={handleChange}
                  required
                  disabled={saving}
                  options={priorities.map((p) => ({
                    value: p.value,
                    label: p.label,
                  }))}
                />
              </div>
            </div>

            <FormField label="Title" htmlFor="title" required error={errors.title}>
              <Input
                id="title"
                name="title"
                placeholder="Brief description of the issue"
                value={formData.title as string}
                onChange={handleChange}
                onBlur={() => validateField("title")}
                disabled={saving}
              />
            </FormField>

            <div className="space-y-2">
              <Label htmlFor="description">Detailed Description</Label>
              <textarea
                id="description"
                name="description"
                placeholder="Provide more details about the issue..."
                value={formData.description as string}
                onChange={handleChange}
                disabled={saving}
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
          <Link href="/complaints">
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
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
    <PermissionGuard permission="complaints.create">
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <NewComplaintForm />
      </Suspense>
    </PermissionGuard>
  )
}
