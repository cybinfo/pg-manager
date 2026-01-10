"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import {
  Wallet,
  ArrowLeft,
  User,
  Building2,
  Banknote,
  CreditCard,
  Smartphone,
  Calendar,
  CheckCircle,
  Clock,
  XCircle,
  Edit,
  Trash2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/form-components"
import { PageLoader } from "@/components/ui/page-loader"
import { Avatar } from "@/components/ui/avatar"
import { TableBadge } from "@/components/ui/data-table"
import { TenantLink, PropertyLink } from "@/components/ui/entity-link"
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { toast } from "sonner"
import { PermissionGuard } from "@/components/auth"

interface Refund {
  id: string
  refund_type: string
  amount: number
  payment_mode: string
  reference_number: string | null
  status: string
  refund_date: string | null
  due_date: string | null
  reason: string | null
  notes: string | null
  created_at: string
  updated_at: string
  processed_at: string | null
  tenant: { id: string; name: string; phone: string; photo_url: string | null } | null
  property: { id: string; name: string } | null
  exit_clearance: { id: string; expected_exit_date: string; settlement_status: string } | null
}

export default function RefundDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [refund, setRefund] = useState<Refund | null>(null)
  const [editing, setEditing] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    status: "",
    refund_date: "",
    reference_number: "",
    notes: "",
  })

  useEffect(() => {
    fetchRefund()
  }, [params.id])

  const fetchRefund = async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("refunds")
      .select(`
        *,
        tenant:tenants(id, name, phone, photo_url),
        property:properties(id, name),
        exit_clearance:exit_clearance(id, expected_exit_date, settlement_status)
      `)
      .eq("id", params.id)
      .single()

    if (error || !data) {
      console.error("Error fetching refund:", error)
      toast.error("Refund not found")
      router.push("/refunds")
      return
    }

    const transformed = {
      ...data,
      tenant: transformJoin(data.tenant),
      property: transformJoin(data.property),
      exit_clearance: transformJoin(data.exit_clearance),
    } as Refund

    setRefund(transformed)
    setFormData({
      status: transformed.status,
      refund_date: transformed.refund_date || "",
      reference_number: transformed.reference_number || "",
      notes: transformed.notes || "",
    })
    setLoading(false)
  }

  const handleUpdate = async () => {
    if (!refund) return

    setSubmitting(true)

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      const updates: Record<string, unknown> = {
        status: formData.status,
        reference_number: formData.reference_number || null,
        notes: formData.notes || null,
      }

      // If marking as completed, set processed info
      if (formData.status === "completed" && refund.status !== "completed") {
        updates.refund_date = formData.refund_date || new Date().toISOString().split("T")[0]
        updates.processed_by = session?.user?.id
        updates.processed_at = new Date().toISOString()
      } else if (formData.refund_date) {
        updates.refund_date = formData.refund_date
      }

      const { error } = await supabase
        .from("refunds")
        .update(updates)
        .eq("id", refund.id)

      if (error) {
        toast.error(`Failed to update: ${error.message}`)
      } else {
        toast.success("Refund updated successfully")
        setEditing(false)
        fetchRefund()
      }
    } catch (err) {
      toast.error("An error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!refund) return
    if (!confirm("Are you sure you want to delete this refund record?")) return

    const supabase = createClient()
    const { error } = await supabase
      .from("refunds")
      .delete()
      .eq("id", refund.id)

    if (error) {
      toast.error(`Failed to delete: ${error.message}`)
    } else {
      toast.success("Refund deleted")
      router.push("/refunds")
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-500" />
      case "failed":
      case "cancelled":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getPaymentModeIcon = (mode: string) => {
    switch (mode) {
      case "cash":
        return <Banknote className="h-5 w-5" />
      case "upi":
        return <Smartphone className="h-5 w-5" />
      case "bank_transfer":
        return <Building2 className="h-5 w-5" />
      case "cheque":
        return <CreditCard className="h-5 w-5" />
      default:
        return <Wallet className="h-5 w-5" />
    }
  }

  if (loading) return <PageLoader />
  if (!refund) return null

  return (
    <PermissionGuard permission="payments.view">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/refunds">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                Refund Details
                {getStatusIcon(refund.status)}
              </h1>
              <p className="text-muted-foreground">
                Created {formatDateTime(refund.created_at)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!editing && (
              <>
                <Button variant="outline" onClick={() => setEditing(true)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button variant="outline" className="text-red-600" onClick={handleDelete}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tenant Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Tenant
                </CardTitle>
              </CardHeader>
              <CardContent>
                {refund.tenant ? (
                  <div className="flex items-center gap-4">
                    <Avatar
                      name={refund.tenant.name}
                      src={refund.tenant.photo_url}
                      size="lg"
                      className="bg-gradient-to-br from-teal-500 to-emerald-500 text-white"
                    />
                    <div>
                      <TenantLink id={refund.tenant.id} name={refund.tenant.name} />
                      <p className="text-sm text-muted-foreground">{refund.tenant.phone}</p>
                      {refund.property && (
                        <div className="mt-1">
                          <PropertyLink id={refund.property.id} name={refund.property.name} size="sm" />
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">Tenant information not available</p>
                )}
              </CardContent>
            </Card>

            {/* Refund Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Refund Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                          value={formData.status}
                          onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                          options={[
                            { value: "pending", label: "Pending" },
                            { value: "processing", label: "Processing" },
                            { value: "completed", label: "Completed" },
                            { value: "failed", label: "Failed" },
                            { value: "cancelled", label: "Cancelled" },
                          ]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Refund Date</Label>
                        <Input
                          type="date"
                          value={formData.refund_date}
                          onChange={(e) => setFormData({ ...formData, refund_date: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Reference Number</Label>
                      <Input
                        value={formData.reference_number}
                        onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                        placeholder="Transaction ID / UPI Ref"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Notes</Label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="w-full min-h-[80px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleUpdate} disabled={submitting}>
                        {submitting ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button variant="outline" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Type</p>
                        <p className="font-medium capitalize">{refund.refund_type.replace(/_/g, " ")}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Amount</p>
                        <p className="text-xl font-bold text-green-600">{formatCurrency(refund.amount)}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Mode</p>
                        <div className="flex items-center gap-2">
                          {getPaymentModeIcon(refund.payment_mode)}
                          <span className="capitalize">{refund.payment_mode.replace(/_/g, " ")}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Reference Number</p>
                        <p className="font-medium">{refund.reference_number || "—"}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Refund Date</p>
                        <p className="font-medium">{refund.refund_date ? formatDate(refund.refund_date) : "Not processed"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <TableBadge
                          variant={
                            refund.status === "completed"
                              ? "success"
                              : refund.status === "pending"
                              ? "warning"
                              : "error"
                          }
                        >
                          {refund.status}
                        </TableBadge>
                      </div>
                    </div>
                    {refund.reason && (
                      <div>
                        <p className="text-sm text-muted-foreground">Reason</p>
                        <p>{refund.reason}</p>
                      </div>
                    )}
                    {refund.notes && (
                      <div>
                        <p className="text-sm text-muted-foreground">Notes</p>
                        <p>{refund.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status Card */}
            <Card>
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                    <Wallet className="h-8 w-8 text-green-600" />
                  </div>
                  <p className="text-3xl font-bold text-green-600">{formatCurrency(refund.amount)}</p>
                  <p className="text-sm text-muted-foreground capitalize mt-1">
                    {refund.refund_type.replace(/_/g, " ")}
                  </p>
                  <div className="mt-4">
                    <TableBadge
                      variant={
                        refund.status === "completed"
                          ? "success"
                          : refund.status === "pending"
                          ? "warning"
                          : "error"
                      }
                    >
                      {refund.status}
                    </TableBadge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Card */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Timeline</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                  <div>
                    <p className="text-sm font-medium">Created</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(refund.created_at)}</p>
                  </div>
                </div>
                {refund.processed_at && (
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                    <div>
                      <p className="text-sm font-medium">Processed</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(refund.processed_at)}</p>
                    </div>
                  </div>
                )}
                {refund.updated_at !== refund.created_at && (
                  <div className="flex items-start gap-3">
                    <div className="h-2 w-2 rounded-full bg-gray-400 mt-2" />
                    <div>
                      <p className="text-sm font-medium">Last Updated</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(refund.updated_at)}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Linked Exit Clearance */}
            {refund.exit_clearance && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Linked Exit Clearance</CardTitle>
                </CardHeader>
                <CardContent>
                  <Link href={`/exit-clearance/${refund.exit_clearance.id}`}>
                    <Button variant="outline" className="w-full">
                      View Exit Clearance
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PermissionGuard>
  )
}
