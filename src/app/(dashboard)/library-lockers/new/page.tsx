/**
 * New Library Locker Page
 *
 * Form to add a new locker to a library.
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox } from "@/components/ui/combobox"
import { Select } from "@/components/ui/form-components"
import { ArrowLeft, Lock, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { withCreatedBy } from "@/lib/audit"

interface Library {
  id: string
  name: string
  code: string | null
}

export default function NewLibraryLockerPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, workspaceId } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [libraries, setLibraries] = useState<Library[]>([])
  const [loadingLibraries, setLoadingLibraries] = useState(true)

  const preselectedLibrary = searchParams.get("library")

  const [formData, setFormData] = useState({
    library_id: preselectedLibrary || "",
    locker_number: "",
    size: "medium",
    floor: 0,
    section: "",
    monthly_rent: "",
    deposit_amount: "",
  })

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.library_id || !formData.locker_number) {
      toast.error("Please fill in required fields (Library, Locker Number)")
      return
    }

    if (!user || !workspaceId) {
      toast.error("Session expired. Please login again.")
      router.push("/login")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      // Get library's owner_id
      const { data: library } = await supabase
        .from("libraries")
        .select("owner_id")
        .eq("id", formData.library_id)
        .single()

      if (!library) {
        toast.error("Library not found")
        setLoading(false)
        return
      }

      const lockerData = withCreatedBy({
        owner_id: library.owner_id,
        workspace_id: workspaceId,
        library_id: formData.library_id,
        locker_number: formData.locker_number,
        size: formData.size,
        floor: formData.floor || 0,
        section: formData.section || null,
        monthly_rent: formData.monthly_rent ? Number(formData.monthly_rent) : null,
        deposit_amount: formData.deposit_amount ? Number(formData.deposit_amount) : null,
        status: "available",
      }, user.id)

      const { error } = await supabase.from("library_lockers").insert(lockerData)

      if (error) {
        console.error("Error creating locker:", error)
        toast.error(`Failed to create locker: ${error.message}`)
        return
      }

      toast.success("Locker created successfully!")

      if (preselectedLibrary) {
        router.push(`/library/${preselectedLibrary}`)
      } else {
        router.push("/library-lockers")
      }
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to create locker. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const libraryOptions = libraries.map((lib) => ({
    value: lib.id,
    label: lib.code ? `${lib.name} (${lib.code})` : lib.name,
  }))

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={preselectedLibrary ? `/library/${preselectedLibrary}` : "/library-lockers"}>
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
                value={formData.library_id}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, library_id: value }))}
                placeholder="Select a library..."
                searchPlaceholder="Search libraries..."
                emptyText="No libraries found"
                disabled={loading || loadingLibraries || !!preselectedLibrary}
              />
            </div>

            {/* Locker Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="locker_number">Locker Number *</Label>
                <Input
                  id="locker_number"
                  name="locker_number"
                  placeholder="e.g., L-001"
                  value={formData.locker_number}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="size">Size</Label>
                <Select
                  value={formData.size}
                  onChange={handleChange}
                  name="size"
                  disabled={loading}
                  options={[
                    { value: "small", label: "Small" },
                    { value: "medium", label: "Medium" },
                    { value: "large", label: "Large" },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="floor">Floor</Label>
                <Input
                  id="floor"
                  name="floor"
                  type="number"
                  placeholder="e.g., 0, 1, 2"
                  value={formData.floor}
                  onChange={handleChange}
                  disabled={loading}
                  min={0}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  name="section"
                  placeholder="e.g., A, Main Hall"
                  value={formData.section}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monthly_rent">Monthly Rent (₹)</Label>
                  <Input
                    id="monthly_rent"
                    name="monthly_rent"
                    type="number"
                    placeholder="e.g., 200"
                    value={formData.monthly_rent}
                    onChange={handleChange}
                    disabled={loading}
                    min={0}
                    step="0.01"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit_amount">Deposit Amount (₹)</Label>
                  <Input
                    id="deposit_amount"
                    name="deposit_amount"
                    type="number"
                    placeholder="e.g., 500"
                    value={formData.deposit_amount}
                    onChange={handleChange}
                    disabled={loading}
                    min={0}
                    step="0.01"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={preselectedLibrary ? `/library/${preselectedLibrary}` : "/library-lockers"}>
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
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
