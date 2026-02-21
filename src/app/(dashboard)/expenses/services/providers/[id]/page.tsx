/**
 * Service Provider Detail Page
 */

"use client"

import { use, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Wrench,
  ArrowLeft,
  Edit,
  Trash2,
  Phone,
  Star,
  FileText,
  CreditCard,
  History,
} from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { softDelete } from "@/lib/audit"
import { useAuth } from "@/lib/auth"
import { formatCurrency, formatDate } from "@/lib/format"
import { showSuccess, showError } from "@/lib/toast-helpers"

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

import type { ServiceProvider, ServicePayment } from "@/types/expense-enhanced.types"

export default function ServiceProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { user } = useAuth()

  const [loading, setLoading] = useState(true)
  const [provider, setProvider] = useState<ServiceProvider | null>(null)
  const [recentPayments, setRecentPayments] = useState<ServicePayment[]>([])
  const [stats, setStats] = useState({
    totalPaid: 0,
    totalTds: 0,
    avgRating: 0,
  })

  // Load provider and payment history
  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      // Load provider
      const { data: providerData, error } = await supabase
        .from("service_providers")
        .select(`
          *,
          category:service_categories(id, name, name_hi)
        `)
        .eq("id", id)
        .is("deleted_at", null)
        .single()

      if (error || !providerData) {
        setLoading(false)
        return
      }

      const transformed = {
        ...providerData,
        category: transformJoin(providerData.category),
      } as ServiceProvider

      setProvider(transformed)

      // Load recent payments
      const { data: paymentsData } = await supabase
        .from("service_payments")
        .select("*")
        .eq("provider_id", id)
        .is("deleted_at", null)
        .order("service_date", { ascending: false })
        .limit(5)

      setRecentPayments(paymentsData || [])

      // Calculate stats
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

        setStats({
          totalPaid,
          totalTds,
          avgRating: transformed.rating || 0,
        })
      }

      setLoading(false)
    }

    loadData()
  }, [id])

  const handleDelete = async () => {
    if (!user?.id) return

    const confirmed = window.confirm(
      `Are you sure you want to delete "${provider?.name}"? This action cannot be undone.`
    )
    if (!confirmed) return

    try {
      const result = await softDelete("service_providers", id, user.id)
      if (!result.error) {
        showSuccess("Provider deleted successfully")
        router.push("/expenses/services/providers")
      } else {
        showError(result.error.message || "Failed to delete provider")
      }
    } catch (error) {
      console.error("Failed to delete provider:", error)
      showError("Failed to delete provider")
    }
  }

  if (loading) return <PageLoading />

  if (!provider) {
    return (
      <div className="container py-6">
        <EmptyState
          title="Provider not found"
          description="The service provider you're looking for doesn't exist or has been deleted."
          action={{
            label: "Back to Providers",
            href: "/expenses/services/providers",
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
            href="/expenses/services/providers"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Providers
          </Link>

          {/* Hero Section */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-amber-600" />
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
              <Button variant="outline" asChild>
                <Link href={`/expenses/services/providers/${id}/edit`}>
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
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">Total Paid</div>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(stats.totalPaid)}
              </div>
            </div>
            <div className="bg-white border rounded-lg p-4">
              <div className="text-sm text-muted-foreground">TDS Deducted</div>
              <div className="text-xl font-bold">{formatCurrency(stats.totalTds)}</div>
            </div>
            <div className="bg-white border rounded-lg p-4">
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
                      <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
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
                <p className="text-sm text-muted-foreground py-4">No services recorded yet</p>
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
    </FeatureGuard>
  )
}
