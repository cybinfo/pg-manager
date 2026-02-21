/**
 * Assign Locker to Member Page
 *
 * Allows assigning an available locker to a library member.
 * Shows available lockers from the member's library.
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
import { ArrowLeft, Lock, Loader2, Check, Package, AlertCircle } from "lucide-react"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { PageLoading } from "@/components/ui/loading"
import { Currency } from "@/components/ui/currency"
import { withCreatedBy } from "@/lib/audit"
import { LIBRARY_LOCKER_SIZE_CONFIG } from "@/types/library.types"

interface MemberData {
  id: string
  name: string
  member_code: string | null
  library_id: string
  library?: { id: string; name: string } | null
  locker_id?: string | null
}

interface LockerOption {
  id: string
  locker_number: string
  size: string
  floor: number
  section: string | null
  monthly_rent: number | null
  deposit_amount: number | null
}

export default function AssignLockerToMemberPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: memberId } = use(params)
  const router = useRouter()
  const { user, workspaceId } = useAuthContext()
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [member, setMember] = useState<MemberData | null>(null)
  const [lockers, setLockers] = useState<LockerOption[]>([])
  const [selectedLockerId, setSelectedLockerId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    rent_amount: "",
    deposit_amount: "",
  })

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      // Fetch member details
      const { data: memberData, error: memberError } = await supabase
        .from("library_members")
        .select("id, name, member_code, library_id, locker_id, library:libraries(id, name)")
        .eq("id", memberId)
        .is("deleted_at", null)
        .single()

      if (memberError || !memberData) {
        showError("Member not found")
        router.push("/library-members")
        return
      }

      if (memberData.locker_id) {
        showError("Member already has a locker assigned")
        router.push(`/library-members/${memberId}`)
        return
      }

      // Transform library
      const library = Array.isArray(memberData.library)
        ? memberData.library[0]
        : memberData.library

      setMember({
        ...memberData,
        library,
      })

      // Fetch available lockers from the same library
      const { data: lockersData } = await supabase
        .from("library_lockers")
        .select("id, locker_number, size, floor, section, monthly_rent, deposit_amount")
        .eq("library_id", memberData.library_id)
        .eq("status", "available")
        .is("deleted_at", null)
        .order("locker_number")

      setLockers(lockersData || [])
      setLoadingData(false)
    }

    fetchData()
  }, [memberId, router])

  const selectedLocker = lockers.find((l) => l.id === selectedLockerId)

  // Update form when locker is selected
  useEffect(() => {
    if (selectedLocker) {
      setFormData((prev) => ({
        ...prev,
        rent_amount: selectedLocker.monthly_rent?.toString() || "",
        deposit_amount: selectedLocker.deposit_amount?.toString() || "",
      }))
    }
  }, [selectedLocker])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedLockerId) {
      showError("Please select a locker")
      return
    }

    if (!formData.start_date) {
      showError("Please enter start date")
      return
    }

    if (!user || !workspaceId || !member) {
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

      // Create locker assignment
      const assignmentData = withCreatedBy(
        {
          owner_id: workspace.owner_user_id,
          workspace_id: workspaceId,
          locker_id: selectedLockerId,
          member_id: memberId,
          start_date: formData.start_date,
          end_date: formData.end_date || null,
          rent_amount: formData.rent_amount ? Number(formData.rent_amount) : selectedLocker?.monthly_rent,
          deposit_amount: formData.deposit_amount ? Number(formData.deposit_amount) : selectedLocker?.deposit_amount,
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
          current_member_id: memberId,
          assigned_from: formData.start_date,
          assigned_until: formData.end_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", selectedLockerId)

      if (lockerError) {
        console.error("Error updating locker:", lockerError)
        showError(`Failed to update locker status: ${lockerError.message}`)
        return
      }

      // Update member's locker_id
      const { error: memberError } = await supabase
        .from("library_members")
        .update({
          locker_id: selectedLockerId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", memberId)

      if (memberError) {
        console.error("Error updating member:", memberError)
        // Don't fail the whole operation for this
      }

      showSuccess("Locker assigned successfully!")
      router.push(`/library-members/${memberId}`)
    } catch (error) {
      console.error("Error:", error)
      showError("Failed to assign locker. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <PageLoading message="Loading data..." />
  }

  if (!member) {
    return null
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/library-members/${memberId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Assign Locker</h1>
          <p className="text-muted-foreground">
            Select a locker for {member.name}
            {member.member_code && <span className="font-mono ml-1">({member.member_code})</span>}
          </p>
        </div>
      </div>

      {lockers.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No Available Lockers</h3>
              <p className="text-muted-foreground mb-4">
                There are no available lockers in {member.library?.name || "this library"}.
              </p>
              <Link href={`/library-members/${memberId}`}>
                <Button variant="outline">Go Back</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Locker Selection */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Select Locker
              </CardTitle>
              <CardDescription>
                {lockers.length} locker{lockers.length !== 1 ? "s" : ""} available in {member.library?.name}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {lockers.map((locker) => {
                  const isSelected = selectedLockerId === locker.id
                  const sizeConfig = LIBRARY_LOCKER_SIZE_CONFIG[locker.size as keyof typeof LIBRARY_LOCKER_SIZE_CONFIG]

                  return (
                    <button
                      key={locker.id}
                      type="button"
                      onClick={() => setSelectedLockerId(locker.id)}
                      className={`relative p-4 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50 hover:bg-muted/50"
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 p-1 bg-primary rounded-full">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className={`h-5 w-5 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <span className="font-semibold">#{locker.locker_number}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="h-3 w-3 text-muted-foreground" />
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          locker.size === "large" ? "bg-blue-100 text-blue-700" :
                          locker.size === "medium" ? "bg-purple-100 text-purple-700" :
                          "bg-gray-100 text-gray-700"
                        }`}>
                          {sizeConfig?.label || locker.size}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Floor {locker.floor === 0 ? "G" : locker.floor}
                        {locker.section && ` • ${locker.section}`}
                      </div>
                      {locker.monthly_rent && (
                        <div className="text-sm font-medium mt-2">
                          <Currency amount={locker.monthly_rent} />
                          <span className="text-muted-foreground">/mo</span>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Assignment Details */}
          {selectedLockerId && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Assignment Details</CardTitle>
                <CardDescription>
                  Configure the assignment period and pricing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                      <p className="text-xs text-muted-foreground">
                        Refundable when locker is returned
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-4">
            <Link href={`/library-members/${memberId}`}>
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading || !selectedLockerId}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Assigning...
                </>
              ) : (
                <>
                  <Lock className="mr-2 h-4 w-4" />
                  Assign Locker
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
