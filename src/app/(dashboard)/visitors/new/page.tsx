"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, FormField } from "@/components/ui/form-components"
import {
  UserPlus,
  Loader2,
  Building2,
  MessageSquare,
} from "lucide-react"
import { Textarea } from "@/components/ui/textarea"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { PageSkeleton } from "@/components/ui/loading"

import { PermissionGuard } from "@/components/auth"
import {
  VisitorTypeSelector,
  VisitorTypeFields,
  OvernightStaySection,
  PersonStepCard,
  VisitDetailsCard,
  useVisitorForm,
} from "./_components"
import { DetailHero, DetailSection, EmptyState } from "@/components/ui"

export default function NewVisitorPage() {
  return (
    <PermissionGuard permission="visitors.create">
      <NewVisitorContent />
    </PermissionGuard>
  )
}

function NewVisitorContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/visitors" })
  const {
    loading,
    loadingData,
    properties,
    filteredTenants,
    filteredRooms,
    ownerId,
    selectedPerson,
    selectedContact,
    formData,
    totalCharge,
    handleChange,
    handlePersonSelect,
    handleVisitorTypeChange,
    handleRoomsInterestedChange,
    handleClearContact,
    handleSubmit,
  } = useVisitorForm()

  const isEnquiry = formData.visitor_type === "enquiry"

  if (loadingData) {
    return <PageSkeleton variant="form" />
  }

  if (properties.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <DetailHero
          title="Check In Visitor"
          subtitle="Register a new visitor"
          backHref={backHref}
          backLabel="All Visitors"
          icon={UserPlus}
          breadcrumbs={[
            { label: "Visitors", href: "/visitors" },
            { label: "Add Visitor" },
          ]}
        />

        <DetailSection title="No Properties Found" icon={Building2}>
          <EmptyState
            icon={Building2}
            title="No properties found"
            description="Add a property before logging visitors"
            action={{ label: "Add Property First", href: "/properties/new" }}
          />
        </DetailSection>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title={isEnquiry ? "Log Enquiry" : "Check In Visitor"}
        subtitle={isEnquiry ? "Record a prospective tenant enquiry" : "Register a new or returning visitor"}
        backHref={backHref}
        backLabel="All Visitors"
        icon={UserPlus}
        breadcrumbs={[
          { label: "Visitors", href: "/visitors" },
          { label: isEnquiry ? "Log Enquiry" : "Check In Visitor" },
        ]}
      />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Step 1: Select or Create Person */}
        <PersonStepCard
          ownerId={ownerId}
          selectedPerson={selectedPerson}
          selectedContact={selectedContact}
          loading={loading}
          onPersonSelect={handlePersonSelect}
          onClearContact={handleClearContact}
        />

        {/* Visitor Type Selection */}
        <VisitorTypeSelector
          selectedType={formData.visitor_type}
          onTypeChange={handleVisitorTypeChange}
          selectedContact={selectedContact}
        />

        {/* Property Selection */}
        <DetailSection title="Property" description="Select the property" icon={Building2}>
          <FormField label="Property" htmlFor="property_id" required>
            <Select
              id="property_id"
              name="property_id"
              value={formData.property_id}
              onChange={handleChange}
              required
              disabled={loading}
              options={properties.map((property) => ({
                value: property.id,
                label: property.name,
              }))}
            />
          </FormField>
        </DetailSection>

        {/* Visit Details */}
        <VisitDetailsCard
          vehicleNumber={formData.vehicle_number}
          purpose={formData.purpose}
          selectedPerson={selectedPerson}
          loading={loading}
          onChange={handleChange}
        />

        {/* Visitor Type-Specific Fields */}
        <VisitorTypeFields
          visitorType={formData.visitor_type}
          formData={formData}
          onChange={handleChange}
          onRoomsInterestedChange={handleRoomsInterestedChange}
          filteredTenants={filteredTenants}
          filteredRooms={filteredRooms}
          selectedPerson={selectedPerson}
          loading={loading}
        />

        {/* Notes - Available for all types */}
        <DetailSection title="Additional Notes" description="Any other information" icon={MessageSquare}>
          <Textarea
            id="notes"
            name="notes"
            placeholder="Any additional notes about the visitor..."
            value={formData.notes}
            onChange={handleChange}
            disabled={loading}
            className="min-h-[80px]"
          />
        </DetailSection>

        {/* Overnight Stay - For tenant_visitor and general */}
        {(formData.visitor_type === "tenant_visitor" || formData.visitor_type === "general") && (
          <OvernightStaySection
            formData={formData}
            totalCharge={totalCharge}
            onChange={handleChange}
            loading={loading}
          />
        )}

        <div className="flex justify-end gap-3">
          <Link href="/visitors">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={loading || (formData.visitor_type === "tenant_visitor" && filteredTenants.length === 0)}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isEnquiry ? "Saving..." : "Checking In..."}
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                {isEnquiry ? "Log Enquiry" : "Check In Visitor"}
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
