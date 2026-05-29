/**
 * useListPageMetrics Hook
 *
 * Manages server-side counts, server-side sums, and metrics computation
 * for accurate cross-page aggregations.
 */

"use client"

import { logger } from "@/lib/logger"
import { useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import type { MetricConfig, FilterConfig, ListPageConfig } from "./types"
import { applyServerFilter, applyBaseFiltersToQuery } from "./utils"

// ============================================
// Types
// ============================================

export interface UseListPageMetricsOptions<T> {
  metrics: MetricConfig<T>[]
  configRef: React.MutableRefObject<ListPageConfig<T>>
  filterConfigsRef: React.MutableRefObject<FilterConfig[]>
  metricsRef: React.MutableRefObject<MetricConfig<T>[]>
}

export interface UseListPageMetricsReturn<T> {
  serverCounts: Record<string, number>
  serverSums: Record<string, number>
  serverCountsLoading: boolean
  fetchServerCounts: (
    fetchFilters?: Record<string, string>,
    fetchSearchQuery?: string
  ) => Promise<void>
  fetchServerSums: (
    fetchFilters?: Record<string, string>,
    fetchSearchQuery?: string
  ) => Promise<void>
  computeMetrics: (
    data: T[],
    total: number,
    metrics: MetricConfig<T>[]
  ) => { id: string; label: string; value: number | string; icon?: React.ComponentType<{ className?: string }>; highlight?: boolean }[]
}

// ============================================
// Hook Implementation
// ============================================

export function useListPageMetrics<T extends object>(
  options: UseListPageMetricsOptions<T>,
  filters: Record<string, string>,
  searchQuery: string
): UseListPageMetricsReturn<T> {
  const { configRef, filterConfigsRef, metricsRef } = options

  // Server-side metric counts (for accurate counts across all pages)
  const [serverCounts, setServerCounts] = useState<Record<string, number>>({})

  // Server-side metric sums (for accurate aggregations across all pages)
  const [serverSums, setServerSums] = useState<Record<string, number>>({})

  // Track if server counts/sums are loading
  const [serverCountsLoading, setServerCountsLoading] = useState(false)

  // Fetch server-side counts for metrics with serverFilter
  const fetchServerCounts = useCallback(async (
    fetchFilters?: Record<string, string>,
    fetchSearchQuery?: string
  ) => {
    const currentConfig = configRef.current
    const currentFilterConfigs = filterConfigsRef.current
    const currentMetrics = metricsRef.current
    const currentFilters = fetchFilters ?? filters
    const currentSearchQuery = fetchSearchQuery ?? searchQuery

    // Find metrics that have serverFilter defined
    const metricsWithServerFilter = currentMetrics.filter((m) => m.serverFilter)
    if (metricsWithServerFilter.length === 0) return

    setServerCountsLoading(true)

    try {
      const supabase = createClient()

      // Guard: @supabase/ssr may not yet have the JWT in memory on first mount; without this, auth.uid() = NULL → RLS returns 0 for all counts.
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const counts: Record<string, number> = {}

      // Query each metric separately
      for (const metric of metricsWithServerFilter) {
        if (!metric.serverFilter) continue

        // GET + select("id") + limit(1): HEAD requests don't reliably attach JWT in @supabase/ssr; count comes from Content-Range.
        let query = supabase
          .from(currentConfig.table)
          .select("id", { count: "exact" })

        // Apply standard filters
        query = applyBaseFiltersToQuery(
          query, currentConfig, currentFilterConfigs,
          currentFilters, currentSearchQuery
        )

        // Apply the metric's specific serverFilter using centralized helper
        query = applyServerFilter(query, metric.serverFilter)
        // Limit to 1 row — we only need the count from Content-Range, not row data
        query = query.limit(1)

        const { count, error } = await query

        if (!error && count !== null) {
          counts[metric.id] = count
        }
      }

      setServerCounts(counts)
    } catch (err) {
      logger.error("[useListPage] Error fetching server counts:", { error: String(err) })
    } finally {
      setServerCountsLoading(false)
    }
  }, [filters, searchQuery, configRef, filterConfigsRef, metricsRef])

  // Fetch server-side sums for metrics with serverSum
  const fetchServerSums = useCallback(async (
    fetchFilters?: Record<string, string>,
    fetchSearchQuery?: string
  ) => {
    const currentConfig = configRef.current
    const currentFilterConfigs = filterConfigsRef.current
    const currentMetrics = metricsRef.current
    const currentFilters = fetchFilters ?? filters
    const currentSearchQuery = fetchSearchQuery ?? searchQuery

    // Find metrics that have serverSum defined
    const metricsWithServerSum = currentMetrics.filter((m) => m.serverSum)
    if (metricsWithServerSum.length === 0) return

    try {
      const supabase = createClient()
      const sums: Record<string, number> = {}

      // Query each metric separately
      for (const metric of metricsWithServerSum) {
        if (!metric.serverSum) continue

        const { column, filter: sumFilter } = metric.serverSum

        // Build query to get sum - fetch all rows (not just first 1000) then sum client-side
        let query = supabase
          .from(currentConfig.table)
          .select(column)
          .range(0, 99999)

        // Apply standard filters
        query = applyBaseFiltersToQuery(
          query, currentConfig, currentFilterConfigs,
          currentFilters, currentSearchQuery
        )

        // Apply the metric's specific filter if defined
        if (sumFilter) {
          query = applyServerFilter(query, sumFilter)
        }

        const { data, error } = await query

        if (!error && data) {
          // Sum up the column values across all rows
          const sum = (data as Record<string, unknown>[]).reduce((acc, row) => {
            const val = row[column]
            return acc + (typeof val === "number" ? val : Number(val) || 0)
          }, 0)
          sums[metric.id] = sum
        }
      }

      setServerSums(sums)
    } catch (err) {
      logger.error("[useListPage] Error fetching server sums:", { error: String(err) })
    }
  }, [filters, searchQuery, configRef, filterConfigsRef, metricsRef])

  // Compute metrics - pass pagination.total, serverCounts, and serverSums for accurate values
  const computeMetrics = useCallback((
    data: T[],
    total: number,
    metrics: MetricConfig<T>[]
  ) => {
    // Merge serverCounts and serverSums for passing to compute function
    const serverData = { ...serverCounts, ...serverSums }

    return metrics.map((metric) => {
      let value: number | string

      // For serverFilter metrics (count-based), use server count directly
      if (metric.serverFilter && serverCounts[metric.id] !== undefined) {
        value = serverCounts[metric.id]
      }
      // For serverSum metrics, always call compute to allow formatting (e.g., currency)
      // The compute function receives serverData and can access the sum via serverData[metric.id]
      else {
        // Compute function handles both regular calculation and serverSum formatting
        value = metric.compute(data, total, serverData)
      }

      return {
        id: metric.id,
        label: metric.label,
        value,
        icon: metric.icon,
        highlight: metric.highlight ? metric.highlight(value, data) : false,
      }
    })
  }, [serverCounts, serverSums])

  return {
    serverCounts,
    serverSums,
    serverCountsLoading,
    fetchServerCounts,
    fetchServerSums,
    computeMetrics,
  }
}
