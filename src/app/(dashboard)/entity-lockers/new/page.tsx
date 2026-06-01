/**
 * New Library Locker Page
 *
 * Form to add a new locker to a library.
 */

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Combobox } from "@/components/ui/combobox"
import { Select, FormField } from "@/components/ui/form-components"
import { requiredField, requiredSelect } from "@/lib/validation"
import { Lock } from "lucide-react"
import { DetailHero, DetailSection } from "@/components/ui"
import { PermissionGuard } from "@/components/auth"
import { LOCKER_SIZE_OPTIONS } from "@/lib/constants/form-options"
import type { LibraryOption } from "@/types/library.types"

export default function NewLibraryLockerPage() {
  return (
    <PermissionGuard permission="entity_lockers.create">
      <NewLibraryLockerContent />
    </PermissionGuard>
  )
}

function NewLibraryLockerContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/entity-lockers" })
  const [libraries, setLibraries] = useState<LibraryOption[]>([])
  const [loadingLibraries, setLoadingLibraries] = useState(true)

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    saving,
    errors,
    searchParams,
    workspaceId,
  } = useFormPage({
    table: "entity_lockers",
    initialData: {
      entity_id: "",
      locker_number: "",
      size: "medium",
      floor: 0,
      section: "",
      monthly_rent: "",
      deposit_amount: "",
    },
    redirectTo: "/entity-lockers",
    successMessage: "Locker created successfully!",
    errorMessage: "Failed to create locker",
    validationSchema: {
      entity_id: requiredSelect("Library"),
      locker_number: requiredField("Locker Number"),
    },
    customSubmit: async (data, userId, supabase): Promise<string | void> => {
      // Get library's owner_id
      const { data: library } = await supabase
        .from("entities")
        .select("owner_id").eq("type", "library")
        .eq("id", data.entity_id)
        .single()

      if (!library) {
        throw new Error("Library not found")
      }

      const { withCreatedBy } = await import("@/lib/audit")

      const lockerData = withCreatedBy({
        owner_id: library.owner_id,
        workspace_id: workspaceId,
        entity_id: data.entity_id,
        locker_number: data.locker_number,
        size: data.size,
        floor: data.floor || 0,
        section: data.section || null,
        monthly_rent: data.monthly_rent ? Number(data.monthly_rent) : null,
        deposit_amount: data.deposit_amount ? Number(data.deposit_amount) : null,
        status: "available",
      }, userId)

      const { error } = await supabase.from("entity_lockers").insert(lockerData)

      if (error) {
        throw new Error(error.message)
      }

      // Redirect to library detail if came from there
      if (data.entity_id && typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get("library")) {
          return `/library/${data.entity_id}`
        }
      }
    },
  })

  const preselectedLibrary = searchParams.get("library")

  // Pre-fill entity_id from URL param
  useEffect(() => {
    if (preselectedLibrary && !formData.entity_id) {
      setFormData((prev) => ({ ...prev, entity_id: preselectedLibrary }))
    }
  }, [preselectedLibrary, formData.entity_id, setFormData])

  useEffect(() => {
    async function fetchLibraries() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("entities")
        .select("id, name, code").eq("type", "library")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      if (!error && data) {
        setLibraries(data)
      }
      setLoadingLibraries(false)
    }

    fetchLibraries()
  }, [])

  const libraryOptions = libraries.map((lib) => ({
    value: lib.id,
    label: lib.code ? `${lib.name} (${lib.code})` : lib.name,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <DetailHero
        title="Add Locker"
        subtitle="Add a new locker to a library"
        backHref={backHref}
        backLabel="Back to Lockers"
        icon={Lock}
        breadcrumbs={[
          { label: "Library Lockers", href: "/entity-lockers" },
          { label: "Add Locker" },
        ]}
      />

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <DetailSection title="Locker Details" description="Enter locker information and pricing" icon={Lock}>
            {/* Library Selection */}
            <FormField label="Library" required error={errors.entity_id}>
              <Combobox
                options={libraryOptions}
                value={formData.entity_id as string}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, entity_id: value }))}
                placeholder="Select a library..."
                searchPlaceholder="Search libraries..."
                emptyText="No libraries found"
                disabled={saving || loadingLibraries || !!preselectedLibrary}
              />
            </FormField>

            {/* Locker Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Locker Number" required error={errors.locker_number}>
                <Input
                  id="locker_number"
                  name="locker_number"
                  placeholder="e.g., L-001"
                  value={formData.locker_number as string}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </FormField>
              <FormField label="Size" htmlFor="size">
                <Select
                  value={formData.size as string}
                  onChange={handleChange}
                  name="size"
                  disabled={saving}
                  options={LOCKER_SIZE_OPTIONS}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Floor">
                <Input
                  id="floor"
                  name="floor"
                  type="number"
                  placeholder="e.g., 0, 1, 2"
                  value={formData.floor as number}
                  onChange={handleChange}
                  disabled={saving}
                  min={0}
                />
              </FormField>
              <FormField label="Section">
                <Input
                  id="section"
                  name="section"
                  placeholder="e.g., A, Main Hall"
                  value={formData.section as string}
                  onChange={handleChange}
                  disabled={saving}
                />
              </FormField>
            </div>

            {/* Pricing */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Pricing</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Monthly Rent (₹)">
                  <Input
                    id="monthly_rent"
                    name="monthly_rent"
                    type="number"
                    placeholder="e.g., 200"
                    value={formData.monthly_rent as string}
                    onChange={handleChange}
                    disabled={saving}
                    min={0}
                    step="0.01"
                  />
                </FormField>
                <FormField label="Deposit Amount (₹)">
                  <Input
                    id="deposit_amount"
                    name="deposit_amount"
                    type="number"
                    placeholder="e.g., 500"
                    value={formData.deposit_amount as string}
                    onChange={handleChange}
                    disabled={saving}
                    min={0}
                    step="0.01"
                  />
                </FormField>
              </div>
            </div>
        </DetailSection>

        <div className="flex justify-end gap-3">
          <Link href={preselectedLibrary ? `/library/${preselectedLibrary}` : "/library-lockers"}>
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create Locker"}
          </Button>
        </div>
      </form>
    </div>
  )
}
