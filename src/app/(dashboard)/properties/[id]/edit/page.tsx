"use client"

import Link from "next/link"
import { Building2, Globe, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DetailHero } from "@/components/ui"
import { PermissionGuard } from "@/components/auth"
import { PageLoading } from "@/components/ui/loading"
import { usePropertyEditForm } from "@/lib/hooks/forms/usePropertyEditForm"

import {
  PropertyDetailsTab,
  TenantPortalTab,
  WebsiteSettingsTab,
} from "./_components"

export default function EditPropertyPage() {
  return (
    <PermissionGuard permission="properties.edit">
      <EditPropertyContent />
    </PermissionGuard>
  )
}

function EditPropertyContent() {
  const {
    backHref,
    params,
    loading,
    loadingData,
    activeTab,
    setActiveTab,
    formData,
    setFormData,
    websiteData,
    tenantFeatures,
    handleChange,
    handleWebsiteChange,
    handleTenantFeatureChange,
    handleSubmit,
  } = usePropertyEditForm()

  if (loadingData) {
    return <PageLoading />
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <DetailHero
        title="Edit Property"
        subtitle={formData.name || "Update property details and website settings"}
        backHref={backHref}
        backLabel="All Properties"
        icon={Building2}
        breadcrumbs={[
          { label: "Properties", href: "/properties" },
          { label: "Edit Property" },
        ]}
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("details")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "details"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="h-4 w-4 inline mr-2" />
          Property Details
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("tenant")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "tenant"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
          Tenant Portal
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("website")}
          className={`px-4 py-2 font-medium border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "website"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          <Globe className="h-4 w-4 inline mr-2" />
          Website Settings
          {websiteData.website_enabled && (
            <span className="ml-2 px-2 py-0.5 bg-success/10 text-success text-xs rounded-full">
              Live
            </span>
          )}
        </button>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {activeTab === "details" && (
          <PropertyDetailsTab
            formData={formData}
            onChange={handleChange}
            setFormData={setFormData}
            loading={loading}
          />
        )}

        {activeTab === "tenant" && (
          <TenantPortalTab
            tenantFeatures={tenantFeatures}
            onFeatureChange={handleTenantFeatureChange}
            loading={loading}
          />
        )}

        {activeTab === "website" && (
          <WebsiteSettingsTab
            websiteData={websiteData}
            onWebsiteChange={handleWebsiteChange}
            propertyName={formData.name}
          />
        )}

        <div className="flex justify-end gap-3">
          <Link href={`/properties/${params.id}`}>
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </div>
  )
}
