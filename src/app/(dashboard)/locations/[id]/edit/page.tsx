"use client"

import Link from "next/link"
import { MapPin, Loader2, Phone, Mail, Clock, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField, Select } from "@/components/ui/form-components"
import { DetailHero, DetailSection } from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"
import { useLocationEditForm } from "@/lib/hooks/forms/useLocationEditForm"

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
]

export default function EditLocationPage() {
  return (
    <PermissionGuard permission="locations.edit">
      <EditLocationContent />
    </PermissionGuard>
  )
}

function EditLocationContent() {
  const { id, backHref, loading, loadingData, businesses, formData, handleChange, handleSubmit } =
    useLocationEditForm()

  if (loadingData) return <PageLoading />

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Edit Location"
        subtitle={formData.name || "Update location details"}
        backHref={backHref}
        backLabel="Back"
        icon={MapPin}
        breadcrumbs={[
          { label: "Locations", href: "/locations" },
          { label: formData.name || "Location", href: `/locations/${id}` },
          { label: "Edit" },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identity */}
        <DetailSection title="Location Identity" icon={Briefcase}>
          <FormField label="Business" htmlFor="business_id" required>
            <Select
              value={formData.business_id}
              onChange={handleChange}
              name="business_id"
              placeholder="Select a business"
              disabled={loading}
              options={businesses.map((b) => ({ value: b.id, label: b.name }))}
            />
          </FormField>

          <FormField label="Location Name" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
            />
          </FormField>

          <FormField label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
              rows={2}
            />
          </FormField>

          <div className="flex flex-col gap-2 pt-1">
            <div className="flex items-center gap-3">
              <input
                id="is_primary"
                name="is_primary"
                type="checkbox"
                checked={formData.is_primary}
                onChange={handleChange}
                disabled={loading}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="is_primary" className="text-sm font-medium">
                Primary / head-office location
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                id="is_active"
                name="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={handleChange}
                disabled={loading}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="is_active" className="text-sm font-medium">
                Location is active
              </label>
            </div>
          </div>
        </DetailSection>

        {/* Address */}
        <DetailSection title="Address" icon={MapPin}>
          <FormField label="Street Address" htmlFor="address">
            <Input
              id="address"
              name="address"
              value={formData.address}
              onChange={handleChange}
              disabled={loading}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="City" htmlFor="city">
              <Input
                id="city"
                name="city"
                value={formData.city}
                onChange={handleChange}
                disabled={loading}
              />
            </FormField>

            <FormField label="State" htmlFor="state">
              <Select
                value={formData.state}
                onChange={handleChange}
                name="state"
                placeholder="Select state"
                disabled={loading}
                options={INDIAN_STATES.map((s) => ({ value: s, label: s }))}
              />
            </FormField>

            <FormField label="Pincode" htmlFor="pincode">
              <Input
                id="pincode"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                disabled={loading}
                maxLength={6}
              />
            </FormField>
          </div>
        </DetailSection>

        {/* Contact & Hours */}
        <DetailSection title="Contact & Hours" icon={Phone}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Phone" htmlFor="phone">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  disabled={loading}
                  className="pl-9"
                />
              </div>
            </FormField>

            <FormField label="Email" htmlFor="email">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  className="pl-9"
                />
              </div>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Opening Time" htmlFor="opening_time">
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="opening_time"
                  name="opening_time"
                  type="time"
                  value={formData.opening_time}
                  onChange={handleChange}
                  disabled={loading}
                  className="pl-9"
                />
              </div>
            </FormField>

            <FormField label="Closing Time" htmlFor="closing_time">
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="closing_time"
                  name="closing_time"
                  type="time"
                  value={formData.closing_time}
                  onChange={handleChange}
                  disabled={loading}
                  className="pl-9"
                />
              </div>
            </FormField>
          </div>
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href={`/locations/${id}`}>
            <Button type="button" variant="outline" disabled={loading}>
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
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
