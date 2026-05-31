/**
 * Service Provider Detail Page
 */

"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import {
  Wrench,
  Edit,
  Trash2,
  Phone,
  Star,
  FileText,
  CreditCard,
  History,
  Home,
  ChevronRight,
} from "lucide-react"

import { useDetailPage, SERVICE_PROVIDER_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { createClient } from "@/lib/supabase/client"
import { formatCurrency, formatDate } from "@/lib/format"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"

import { PermissionGuard, PermissionGate, ModuleGuard } from "@/components/auth"
import { Button } from "@/components/ui/button"
import {
  DetailPageTemplate,
  DetailSection,
  InfoRow,
  NotFoundState,
  EmptyState,
} from "@/components/ui"
import { TableBadge } from "@/components/ui/data-table"
import { PageLoading } from "@/components/ui/loading"

import type { ServiceProvider, ServicePayment } from "@/types/expense-enhanced.types"

export default function ServiceProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalTds: 0,
    avgRating: 0,
  })

  const {
    data: provider,
    loading,
    related,
    deleteRecord,
    isDeleting,
  } = useDetailPage<ServiceProvider>({
    config: SERVICE_PROVIDER_DETAIL_CONFIG,
    id,
  })

  // Load aggregate stats (not covered by relatedQueries)
  useEffect(() => {
    if (!id) return

    async function loadStats() {
      const supabase = createClient()

      interface StatsRow {
        net_amount: number
        tds_amount: number
      }

      const { data: statsData } = await supabase
        .from("service_payments")
        .select("net_amount, tds_amount")
        .eq("provider_id", id)
        .is("deleted_at", null)

      if (statsData) {
        const rows = statsData as StatsRow[]
        const totalPaid = rows.reduce((sum: number, p: StatsRow) => sum + Number(p.net_amount), 0)
        const totalTds = rows.reduce((sum: number, p: StatsRow) => sum + Number(p.tds_amount), 0)
        setStats({ totalPaid, totalTds, avgRating: 0 })
      }
    }

    loadStats()
  }, [id])

  const handleDelete = () => {
    confirm({
      title: "Delete Provider",
      description: `Are you sure you want to delete "${provider?.name}"? This action cannot be undone.`,
      destructive: true,
      onConfirm: async () => {
        await deleteRecord({ confirm: false })
      },
    })
  }

  // Use related data from the hook (recentServices from relatedQueries config)
  const recentPayments = (related.recentServices || []) as ServicePayment[]

  if (loading) return <PageLoading />

  if (!provider) {
    return <NotFoundState title="Provider not found" backHref="/expenses/services/providers" backLabel="All Providers" />
  }

  return (
    <ModuleGuard module="expenses">
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
            <Link href="/expenses/services" className="hover:text-foreground transition-colors">Services</Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <Link href="/expenses/services/providers" className="hover:text-foreground transition-colors">Providers</Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-foreground font-medium">Details</span>
          </nav>

          {/* Hero Section */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-warning" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{provider.name}</h1>
                {provider.phone && (
                  <a
                    href={`tel:${provider.phone}`}
                    className="text-muted-foreground hover:text-primary"
                  >
                    {provider.phone}
                  </a>
                )}
                <div className="flex gap-2 mt-1">
                  {provider.is_active ? (
                    <TableBadge variant="success">Active</TableBadge>
                  ) : (
                    <TableBadge variant="error">Inactive</TableBadge>
                  )}
                  {provider.category && (
                    <TableBadge variant="muted">{provider.category.name}</TableBadge>
                  )}
                  {provider.rating && (
                    <TableBadge variant="warning">
                      <Star className="h-3 w-3 mr-1 fill-current" />
                      {provider.rating.toFixed(1)}
                    </TableBadge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <PermissionGate permission="expenses.edit" hide>
                <Button variant="outline" asChild>
                  <Link href={`/expenses/services/providers/${id}/edit`}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Link>
                </Button>
              </PermissionGate>
              <PermissionGate permission="expenses.delete" hide>
                <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </PermissionGate>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Total Paid</div>
              <div className="text-xl font-bold text-success">
                {formatCurrency(stats.totalPaid)}
              </div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">TDS Deducted</div>
              <div className="text-xl font-bold">{formatCurrency(stats.totalTds)}</div>
            </div>
            <div className="bg-card border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Total Jobs</div>
              <div className="text-xl font-bold">{provider.total_jobs}</div>
            </div>
          </div>

          {/* Content */}
          <DetailPageTemplate
            layoutKey="service-provider-detail"
            entityType="service_provider"
            record={provider}
            columns={2}
          >
            {/* Contact Details */}
            <DetailSection title="Contact Information" icon={Phone}>
              <InfoRow
                label="Phone"
                value={
                  provider.phone ? (
                    <a href={`tel:${provider.phone}`} className="text-primary hover:underline">
                      {provider.phone}
                    </a>
                  ) : (
                    "Not set"
                  )
                }
              />
              <InfoRow
                label="Alternate Phone"
                value={
                  provider.alternate_phone ? (
                    <a
                      href={`tel:${provider.alternate_phone}`}
                      className="text-primary hover:underline"
                    >
                      {provider.alternate_phone}
                    </a>
                  ) : (
                    "Not set"
                  )
                }
              />
              <InfoRow
                label="Email"
                value={
                  provider.email ? (
                    <a href={`mailto:${provider.email}`} className="text-primary hover:underline">
                      {provider.email}
                    </a>
                  ) : (
                    "Not set"
                  )
                }
              />
              <InfoRow label="Address" value={provider.address || "Not set"} />
            </DetailSection>

            {/* Tax Information */}
            <DetailSection title="Tax & TDS" icon={FileText}>
              <InfoRow label="PAN" value={provider.pan || "Not provided"} />
              <InfoRow label="GSTIN" value={provider.gstin || "Not provided"} />
              <InfoRow
                label="TDS Applicable"
                value={provider.tds_applicable ? "Yes" : "No"}
              />
              {provider.tds_applicable && (
                <>
                  <InfoRow label="TDS Section" value={provider.tds_section || "—"} />
                  <InfoRow
                    label="TDS Rate"
                    value={provider.tds_rate ? `${provider.tds_rate}%` : "—"}
                  />
                </>
              )}
            </DetailSection>

            {/* Payment Details */}
            <DetailSection title="Payment Details" icon={CreditCard}>
              <InfoRow label="UPI ID" value={provider.upi_id || "Not set"} />
              <InfoRow label="Total Jobs" value={provider.total_jobs.toString()} />
              <InfoRow
                label="Rating"
                value={
                  provider.rating ? (
                    <span className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-warning fill-warning" />
                      {provider.rating.toFixed(1)}
                    </span>
                  ) : (
                    "No rating yet"
                  )
                }
              />
            </DetailSection>

            {/* Recent Payments */}
            <DetailSection
              title="Recent Services"
              icon={History}
              description={`Last ${recentPayments.length} services`}
            >
              {recentPayments.length > 0 ? (
                <div className="space-y-3">
                  {recentPayments.map((payment) => (
                    <Link
                      key={payment.id}
                      href={`/expenses/services/${payment.id}`}
                      className="flex items-center justify-between py-2 border-b border-dashed last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded"
                    >
                      <div>
                        <div className="text-sm font-medium">{payment.description}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(payment.service_date)}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">
                        {formatCurrency(payment.net_amount)}
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <EmptyState variant="minimal" icon={Wrench} title="No services recorded yet" />
              )}
            </DetailSection>

            {/* Notes */}
            {provider.notes && (
              <DetailSection title="Notes" icon={Wrench}>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {provider.notes}
                </p>
              </DetailSection>
            )}
          </DetailPageTemplate>
        </div>
      </PermissionGuard>
    </ModuleGuard>
  )
}
