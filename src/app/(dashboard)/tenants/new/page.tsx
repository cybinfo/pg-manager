"use client"

import Link from "next/link"
import { PermissionGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { FormField, Select } from "@/components/ui/form-components"
import { Card, CardContent } from "@/components/ui/card"
import {
  Users, Loader2, Building2, Home, RefreshCw,
  Shield, ChevronRight, FileText, Wrench, CheckCircle2
} from "lucide-react"
import { formatCurrency } from "@/lib/format"
import { PageSkeleton } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui"
import { Checkbox } from "@/components/ui/checkbox"
import { POLICE_VERIFICATION_STATUS_OPTIONS } from "@/lib/status"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import {
  WorkflowStepper,
  WorkflowStepCard,
  WorkflowHeader,
  WorkflowStepDef,
} from "@/components/ui/workflow"
import { PersonSelector } from "@/components/people"
import { useTenantCreateForm } from "@/lib/hooks/forms/useTenantCreateForm"

const STEPS: WorkflowStepDef[] = [
  { id: 1, label: "Select Person", icon: Users },
  { id: 2, label: "Room", icon: Home },
  { id: 3, label: "Verification", icon: Shield },
  { id: 4, label: "Confirm", icon: CheckCircle2 },
]

export default function NewTenantPage() {
  return (
    <PermissionGuard permission="tenants.create">
      <NewTenantContent />
    </PermissionGuard>
  )
}

function NewTenantContent() {
  const {
    loading,
    loadingData,
    currentStep,
    setCurrentStep,
    ownerId,
    selectedPerson,
    formData,
    setFormData,
    properties,
    availableRooms,
    step1Complete,
    step2Complete,
    step3Complete,
    selectedProperty,
    selectedRoom,
    verificationLabel,
    handleChange,
    handlePersonSelect,
    handleSubmit,
    refreshRooms,
    backHref,
    router,
    isFeatureEnabled,
  } = useTenantCreateForm()

  if (loadingData) {
    return <PageSkeleton variant="form" />
  }

  if (properties.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">Add Tenant</h1>
            <p className="text-muted-foreground">Register a new tenant</p>
          </div>
        </div>

        <Card>
          <CardContent className="py-2">
            <EmptyState
              icon={Building2}
              title="No properties found"
              description="You need to create a property and rooms before adding tenants"
              action={{ label: "Add Property First", href: "/properties/new" }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dashboard" className="flex items-center gap-1 hover:text-foreground transition-colors">
          <Home className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only">Dashboard</span>
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        <Link href="/tenants" className="hover:text-foreground transition-colors">
          Tenants
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
        <span className="text-foreground font-medium">Add New</span>
      </nav>

      {/* Header */}
      <WorkflowHeader
        title="Add Tenant"
        subtitle="Register a new tenant in 4 guided steps"
        icon={Users}
        onBack={() => router.push(backHref)}
        backLabel="Tenants"
      />

      {/* Stepper */}
      <WorkflowStepper steps={STEPS} currentStep={currentStep} />

      {/* Step 1 — Select Person */}
      <WorkflowStepCard
        stepNum={1}
        title="Select Person"
        description="Search for an existing person or add a new one"
        icon={Users}
        currentStep={currentStep}
        onEdit={() => setCurrentStep(1)}
        completedSummary={selectedPerson ? selectedPerson.name : undefined}
      >
        <div className="space-y-4">
          {ownerId ? (
            <PersonSelector
              ownerId={ownerId}
              selectedPersonId={selectedPerson?.id}
              onSelect={handlePersonSelect}
              excludeTags={["blocked"]}
              placeholder="Search by name, phone, or email..."
              disabled={loading}
              required
              showEditLink={true}
              showDetailedInfo={true}
            />
          ) : (
            <div className="h-10 flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </div>
          )}

          {selectedPerson && !selectedPerson.id_documents?.length && (
            <div className="p-3 bg-warning/10 border border-warning/20 rounded-lg">
              <p className="text-sm text-warning">
                <strong>Note:</strong> This person has no ID documents on file.
                For police verification, please add ID documents in the People module.
              </p>
            </div>
          )}

          <Button
            className="w-full"
            disabled={!step1Complete}
            onClick={() => setCurrentStep(2)}
          >
            Save & Continue
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </WorkflowStepCard>

      {/* Step 2 — Room Assignment */}
      <WorkflowStepCard
        stepNum={2}
        title="Room Assignment"
        description="Assign tenant to a property and room"
        icon={Home}
        currentStep={currentStep}
        onEdit={() => setCurrentStep(2)}
        completedSummary={
          step2Complete && selectedProperty && selectedRoom
            ? `${selectedProperty.name} · Room ${selectedRoom.room_number} · ${formatCurrency(parseFloat(formData.monthly_rent))}/mo`
            : undefined
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Property" required>
              <Combobox
                options={properties.map((p): ComboboxOption => ({
                  value: p.id,
                  label: p.name,
                }))}
                value={formData.property_id}
                onValueChange={(value) => setFormData(prev => ({ ...prev, property_id: value }))}
                placeholder="Select property..."
                searchPlaceholder="Search properties..."
                disabled={loading}
              />
            </FormField>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Room *</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={refreshRooms}
                  disabled={loading}
                  className="h-6 px-2 text-xs"
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Refresh
                </Button>
              </div>
              <Combobox
                options={availableRooms.map((r): ComboboxOption => ({
                  value: r.id,
                  label: `Room ${r.room_number}`,
                  description: `${r.occupied_beds}/${r.total_beds} beds - ${formatCurrency(r.rent_amount)}/mo`,
                }))}
                value={formData.room_id}
                onValueChange={(value) => {
                  const room = availableRooms.find(r => r.id === value)
                  setFormData(prev => ({
                    ...prev,
                    room_id: value,
                    monthly_rent: room?.rent_amount?.toString() || prev.monthly_rent,
                    security_deposit: room?.deposit_amount?.toString() || prev.security_deposit,
                  }))
                }}
                placeholder={availableRooms.length === 0 ? "No available rooms" : "Select room..."}
                searchPlaceholder="Search rooms..."
                disabled={loading || availableRooms.length === 0}
              />
              {isFeatureEnabled("properties", "maintenanceMode") && formData.room_id && (() => {
                const room = availableRooms.find(r => r.id === formData.room_id)
                return room?.is_under_maintenance ? (
                  <div className="mt-2 flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                    <Wrench className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                    <p className="text-sm text-warning">
                      This room is under maintenance and cannot accept new tenants.
                    </p>
                  </div>
                ) : null
              })()}
            </div>
          </div>

          <FormField label="Check-in Date" required>
            <DatePicker
              id="check_in_date"
              value={formData.check_in_date}
              onChange={(val) => setFormData((prev) => ({ ...prev, check_in_date: val }))}
              disabled={loading}
            />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Monthly Rent" required>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="monthly_rent"
                  name="monthly_rent"
                  type="number"
                  min="0"
                  placeholder="e.g., 8000"
                  className="pl-8"
                  value={formData.monthly_rent}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
            </FormField>
            <FormField label="Security Deposit">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                  id="security_deposit"
                  name="security_deposit"
                  type="number"
                  min="0"
                  placeholder="e.g., 16000"
                  className="pl-8"
                  value={formData.security_deposit}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </FormField>
          </div>

          <Button
            className="w-full"
            disabled={!step2Complete}
            onClick={() => setCurrentStep(3)}
          >
            Save & Continue
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </WorkflowStepCard>

      {/* Step 3 — Verification */}
      <WorkflowStepCard
        stepNum={3}
        title="Verification & Notes"
        description="Police verification status, agreement, and notes"
        icon={Shield}
        currentStep={currentStep}
        onEdit={() => setCurrentStep(3)}
        completedSummary={
          step3Complete
            ? `${verificationLabel}${formData.agreement_signed ? " · Agreement signed" : ""}`
            : undefined
        }
      >
        <div className="space-y-4">
          <FormField label="Police Verification">
            <Select
              id="police_verification_status"
              name="police_verification_status"
              value={formData.police_verification_status}
              onChange={handleChange}
              disabled={loading}
              options={POLICE_VERIFICATION_STATUS_OPTIONS}
            />
          </FormField>

          <div className="flex items-center gap-2">
            <Checkbox
              id="agreement_signed"
              checked={formData.agreement_signed as boolean}
              onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, agreement_signed: checked === true }))}
              disabled={loading}
            />
            <Label htmlFor="agreement_signed" className="font-normal cursor-pointer">
              Agreement signed
            </Label>
          </div>

          <FormField label="Notes">
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any additional notes about the tenant..."
              value={formData.notes}
              onChange={handleChange}
              disabled={loading}
              className="min-h-[80px]"
            />
          </FormField>

          <Button
            className="w-full"
            onClick={() => setCurrentStep(4)}
          >
            Save & Continue
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </WorkflowStepCard>

      {/* Step 4 — Confirm & Submit */}
      <WorkflowStepCard
        stepNum={4}
        title="Confirm & Add Tenant"
        description="Review details and submit"
        icon={CheckCircle2}
        currentStep={currentStep}
      >
        <div className="space-y-4">
          {/* Summary card */}
          <div className="rounded-lg border bg-muted/30 p-4 space-y-3 text-sm">
            <div className="flex items-center gap-2 pb-2 border-b">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold text-base">Enrollment Summary</span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <span className="text-muted-foreground">Person</span>
              <span className="font-medium">{selectedPerson?.name ?? "—"}</span>

              <span className="text-muted-foreground">Property</span>
              <span className="font-medium">{selectedProperty?.name ?? "—"}</span>

              <span className="text-muted-foreground">Room</span>
              <span className="font-medium">
                {selectedRoom ? `Room ${selectedRoom.room_number}` : "—"}
              </span>

              <span className="text-muted-foreground">Check-in</span>
              <span className="font-medium">{formData.check_in_date || "—"}</span>

              <span className="text-muted-foreground">Monthly Rent</span>
              <span className="font-medium">
                {formData.monthly_rent ? formatCurrency(parseFloat(formData.monthly_rent)) : "—"}
              </span>

              <span className="text-muted-foreground">Deposit</span>
              <span className="font-medium">
                {formData.security_deposit ? formatCurrency(parseFloat(formData.security_deposit)) : "—"}
              </span>

              <span className="text-muted-foreground">Police Verification</span>
              <span className="font-medium">{verificationLabel}</span>

              <span className="text-muted-foreground">Agreement</span>
              <span className="font-medium">{formData.agreement_signed ? "Signed" : "Not signed"}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => router.push("/tenants")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              disabled={loading || !step1Complete || !step2Complete}
              onClick={handleSubmit}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Tenant"
              )}
            </Button>
          </div>
        </div>
      </WorkflowStepCard>
    </div>
  )
}
