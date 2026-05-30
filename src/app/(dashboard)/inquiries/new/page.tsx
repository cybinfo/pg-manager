"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, FormField } from "@/components/ui/form-components"
import { requiredField, requiredPhone, requiredSelect } from "@/lib/validation"
import { Inbox, Loader2 } from "lucide-react"
import { DatePicker } from "@/components/ui/date-picker"
import { DetailHero } from "@/components/ui"
import { PermissionGuard } from "@/components/auth"
import { defaultConfigurableRoomTypes, ConfigurableRoomType } from "@/types/rooms.types"
import type { PropertyOption } from "@/types/properties.types"
import { INQUIRY_SOURCE_LABELS } from "@/lib/status"

const SOURCE_OPTIONS = Object.entries(INQUIRY_SOURCE_LABELS).map(([value, label]) => ({ value, label }))

export default function NewInquiryPage() {
  return (
    <PermissionGuard permission="tenants.create">
      <NewInquiryContent />
    </PermissionGuard>
  )
}

function NewInquiryContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/inquiries" })
  const { user } = useAuth()
  const [properties, setProperties] = useState<PropertyOption[]>([])
  const [roomTypes, setRoomTypes] = useState<ConfigurableRoomType[]>(defaultConfigurableRoomTypes)

  const {
    formData,
    handleChange,
    handleSubmit,
    saving,
    errors,
    setField,
  } = useFormPage({
    table: "website_inquiries",
    initialData: {
      property_id: "",
      name: "",
      phone: "",
      email: "",
      source: "phone",
      preferred_room_type: "",
      expected_move_in: "",
      message: "",
      status: "new",
    },
    redirectTo: "/inquiries",
    successMessage: "Inquiry logged successfully!",
    errorMessage: "Failed to log inquiry",
    addOwnerId: true,
    validationSchema: {
      property_id: requiredSelect("Property"),
      name: requiredField("Name"),
      phone: requiredPhone("Phone Number"),
    },
    transform: (data) => ({
      property_id: data.property_id,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      source: data.source,
      preferred_room_type: data.preferred_room_type || null,
      expected_move_in: data.expected_move_in || null,
      message: data.message || null,
      status: "new",
    }),
  })

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      const [propertiesRes, configRes] = await Promise.all([
        supabase.from("properties").select("id, name").order("name"),
        user
          ? supabase.from("owner_config").select("room_types").eq("owner_id", user.id).single()
          : null,
      ])

      if (!propertiesRes.error) setProperties(propertiesRes.data || [])

      if (configRes?.data?.room_types && Array.isArray(configRes.data.room_types)) {
        setRoomTypes(configRes.data.room_types)
      }
    }

    fetchData()
  }, [user])

  const enabledRoomTypes = roomTypes.filter((rt) => rt.is_enabled).sort((a, b) => a.display_order - b.display_order)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Log Inquiry"
        subtitle="Record a phone, WhatsApp, or walk-in inquiry"
        backHref={backHref}
        backLabel="Back to Inquiries"
        icon={Inbox}
        breadcrumbs={[
          { label: "Inquiries", href: "/inquiries" },
          { label: "Log Inquiry" },
        ]}
      />

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Inbox className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Inquiry Details</CardTitle>
                <CardDescription>Enter the prospect&apos;s contact and preference details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Property + Source */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Property" required error={errors.property_id}>
                <Select
                  id="property_id"
                  name="property_id"
                  value={formData.property_id as string}
                  onChange={handleChange}
                  disabled={saving}
                  options={properties.map((p) => ({ value: p.id, label: p.name }))}
                  placeholder="Select property"
                />
              </FormField>
              <FormField label="Source">
                <Select
                  id="source"
                  name="source"
                  value={formData.source as string}
                  onChange={handleChange}
                  disabled={saving}
                  options={SOURCE_OPTIONS}
                />
              </FormField>
            </div>

            {/* Name + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Name" required error={errors.name}>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Rahul Sharma"
                  value={formData.name as string}
                  onChange={handleChange}
                  disabled={saving}
                />
              </FormField>
              <FormField label="Phone" required error={errors.phone}>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="e.g., 9876543210"
                  value={formData.phone as string}
                  onChange={handleChange}
                  disabled={saving}
                  maxLength={10}
                />
              </FormField>
            </div>

            {/* Email */}
            <FormField label="Email">
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="e.g., rahul@example.com"
                value={formData.email as string}
                onChange={handleChange}
                disabled={saving}
              />
            </FormField>

            {/* Preferences */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Preferred Room Type">
                <Select
                  id="preferred_room_type"
                  name="preferred_room_type"
                  value={formData.preferred_room_type as string}
                  onChange={handleChange}
                  disabled={saving}
                  options={enabledRoomTypes.map((rt) => ({ value: rt.code, label: rt.name }))}
                  placeholder="Any / Not specified"
                />
              </FormField>
              <FormField label="Expected Move-in">
                <DatePicker
                  id="expected_move_in"
                  value={formData.expected_move_in as string}
                  onChange={(val) => setField("expected_move_in", val)}
                  disabled={saving}
                />
              </FormField>
            </div>

            {/* Message */}
            <FormField label="Notes / Message">
              <Textarea
                id="message"
                name="message"
                placeholder="Any notes about this inquiry..."
                value={formData.message as string}
                onChange={handleChange}
                disabled={saving}
                rows={3}
              />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={backHref}>
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Logging...
              </>
            ) : (
              "Log Inquiry"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
