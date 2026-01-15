/**
 * Edit Meter Page
 *
 * Form to edit meter details (not assignment - that's handled on detail page)
 */

"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  DetailHero,
  DetailSection,
} from "@/components/ui/detail-components"
import { PageLoading } from "@/components/ui/loading"
import { Select } from "@/components/ui/form-components"
import {
  Gauge,
  Zap,
  Droplets,
  Building2,
  Save,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import { PermissionGuard } from "@/components/auth"
import {
  MeterType,
  MeterStatus,
  METER_TYPES,
  METER_STATUSES,
  METER_TYPE_CONFIG,
} from "@/types/meters.types"

// ============================================
// Types
// ============================================

interface Meter {
  id: string
  owner_id: string
  property_id: string
  meter_number: string
  meter_type: MeterType
  status: MeterStatus
  initial_reading: number
  make: string | null
  model: string | null
  installation_date: string | null
  notes: string | null
  property: { id: string; name: string } | null
}

interface Property {
  id: string
  name: string
}

// ============================================
// Component
// ============================================

export default function EditMeterPage() {
  const params = useParams()
  const router = useRouter()
  const [loadingData, setLoadingData] = useState(true)
  const [loading, setLoading] = useState(false)
  const [meter, setMeter] = useState<Meter | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    property_id: "",
    meter_number: "",
    meter_type: "electricity" as MeterType,
    status: "active" as MeterStatus,
    initial_reading: "0",
    make: "",
    model: "",
    installation_date: "",
    notes: "",
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // Fetch meter and properties in parallel
      const [meterRes, propertiesRes] = await Promise.all([
        supabase
          .from("meters")
          .select(`
            *,
            property:properties(id, name)
          `)
          .eq("id", params.id)
          .single(),
        supabase.from("properties").select("id, name").order("name"),
      ])

      if (meterRes.error || !meterRes.data) {
        console.error("Error fetching meter:", meterRes.error)
        toast.error("Meter not found")
        router.push("/meters")
        return
      }

      const meterData = {
        ...meterRes.data,
        property: Array.isArray(meterRes.data.property) ? meterRes.data.property[0] : meterRes.data.property,
      } as Meter

      setMeter(meterData)
      setFormData({
        property_id: meterData.property_id,
        meter_number: meterData.meter_number,
        meter_type: meterData.meter_type,
        status: meterData.status,
        initial_reading: meterData.initial_reading.toString(),
        make: meterData.make || "",
        model: meterData.model || "",
        installation_date: meterData.installation_date || "",
        notes: meterData.notes || "",
      })

      if (propertiesRes.data) {
        setProperties(propertiesRes.data)
      }

      setLoadingData(false)
    }

    fetchData()
  }, [params.id, router])

  const updateField = (field: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.property_id) {
      newErrors.property_id = "Property is required"
    }

    if (!formData.meter_number.trim()) {
      newErrors.meter_number = "Meter number is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate() || !meter) {
      toast.error("Please fix the errors before submitting")
      return
    }

    setLoading(true)
    const supabase = createClient()

    // Check for duplicate meter number (excluding current meter)
    if (formData.meter_number !== meter.meter_number) {
      const { data: existing } = await supabase
        .from("meters")
        .select("id, meter_number")
        .eq("owner_id", meter.owner_id)
        .eq("meter_number", formData.meter_number.trim())
        .neq("id", meter.id)
        .single()

      if (existing) {
        toast.error(`A meter with number "${formData.meter_number}" already exists`)
        setLoading(false)
        return
      }
    }

    const { error } = await supabase
      .from("meters")
      .update({
        property_id: formData.property_id,
        meter_number: formData.meter_number.trim(),
        meter_type: formData.meter_type,
        status: formData.status,
        initial_reading: parseFloat(formData.initial_reading) || 0,
        make: formData.make.trim() || null,
        model: formData.model.trim() || null,
        installation_date: formData.installation_date || null,
        notes: formData.notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", meter.id)

    if (error) {
      console.error("Error updating meter:", error)
      toast.error("Failed to update meter")
      setLoading(false)
      return
    }

    toast.success("Meter updated successfully")
    router.push(`/meters/${meter.id}`)
  }

  if (loadingData) {
    return <PageLoading message="Loading meter details..." />
  }

  if (!meter) {
    return null
  }

  const typeConfig = METER_TYPE_CONFIG[formData.meter_type] || METER_TYPE_CONFIG.electricity
  const TypeIcon = formData.meter_type === "water" ? Droplets : formData.meter_type === "gas" ? Gauge : Zap

  return (
    <PermissionGuard permission="meters.edit">
      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
        {/* Hero Header */}
        <DetailHero
          title="Edit Meter"
          subtitle={meter.meter_number}
          backHref={`/meters/${meter.id}`}
          backLabel="Back to Meter"
          avatar={
            <div className={`p-3 rounded-lg ${typeConfig.bgColor}`}>
              <TypeIcon className={`h-8 w-8 ${typeConfig.color}`} />
            </div>
          }
        />

        {/* Basic Information */}
        <DetailSection
          title="Meter Information"
          description="Basic meter details"
          icon={Gauge}
        >
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="property_id">Property *</Label>
              <Select
                value={formData.property_id}
                onChange={(e) => updateField("property_id", e.target.value)}
                options={[
                  { value: "", label: "Select property" },
                  ...properties.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />
              {errors.property_id && <p className="text-sm text-red-500">{errors.property_id}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meter_number">Meter Number *</Label>
                <Input
                  id="meter_number"
                  value={formData.meter_number}
                  onChange={(e) => updateField("meter_number", e.target.value)}
                  placeholder="e.g., E-001, W-101"
                  className={errors.meter_number ? "border-red-500" : ""}
                />
                {errors.meter_number && <p className="text-sm text-red-500">{errors.meter_number}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="meter_type">Meter Type *</Label>
                <Select
                  value={formData.meter_type}
                  onChange={(e) => updateField("meter_type", e.target.value)}
                  options={METER_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onChange={(e) => updateField("status", e.target.value)}
                  options={METER_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial_reading">Initial Reading</Label>
                <Input
                  id="initial_reading"
                  type="number"
                  value={formData.initial_reading}
                  onChange={(e) => updateField("initial_reading", e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
          </div>
        </DetailSection>

        {/* Additional Details */}
        <DetailSection
          title="Additional Details"
          description="Optional meter information"
          icon={Building2}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="make">Make / Manufacturer</Label>
                <Input
                  id="make"
                  value={formData.make}
                  onChange={(e) => updateField("make", e.target.value)}
                  placeholder="e.g., Secure, HPL"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  value={formData.model}
                  onChange={(e) => updateField("model", e.target.value)}
                  placeholder="e.g., Sprint 350"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="installation_date">Installation Date</Label>
              <Input
                id="installation_date"
                type="date"
                value={formData.installation_date}
                onChange={(e) => updateField("installation_date", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                placeholder="Any additional notes about this meter..."
                rows={3}
              />
            </div>
          </div>
        </DetailSection>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <Link href={`/meters/${meter.id}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
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
      </form>
    </PermissionGuard>
  )
}
