/**
 * New Library Seat Page
 *
 * Form to add a new seat to a section.
 */

"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useFormPage } from "@/lib/hooks/useFormPage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox } from "@/components/ui/combobox"
import { ArrowLeft, Armchair, Loader2 } from "lucide-react"
import { PermissionGuard } from "@/components/auth"

interface Section {
  id: string
  name: string
  library?: { id: string; name: string } | null
}

export default function NewLibrarySeatPage() {
  return (
    <PermissionGuard permission="library_seats.create">
      <NewLibrarySeatContent />
    </PermissionGuard>
  )
}

function NewLibrarySeatContent() {
  const [sections, setSections] = useState<Section[]>([])
  const [loadingSections, setLoadingSections] = useState(true)

  const {
    formData, setFormData,
    handleChange,
    handleSubmit,
    saving,
    searchParams,
  } = useFormPage({
    table: "library_seats",
    initialData: {
      section_id: "",
      seat_number: "",
      row_number: "",
      has_power_outlet: true as boolean,
      has_lamp: false as boolean,
      is_window_seat: false as boolean,
    },
    preSelectFields: ["section"],
    redirectTo: "/library-seats",
    successMessage: "Seat created successfully!",
    errorMessage: "Failed to create seat",
    validate: (data) => {
      if (!data.section_id || !data.seat_number) {
        return "Please fill in required fields (Section, Seat Number)"
      }
      return null
    },
    customSubmit: async (data, userId, supabase): Promise<string | void> => {
      // Get section's owner_id and workspace_id
      const { data: section } = await supabase
        .from("library_sections")
        .select("owner_id, workspace_id")
        .eq("id", data.section_id)
        .single()

      if (!section) {
        throw new Error("Section not found")
      }

      const { withCreatedBy } = await import("@/lib/audit")

      const seatData = withCreatedBy({
        owner_id: section.owner_id,
        workspace_id: section.workspace_id,
        section_id: data.section_id,
        seat_number: data.seat_number,
        row_number: data.row_number || null,
        has_power_outlet: data.has_power_outlet,
        has_lamp: data.has_lamp,
        is_window_seat: data.is_window_seat,
        status: "available",
      }, userId)

      const { error } = await supabase.from("library_seats").insert(seatData)

      if (error) {
        throw new Error(error.message)
      }

      // Redirect to section detail if came from there
      if (data.section_id && typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search)
        if (urlParams.get("section")) {
          return `/library-sections/${data.section_id}`
        }
      }
    },
  })

  const preselectedSection = searchParams.get("section")

  // Pre-fill section_id from URL param (mapped from "section" to "section_id")
  useEffect(() => {
    if (preselectedSection && !formData.section_id) {
      setFormData((prev) => ({ ...prev, section_id: preselectedSection }))
    }
  }, [preselectedSection, formData.section_id, setFormData])

  useEffect(() => {
    async function fetchSections() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("library_sections")
        .select("id, name, library:libraries(id, name)")
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("name")

      if (!error && data) {
        setSections(data)
      }
      setLoadingSections(false)
    }

    fetchSections()
  }, [])

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  const sectionOptions = sections.map((sec) => ({
    value: sec.id,
    label: sec.library ? `${sec.name} (${sec.library.name})` : sec.name,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={preselectedSection ? `/library-sections/${preselectedSection}` : "/library-seats"}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Add Seat</h1>
          <p className="text-muted-foreground">
            Add a new seat to a library section
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Armchair className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Seat Details</CardTitle>
                <CardDescription>
                  Enter seat information and features
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Section Selection */}
            <div className="space-y-2">
              <Label>Section *</Label>
              <Combobox
                options={sectionOptions}
                value={formData.section_id as string}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, section_id: value }))}
                placeholder="Select a section..."
                searchPlaceholder="Search sections..."
                emptyText="No sections found"
                disabled={saving || loadingSections || !!preselectedSection}
              />
            </div>

            {/* Seat Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="seat_number">Seat Number *</Label>
                <Input
                  id="seat_number"
                  name="seat_number"
                  placeholder="e.g., A-01, 101"
                  value={formData.seat_number as string}
                  onChange={handleChange}
                  required
                  disabled={saving}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="row_number">Row</Label>
                <Input
                  id="row_number"
                  name="row_number"
                  placeholder="e.g., A, B, 1"
                  value={formData.row_number as string}
                  onChange={handleChange}
                  disabled={saving}
                  maxLength={10}
                />
              </div>
            </div>

            {/* Features */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Features</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_power_outlet"
                    checked={formData.has_power_outlet as boolean}
                    onCheckedChange={(checked) => handleCheckboxChange("has_power_outlet", checked as boolean)}
                    disabled={saving}
                  />
                  <Label htmlFor="has_power_outlet" className="cursor-pointer">
                    Power Outlet
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_lamp"
                    checked={formData.has_lamp as boolean}
                    onCheckedChange={(checked) => handleCheckboxChange("has_lamp", checked as boolean)}
                    disabled={saving}
                  />
                  <Label htmlFor="has_lamp" className="cursor-pointer">
                    Desk Lamp
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_window_seat"
                    checked={formData.is_window_seat as boolean}
                    onCheckedChange={(checked) => handleCheckboxChange("is_window_seat", checked as boolean)}
                    disabled={saving}
                  />
                  <Label htmlFor="is_window_seat" className="cursor-pointer">
                    Window Seat
                  </Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={preselectedSection ? `/library-sections/${preselectedSection}` : "/library-seats"}>
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
              "Create Seat"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
