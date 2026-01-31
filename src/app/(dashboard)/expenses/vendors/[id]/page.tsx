/**
 * Vendor Detail Page
 *
 * Shows vendor details with payment history and statistics.
 */

"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Building2,
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Receipt,
  History,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { softDelete } from "@/lib/audit"
import { useAuth } from "@/lib/auth"
import { formatCurrency, formatDate } from "@/lib/format"
import { toast } from "sonner"

import { PermissionGuard, FeatureGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import {
  DetailPageTemplate,
  DetailSection,
  InfoRow,
} from "@/components/ui"
import { TableBadge } from "@/components/ui/data-table"
import { PageLoading } from "@/components/ui/loading"
import { EmptyState } from "@/components/ui/empty-state"

import type { Vendor, BillPayment } from "@/types/expense-enhanced.types"

export default function VendorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [vendor, setVendor] = useState<Vendor | null>(null)
  const [recentPayments, setRecentPayments] = useState<BillPayment[]>([])
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalBills: 0,
    pendingAmount: 0,
    lastPaymentDate: null as string | null,
  })

  // Load vendor and payment history
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      // Load vendor
      const { data: vendorData, error } = await supabase
        .from("vendors")
        .select(`
          *,
          category:bill_categories(id, name, name_hi)
        `)
        .eq("id", id)
        .is("deleted_at", null)
        .single()

      if (error || !vendorData) {
        setLoading(false)
        return
      }

      const transformed = {
        ...vendorData,
        category: transformJoin(vendorData.category),
      } as Vendor

      setVendor(transformed)

      // Load recent payments
      const { data: paymentsData } = await supabase
        .from("bill_payments")
        .select("*")
        .eq("vendor_id", id)
        .is("deleted_at", null)
        .order("payment_date", { ascending: false })
        .limit(5)

      setRecentPayments(paymentsData || [])

      // Calculate stats
      interface StatsRow {
        bill_amount: number
        paid_amount: number | null
        payment_date: string | null
        status: string
      }

      const { data: statsData } = await supabase
        .from("bill_payments")
        .select("bill_amount, paid_amount, payment_date, status")
        .eq("vendor_id", id)
        .is("deleted_at", null)

      if (statsData) {
        const rows = statsData as StatsRow[]
        const totalPaid = rows.reduce((sum: number, p: StatsRow) => sum + (Number(p.paid_amount) || 0), 0)
        const totalBills = rows.reduce((sum: number, p: StatsRow) => sum + Number(p.bill_amount), 0)
        const pendingAmount = rows
          .filter((p: StatsRow) => p.status !== "paid")
          .reduce((sum: number, p: StatsRow) => sum + (Number(p.bill_amount) - (Number(p.paid_amount) || 0)), 0)
        const lastPayment = rows
          .filter((p: StatsRow) => p.payment_date)
          .sort((a: StatsRow, b: StatsRow) => new Date(b.payment_date!).getTime() - new Date(a.payment_date!).getTime())[0]

        setStats({
          totalPaid,
          totalBills,
          pendingAmount,
          lastPaymentDate: lastPayment?.payment_date || null,
        })
      }

      setLoading(false)
    }

    loadData()
  }, [id])

  const handleDelete = async () => {
    if (!user?.id) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${vendor?.name}"? This action cannot be undone.`
    )
    if (!confirmed) return

    try {
      const result = await softDelete("vendors", id, user.id)
      if (!result.error) {
        toast.success("Vendor deleted successfully")
        router.push("/expenses/vendors")
      } else {
        toast.error(result.error.message || "Failed to delete vendor")
      }
    } catch (error) {
      console.error("Failed to delete vendor:", error)
      toast.error("Failed to delete vendor")
    }
  }

  if (loading) return <PageLoading />

  if (!vendor) {
    return (
      <div className="container py-6">
        <EmptyState
          title="Vendor not found"
          description="The vendor you're looking for doesn't exist or has been deleted."
          action={{
            label: "Back to Vendors",
            href: "/expenses/vendors",
          }}
        />
      </div>
    )
  }

  return (
    <FeatureGuard feature="expenses">
      <PermissionGuard permission="expenses.view">
        <div className="container py-6">
          {/* Back Link */}
          <Link
            href="/expenses/vendors"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Vendors
          </Link>

          {/* Hero Section */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{vendor.name}</h1>
                {vendor.contact_name && (
                  <p className="text-muted-foreground">{vendor.contact_name}</p>
                )}
                <div className="flex gap-2 mt-1">
                  {vendor.is_active ? (
                    <TableBadge variant="success">Active</TableBadge>
                  ) : (
                    <TableBadge variant="error">Inactive</TableBadge>
                  )}
                  {vendor.category && (
                    <TableBadge variant="muted">{vendor.category.name}</TableBadge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/expenses/vendors/${id}/edit`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Link>
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Total Paid</div>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(stats.totalPaid)}
              </div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Total Bills</div>
              <div className="text-xl font-bold">{formatCurrency(stats.totalBills)}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Pending</div>
              <div className="text-xl font-bold text-orange-600">
                {formatCurrency(stats.pendingAmount)}
              </div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Last Payment</div>
              <div className="text-xl font-bold">
                {stats.lastPaymentDate ? formatDate(stats.lastPaymentDate) : "—"}
              </div>
            </div>
          </div>

          {/* Content */}
          <DetailPageTemplate
            layoutKey="vendor-detail"
            entityType="vendor"
            record={vendor}
            columns={2}
          >
            {/* Contact Details */}
            <DetailSection title="Contact Information" icon={Phone}>
              <InfoRow label="Contact Person" value={vendor.contact_name || "Not set"} />
              <InfoRow
                label="Phone"
                value={
                  vendor.phone ? (
                    <a href={`tel:${vendor.phone}`} className="text-primary hover:underline">
                      {vendor.phone}
                    </a>
                  ) : (
                    "Not set"
                  )
                }
              />
              <InfoRow
                label="Email"
                value={
                  vendor.email ? (
                    <a href={`mailto:${vendor.email}`} className="text-primary hover:underline">
                      {vendor.email}
                    </a>
                  ) : (
                    "Not set"
                  )
                }
              />
              <InfoRow label="Address" value={vendor.address || "Not set"} />
            </DetailSection>

            {/* Tax Information */}
            <DetailSection title="Tax Information" icon={Receipt}>
              <InfoRow label="GSTIN" value={vendor.gstin || "Not provided"} />
              <InfoRow label="PAN" value={vendor.pan || "Not provided"} />
            </DetailSection>

            {/* Payment Details */}
            <DetailSection title="Payment Details" icon={CreditCard}>
              <InfoRow
                label="UPI ID"
                value={vendor.upi_id || "Not set"}
              />
              <InfoRow label="Bank Name" value={vendor.bank_name || "Not set"} />
              <InfoRow label="Account Number" value={vendor.bank_account || "Not set"} />
              <InfoRow label="IFSC Code" value={vendor.bank_ifsc || "Not set"} />
            </DetailSection>

            {/* Recent Payments */}
            <DetailSection
              title="Recent Payments"
              icon={History}
              description={`Last ${recentPayments.length} payments`}
            >
              {recentPayments.length > 0 ? (
                <div className="space-y-3">
                  {recentPayments.map((payment) => (
                    <Link
                      key={payment.id}
                      href={`/expenses/bills/${payment.id}`}
                      className="flex items-center justify-between py-2 border-b border-dashed last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {payment.bill_number || "Bill"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {payment.payment_date
                            ? formatDate(payment.payment_date)
                            : "Unpaid"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-semibold">
                          {formatCurrency(payment.bill_amount)}
                        </div>
                        <TableBadge
                          variant={
                            payment.status === "paid"
                              ? "success"
                              : payment.status === "overdue"
                                ? "error"
                                : "warning"
                          }
                        >
                          {payment.status}
                        </TableBadge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">No payments recorded yet</p>
              )}
            </DetailSection>

            {/* Notes */}
            {vendor.notes && (
              <DetailSection title="Notes" icon={Building2}>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {vendor.notes}
                </p>
              </DetailSection>
            )}
          </DetailPageTemplate>
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
