"use client"

import Link from "next/link"
import { MapPin, Loader2, Phone, Mail, Clock, Briefcase } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField, Select } from "@/components/ui/form-components"
import { DetailHero, DetailSection } from "@/components/ui"
import { PageSkeleton } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"
import { useLocationCreateForm } from "@/lib/hooks/forms/useLocationCreateForm"
import { EmptyState } from "@/components/ui"

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
  "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram",
  "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
  "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Delhi", "Jammu & Kashmir", "Ladakh", "Puducherry", "Chandigarh",
]

export default function NewLocationPage() {
  return (
    <PermissionGuard permission="locations.create">
      <NewLocationContent />
    </PermissionGuard>
  )
}

function NewLocationContent() {
  const { backHref, loading, loadingData, businesses, formData, handleChange, doSubmit } =
    useLocationCreateForm()

  if (loadingData) return <PageSkeleton variant="form" />

  if (businesses.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <DetailHero
          title="Add Location"
          subtitle="Add a physical location to a business"
          backHref={backHref}
          backLabel="All Locations"
          icon={MapPin}
        />
        <EmptyState
          icon={Briefcase}
          title="No businesses yet"
          description="You need to create a business before adding a location."
          action={{ label: "Create a Business", href: "/businesses/new" }}
        />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Add Location"
        subtitle="Add a physical location to a business"
        backHref={backHref}
        backLabel="All Locations"
        icon={MapPin}
        breadcrumbs={[
          { label: "Locations", href: "/locations" },
          { label: "Add Location" },
        ]}
      />

      <form onSubmit={doSubmit} className="space-y-6">
        {/* Business & Identity */}
        <DetailSection title="Location Identity" description="Which business does this location belong to?" icon={Briefcase}>
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
              placeholder="e.g., Main Branch, FC Road, Koregaon Park"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
            />
          </FormField>

          <FormField label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              placeholder="Brief description of this location"
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
              rows={2}
            />
          </FormField>

          <div className="flex items-center gap-3 pt-1">
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
              This is the primary / head-office location
            </label>
          </div>
        </DetailSection>

        {/* Address */}
        <DetailSection title="Address" description="Physical address of this location" icon={MapPin}>
          <FormField label="Street Address" htmlFor="address">
            <Input
              id="address"
              name="address"
              placeholder="e.g., 123 FC Road, Shivajinagar"
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
                placeholder="e.g., Pune"
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
                placeholder="411001"
                value={formData.pincode}
                onChange={handleChange}
                disabled={loading}
                maxLength={6}
              />
            </FormField>
          </div>
        </DetailSection>

        {/* Contact */}
        <DetailSection title="Contact & Hours" description="Location-specific contact and operating hours" icon={Phone}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Phone" htmlFor="phone">
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
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
                  placeholder="location@example.com"
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
          <Link href="/locations">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <MapPin className="mr-2 h-4 w-4" />
                Create Location
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
