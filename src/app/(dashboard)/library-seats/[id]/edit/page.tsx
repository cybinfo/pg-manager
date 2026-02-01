/**
 * Edit Library Seat Page
 *
 * Form to edit seat details.
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
import { Checkbox } from "@/components/ui/checkbox"
import { Select } from "@/components/ui/form-components"
import { ArrowLeft, Armchair, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { PageLoading } from "@/components/ui/loading"

interface SeatData {
  id: string
  section_id: string
  seat_number: string
  row_number: string | null
  has_power_outlet: boolean
  has_lamp: boolean
  is_window_seat: boolean
  status: string
  section?: { id: string; name: string; library?: { id: string; name: string } | null } | null
}

export default function EditLibrarySeatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [seat, setSeat] = useState<SeatData | null>(null)

  const [formData, setFormData] = useState({
    seat_number: "",
    row_number: "",
    has_power_outlet: true,
    has_lamp: false,
    is_window_seat: false,
    status: "available",
  })

  useEffect(() => {
    async function fetchSeat() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("library_seats")
        .select("*, section:library_sections(id, name, library:libraries(id, name))")
        .eq("id", id)
        .is("deleted_at", null)
        .single()

      if (error || !data) {
        toast.error("Seat not found")
        router.push("/library-seats")
        return
      }

      setSeat(data)
      setFormData({
        seat_number: data.seat_number || "",
        row_number: data.row_number || "",
        has_power_outlet: data.has_power_outlet ?? true,
        has_lamp: data.has_lamp ?? false,
        is_window_seat: data.is_window_seat ?? false,
        status: data.status || "available",
      })
      setLoadingData(false)
    }

    fetchSeat()
  }, [id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleCheckboxChange = (name: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.seat_number) {
      toast.error("Please enter seat number")
      return
    }

    if (!user) {
      toast.error("Session expired. Please login again.")
      router.push("/login")
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()

      const updateData = {
        seat_number: formData.seat_number,
        row_number: formData.row_number || null,
        has_power_outlet: formData.has_power_outlet,
        has_lamp: formData.has_lamp,
        is_window_seat: formData.is_window_seat,
        status: formData.status,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("library_seats")
        .update(updateData)
        .eq("id", id)

      if (error) {
        console.error("Error updating seat:", error)
        toast.error(`Failed to update seat: ${error.message}`)
        return
      }

      toast.success("Seat updated successfully!")
      router.push(`/library-seats/${id}`)
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to update seat. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading message="Loading seat..." />
  }

  if (!seat) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/library-seats/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Seat</h1>
          <p className="text-muted-foreground">
            {seat.seat_number} • {seat.section?.name}
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
                  Update seat information and features
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seat Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="seat_number">Seat Number *</Label>
                <Input
                  id="seat_number"
                  name="seat_number"
                  placeholder="e.g., A-01, 101"
                  value={formData.seat_number}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="row_number">Row</Label>
                <Input
                  id="row_number"
                  name="row_number"
                  placeholder="e.g., A, B, 1"
                  value={formData.row_number}
                  onChange={handleChange}
                  disabled={loading}
                  maxLength={10}
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
                  { value: "reserved", label: "Reserved" },
                  { value: "maintenance", label: "Maintenance" },
                ]}
              />
            </div>

            {/* Features */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Features</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_power_outlet"
                    checked={formData.has_power_outlet}
                    onCheckedChange={(checked) => handleCheckboxChange("has_power_outlet", checked as boolean)}
                    disabled={loading}
                  />
                  <Label htmlFor="has_power_outlet" className="cursor-pointer">
                    Power Outlet
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="has_lamp"
                    checked={formData.has_lamp}
                    onCheckedChange={(checked) => handleCheckboxChange("has_lamp", checked as boolean)}
                    disabled={loading}
                  />
                  <Label htmlFor="has_lamp" className="cursor-pointer">
                    Desk Lamp
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="is_window_seat"
                    checked={formData.is_window_seat}
                    onCheckedChange={(checked) => handleCheckboxChange("is_window_seat", checked as boolean)}
                    disabled={loading}
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
          <Link href={`/library-seats/${id}`}>
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
