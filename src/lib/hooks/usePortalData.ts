/**
 * usePortalData - Generic Base Hook for Portal Data Fetching
 *
 * Shared foundation for useTenantPortalData and useMemberPortalData.
 * Handles the common pattern of:
 * - Auth check (Supabase getUser)
 * - Single-record query with configurable table, select, and filters
 * - Join transformation for specified fields
 * - Loading/error/refresh state management
 * - Optional post-fetch transformation callback
 *
 * @example
 * const result = usePortalData<MyType>({
 *   table: "my_table",
 *   select: "*, related:other_table(id, name)",
 *   joinFields: ["related"],
 *   statusFilter: { column: "status", value: "active" },
 *   postTransform: (data) => ({ ...data, related: transformJoin(data.related) }),
 * })
 */

"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import type { User } from "@supabase/supabase-js"

// ============================================================================
// TYPES
// ============================================================================

export interface PortalDataConfig<T> {
  /** The Supabase table to query */
  table: string
  /** The select expression (supports joins) */
  select: string
  /** Fields that are Supabase JOINs and need transformJoin normalization */
  joinFields: string[]
  /** Optional status filter (defaults to { column: "status", value: "active" }) */
  statusFilter?: { column: string; value: string }
  /** Optional post-transform callback to apply additional normalization after join transforms */
  postTransform?: (data: Record<string, unknown>) => T
  /** Error message prefix for logging (e.g., "tenant portal", "member portal") */
  errorContext?: string
}

export interface UsePortalDataReturn<T> {
  /** The fetched and transformed record, or null */
  data: T | null
  /** The raw record as returned by Supabase (after join transforms, before postTransform) */
  rawData: Record<string, unknown> | null
  /** The authenticated Supabase user */
  user: User | null
  /** Whether data is currently loading */
  loading: boolean
  /** Error message if fetch failed */
  error: string | null
  /** Re-fetch all data */
  refresh: () => Promise<void>
}

// ============================================================================
// HOOK
// ============================================================================

export function usePortalData<T>(config: PortalDataConfig<T>): UsePortalDataReturn<T> {
  const {
    table,
    select,
    joinFields,
    statusFilter = { column: "status", value: "active" },
    postTransform,
    errorContext = "portal",
  } = config

  const [data, setData] = useState<T | null>(null)
  const [rawData, setRawData] = useState<Record<string, unknown> | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        setLoading(false)
        setError("Not authenticated")
        return
      }

      setUser(authUser)

      // Build query
      let query = supabase
        .from(table)
        .select(select)
        .eq("user_id", authUser.id)

      if (statusFilter) {
        query = query.eq(statusFilter.column, statusFilter.value)
      }

      const { data: record, error: queryError } = await query.single()

      if (queryError || !record) {
        setData(null)
        setRawData(null)
        setLoading(false)
        return
      }

      // Transform join fields
      const transformed: Record<string, unknown> = { ...record }
      for (const field of joinFields) {
        transformed[field] = transformJoin(
          (record as Record<string, unknown>)[field] as unknown[]
        )
      }

      setRawData(transformed)

      // Apply optional post-transform or use the join-transformed data as-is
      if (postTransform) {
        setData(postTransform(transformed))
      } else {
        setData(transformed as T)
      }
    } catch (err) {
      console.error(`Error fetching ${errorContext} data:`, err)
      setError(err instanceof Error ? err.message : `Failed to load ${errorContext} data`)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, select, errorContext])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    rawData,
    user,
    loading,
    error,
    refresh: fetchData,
  }
}
