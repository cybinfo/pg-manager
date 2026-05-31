"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormField, Select } from "@/components/ui/form-components"
import {
  Loader2,
  UserPlus,
  Mail,
  Phone,
  Shield,
  Plus,
  X,
  CheckCircle,
} from "lucide-react"
import { EmailInput } from "@/components/ui/form-components"
import { PageSkeleton } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui"
import { PermissionGuard } from "@/components/auth"
import { PersonSelector } from "@/components/people"
import {
  WorkflowStepper,
  WorkflowStepCard,
  WorkflowHeader,
  WorkflowStepDef,
  WorkflowContinueButton,
} from "@/components/ui/workflow"
import { useStaffCreateForm } from "@/lib/hooks/forms/useStaffCreateForm"

const STEPS: WorkflowStepDef[] = [
  { id: 1, label: "Select Person", icon: Mail },
  { id: 2, label: "Role & Access", icon: Shield },
  { id: 3, label: "Confirm & Invite", icon: UserPlus },
]

export default function NewStaffPage() {
  return (
    <PermissionGuard permission="staff.create">
      <NewStaffContent />
    </PermissionGuard>
  )
}

function NewStaffContent() {
  const router = useRouter()
  const {
    backHref,
    loading,
    loadingData,
    roles,
    properties,
    roleAssignments,
    currentStep,
    setCurrentStep,
    ownerId,
    selectedPerson,
    formData,
    handleChange,
    handlePersonSelect,
    addRoleAssignment,
    updateRoleAssignment,
    removeRoleAssignment,
    doSubmit,
    step1Complete,
    step2Complete,
    staffName,
    staffEmail,
    staffPhone,
  } = useStaffCreateForm()

  if (loadingData) {
    return <PageSkeleton variant="form" />
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <WorkflowHeader
        title="Add Staff Member"
        subtitle="Invite someone to manage your property"
        icon={UserPlus}
        onBack={() => router.push(backHref)}
        backLabel="Back to Staff"
      />

      <WorkflowStepper steps={STEPS} currentStep={currentStep} />

      {/* Step 1: Select Person */}
      <WorkflowStepCard
        stepNum={1}
        title="Select Person"
        description="Search for an existing person or create a new one"
        icon={Mail}
        currentStep={currentStep}
        onEdit={() => setCurrentStep(1)}
        completedSummary={
          selectedPerson
            ? `${selectedPerson.name}${staffEmail ? ` · ${staffEmail}` : ""}`
            : undefined
        }
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
              showDetailedInfo={false}
            />
          ) : (
            <div className="h-10 flex items-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Loading...
            </div>
          )}

          {selectedPerson && (
            <>
              <FormField
                label="Email Address"
                required
                hint="An invitation email will be sent to this address"
              >
                <EmailInput
                  id="email"
                  name="email"
                  placeholder="staff@example.com"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </FormField>

              <FormField label="Phone Number">
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
            </>
          )}

          <WorkflowContinueButton
            onClick={() => setCurrentStep(2)}
            disabled={!step1Complete}
            disabledReason={
              !selectedPerson
                ? "Select a person to continue"
                : !formData.email
                ? "Enter an email address to continue"
                : undefined
            }
          />
        </div>
      </WorkflowStepCard>

      {/* Step 2: Role & Access */}
      <WorkflowStepCard
        stepNum={2}
        title="Role & Access"
        description="Assign roles and property scope"
        icon={Shield}
        currentStep={currentStep}
        onEdit={() => setCurrentStep(2)}
        completedSummary={
          roleAssignments.length > 0
            ? `${roleAssignments.length} role${roleAssignments.length > 1 ? "s" : ""} assigned`
            : undefined
        }
      >
        <div className="space-y-4">
          {roles.length === 0 ? (
            <EmptyState
              variant="minimal"
              icon={Shield}
              title="No roles created yet"
              action={{ label: "Create your first role", href: "/staff/roles/new" }}
            />
          ) : (
            <>
              {roleAssignments.length === 0 ? (
                <EmptyState
                  variant="minimal"
                  icon={Shield}
                  title="No roles assigned yet"
                  description='Click "Add Role" to assign permissions'
                />
              ) : (
                <div className="space-y-3">
                  {roleAssignments.map((assignment, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs text-muted-foreground">Role</Label>
                          <Select
                            value={assignment.role_id}
                            onChange={(e) => updateRoleAssignment(index, "role_id", e.target.value)}
                            disabled={loading}
                            options={roles.map((role) => ({
                              value: role.id,
                              label: role.name,
                            }))}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Property (Optional)</Label>
                          <Select
                            value={assignment.entity_id || ""}
                            onChange={(e) =>
                              updateRoleAssignment(
                                index,
                                "entity_id",
                                e.target.value || null
                              )
                            }
                            disabled={loading}
                            placeholder="All Properties"
                            options={properties.map((property) => ({
                              value: property.id,
                              label: property.name,
                            }))}
                          />
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeRoleAssignment(index)}
                        disabled={loading}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addRoleAssignment}
                disabled={loading || roles.length === 0}
                className="w-full"
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Another Role
              </Button>
            </>
          )}

          <WorkflowContinueButton
            onClick={() => setCurrentStep(3)}
            disabled={!step2Complete}
            disabledReason={!step2Complete ? "Add at least one role to continue" : undefined}
          />
        </div>
      </WorkflowStepCard>

      {/* Step 3: Confirm & Invite */}
      <WorkflowStepCard
        stepNum={3}
        title="Confirm & Invite"
        description="Review and send the invitation"
        icon={UserPlus}
        currentStep={currentStep}
      >
        <div className="space-y-5">
          {/* Summary */}
          <div className="space-y-3 rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{staffName || "—"}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">Email</span>
              <span className="font-medium">{staffEmail || "—"}</span>
            </div>
            {staffPhone && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Phone</span>
                <span className="font-medium">{staffPhone}</span>
              </div>
            )}
            {roleAssignments.length > 0 && (
              <div className="pt-1 border-t space-y-1.5">
                <span className="text-muted-foreground block">Roles</span>
                {roleAssignments.map((assignment, i) => {
                  const role = roles.find(r => r.id === assignment.role_id)
                  const property = properties.find(p => p.id === assignment.entity_id)
                  return (
                    <div key={i} className="flex items-center gap-2 pl-2">
                      <Shield className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="font-medium">{role?.name || "Unknown"}</span>
                      {property && (
                        <span className="text-muted-foreground">· {property.name}</span>
                      )}
                      {!property && (
                        <span className="text-muted-foreground">· All Properties</span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Invitation info */}
          {staffEmail && (
            <div className="flex items-start gap-3 rounded-lg border border-info/30 bg-info/10 p-3 text-sm text-info">
              <CheckCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <p>An invitation email will be sent to <strong>{staffEmail}</strong> with a signup link to access the dashboard.</p>
            </div>
          )}

          {/* Submit */}
          <Button
            className="w-full"
            onClick={doSubmit}
            disabled={loading || !step1Complete || !step2Complete}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Staff Member
              </>
            )}
          </Button>

          <div className="text-center">
            <Link href="/staff">
              <Button type="button" variant="ghost" size="sm" disabled={loading}>
                Cancel
              </Button>
            </Link>
          </div>
        </div>
      </WorkflowStepCard>
    </div>
  )
}
