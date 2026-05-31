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
import { Card, CardContent } from "@/components/ui/card"
import { MessageSquare, Loader2, Building2, AlertTriangle, Library } from "lucide-react"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { requiredField } from "@/lib/validation"
import type { ValidatorResult } from "@/lib/hooks/useFormValidation"
import { COMPLAINT_CATEGORIES, COMPLAINT_PRIORITY } from "@/lib/status"
import { Textarea } from "@/components/ui/textarea"
import { PageSkeleton } from "@/components/ui/loading"
import { DetailHero, DetailSection, EmptyState } from "@/components/ui"
import { PermissionGuard } from "@/components/auth"
import { withCreatedBy } from "@/lib/audit"
import type { PropertyOption } from "@/types/properties.types"

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
  entity_id: string
}

interface TenantRaw {
  id: string
  name: string
  entity_id: string
  room_id: string
  room: { room_number: string }[] | null
  property: { name: string }[] | null
}

interface Tenant {
  id: string
  name: string
  entity_id: string
  room_id: string
  room: {
    room_number: string
  } | null
  property: {
    name: string
  } | null
}

const CATEGORY_OPTIONS = Object.entries(COMPLAINT_CATEGORIES).map(([value, label]) => ({ value, label }))

const PRIORITY_DESCRIPTIONS: Record<string, string> = {
  low: "Can be addressed within a week",
  medium: "Should be addressed within 2-3 days",
  high: "Needs attention within 24 hours",
  urgent: "Requires immediate attention",
}

const PRIORITY_OPTIONS = Object.entries(COMPLAINT_PRIORITY).map(([value, config]) => ({
  value,
  label: config.label,
  description: PRIORITY_DESCRIPTIONS[value] ?? "",
}))

function NewComplaintForm() {
  const { backHref } = useBackNavigation({ defaultHref: "/complaints" })
  const [loadingData, setLoadingData] = useState(true)
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [libraries, setLibraries] = useState<LibraryItem[]>([])
  const [libraryMembers, setLibraryMembers] = useState<LibraryMember[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [filteredRooms, setFilteredRooms] = useState<Room[]>([])
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([])
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
      entity_id: "",
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
      entity_id: (value: unknown): ValidatorResult => {
        if (!String(value ?? "").trim()) {
          return { isValid: false, error: "Please select a property or library" }
        }
        return null
      },
    },
    transform: (data, userId) => withCreatedBy({
      owner_id: userId,
      entity_id: data.entity_id || null,
      room_id: data.room_id || null,
      tenant_id: data.tenant_id || null,
      category: data.category,
      priority: data.priority,
      title: data.title,
      description: data.description || null,
      status: "open",
    }, userId) as unknown as Record<string, unknown>,
    addOwnerId: false,
  })

  const preselectedTenantId = searchParams.get("tenant")

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const newData = { ...prev, [name]: value }

      // Reset dependent fields
      if (name === "entity_type") {
        newData.entity_id = ""
        newData.room_id = ""
        newData.tenant_id = ""
        newData.member_id = ""
      }
      if (name === "entity_id") {
        newData.room_id = ""
        newData.tenant_id = ""
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
        supabase.from("entities").eq("type", "pg").select("id, name").is("deleted_at", null).order("name"),
        supabase.from("rooms").select("id, room_number, entity_id").is("deleted_at", null).order("room_number"),
        supabase
          .from("tenants")
          .select("id, name, entity_id, room_id, room:rooms(room_number), property:properties(name)")
          .eq("status", "active")
          .is("deleted_at", null)
          .order("name"),
        supabase.from("entities").eq("type", "library").select("id, name").is("deleted_at", null).order("name"),
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
          entity_id: t.entity_id,
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
              entity_id: tenant.entity_id,
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
    if (formData.entity_id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilteredRooms(rooms.filter((r) => r.entity_id === formData.entity_id))
      setFilteredTenants(tenants.filter((t) => t.entity_id === formData.entity_id))
    } else {
      setFilteredRooms([])
      setFilteredTenants(tenants)
    }
  }, [formData.entity_id, rooms, tenants])

  // Filter tenants when room changes
  useEffect(() => {
    if (formData.room_id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFilteredTenants(tenants.filter((t) => t.room_id === formData.room_id))
    } else if (formData.entity_id) {
      setFilteredTenants(tenants.filter((t) => t.entity_id === formData.entity_id))
    }
  }, [formData.room_id, formData.entity_id, tenants])

  if (loadingData) {
    return <PageSkeleton variant="form" />
  }

  if (properties.length === 0 && libraries.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <DetailHero
          title="Log Complaint"
          subtitle="Report an issue or problem"
          backHref={backHref}
          backLabel="Back to Complaints"
          icon={MessageSquare}
          breadcrumbs={[
            { label: "Complaints", href: "/complaints" },
            { label: "Log Complaint" },
          ]}
        />

        <Card>
          <CardContent className="py-2">
            <EmptyState
              icon={Building2}
              title="No properties or libraries found"
              description="You need to add a property or library before logging complaints"
              action={{ label: "Add Property", href: "/properties/new" }}
              secondaryAction={{ label: "Add Library", href: "/library/new" }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Log Complaint"
        subtitle="Report an issue or problem"
        backHref={backHref}
        backLabel="Back to Complaints"
        icon={MessageSquare}
        breadcrumbs={[
          { label: "Complaints", href: "/complaints" },
          { label: "Log Complaint" },
        ]}
      />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Location */}
        <DetailSection title="Location" description="Where is the issue?" icon={MessageSquare}>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Property" htmlFor="entity_id" required error={errors.entity_id}>
                    <Select
                      id="entity_id"
                      name="entity_id"
                      value={formData.entity_id as string}
                      onChange={handleChange}
                      disabled={saving}
                      placeholder="Select property"
                      options={properties.map((property) => ({
                        value: property.id,
                        label: property.name,
                      }))}
                    />
                  </FormField>
                  <FormField label="Room" htmlFor="room_id" hint="Optional">
                    <Select
                      id="room_id"
                      name="room_id"
                      value={formData.room_id as string}
                      onChange={handleChange}
                      disabled={saving || !formData.entity_id}
                      placeholder="Select room"
                      options={filteredRooms.map((room) => ({
                        value: room.id,
                        label: `Room ${room.room_number}`,
                      }))}
                    />
                  </FormField>
                </div>

                <FormField label="Reported By" htmlFor="tenant_id" hint="Optional">
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
                </FormField>
              </>
            )}

            {/* Library Fields */}
            {formData.entity_type === "library" && (
              <>
                <FormField label="Library" htmlFor="entity_id" required error={errors.entity_id}>
                  <Select
                    id="entity_id"
                    name="entity_id"
                    value={formData.entity_id as string}
                    onChange={handleChange}
                    disabled={saving}
                    placeholder="Select library"
                    options={libraries.map((library) => ({
                      value: library.id,
                      label: library.name,
                    }))}
                  />
                </FormField>

                <FormField label="Reported By" htmlFor="member_id" hint="Optional">
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
                </FormField>
              </>
            )}
        </DetailSection>

        {/* Issue Details */}
        <DetailSection title="Issue Details" description="Describe the problem" icon={AlertTriangle}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Category" htmlFor="category" required>
                <Select
                  id="category"
                  name="category"
                  value={formData.category as string}
                  onChange={handleChange}
                  required
                  disabled={saving}
                  options={CATEGORY_OPTIONS}
                />
              </FormField>
              <FormField label="Priority" htmlFor="priority" required>
                <Select
                  id="priority"
                  name="priority"
                  value={formData.priority as string}
                  onChange={handleChange}
                  required
                  disabled={saving}
                  options={PRIORITY_OPTIONS}
                />
              </FormField>
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

            <FormField label="Detailed Description" htmlFor="description">
              <Textarea
                id="description"
                name="description"
                placeholder="Provide more details about the issue..."
                value={formData.description as string}
                onChange={handleChange}
                disabled={saving}
                rows={4}
                className="resize-none"
              />
            </FormField>

            {/* Priority Info */}
            <div className="p-3 bg-muted rounded-lg text-sm">
              <p className="font-medium mb-1">Priority Guide:</p>
              <ul className="text-muted-foreground space-y-1 text-xs">
                {PRIORITY_OPTIONS.map((p) => (
                  <li key={p.value}>
                    <strong>{p.label}:</strong> {p.description}
                  </li>
                ))}
              </ul>
            </div>
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href="/complaints">
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Submitting..." : (
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
