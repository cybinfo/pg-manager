"use client"

import Link from "next/link"
import { Briefcase, Loader2, Phone, Mail, Globe, FileText, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField, Select } from "@/components/ui/form-components"
import { DetailHero, DetailSection } from "@/components/ui"
import { PermissionGuard } from "@/components/auth"
import { useBusinessCreateForm } from "@/lib/hooks/forms/useBusinessCreateForm"
import { BUSINESS_ENTITY_TYPE_OPTIONS } from "@/types/business.types"

export default function NewBusinessPage() {
  return (
    <PermissionGuard permission="businesses.create">
      <NewBusinessContent />
    </PermissionGuard>
  )
}

function NewBusinessContent() {
  const { backHref, loading, formData, handleChange, doSubmit } = useBusinessCreateForm()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Add Business"
        subtitle="Create a new business or brand"
        backHref={backHref}
        backLabel="All Businesses"
        icon={Briefcase}
        breadcrumbs={[
          { label: "Businesses", href: "/businesses" },
          { label: "Add Business" },
        ]}
      />

      <form onSubmit={doSubmit} className="space-y-6">
        {/* Identity */}
        <DetailSection title="Business Details" icon={Briefcase}>
          <FormField label="Business Name" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              placeholder="e.g., Greenhigh Homes"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
            />
          </FormField>

          <FormField label="Legal / Registered Name" htmlFor="legal_name">
            <Input
              id="legal_name"
              name="legal_name"
              placeholder="e.g., Greenhigh Vincom Pvt. Ltd."
              value={formData.legal_name}
              onChange={handleChange}
              disabled={loading}
            />
          </FormField>

          <FormField label="Business Type" htmlFor="business_type">
            <Select
              value={formData.business_type}
              onChange={handleChange}
              name="business_type"
              placeholder="Select type"
              disabled={loading}
              options={BUSINESS_ENTITY_TYPE_OPTIONS}
            />
          </FormField>

          <FormField label="Description" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              placeholder="Brief description (optional)"
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
              rows={2}
            />
          </FormField>
        </DetailSection>

        {/* Legal & Tax */}
        <DetailSection title="Legal & Tax" icon={FileText}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="GST Number" htmlFor="gst_number">
              <Input
                id="gst_number"
                name="gst_number"
                placeholder="27XXXXXXXXXXXXX"
                value={formData.gst_number}
                onChange={handleChange}
                disabled={loading}
                className="uppercase"
              />
            </FormField>

            <FormField label="PAN Number" htmlFor="pan_number">
              <Input
                id="pan_number"
                name="pan_number"
                placeholder="XXXXXXXXXX"
                value={formData.pan_number}
                onChange={handleChange}
                disabled={loading}
                className="uppercase"
              />
            </FormField>
          </div>

          <FormField label="Registration / CIN Number" htmlFor="registration_number">
            <Input
              id="registration_number"
              name="registration_number"
              placeholder="Registration or CIN number"
              value={formData.registration_number}
              onChange={handleChange}
              disabled={loading}
            />
          </FormField>
        </DetailSection>

        {/* Registered Address */}
        <DetailSection title="Registered Address" icon={MapPin}>
          <FormField label="Address" htmlFor="reg_address">
            <Input
              id="reg_address"
              name="reg_address"
              placeholder="Street / locality"
              value={formData.reg_address}
              onChange={handleChange}
              disabled={loading}
            />
          </FormField>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <FormField label="City" htmlFor="reg_city">
              <Input
                id="reg_city"
                name="reg_city"
                placeholder="City"
                value={formData.reg_city}
                onChange={handleChange}
                disabled={loading}
              />
            </FormField>

            <FormField label="State" htmlFor="reg_state">
              <Input
                id="reg_state"
                name="reg_state"
                placeholder="State"
                value={formData.reg_state}
                onChange={handleChange}
                disabled={loading}
              />
            </FormField>

            <FormField label="Pincode" htmlFor="reg_pincode">
              <Input
                id="reg_pincode"
                name="reg_pincode"
                placeholder="Pincode"
                value={formData.reg_pincode}
                onChange={handleChange}
                disabled={loading}
                maxLength={6}
              />
            </FormField>
          </div>
        </DetailSection>

        {/* Contact */}
        <DetailSection title="Contact" icon={Phone}>
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
                  placeholder="business@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  className="pl-9"
                />
              </div>
            </FormField>
          </div>

          <FormField label="Website" htmlFor="website">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://www.example.com"
                value={formData.website}
                onChange={handleChange}
                disabled={loading}
                className="pl-9"
              />
            </div>
          </FormField>
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href="/businesses">
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
                <Briefcase className="mr-2 h-4 w-4" />
                Create Business
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
