/**
 * Edit Library Locker Page
 *
 * Form to edit locker details.
 */

"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/form-components"
import { ArrowLeft, Lock, Loader2 } from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { PageLoading } from "@/components/ui/loading"

interface LockerData {
  id: string
  library_id: string
  locker_number: string
  size: string
  floor: number
  section: string | null
  monthly_rent: number | null
  deposit_amount: number | null
  status: string
  library?: { id: string; name: string } | null
}

export default function EditLibraryLockerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [locker, setLocker] = useState<LockerData | null>(null)

  const [formData, setFormData] = useState({
    locker_number: "",
    size: "medium",
    floor: 0,
    section: "",
    monthly_rent: "",
    deposit_amount: "",
    status: "available",
  })

  useEffect(() => {
    async function fetchLocker() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("library_lockers")
        .select("*, library:libraries(id, name)")
        .eq("id", id)
        .is("deleted_at", null)
        .single()

      if (error || !data) {
        showError("Locker not found")
        router.push("/library-lockers")
        return
      }

      setLocker(data)
      setFormData({
        locker_number: data.locker_number || "",
        size: data.size || "medium",
        floor: data.floor || 0,
        section: data.section || "",
        monthly_rent: data.monthly_rent?.toString() || "",
        deposit_amount: data.deposit_amount?.toString() || "",
        status: data.status || "available",
      })
      setLoadingData(false)
    }

    fetchLocker()
  }, [id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? (value === "" ? "" : Number(value)) : value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.locker_number) {
      showError("Please enter locker number")
      return
    }

    if (!user) {
      showError("Session expired. Please login again.")
      router.push("/login")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const updateData = {
        locker_number: formData.locker_number,
        size: formData.size,
        floor: formData.floor || 0,
        section: formData.section || null,
        monthly_rent: formData.monthly_rent ? Number(formData.monthly_rent) : null,
        deposit_amount: formData.deposit_amount ? Number(formData.deposit_amount) : null,
        status: formData.status,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("library_lockers")
        .update(updateData)
        .eq("id", id)

      if (error) {
        console.error("Error updating locker:", error)
        showError(`Failed to update locker: ${error.message}`)
        return
      }

      showSuccess("Locker updated successfully!")
      router.push(`/library-lockers/${id}`)
    } catch (error) {
      console.error("Error:", error)
      showError("Failed to update locker. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading message="Loading locker..." />
  }

  if (!locker) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/library-lockers/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Locker</h1>
          <p className="text-muted-foreground">
            #{locker.locker_number} • {locker.library?.name}
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
                  Update locker information and pricing
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
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

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onChange={handleChange}
                name="status"
                disabled={loading}
                options={[
                  { value: "available", label: "Available" },
                  { value: "occupied", label: "Occupied" },
                  { value: "maintenance", label: "Maintenance" },
                ]}
              />
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
          <Link href={`/library-lockers/${id}`}>
            <Button type="button" variant="outline" disabled={loading}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
