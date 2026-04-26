/**
 * Add to Waitlist Page
 *
 * Form to add a prospective member to the library waitlist.
 */

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, FormField } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { ArrowLeft, Users, Loader2, Clock } from "lucide-react"
import { PageLoading } from "@/components/ui/loading"
import { validatePhone as validateIndianMobile } from "@/lib/phone"
import { requiredField, requiredSelect, requiredPhone } from "@/lib/validation"
import { PermissionGuard } from "@/components/auth"
import { TIME_SLOTS } from "@/types/library.types"

interface LibraryOption {
  id: string
  name: string
  total_seats: number
  occupied_seats: number
}

export default function AddToWaitlistPage() {
  return (
    <PermissionGuard permission="library_waitlist.create">
      <AddToWaitlistContent />
    </PermissionGuard>
  )
}

function AddToWaitlistContent() {
  const { backHref } = useBackNavigation({ defaultHref: "/library-waitlist" })
  const [loadingData, setLoadingData] = useState(true)
  const [libraries, setLibraries] = useState<LibraryOption[]>([])

  const {
    formData, setFormData,
    handleSubmit,
    saving,
    errors,
    searchParams,
    workspaceId,
  } = useFormPage({
    table: "library_waitlist",
    initialData: {
      library_id: "",
      name: "",
      phone: "",
      email: "",
      preferred_slot: "",
      preferred_plan: "",
      notes: "",
    },
    preSelectFields: ["library"],
    redirectTo: "/library-waitlist",
    successMessage: "Added to waitlist successfully!",
    errorMessage: "Failed to add to waitlist",
    validationSchema: {
      library_id: requiredSelect("Library"),
      name: requiredField("Name"),
      phone: requiredPhone("Phone"),
    },
    customSubmit: async (data, userId, supabase) => {
      // Get owner_id from workspace
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("owner_user_id")
        .eq("id", workspaceId)
        .single()

      if (!workspace) {
        throw new Error("Workspace not found")
      }

      // Check if already on waitlist
      const { data: existing } = await supabase
        .from("library_waitlist")
        .select("id")
        .eq("library_id", data.library_id)
        .eq("phone", data.phone)
        .in("status", ["waiting", "contacted"])
        .is("deleted_at", null)
        .single()

      if (existing) {
        throw new Error("This person is already on the waitlist for this library")
      }

      const { withCreatedBy } = await import("@/lib/audit")

      // Create waitlist entry
      const waitlistData = withCreatedBy(
        {
          owner_id: workspace.owner_user_id,
          workspace_id: workspaceId,
          library_id: data.library_id,
          name: (data.name as string).trim(),
          phone: (data.phone as string).trim(),
          email: (data.email as string).trim() || null,
          preferred_slot: data.preferred_slot || null,
          preferred_plan: data.preferred_plan || null,
          notes: (data.notes as string).trim() || null,
          status: "waiting",
        },
        userId
      )

      const { error } = await supabase.from("library_waitlist").insert(waitlistData)

      if (error) {
        throw new Error(error.message)
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
    async function fetchData() {
      const supabase = createClient()

      // Fetch libraries
      const { data: librariesData } = await supabase
        .from("libraries")
        .select("id, name, total_seats, occupied_seats")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      setLibraries(librariesData || [])
      setLoadingData(false)
    }

    fetchData()
  }, [])

  if (loadingData) {
    return <PageLoading message="Loading..." />
  }

  const libraryOptions: ComboboxOption[] = libraries.map((lib) => ({
    value: lib.id,
    label: `${lib.name} (${lib.total_seats - lib.occupied_seats} seats available)`,
  }))

  const slotOptions = [
    { value: "", label: "No preference" },
    ...TIME_SLOTS.map((slot) => ({ value: slot.value, label: slot.label })),
  ]

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
          <h1 className="text-3xl font-bold">Add to Waitlist</h1>
          <p className="text-muted-foreground">
            Add a prospective member to the waitlist
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Waitlist Details</CardTitle>
                <CardDescription>
                  Enter the contact information for the prospective member
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Library Selection */}
            <FormField label="Library" htmlFor="library_id" required error={errors.library_id}>
              <Combobox
                options={libraryOptions}
                value={formData.library_id as string}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, library_id: value }))}
                placeholder="Select a library..."
                emptyText="No libraries found"
                disabled={saving}
              />
            </FormField>

            {/* Contact Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Name" required error={errors.name}>
                <Input
                  id="name"
                  value={formData.name as string}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                  disabled={saving}
                  required
                />
              </FormField>
              <FormField label="Phone" required error={errors.phone}>
                <Input
                  id="phone"
                  value={formData.phone as string}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="10-digit mobile"
                  disabled={saving}
                  required
                />
              </FormField>
            </div>

            <FormField label="Email" hint="Optional" error={errors.email}>
              <Input
                id="email"
                type="email"
                value={formData.email as string}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
                disabled={saving}
              />
            </FormField>

            {/* Preferences */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Preferences</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Preferred Time Slot" error={errors.preferred_slot}>
                  <Select
                    value={formData.preferred_slot as string}
                    onChange={(e) => setFormData((prev) => ({ ...prev, preferred_slot: e.target.value }))}
                    options={slotOptions}
                    disabled={saving}
                  />
                </FormField>
                <FormField label="Preferred Plan" error={errors.preferred_plan}>
                  <Input
                    id="preferred_plan"
                    value={formData.preferred_plan as string}
                    onChange={(e) => setFormData((prev) => ({ ...prev, preferred_plan: e.target.value }))}
                    placeholder="e.g., 9 Hours"
                    disabled={saving}
                  />
                </FormField>
              </div>
            </div>

            {/* Notes */}
            <FormField label="Notes" hint="Optional" error={errors.notes}>
              <Textarea
                id="notes"
                value={formData.notes as string}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional information..."
                rows={3}
                disabled={saving}
              />
            </FormField>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href="/library-waitlist">
            <Button type="button" variant="outline" disabled={saving}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Users className="mr-2 h-4 w-4" />
                Add to Waitlist
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
