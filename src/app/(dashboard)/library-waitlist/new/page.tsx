/**
 * Add to Waitlist Page
 *
 * Form to add a prospective member to the library waitlist.
 */

"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { ArrowLeft, Users, Loader2, Clock } from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { PageLoading } from "@/components/ui/loading"
import { withCreatedBy } from "@/lib/audit"
import { validateIndianMobile } from "@/lib/validators"
import { TIME_SLOTS } from "@/types/library.types"

interface LibraryOption {
  id: string
  name: string
  total_seats: number
  occupied_seats: number
}

export default function AddToWaitlistPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedLibrary = searchParams.get("library")
  const { user, workspaceId } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [libraries, setLibraries] = useState<LibraryOption[]>([])

  const [formData, setFormData] = useState({
    library_id: preselectedLibrary || "",
    name: "",
    phone: "",
    email: "",
    preferred_slot: "",
    preferred_plan: "",
    notes: "",
  })

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.library_id) {
      showError("Please select a library")
      return
    }

    if (!formData.name.trim()) {
      showError("Please enter a name")
      return
    }

    if (!formData.phone.trim()) {
      showError("Please enter a phone number")
      return
    }

    if (!validateIndianMobile(formData.phone)) {
      showError("Please enter a valid 10-digit mobile number")
      return
    }

    if (!user || !workspaceId) {
      showError("Session expired. Please login again.")
      router.push("/login")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Get owner_id from workspace
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("owner_user_id")
        .eq("id", workspaceId)
        .single()

      if (!workspace) {
        showError("Workspace not found")
        setLoading(false)
        return
      }

      // Check if already on waitlist
      const { data: existing } = await supabase
        .from("library_waitlist")
        .select("id")
        .eq("library_id", formData.library_id)
        .eq("phone", formData.phone)
        .in("status", ["waiting", "contacted"])
        .is("deleted_at", null)
        .single()

      if (existing) {
        showError("This person is already on the waitlist for this library")
        setLoading(false)
        return
      }

      // Create waitlist entry
      const waitlistData = withCreatedBy(
        {
          owner_id: workspace.owner_user_id,
          workspace_id: workspaceId,
          library_id: formData.library_id,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || null,
          preferred_slot: formData.preferred_slot || null,
          preferred_plan: formData.preferred_plan || null,
          notes: formData.notes.trim() || null,
          status: "waiting",
        },
        user.id
      )

      const { error } = await supabase.from("library_waitlist").insert(waitlistData)

      if (error) {
        console.error("Error adding to waitlist:", error)
        showError(`Failed to add to waitlist: ${error.message}`)
        return
      }

      showSuccess("Added to waitlist successfully!")
      router.push("/library-waitlist")
    } catch (error) {
      console.error("Error:", error)
      showError("Failed to add to waitlist. Please try again.")
    } finally {
      setLoading(false)
    }
  }

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
        <Link href="/library-waitlist">
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
            <div className="space-y-2">
              <Label htmlFor="library_id">Library *</Label>
              <Combobox
                options={libraryOptions}
                value={formData.library_id}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, library_id: value }))}
                placeholder="Select a library..."
                emptyText="No libraries found"
                disabled={loading}
              />
            </div>

            {/* Contact Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Full name"
                  disabled={loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="10-digit mobile"
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="email@example.com"
                disabled={loading}
              />
            </div>

            {/* Preferences */}
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Preferences</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="preferred_slot">Preferred Time Slot</Label>
                  <Select
                    value={formData.preferred_slot}
                    onChange={(e) => setFormData((prev) => ({ ...prev, preferred_slot: e.target.value }))}
                    options={slotOptions}
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferred_plan">Preferred Plan</Label>
                  <Input
                    id="preferred_plan"
                    value={formData.preferred_plan}
                    onChange={(e) => setFormData((prev) => ({ ...prev, preferred_plan: e.target.value }))}
                    placeholder="e.g., 9 Hours"
                    disabled={loading}
                  />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Any additional information..."
                rows={3}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href="/library-waitlist">
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
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
