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
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox } from "@/components/ui/combobox"
import { Select, FormField } from "@/components/ui/form-components"
import { ArrowLeft, Lock, Loader2 } from "lucide-react"
import { PermissionGuard } from "@/components/auth"

interface Library {
  id: string
  name: string
  code: string | null
}

export default function NewLibraryLockerPage() {
  return (
    <PermissionGuard permission="library_lockers.create">
      <NewLibraryLockerContent />
    </PermissionGuard>
  )
}

function NewLibraryLockerContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/library-lockers" })
  const [libraries, setLibraries] = useState<Library[]>([])
  const [loadingLibraries, setLoadingLibraries] = useState(true)

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    saving,
    searchParams,
    workspaceId,
  } = useFormPage({
    table: "library_lockers",
    initialData: {
      library_id: "",
      locker_number: "",
      size: "medium",
      floor: 0,
      section: "",
      monthly_rent: "",
      deposit_amount: "",
    },
    redirectTo: "/library-lockers",
    successMessage: "Locker created successfully!",
    errorMessage: "Failed to create locker",
    validate: (data) => {
      if (!data.library_id || !data.locker_number) {
        return "Please fill in required fields (Library, Locker Number)"
      }
      return null
    },
    customSubmit: async (data, userId, supabase): Promise<string | void> => {
      // Get library's owner_id
      const { data: library } = await supabase
        .from("libraries")
        .select("owner_id")
        .eq("id", data.library_id)
        .single()

      if (!library) {
        throw new Error("Library not found")
      }

      const { withCreatedBy } = await import("@/lib/audit")

      const lockerData = withCreatedBy({
        owner_id: library.owner_id,
        workspace_id: workspaceId,
        library_id: data.library_id,
        locker_number: data.locker_number,
        size: data.size,
        floor: data.floor || 0,
        section: data.section || null,
        monthly_rent: data.monthly_rent ? Number(data.monthly_rent) : null,
        deposit_amount: data.deposit_amount ? Number(data.deposit_amount) : null,
        status: "available",
      }, userId)

      const { error } = await supabase.from("library_lockers").insert(lockerData)

      if (error) {
        throw new Error(error.message)
      }

      // Redirect to library detail if came from there
      if (data.library_id && typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get("library")) {
          return `/library/${data.library_id}`
        }
      }
    },
  })

  const preselectedLibrary = searchParams.get("library")

  // Pre-fill library_id from URL param
  useEffect(() => {
    if (preselectedLibrary && !formData.library_id) {
      setFormData((prev) => ({ ...prev, library_id: preselectedLibrary }))
    }
  }, [preselectedLibrary, formData.library_id, setFormData])

  useEffect(() => {
    async function fetchLibraries() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("libraries")
        .select("id, name, code")
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
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={backHref}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Locker</h1>
          <p className="text-muted-foreground">
            Add a new locker to a library
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Locker Details</CardTitle>
                <CardDescription>
                  Enter locker information and pricing
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Library Selection */}
            <div className="space-y-2">
              <Label>Library *</Label>
              <Combobox
                options={libraryOptions}
                value={formData.library_id as string}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, library_id: value }))}
                placeholder="Select a library..."
                searchPlaceholder="Search libraries..."
                emptyText="No libraries found"
                disabled={saving || loadingLibraries || !!preselectedLibrary}
              />
            </div>

            {/* Locker Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Locker Number" required>
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
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Select
                  value={formData.size as string}
                  onChange={handleChange}
                  name="size"
                  disabled={saving}
                  options={[
                    { value: "small", label: "Small" },
                    { value: "medium", label: "Medium" },
                    { value: "large", label: "Large" },
                  ]}
                />
              </div>
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
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={preselectedLibrary ? `/library/${preselectedLibrary}` : "/library-lockers"}>
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Locker"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
