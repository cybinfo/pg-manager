"use client"

import Link from "next/link"
import { Briefcase, Loader2, Phone, Mail, Globe, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormField, Select } from "@/components/ui/form-components"
import { DetailHero, DetailSection } from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import { PermissionGuard } from "@/components/auth"
import { useBusinessEditForm } from "@/lib/hooks/forms/useBusinessEditForm"
import { BUSINESS_ENTITY_TYPE_OPTIONS } from "@/types/business.types"

export default function EditBusinessPage() {
  return (
    <PermissionGuard permission="businesses.edit">
      <EditBusinessContent />
    </PermissionGuard>
  )
}

function EditBusinessContent() {
  const { id, backHref, loading, loadingData, formData, handleChange, handleSubmit } =
    useBusinessEditForm()

  if (loadingData) return <PageLoading />

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Edit Business"
        subtitle={formData.name || "Update business details"}
        backHref={backHref}
        backLabel="Back"
        icon={Briefcase}
        breadcrumbs={[
          { label: "Businesses", href: "/businesses" },
          { label: formData.name || "Business", href: `/businesses/${id}` },
          { label: "Edit" },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Identity */}
        <DetailSection title="Business Identity" icon={Briefcase}>
          <FormField label="Business Name" htmlFor="name" required>
            <Input
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              disabled={loading}
            />
          </FormField>

          <FormField label="Legal / Registered Name" htmlFor="legal_name">
            <Input
              id="legal_name"
              name="legal_name"
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
              value={formData.description}
              onChange={handleChange}
              disabled={loading}
              rows={3}
            />
          </FormField>

          <div className="flex items-center gap-3 pt-1">
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
              Business is active
            </label>
          </div>
        </DetailSection>

        {/* Legal & Tax */}
        <DetailSection title="Legal & Tax Details" icon={FileText}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="GST Number" htmlFor="gst_number">
              <Input
                id="gst_number"
                name="gst_number"
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
                value={formData.pan_number}
                onChange={handleChange}
                disabled={loading}
                className="uppercase"
              />
            </FormField>
          </div>

          <FormField label="Registration Number" htmlFor="registration_number">
            <Input
              id="registration_number"
              name="registration_number"
              value={formData.registration_number}
              onChange={handleChange}
              disabled={loading}
            />
          </FormField>
        </DetailSection>

        {/* Contact */}
        <DetailSection title="Contact Details" icon={Phone}>
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

          <FormField label="Website" htmlFor="website">
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="website"
                name="website"
                type="url"
                value={formData.website}
                onChange={handleChange}
                disabled={loading}
                className="pl-9"
              />
            </div>
          </FormField>
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href={`/businesses/${id}`}>
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
