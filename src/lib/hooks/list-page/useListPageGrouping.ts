/**
 * useListPageGrouping Hook
 *
 * Manages group state, server-side group counts, and group expansion.
 */

"use client"

import { useState, useCallback, useMemo, useRef, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { transformArrayJoins } from "@/lib/supabase/transforms"
import type { ListPageConfig, FilterConfig, GroupByOption } from "./types"
import { getNestedValue, applyBaseFiltersToQuery } from "./utils"

// ============================================
// Types
// ============================================

export interface UseListPageGroupingOptions<T> {
  groupByOptions: GroupByOption[]
  initialGroups: string[]
  configRef: React.MutableRefObject<ListPageConfig<T>>
  filterConfigsRef: React.MutableRefObject<FilterConfig[]>
}

export interface UseListPageGroupingReturn {
  selectedGroups: string[]
  setSelectedGroups: (groups: string[]) => void
  selectedGroupsRef: React.MutableRefObject<string[]>
  groupConfig: { key: string; label: string | undefined }[]
  groupCounts: Record<string, number>
  fetchGroupCounts: (
    groupFields?: string[],
    fetchFilters?: Record<string, string>,
    fetchSearchQuery?: string
  ) => Promise<void>
}

// ============================================
// Hook Implementation
// ============================================

export function useListPageGrouping<T extends object>(
  options: UseListPageGroupingOptions<T>,
  filters: Record<string, string>,
  searchQuery: string
): UseListPageGroupingReturn {
  const { groupByOptions, initialGroups, configRef, filterConfigsRef } = options

  // Group state
  const [selectedGroups, setSelectedGroups] = useState<string[]>(initialGroups)
  const selectedGroupsRef = useRef(selectedGroups)

  // Server-side group counts (for accurate group totals when paginated)
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({})

  // Keep selectedGroups ref in sync with state
  useEffect(() => {
    selectedGroupsRef.current = selectedGroups
  }, [selectedGroups])

  // Fetch server-side group counts for accurate group totals when paginated
  // Uses the same select query as main fetch to get proper nested values
  const fetchGroupCounts = useCallback(async (
    groupFields?: string[],
    fetchFilters?: Record<string, string>,
    fetchSearchQuery?: string
  ) => {
    const currentConfig = configRef.current
    const currentFilterConfigs = filterConfigsRef.current
    const currentFilters = fetchFilters ?? filters
    const currentSearchQuery = fetchSearchQuery ?? searchQuery
    const groups = groupFields ?? selectedGroupsRef.current

    // No groups selected, clear counts
    if (groups.length === 0) {
      setGroupCounts({})
      return
    }

    try {
      const supabase = createClient()

      // Use the same select as the main query to get proper nested values
      let query = supabase
        .from(currentConfig.table)
        .select(currentConfig.select)

      // Apply standard filters
      query = applyBaseFiltersToQuery(
        query, currentConfig, currentFilterConfigs,
        currentFilters, currentSearchQuery
      )

      const { data: rawData, error } = await query

      if (error || !rawData) {
        console.error("[useListPage] Error fetching group counts:", error)
        return
      }

      // Transform JOIN fields to get proper nested values
      let transformedData = rawData as Record<string, unknown>[]
      if (currentConfig.joinFields && currentConfig.joinFields.length > 0) {
        transformedData = transformArrayJoins(transformedData, currentConfig.joinFields as string[])
      }

      // Now count by each group field using the display values
      const counts: Record<string, number> = {}

      for (const groupField of groups) {
        const valueCounts: Record<string, number> = {}

        for (const row of transformedData) {
          // Get the nested value (e.g., "room.room_number" -> room?.room_number)
          const value = getNestedValue(row, groupField)
          const key = value != null ? String(value) : "__null__"
          valueCounts[key] = (valueCounts[key] || 0) + 1
        }

        // Store counts with the group field as prefix for uniqueness
        for (const [value, count] of Object.entries(valueCounts)) {
          counts[`${groupField}:${value}`] = count
        }
      }

      setGroupCounts(counts)
    } catch (err) {
      console.error("[useListPage] Error fetching group counts:", err)
    }
  }, [filters, searchQuery, configRef, filterConfigsRef])

  // Fetch group counts when grouping changes
  useEffect(() => {
    if (selectedGroups.length > 0) {
      // eslint-disable-next-line react-compiler/react-compiler
      fetchGroupCounts(selectedGroups, filters, searchQuery)
    } else {
      setGroupCounts({})
    }
  }, [selectedGroups, filters, searchQuery, fetchGroupCounts])

  // Group config for DataTable
  const groupConfig = useMemo(() => {
    return selectedGroups.map((key) => ({
      key,
      label: groupByOptions.find((o) => o.value === key)?.label,
    }))
  }, [selectedGroups, groupByOptions])

  return {
    selectedGroups,
    setSelectedGroups,
    selectedGroupsRef,
    groupConfig,
    groupCounts,
    fetchGroupCounts,
  }
}
