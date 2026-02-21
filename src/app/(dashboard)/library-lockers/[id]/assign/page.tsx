/**
 * Assign Locker Page
 *
 * Form to assign a locker to a library member.
 */

"use client"

import { useState, useEffect, use } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuthContext } from "@/lib/auth/useAuthContext"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { ArrowLeft, Lock, Loader2, Users } from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { handleClientError } from "@/lib/error-handler"
import { PageLoading } from "@/components/ui/loading"
import { Currency } from "@/components/ui/currency"
import { withCreatedBy } from "@/lib/audit"

interface LockerData {
  id: string
  locker_number: string
  size: string
  monthly_rent: number | null
  deposit_amount: number | null
  library_id: string
  status: string
  library?: { id: string; name: string } | null
}

interface MemberOption {
  id: string
  name: string
  member_code: string | null
  status: string
}

export default function AssignLockerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedMember = searchParams.get("member")
  const { user, workspaceId } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [locker, setLocker] = useState<LockerData | null>(null)
  const [members, setMembers] = useState<MemberOption[]>([])

  const [formData, setFormData] = useState({
    member_id: preselectedMember || "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    rent_amount: "",
    deposit_amount: "",
  })

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Fetch locker details
      const { data: lockerData, error: lockerError } = await supabase
        .from("library_lockers")
        .select("*, library:libraries(id, name)")
        .eq("id", id)
        .is("deleted_at", null)
        .single()

      if (lockerError || !lockerData) {
        showError("Locker not found")
        router.push("/library-lockers")
        return
      }

      if (lockerData.status !== "available") {
        showError("Locker is not available for assignment")
        router.push(`/library-lockers/${id}`)
        return
      }

      setLocker(lockerData)

      // Pre-fill pricing from locker
      setFormData((prev) => ({
        ...prev,
        rent_amount: lockerData.monthly_rent?.toString() || "",
        deposit_amount: lockerData.deposit_amount?.toString() || "",
      }))

      // Fetch active members from the same library without a locker
      const { data: membersData } = await supabase
        .from("library_members")
        .select("id, name, member_code, status")
        .eq("library_id", lockerData.library_id)
        .eq("status", "active")
        .is("locker_id", null)
        .is("deleted_at", null)
        .order("name")

      setMembers(membersData || [])
      setLoadingData(false)
    }

    fetchData()
  }, [id, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.member_id) {
      showError("Please select a member")
      return
    }

    if (!formData.start_date) {
      showError("Please enter start date")
      return
    }

    if (!user || !workspaceId) {
      showError("Session expired. Please login again.")
      router.push("/login")
      return
    }

    if (!locker) return

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

      // Create locker assignment
      const assignmentData = withCreatedBy(
        {
          owner_id: workspace.owner_user_id,
          workspace_id: workspaceId,
          locker_id: id,
          member_id: formData.member_id,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          rent_amount: formData.rent_amount ? Number(formData.rent_amount) : locker.monthly_rent,
          deposit_amount: formData.deposit_amount ? Number(formData.deposit_amount) : locker.deposit_amount,
          status: "active",
        },
        user.id
      )

      const { error: assignmentError } = await supabase
        .from("library_locker_assignments")
        .insert(assignmentData)

      if (assignmentError) {
        console.error("Error creating assignment:", assignmentError)
        showError(`Failed to assign locker: ${assignmentError.message}`)
        return
      }

      // Update locker status
      const { error: lockerError } = await supabase
        .from("library_lockers")
        .update({
          status: "occupied",
          current_member_id: formData.member_id,
          assigned_from: formData.start_date,
          assigned_until: formData.end_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (lockerError) {
        console.error("Error updating locker:", lockerError)
        showError(`Failed to update locker status: ${lockerError.message}`)
        return
      }

      // Update member's locker_id
      const { error: memberError } = await supabase
        .from("library_members")
        .update({
          locker_id: id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", formData.member_id)

      if (memberError) {
        console.error("Error updating member:", memberError)
        // Don't fail the whole operation for this
      }

      showSuccess("Locker assigned successfully!")
      router.push(`/library-lockers/${id}`)
    } catch (error) {
      handleClientError(error, "Assigning locker")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading message="Loading locker details..." />
  }

  if (!locker) {
    return null
  }

  const memberOptions: ComboboxOption[] = members.map((m) => ({
    value: m.id,
    label: m.name + (m.member_code ? ` (${m.member_code})` : ""),
  }))

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
          <h1 className="text-3xl font-bold">Assign Locker</h1>
          <p className="text-muted-foreground">
            Locker #{locker.locker_number} • {locker.library?.name}
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
                <CardTitle>Assignment Details</CardTitle>
                <CardDescription>
                  Assign this locker to a library member
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
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
            <div className="space-y-2">
              <Label htmlFor="member_id">Select Member *</Label>
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
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Start Date *</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, start_date: e.target.value }))}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">End Date (Optional)</Label>
                <Input
                  id="end_date"
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, end_date: e.target.value }))}
                  disabled={loading}
                  min={formData.start_date}
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty for ongoing assignment
                </p>
              </div>
            </div>

            {/* Pricing */}
            <div className="border-t pt-4">
              <h3 className="font-medium mb-3">Pricing</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rent_amount">Monthly Rent (₹)</Label>
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
                </div>
                <div className="space-y-2">
                  <Label htmlFor="deposit_amount">Deposit (₹)</Label>
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
  )
}
