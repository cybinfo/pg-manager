"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Select, FormField } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ArrowLeft,
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

  if (loadingData) {
    return <PageSkeleton variant="form" />
  }

  if (properties.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link href={backHref}>
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
        <Link href={backHref}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Check In Visitor</h1>
          <p className="text-muted-foreground">Register a new or returning visitor</p>
        </div>
      </div>

      {/* Form */}
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
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Property</CardTitle>
                <CardDescription>Select the property</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

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
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <CardTitle>Additional Notes</CardTitle>
                <CardDescription>Any other information</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any additional notes about the visitor..."
              value={formData.notes}
              onChange={handleChange}
              disabled={loading}
              className="min-h-[80px]"
            />
          </CardContent>
        </Card>

        {/* Overnight Stay - For tenant_visitor and general */}
        {(formData.visitor_type === "tenant_visitor" || formData.visitor_type === "general") && (
          <OvernightStaySection
            formData={formData}
            totalCharge={totalCharge}
            onChange={handleChange}
            loading={loading}
          />
        )}

        <div className="flex justify-end gap-4">
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
