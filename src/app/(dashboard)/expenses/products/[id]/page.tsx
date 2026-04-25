/**
 * Product Detail Page
 *
 * Shows product details with price history and usage statistics.
 */

"use client"

import { use, useState, useEffect } from "react"
import Link from "next/link"
import {
  Package,
  Edit,
  Trash2,
  Tag,
  Scale,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  History,
  Home,
  ChevronRight,
} from "lucide-react"

import { useDetailPage, PRODUCT_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
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

import type { Product, ProductPriceHistory } from "@/types/expense-enhanced.types"

interface DailySpendItem {
  id: string
  spend_date: string
  quantity: number
  unit: string
  rate: number
  total: number
  vendor_name: string | null
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)

  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const [priceHistory, setPriceHistory] = useState<ProductPriceHistory[]>([])
  const [recentSpend, setRecentSpend] = useState<DailySpendItem[]>([])

  const {
    data: product,
    loading,
    deleteRecord,
    isDeleting,
  } = useDetailPage<Product>({
    config: PRODUCT_DETAIL_CONFIG,
    id,
  })

  // Load price history and recent spend (not covered by the config's relatedQueries)
  useEffect(() => {
    if (!id) return

    async function loadRelatedData() {
      const supabase = createClient()

      const [{ data: historyData }, { data: spendData }] = await Promise.all([
        supabase
          .from("product_price_history")
          .select("*")
          .eq("product_id", id)
          .order("recorded_date", { ascending: false })
          .limit(10),
        supabase
          .from("daily_spend")
          .select("id, spend_date, quantity, unit, rate, total, vendor_name")
          .eq("product_id", id)
          .is("deleted_at", null)
          .order("spend_date", { ascending: false })
          .limit(5),
      ])

      setPriceHistory(historyData || [])
      setRecentSpend(spendData || [])
    }

    loadRelatedData()
  }, [id])

  const handleDelete = () => {
    confirm({
      title: "Delete Product",
      description: `Are you sure you want to delete "${product?.name}"? This action cannot be undone.`,
      destructive: true,
      onConfirm: async () => {
        await deleteRecord({ confirm: false })
      },
    })
  }

  // Calculate price statistics
  const priceStats = {
    current: product?.default_rate || (priceHistory[0]?.rate || 0),
    average: priceHistory.length > 0
      ? priceHistory.reduce((sum: number, p: ProductPriceHistory) => sum + Number(p.rate), 0) / priceHistory.length
      : 0,
    min: priceHistory.length > 0
      ? Math.min(...priceHistory.map((p: ProductPriceHistory) => Number(p.rate)))
      : 0,
    max: priceHistory.length > 0
      ? Math.max(...priceHistory.map((p: ProductPriceHistory) => Number(p.rate)))
      : 0,
  }

  const priceTrend =
    priceHistory.length >= 2
      ? ((Number(priceHistory[0]?.rate) - Number(priceHistory[1]?.rate)) /
          Number(priceHistory[1]?.rate)) *
        100
      : 0

  if (loading) return <PageLoading />

  if (!product) {
    return (
      <div className="container py-6">
        <EmptyState
          title="Product not found"
          description="The product you're looking for doesn't exist or has been deleted."
          action={{
            label: "Back to Products",
            href: "/expenses/products",
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
            <Link href="/expenses/products" className="hover:text-foreground transition-colors">Products</Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
            <span className="text-foreground font-medium">Details</span>
          </nav>

          {/* Hero Section */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{product.name}</h1>
                {product.name_hi && (
                  <p className="text-muted-foreground">{product.name_hi}</p>
                )}
                <div className="flex gap-2 mt-1">
                  {product.is_active ? (
                    <TableBadge variant="success">Active</TableBadge>
                  ) : (
                    <TableBadge variant="error">Inactive</TableBadge>
                  )}
                  {product.category && (
                    <TableBadge variant="muted">{product.category.name}</TableBadge>
                  )}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <Link href={`/expenses/products/${id}/edit`}>
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

          {/* Content */}
          <DetailPageTemplate
            layoutKey="product-detail"
            entityType="product"
            record={product}
            columns={2}
          >
            {/* Product Details */}
            <DetailSection title="Product Details" icon={Package}>
              <InfoRow label="Name" value={product.name} />
              {product.name_hi && (
                <InfoRow label="Hindi Name" value={product.name_hi} />
              )}
              <InfoRow
                label="Category"
                value={product.category?.name || "Uncategorized"}
              />
              <InfoRow
                label="Default Unit"
                value={product.default_unit || "Not set"}
              />
              <InfoRow
                label="Default Rate"
                value={
                  product.default_rate
                    ? `${formatCurrency(product.default_rate)}/${product.default_unit || "unit"}`
                    : "Not set"
                }
              />
            </DetailSection>

            {/* Price Statistics */}
            <DetailSection title="Price Statistics" icon={TrendingUp}>
              <InfoRow
                label="Current Rate"
                value={priceStats.current > 0 ? formatCurrency(priceStats.current) : "Not set"}
              />
              <InfoRow
                label="Average Rate"
                value={priceStats.average > 0 ? formatCurrency(priceStats.average) : "No data"}
              />
              <InfoRow
                label="Price Range"
                value={
                  priceStats.min > 0
                    ? `${formatCurrency(priceStats.min)} - ${formatCurrency(priceStats.max)}`
                    : "No data"
                }
              />
              <InfoRow
                label="Recent Trend"
                value={
                  priceTrend !== 0 ? (
                    <span className={priceTrend > 0 ? "text-destructive" : "text-success"}>
                      {priceTrend > 0 ? "↑" : "↓"} {Math.abs(priceTrend).toFixed(1)}%
                    </span>
                  ) : (
                    "Stable"
                  )
                }
              />
            </DetailSection>

            {/* Recent Purchases */}
            <DetailSection
              title="Recent Purchases"
              icon={History}
              description={`Last ${recentSpend.length} purchases`}
            >
              {recentSpend.length > 0 ? (
                <div className="space-y-3">
                  {recentSpend.map((spend) => (
                    <div
                      key={spend.id}
                      className="flex items-center justify-between py-2 border-b border-dashed last:border-0"
                    >
                      <div>
                        <div className="text-sm font-medium">
                          {spend.quantity} {spend.unit} @ {formatCurrency(spend.rate)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(spend.spend_date)}
                          {spend.vendor_name && ` • ${spend.vendor_name}`}
                        </div>
                      </div>
                      <div className="text-sm font-semibold">
                        {formatCurrency(spend.total)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">No purchases recorded yet</p>
              )}
            </DetailSection>

            {/* Price History */}
            <DetailSection
              title="Price History"
              icon={TrendingUp}
              description="Recent price changes"
            >
              {priceHistory.length > 0 ? (
                <div className="space-y-2">
                  {priceHistory.slice(0, 5).map((price, index) => (
                    <div
                      key={price.id}
                      className="flex items-center justify-between py-2 border-b border-dashed last:border-0"
                    >
                      <div className="text-sm">
                        {formatDate(price.recorded_date)}
                        {price.vendor_name && (
                          <span className="text-muted-foreground ml-2">
                            from {price.vendor_name}
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-semibold">
                        {formatCurrency(price.rate)}
                        {index < priceHistory.length - 1 && priceHistory[index + 1] && (
                          <span
                            className={`ml-2 text-xs ${
                              Number(price.rate) > Number(priceHistory[index + 1].rate)
                                ? "text-destructive"
                                : Number(price.rate) < Number(priceHistory[index + 1].rate)
                                  ? "text-success"
                                  : "text-muted-foreground"
                            }`}
                          >
                            {Number(price.rate) > Number(priceHistory[index + 1].rate) ? "↑" :
                             Number(price.rate) < Number(priceHistory[index + 1].rate) ? "↓" : "→"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4">No price history available</p>
              )}
            </DetailSection>
          </DetailPageTemplate>
        </div>
      </PermissionGuard>
    </FeatureGuard>
  )
}
