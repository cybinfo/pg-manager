/**
 * Vendor Detail Page
 *
 * Shows vendor details with payment history and statistics.
 */

"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import {
  Building2,
  Edit,
  Trash2,
  Phone,
  CreditCard,
  Receipt,
  History,
  Home,
  ChevronRight,
} from "lucide-react"

import { useDetailPage, VENDOR_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate } from "@/lib/format"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"

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

  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalBills: 0,
    pendingAmount: 0,
    lastPaymentDate: null as string | null,
  })

  const {
    data: vendor,
    loading,
    related,
    deleteRecord,
    isDeleting,
  } = useDetailPage<Vendor>({
    config: VENDOR_DETAIL_CONFIG,
    id,
  })

  // Load aggregate stats (not covered by relatedQueries)
  useEffect(() => {
    if (!id) return

    async function loadStats() {
      const supabase = createClient()

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
    }

    loadStats()
  }, [id])

  const handleDelete = () => {
    confirm({
      title: "Delete Vendor",
      description: `Are you sure you want to delete "${vendor?.name}"? This action cannot be undone.`,
      destructive: true,
      onConfirm: async () => {
        await deleteRecord({ confirm: false })
      },
    })
  }

  // Use related data from the hook (recentPayments from relatedQueries config)
  const recentPayments = (related.recentPayments || []) as BillPayment[]

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
          {ConfirmDialogElement}
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground mb-6">
            <Link href="/dashboard" className="flex items-center gap-1 hover:text-foreground transition-colors">
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Dashboard</span>
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <Link href="/expenses" className="hover:text-foreground transition-colors">Expenses</Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <Link href="/expenses/vendors" className="hover:text-foreground transition-colors">Vendors</Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-foreground font-medium">Details</span>
          </nav>

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
              <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Total Paid</div>
              <div className="text-xl font-bold text-success">
                {formatCurrency(stats.totalPaid)}
              </div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Total Bills</div>
              <div className="text-xl font-bold">{formatCurrency(stats.totalBills)}</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Pending</div>
              <div className="text-xl font-bold text-warning">
                {formatCurrency(stats.pendingAmount)}
              </div>
            </div>
            <div className="bg-card border rounded-lg p-4">
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
