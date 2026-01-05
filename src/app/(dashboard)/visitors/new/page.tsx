"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, UserPlus, Loader2, Users, Building2, Moon, IndianRupee, Calendar, FileText } from "lucide-react"
import { toast } from "sonner"
import { PageLoader } from "@/components/ui/page-loader"

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
    num_nights: "1",
    charge_per_night: "",
    expected_checkout_date: "",
    create_bill: false,
  })

  // Calculate total charge
  const totalCharge = formData.is_overnight && formData.charge_per_night
    ? parseFloat(formData.charge_per_night) * parseInt(formData.num_nights || "1")
    : 0

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
          room: transformJoin(tenant.room),
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

      const numNights = formData.is_overnight ? parseInt(formData.num_nights || "1") : null
      const chargePerNight = formData.is_overnight && formData.charge_per_night
        ? parseFloat(formData.charge_per_night)
        : null
      const overnightCharge = numNights && chargePerNight ? numNights * chargePerNight : null

      // Calculate expected checkout date if overnight
      let expectedCheckout: string | null = null
      if (formData.is_overnight && numNights) {
        if (formData.expected_checkout_date) {
          expectedCheckout = formData.expected_checkout_date
        } else {
          const checkoutDate = new Date()
          checkoutDate.setDate(checkoutDate.getDate() + numNights)
          expectedCheckout = checkoutDate.toISOString().split("T")[0]
        }
      }

      // Create bill first if requested and there's a charge
      let billId: string | null = null
      if (formData.create_bill && overnightCharge && overnightCharge > 0 && numNights && chargePerNight) {
        const billNumber = `VIS-${Date.now().toString(36).toUpperCase()}`
        const today = new Date().toISOString().split("T")[0]

        const { data: billData, error: billError } = await supabase
          .from("bills")
          .insert({
            owner_id: user.id,
            tenant_id: formData.tenant_id,
            property_id: formData.property_id,
            bill_number: billNumber,
            bill_date: today,
            due_date: expectedCheckout || today,
            total_amount: overnightCharge,
            balance_due: overnightCharge,
            status: "pending",
            line_items: [{
              description: `Visitor Stay - ${formData.visitor_name} (${numNights} night${numNights > 1 ? "s" : ""})`,
              quantity: numNights,
              rate: chargePerNight,
              amount: overnightCharge,
            }],
            notes: `Visitor: ${formData.visitor_name}${formData.relation ? ` (${formData.relation})` : ""}`,
          })
          .select("id")
          .single()

        if (billError) {
          console.error("Error creating bill:", billError)
          toast.error("Failed to create bill, but visitor will be checked in")
        } else {
          billId = billData.id
        }
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
        num_nights: numNights,
        charge_per_night: chargePerNight,
        overnight_charge: overnightCharge,
        expected_checkout_date: expectedCheckout,
        bill_id: billId,
      })

      if (error) {
        console.error("Error creating visitor:", error)
        throw error
      }

      const message = billId
        ? "Visitor checked in and bill created!"
        : "Visitor checked in successfully!"
      toast.success(message)
      router.push("/visitors")
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to check in visitor. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoader />
  }

  if (properties.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/visitors">
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
            <Link href="/properties/new">
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
        <Link href="/visitors">
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
              <div className="space-y-4 pt-2 border-t">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="num_nights">Number of Nights *</Label>
                    <Input
                      id="num_nights"
                      name="num_nights"
                      type="number"
                      min="1"
                      max="365"
                      value={formData.num_nights}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="charge_per_night">Charge per Night (₹)</Label>
                    <div className="relative">
                      <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="charge_per_night"
                        name="charge_per_night"
                        type="number"
                        min="0"
                        placeholder="e.g., 200"
                        value={formData.charge_per_night}
                        onChange={handleChange}
                        disabled={loading}
                        className="pl-9"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expected_checkout_date">Expected Checkout Date</Label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="expected_checkout_date"
                      name="expected_checkout_date"
                      type="date"
                      value={formData.expected_checkout_date}
                      onChange={handleChange}
                      disabled={loading}
                      className="pl-9"
                      min={new Date().toISOString().split("T")[0]}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auto-calculated if not specified based on number of nights
                  </p>
                </div>

                {totalCharge > 0 && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted-foreground">Total Charge</span>
                      <span className="text-xl font-bold text-purple-600">
                        ₹{totalCharge.toLocaleString("en-IN")}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      {formData.num_nights} night{parseInt(formData.num_nights) > 1 ? "s" : ""} × ₹{parseFloat(formData.charge_per_night).toLocaleString("en-IN")}/night
                    </p>

                    <div className="pt-3 border-t border-purple-200">
                      <div className="flex items-center gap-2">
                        <input
                          id="create_bill"
                          name="create_bill"
                          type="checkbox"
                          checked={formData.create_bill}
                          onChange={handleChange}
                          disabled={loading}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <Label htmlFor="create_bill" className="font-normal cursor-pointer flex items-center gap-2">
                          <FileText className="h-4 w-4 text-purple-600" />
                          Create bill for tenant
                        </Label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 ml-6">
                        Bill will be created for the visiting tenant with visitor stay charges
                      </p>
                    </div>
                  </div>
                )}

                {!formData.charge_per_night && (
                  <p className="text-xs text-muted-foreground">
                    Leave charge empty if no fee for overnight stays
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Link href="/visitors">
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
