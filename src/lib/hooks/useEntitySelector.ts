"use client"

import { useState, useEffect, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import type { EntitySelectorConfig } from "@/components/ui/entity-selector"

export interface UseEntitySelectorOptions<T extends { id: string }> {
  config: EntitySelectorConfig<T>
  scopeId: string
  selectedId?: string | null
  isOpen: boolean
  search: string
  extraFilterData: Record<string, unknown>
}

export interface UseEntitySelectorResult<T extends { id: string }> {
  selectedItem: T | null
  setSelectedItem: (item: T | null) => void
  results: T[]
  loading: boolean
  searchEntities: (query: string) => Promise<void>
}

export function useEntitySelector<T extends { id: string }>({
  config,
  scopeId,
  selectedId,
  isOpen,
  search,
  extraFilterData,
}: UseEntitySelectorOptions<T>): UseEntitySelectorResult<T> {
  const [results, setResults] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedItem, setSelectedItem] = useState<T | null>(null)

  const minSearchLength = config.minSearchLength ?? 0

  useEffect(() => {
    if (selectedId && !selectedItem) {
      const fetchItem = async () => {
        const supabase = createClient()
        const { data } = await supabase
          .from(config.table)
          .select(config.select)
          .eq("id", selectedId)
          .single()

        if (data) {
          setSelectedItem(data as T)
        }
      }
      fetchItem()
    }
  }, [selectedId, selectedItem, config.table, config.select])

  const searchEntities = useCallback(async (query: string) => {
    if (minSearchLength > 0 && (!query || query.length < minSearchLength)) {
      setResults([])
      return
    }

    setLoading(true)
    const supabase = createClient()

    let queryBuilder = supabase
      .from(config.table)
      .select(config.select)
      .eq(config.scopeColumn, scopeId)

    if (config.staticFilters) {
      for (const filter of config.staticFilters) {
        if (filter.op === "eq") {
          queryBuilder = queryBuilder.eq(filter.column, filter.value)
        } else if (filter.op === "is") {
          queryBuilder = queryBuilder.is(filter.column, filter.value)
        }
      }
    }

    if (query && query.length > 0 && config.searchColumns.length > 0) {
      const orClause = config.searchColumns
        .map((col: string) => `${col}.ilike.%${query}%`)
        .join(",")
      queryBuilder = queryBuilder.or(orClause)
    }

    if (config.applyExtraFilters) {
      queryBuilder = config.applyExtraFilters(queryBuilder, extraFilterData)
    }

    queryBuilder = queryBuilder
      .order(config.orderBy ?? "name")
      .limit(config.limit ?? 20)

    const { data, error: searchError } = await queryBuilder

    if (searchError) {
      logger.error("EntitySelector search error", { detail: searchError })
      setResults([])
    } else {
      let items = (data || []) as T[]
      if (config.clientFilter) {
        items = config.clientFilter(items, extraFilterData)
      }
      setResults(items)
    }

    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeId, config, extraFilterData])

  useEffect(() => {
    if (!isOpen) return

    const delay = search ? 300 : (minSearchLength === 0 ? 0 : 300)
    const timer = setTimeout(() => {
      searchEntities(search)
    }, delay)

    return () => clearTimeout(timer)
  }, [search, isOpen, searchEntities, minSearchLength])

  return { selectedItem, setSelectedItem, results, loading, searchEntities }
}
