"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, UserPlus, Loader2, Users, Building2, Moon, IndianRupee } from "lucide-react"
import { toast } from "sonner"

interface Property {
  id: string
  name: string
}

interface Tenant {
  id: string
  name: string
  phone: string
  property_id: string
  room: {
    room_number: string
  } | null
}

interface RawTenant {
  id: string
  name: string
  phone: string
  property_id: string
  room: { room_number: string }[] | null
}

export default function NewVisitorPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [properties, setProperties] = useState<Property[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [filteredTenants, setFilteredTenants] = useState<Tenant[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [formData, setFormData] = useState({
    property_id: "",
    tenant_id: "",
    visitor_name: "",
    visitor_phone: "",
    relation: "",
    purpose: "",
    is_overnight: false,
    overnight_charge: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [propertiesRes, tenantsRes] = await Promise.all([
        supabase.from("properties").select("id, name").order("name"),
        supabase
          .from("tenants")
          .select("id, name, phone, property_id, room:rooms(room_number)")
          .eq("status", "active")
          .order("name"),
      ])

      if (!propertiesRes.error) {
        setProperties(propertiesRes.data || [])
        if (propertiesRes.data && propertiesRes.data.length > 0) {
          setFormData((prev) => ({ ...prev, property_id: propertiesRes.data[0].id }))
        }
      }

      if (!tenantsRes.error) {
        const transformedTenants = ((tenantsRes.data as RawTenant[]) || []).map((tenant) => ({
          ...tenant,
          room: tenant.room && tenant.room.length > 0 ? tenant.room[0] : null,
        }))
        setTenants(transformedTenants)
      }

      setLoadingData(false)
    }

    fetchData()
  }, [])

  // Filter tenants when property changes
  useEffect(() => {
    if (formData.property_id) {
      const filtered = tenants.filter((t) => t.property_id === formData.property_id)
      setFilteredTenants(filtered)
      if (filtered.length > 0) {
        setFormData((prev) => ({ ...prev, tenant_id: filtered[0].id }))
      } else {
        setFormData((prev) => ({ ...prev, tenant_id: "" }))
      }
    }
  }, [formData.property_id, tenants])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.property_id || !formData.tenant_id || !formData.visitor_name) {
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

      const { error } = await supabase.from("visitors").insert({
        owner_id: user.id,
        property_id: formData.property_id,
        tenant_id: formData.tenant_id,
        visitor_name: formData.visitor_name,
        visitor_phone: formData.visitor_phone || null,
        relation: formData.relation || null,
        purpose: formData.purpose || null,
        check_in_time: new Date().toISOString(),
        is_overnight: formData.is_overnight,
        overnight_charge: formData.is_overnight && formData.overnight_charge
          ? parseFloat(formData.overnight_charge)
          : null,
      })

      if (error) {
        console.error("Error creating visitor:", error)
        throw error
      }

      toast.success("Visitor checked in successfully!")
      router.push("/dashboard/visitors")
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to check in visitor. Please try again.")
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
          <Link href="/dashboard/visitors">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Check In Visitor</h1>
            <p className="text-muted-foreground">Register a new visitor</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No properties found</h3>
            <p className="text-muted-foreground text-center mb-4">
              You need to create a property first
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
        <Link href="/dashboard/visitors">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Check In Visitor</h1>
          <p className="text-muted-foreground">Register a new visitor</p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Visitor Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <UserPlus className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Visitor Information</CardTitle>
                <CardDescription>Details about the visitor</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="visitor_name">Visitor Name *</Label>
              <Input
                id="visitor_name"
                name="visitor_name"
                placeholder="e.g., Amit Kumar"
                value={formData.visitor_name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="visitor_phone">Phone Number</Label>
                <Input
                  id="visitor_phone"
                  name="visitor_phone"
                  type="tel"
                  placeholder="e.g., 9876543210"
                  value={formData.visitor_phone}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="relation">Relation</Label>
                <select
                  id="relation"
                  name="relation"
                  value={formData.relation}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  disabled={loading}
                >
                  <option value="">Select relation</option>
                  <option value="Parent">Parent</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Friend">Friend</option>
                  <option value="Relative">Relative</option>
                  <option value="Colleague">Colleague</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="purpose">Purpose of Visit</Label>
              <textarea
                id="purpose"
                name="purpose"
                placeholder="e.g., Meeting, Delivery, etc."
                value={formData.purpose}
                onChange={handleChange}
                disabled={loading}
                className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tenant Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Visiting Tenant</CardTitle>
                <CardDescription>Who is this visitor here to see?</CardDescription>
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
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="tenant_id">Tenant *</Label>
                <select
                  id="tenant_id"
                  name="tenant_id"
                  value={formData.tenant_id}
                  onChange={handleChange}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  required
                  disabled={loading || filteredTenants.length === 0}
                >
                  {filteredTenants.length === 0 ? (
                    <option value="">No tenants in this property</option>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name} (Room {tenant.room?.room_number})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overnight Stay */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Moon className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Overnight Stay</CardTitle>
                <CardDescription>Is this visitor staying overnight?</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                id="is_overnight"
                name="is_overnight"
                type="checkbox"
                checked={formData.is_overnight}
                onChange={handleChange}
                disabled={loading}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="is_overnight" className="font-normal cursor-pointer">
                This is an overnight stay
              </Label>
            </div>

            {formData.is_overnight && (
              <div className="space-y-2">
                <Label htmlFor="overnight_charge">Overnight Charge (₹)</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="overnight_charge"
                    name="overnight_charge"
                    type="number"
                    min="0"
                    placeholder="e.g., 200"
                    value={formData.overnight_charge}
                    onChange={handleChange}
                    disabled={loading}
                    className="pl-9"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave empty if no charge for overnight stay
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/dashboard/visitors">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || filteredTenants.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Checking In...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Check In Visitor
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
