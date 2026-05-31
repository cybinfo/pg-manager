"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RefreshCw, Calendar, Home, IndianRupee, AlertCircle, CheckCircle, Loader2, Clock } from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { formatDate, formatCurrency } from "@/lib/format"
import { withCreatedBy } from "@/lib/audit"
import { useTenantPortalData } from "@/lib/hooks/useTenantPortalData"
import { FeatureGuard } from "@/components/auth"
import { APPROVAL_STATUS } from "@/lib/status"
import { variantClassMap } from "@/lib/design-tokens"
import { TableBadge } from "@/components/ui/data-table"

interface RenewalRequest {
  id: string
  status: string
  description: string
  created_at: string
  decided_at: string | null
}

function TenantRenewalContent() {
  const { tenant, tenantContext, user, loading: tenantLoading } = useTenantPortalData()
  const [requests, setRequests] = useState<RenewalRequest[]>([])
  const [loadingRequests, setLoadingRequests] = useState(false)
  const [requestsLoaded, setRequestsLoaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [reason, setReason] = useState("")

  const fetchRequests = async (tenantId: string) => {
    setLoadingRequests(true)
    const supabase = createClient()
    const { data } = await supabase
      .from("approvals")
      .select("id, status, description, created_at, decided_at")
      .eq("requester_tenant_id", tenantId)
      .eq("type", "lease_renewal")
      .order("created_at", { ascending: false })
    setRequests(data || [])
    setLoadingRequests(false)
    setRequestsLoaded(true)
  }

  // Lazy-load renewal request history once tenant is available
  if (!tenantLoading && tenant && !requestsLoaded && !loadingRequests) {
    fetchRequests(tenant.id)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!tenant || !tenantContext || !reason.trim()) {
      showError("Please provide a reason for renewal")
      return
    }

    setSubmitting(true)
    try {
      const supabase = createClient()

      const { error } = await supabase.from("approvals").insert(
        withCreatedBy({
          requester_tenant_id: tenant.id,
          workspace_id: tenantContext.workspace_id,
          owner_id: tenantContext.owner_id,
          type: "lease_renewal",
          title: "Lease Renewal Request",
          description: reason.trim(),
          payload: {
            current_rent: tenant.monthly_rent,
            check_in_date: tenant.check_in_date,
            room: tenant.room ? `Room ${tenant.room.room_number}` : null,
            property: tenant.property?.name,
          },
          status: "pending",
        }, user?.id || tenant.id)
      )

      if (error) {
        showError("Failed to submit renewal request. Please try again.")
        return
      }

      showSuccess("Renewal request submitted! Your property owner will review it.")
      setReason("")
      setShowForm(false)
      fetchRequests(tenant.id)
    } catch {
      showError("Failed to submit renewal request. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (tenantLoading) return <PageSkeleton variant="detail" />

  if (!tenant) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Profile Not Found</h2>
        <p className="text-muted-foreground">Unable to load your tenancy details.</p>
      </div>
    )
  }

  const statusColorClass = (status: string) =>
    variantClassMap[APPROVAL_STATUS[status]?.variant ?? "muted"] ?? variantClassMap.muted

  const hasPendingRequest = requests.some((r) => r.status === "pending")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Stay Renewal</h1>
        <p className="text-muted-foreground">Request an extension of your current stay</p>
      </div>

      {/* Current Stay Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Current Stay
          </CardTitle>
          <CardDescription>Your active tenancy details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {tenant.property && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Property</p>
                <p className="font-medium">{tenant.property.name}</p>
              </div>
            )}
            {tenant.room && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Room</p>
                <p className="font-medium">Room {tenant.room.room_number}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Monthly Rent</p>
              <p className="font-medium flex items-center gap-1">
                <IndianRupee className="h-3.5 w-3.5" />
                {formatCurrency(tenant.monthly_rent)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Check-in Date</p>
              <p className="font-medium flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {formatDate(tenant.check_in_date)}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Status</p>
              <TableBadge variant="success">
                <span className="h-1.5 w-1.5 rounded-full bg-success mr-1.5 inline-block" />
                Active
              </TableBadge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Request Renewal */}
      {!showForm ? (
        <Card>
          <CardContent className="flex flex-col items-center py-10 text-center gap-4">
            <div className="p-3 bg-primary/10 rounded-full">
              <RefreshCw className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Request a Renewal</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm">
                Submit a renewal request to your property owner. They will review and confirm the extension.
              </p>
            </div>
            <Button
              onClick={() => setShowForm(true)}
              disabled={hasPendingRequest}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {hasPendingRequest ? "Renewal Pending Review" : "Request Renewal"}
            </Button>
            {hasPendingRequest && (
              <p className="text-xs text-warning">
                You already have a pending renewal request. Please wait for the owner to respond.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Submit Renewal Request</CardTitle>
            <CardDescription>
              Tell your property owner how long you&apos;d like to extend your stay.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reason">Renewal Details *</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g., I'd like to extend my stay for 3 more months until July 2026..."
                  rows={4}
                  disabled={submitting}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Include how long you want to extend and any other relevant details.
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setShowForm(false); setReason("") }}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting || !reason.trim()}>
                  {submitting ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                  ) : (
                    <><RefreshCw className="mr-2 h-4 w-4" />Submit Request</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Past Renewal Requests */}
      {(loadingRequests || requests.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Renewal History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRequests ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-3">
                {requests.map((req) => (
                  <div
                    key={req.id}
                    className={`p-4 rounded-lg border ${statusColorClass(req.status)}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1 min-w-0">
                        <p className="text-sm font-medium">
                          {req.status === "approved" && <CheckCircle className="inline h-4 w-4 mr-1" />}
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </p>
                        <p className="text-sm opacity-80 truncate">{req.description}</p>
                      </div>
                      <div className="text-right text-xs opacity-70 whitespace-nowrap">
                        <p>Submitted {formatDate(req.created_at)}</p>
                        {req.decided_at && <p>Decided {formatDate(req.decided_at)}</p>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default function TenantRenewalPage() {
  return (
    <FeatureGuard module="approvals" feature="tenantRequests">
      <TenantRenewalContent />
    </FeatureGuard>
  )
}
