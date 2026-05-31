/**
 * Assign Locker Page
 *
 * Form to assign a locker to a library member.
 */

"use client"

import { use } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/ui/form-components"
import { Combobox } from "@/components/ui/combobox"
import { Lock, Loader2, Users } from "lucide-react"
import { DetailHero, DetailSection, NotFoundState } from "@/components/ui"
import { DatePicker } from "@/components/ui/date-picker"
import { PageLoading } from "@/components/ui/loading"
import { Currency } from "@/components/ui/currency"
import { ModuleGuard, PermissionGuard } from "@/components/auth"
import { useLockerAssignForm } from "@/lib/hooks/forms/useLockerAssignForm"

export default function AssignLockerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const {
    loading,
    loadingData,
    locker,
    members,
    memberOptions,
    formData,
    setFormData,
    handleSubmit,
    backHref,
    lockerNumber,
  } = useLockerAssignForm(id)

  if (loadingData) {
    return <PageLoading message="Loading locker details..." />
  }

  if (!locker) {
    return <NotFoundState title="Locker not found" backHref="/entity-lockers" backLabel="All Lockers" />
  }

  return (
    <ModuleGuard module="lockers">
      <PermissionGuard permission="entity_lockers.edit">
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Assign Locker"
        subtitle={`${lockerNumber}${locker.library?.name ? ` • ${locker.library.name}` : ""}`}
        backHref={backHref}
        backLabel="Back to Locker"
        icon={Lock}
        breadcrumbs={[
          { label: "Lockers", href: "/entity-lockers" },
          { label: lockerNumber, href: backHref },
          { label: "Assign Member" },
        ]}
      />

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <DetailSection
          title="Assignment Details"
          description="Assign this locker to a library member"
          icon={Lock}
        >
          <div className="space-y-6">
            {/* Locker Info */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3 mb-2">
                <Lock className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">Locker #{locker.locker_number}</span>
                <span className="text-sm text-muted-foreground capitalize">({locker.size})</span>
              </div>
              <div className="flex gap-4 text-sm text-muted-foreground">
                {locker.monthly_rent && (
                  <span>Rent: <Currency amount={locker.monthly_rent} />/mo</span>
                )}
                {locker.deposit_amount && (
                  <span>Deposit: <Currency amount={locker.deposit_amount} /></span>
                )}
              </div>
            </div>

            {/* Member Selection */}
            <FormField label="Select Member" htmlFor="member_id" required>
              {members.length > 0 ? (
                <Combobox
                  options={memberOptions}
                  value={formData.member_id}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, member_id: value }))}
                  placeholder="Search for a member..."
                  emptyText="No members found without a locker"
                  disabled={loading}
                />
              ) : (
                <div className="p-4 bg-muted/50 rounded-lg text-center">
                  <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No active members available without a locker
                  </p>
                </div>
              )}
            </FormField>

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
              <FormField label="End Date" htmlFor="end_date" hint="Leave empty for ongoing assignment">
                <DatePicker
                  id="end_date"
                  value={formData.end_date}
                  onChange={(val) => setFormData((prev) => ({ ...prev, end_date: val }))}
                  disabled={loading}
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
                <FormField label="Deposit (₹)" htmlFor="deposit_amount">
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

        <div className="flex justify-end gap-3 mt-6">
          <Link href={`/entity-lockers/${id}`}>
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading || members.length === 0}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign Locker"
            )}
          </Button>
        </div>
      </form>
    </div>
      </PermissionGuard>
    </ModuleGuard>
  )
}
