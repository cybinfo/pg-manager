/**
 * Edit Library Member Page
 *
 * Form to edit member personal details.
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
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/form-components"
import { ArrowLeft, Users, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { PageLoading } from "@/components/ui/loading"
import { TIME_SLOTS } from "@/types/library.types"

interface MemberData {
  id: string
  name: string
  phone: string | null
  email: string | null
  member_code: string | null
  id_proof_type: string | null
  id_proof_number: string | null
  preferred_slot: string | null
  notes: string | null
  status: string
  library?: { id: string; name: string } | null
}

export default function EditLibraryMemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [member, setMember] = useState<MemberData | null>(null)

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    id_proof_type: "aadhar",
    id_proof_number: "",
    preferred_slot: "Morning",
    notes: "",
    status: "active",
  })

  useEffect(() => {
    async function fetchMember() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("library_members")
        .select("*, library:libraries(id, name)")
        .eq("id", id)
        .is("deleted_at", null)
        .single()

      if (error || !data) {
        toast.error("Member not found")
        router.push("/library-members")
        return
      }

      setMember(data)
      setFormData({
        name: data.name || "",
        phone: data.phone || "",
        email: data.email || "",
        id_proof_type: data.id_proof_type || "aadhar",
        id_proof_number: data.id_proof_number || "",
        preferred_slot: data.preferred_slot || "Morning",
        notes: data.notes || "",
        status: data.status || "active",
      })
      setLoadingData(false)
    }

    fetchMember()
  }, [id, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.phone) {
      toast.error("Please fill in required fields (Name, Phone)")
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
        name: formData.name,
        phone: formData.phone || null,
        email: formData.email || null,
        id_proof_type: formData.id_proof_type || null,
        id_proof_number: formData.id_proof_number || null,
        preferred_slot: formData.preferred_slot || null,
        notes: formData.notes || null,
        status: formData.status,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from("library_members")
        .update(updateData)
        .eq("id", id)

      if (error) {
        console.error("Error updating member:", error)
        toast.error(`Failed to update member: ${error.message}`)
        return
      }

      toast.success("Member updated successfully!")
      router.push(`/library-members/${id}`)
    } catch (error) {
      console.error("Error:", error)
      toast.error("Failed to update member. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading message="Loading member..." />
  }

  if (!member) {
    return null
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/library-members/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Member</h1>
          <p className="text-muted-foreground">
            {member.member_code} • {member.library?.name}
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
                <CardTitle>Member Details</CardTitle>
                <CardDescription>
                  Update member information
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g., Rahul Sharma"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  name="phone"
                  placeholder="e.g., 9876543210"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  disabled={loading}
                  type="tel"
                  maxLength={10}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                placeholder="e.g., rahul@example.com"
                value={formData.email}
                onChange={handleChange}
                disabled={loading}
                type="email"
              />
            </div>

            {/* ID Proof */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="id_proof_type">ID Proof Type</Label>
                <Select
                  value={formData.id_proof_type}
                  onChange={handleChange}
                  name="id_proof_type"
                  disabled={loading}
                  options={[
                    { value: "aadhar", label: "Aadhaar Card" },
                    { value: "pan", label: "PAN Card" },
                    { value: "student_id", label: "Student ID" },
                    { value: "voter_id", label: "Voter ID" },
                    { value: "driving_license", label: "Driving License" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="id_proof_number">ID Number</Label>
                <Input
                  id="id_proof_number"
                  name="id_proof_number"
                  placeholder="e.g., XXXX-XXXX-XXXX"
                  value={formData.id_proof_number}
                  onChange={handleChange}
                  disabled={loading}
                />
              </div>
            </div>

            {/* Preferences */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="preferred_slot">Preferred Time Slot</Label>
                <Select
                  value={formData.preferred_slot}
                  onChange={handleChange}
                  name="preferred_slot"
                  disabled={loading}
                  options={TIME_SLOTS.map((slot) => ({
                    value: slot.value,
                    label: slot.label,
                  }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onChange={handleChange}
                  name="status"
                  disabled={loading}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "expired", label: "Expired" },
                    { value: "suspended", label: "Suspended" },
                    { value: "cancelled", label: "Cancelled" },
                  ]}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Any additional notes..."
                value={formData.notes}
                onChange={handleChange}
                disabled={loading}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 mt-6">
          <Link href={`/library-members/${id}`}>
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
