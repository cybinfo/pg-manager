/**
 * Assign Locker to Member Page
 *
 * Allows assigning an available locker to a library member.
 * Shows available lockers from the member's library.
 */

"use client"

import { use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DatePicker } from "@/components/ui/date-picker"
import { FormField } from "@/components/ui/form-components"
import { Lock, Loader2, Check, Package, AlertCircle } from "lucide-react"
import { DetailHero, DetailSection, NotFoundState } from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import { Currency } from "@/components/ui/currency"
import { LIBRARY_LOCKER_SIZE_CONFIG } from "@/types/library.types"
import { ModuleGuard, PermissionGuard } from "@/components/auth"
import { useMemberLockerAssignForm } from "@/lib/hooks/forms/useMemberLockerAssignForm"

export default function AssignLockerToMemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: memberId } = use(params)
  const {
    loading,
    loadingData,
    member,
    lockers,
    selectedLockerId,
    setSelectedLockerId,
    formData,
    setFormData,
    handleSubmit,
    backHref,
  } = useMemberLockerAssignForm(memberId)

  if (loadingData) {
    return <PageLoading message="Loading data..." />
  }

  if (!member) {
    return <NotFoundState title="Member not found" backHref="/entity-members" backLabel="All Members" />
  }

  const memberName = member.name

  return (
    <ModuleGuard module="lockers">
      <PermissionGuard permission="entity_members.edit">
    <div className="max-w-3xl mx-auto space-y-6">
      <DetailHero
        title="Assign Locker"
        subtitle={memberName}
        backHref={backHref}
        backLabel="Back to Member"
        icon={Lock}
        breadcrumbs={[
          { label: "Members", href: "/entity-members" },
          { label: memberName, href: backHref },
          { label: "Assign Locker" },
        ]}
      />

      {lockers.length === 0 ? (
        <DetailSection title="No Available Lockers" icon={AlertCircle}>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              There are no available lockers in {member.library?.name || "this library"}.
            </p>
            <Link href={backHref}>
              <Button variant="outline">Go Back</Button>
            </Link>
          </div>
        </DetailSection>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Locker Selection */}
          <DetailSection
            title="Select Locker"
            description={`${lockers.length} locker${lockers.length !== 1 ? "s" : ""} available in ${member.library?.name}`}
            icon={Lock}
            className="mb-6"
          >
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {lockers.map((locker) => {
                  const isSelected = selectedLockerId === locker.id
                  const sizeConfig = LIBRARY_LOCKER_SIZE_CONFIG[locker.size as keyof typeof LIBRARY_LOCKER_SIZE_CONFIG]

                  return (
                    <button
                      key={locker.id}
                      type="button"
                      onClick={() => setSelectedLockerId(locker.id)}
                      className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 p-1 bg-primary rounded-full">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="font-semibold">#{locker.locker_number}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          locker.size === "large" ? "bg-info/10 text-info" :
                          locker.size === "medium" ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {sizeConfig?.label || locker.size}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Floor {locker.floor === 0 ? "G" : locker.floor}
                        {locker.section && ` • ${locker.section}`}
                      </div>
                      {locker.monthly_rent && (
                        <div className="text-sm font-medium mt-2">
                          <Currency amount={locker.monthly_rent} />
                          <span className="text-muted-foreground">/mo</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
          </DetailSection>

          {/* Assignment Details */}
          {selectedLockerId && (
            <DetailSection
              title="Assignment Details"
              description="Configure the assignment period and pricing"
              className="mb-6"
            >
              <div className="space-y-6">
                {/* Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Start Date" htmlFor="start_date" required>
                    <DatePicker
                      id="start_date"
                      value={formData.start_date}
                      onChange={(val) => setFormData((prev) => ({ ...prev, start_date: val }))}
                      disabled={loading}
                    />
                  </FormField>
                  <FormField label="End Date (Optional)" htmlFor="end_date" hint="Leave empty for ongoing assignment">
                    <DatePicker
                      id="end_date"
                      value={formData.end_date}
                      onChange={(val) => setFormData((prev) => ({ ...prev, end_date: val }))}
                      disabled={loading}
                      placeholder="Pick a date"
                    />
                  </FormField>
                </div>

                {/* Pricing */}
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-3">Pricing</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="Monthly Rent (₹)" htmlFor="rent_amount">
                      <Input
                        id="rent_amount"
                        name="rent_amount"
                        type="number"
                        placeholder="e.g., 200"
                        value={formData.rent_amount}
                        onChange={(e) => setFormData((prev) => ({ ...prev, rent_amount: e.target.value }))}
                        disabled={loading}
                        min={0}
                      />
                    </FormField>
                    <FormField label="Deposit (₹)" htmlFor="deposit_amount" hint="Refundable when locker is returned">
                      <Input
                        id="deposit_amount"
                        name="deposit_amount"
                        type="number"
                        placeholder="e.g., 500"
                        value={formData.deposit_amount}
                        onChange={(e) => setFormData((prev) => ({ ...prev, deposit_amount: e.target.value }))}
                        disabled={loading}
                        min={0}
                      />
                    </FormField>
                  </div>
                </div>
              </div>
            </DetailSection>
          )}

          <div className="flex justify-end gap-3">
            <Link href={`/entity-members/${memberId}`}>
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading || !selectedLockerId}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Assign Locker
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
      </PermissionGuard>
    </ModuleGuard>
  )
}
