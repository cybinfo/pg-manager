/**
 * useDetailPageData Hook
 *
 * Handles data fetching, join transforms, related data loading, and refresh logic
 * for detail pages. This is an internal sub-hook composed by the main useDetailPage.
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { showError } from "@/lib/toast-helpers"
import type { DetailPageConfig } from "./types"

interface UseDetailPageDataOptions<T> {
  config: DetailPageConfig<T>
  id: string | string[] | undefined
  enabled: boolean
}

interface UseDetailPageDataReturn<T> {
  data: T | null
  setData: React.Dispatch<React.SetStateAction<T | null>>
  related: Record<string, unknown[]>
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export function useDetailPageData<T extends object>(
  options: UseDetailPageDataOptions<T>
): UseDetailPageDataReturn<T> {
  const { config, id, enabled } = options

  const router = useRouter()
  const [data, setData] = useState<T | null>(null)
  const [related, setRelated] = useState<Record<string, unknown[]>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Refs to prevent stale closures
  const configRef = useRef(config)
  const initialFetchDone = useRef(false)

  // Update ref when config changes
  useEffect(() => {
    configRef.current = config
  }, [config])

  // Main fetch function
  const fetchData = useCallback(async () => {
    if (!enabled || !id) {
      setLoading(false)
      return
    }

    const currentConfig = configRef.current
    const entityId = Array.isArray(id) ? id[0] : id
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      // Build main entity query
      const { data: rawData, error: fetchError } = await supabase
        .from(currentConfig.table)
        .select(currentConfig.select)
        .eq("id", entityId)
        .single()

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          // Not found
          showError(currentConfig.notFoundMessage || `${currentConfig.table.slice(0, -1)} not found`)
          if (currentConfig.redirectOnNotFound) {
            router.push(currentConfig.redirectOnNotFound)
          }
          setData(null)
          setLoading(false)
          return
        }
        throw fetchError
      }

      // Transform join fields
      let transformedData: Record<string, unknown> = { ...rawData }
      if (currentConfig.joinFields && currentConfig.joinFields.length > 0) {
        for (const field of currentConfig.joinFields) {
          if (transformedData[field] !== undefined) {
            transformedData[field] = transformJoin(transformedData[field])
          }
        }
      }

      // Apply computed fields
      if (currentConfig.computedFields) {
        transformedData = {
          ...transformedData,
          ...currentConfig.computedFields(transformedData as unknown as T),
        }
      }

      setData(transformedData as unknown as T)

      // Fetch related data in parallel
      if (currentConfig.relatedQueries && currentConfig.relatedQueries.length > 0) {
        const relatedResults: Record<string, unknown[]> = {}

        const relatedPromises = currentConfig.relatedQueries.map(async (relatedConfig) => {
          try {
            // Determine the FK value
            let fkValue = entityId
            if (relatedConfig.foreignKeyValue) {
              if (relatedConfig.foreignKeyValue.startsWith("field:")) {
                const fieldName = relatedConfig.foreignKeyValue.slice(6)
                const fieldValue = transformedData[fieldName]
                if (!fieldValue) {
                  relatedResults[relatedConfig.key] = []
                  return
                }
                fkValue = fieldValue as string
              } else {
                fkValue = relatedConfig.foreignKeyValue
              }
            }

            let query = supabase
              .from(relatedConfig.table)
              .select(relatedConfig.select)
              .eq(relatedConfig.foreignKey, fkValue)

            // Apply additional filters
            if (relatedConfig.filter) {
              for (const [key, value] of Object.entries(relatedConfig.filter)) {
                if (Array.isArray(value)) {
                  query = query.in(key, value)
                } else {
                  query = query.eq(key, value)
                }
              }
            }

            // Apply null filter
            if (relatedConfig.filterNull) {
              query = query.is(relatedConfig.filterNull, null)
            }

            // Apply ordering
            if (relatedConfig.orderBy) {
              query = query.order(relatedConfig.orderBy, {
                ascending: relatedConfig.orderDirection !== "desc",
              })
            }

            // Apply limit
            if (relatedConfig.limit) {
              query = query.limit(relatedConfig.limit)
            }

            const { data: relatedData, error: relatedError } = await query

            if (relatedError) {
              console.error(`[useDetailPage] Error fetching ${relatedConfig.key}:`, JSON.stringify(relatedError, null, 2))
              relatedResults[relatedConfig.key] = []
              return
            }

            // Transform join fields in related data
            let transformedRelated = relatedData || []
            if (relatedConfig.joinFields && relatedConfig.joinFields.length > 0) {
              transformedRelated = transformedRelated.map((item: Record<string, unknown>) => {
                const transformed = { ...item }
                for (const field of relatedConfig.joinFields!) {
                  if (transformed[field] !== undefined) {
                    transformed[field] = transformJoin(transformed[field])
                  }
                }
                return transformed
              })
            }

            relatedResults[relatedConfig.key] = transformedRelated
          } catch (err) {
            const errorDetails = err instanceof Error
              ? { message: err.message, name: err.name }
              : typeof err === "object" && err !== null
                ? JSON.stringify(err, null, 2)
                : String(err)
            console.error(`[useDetailPage] Error fetching ${relatedConfig.key}:`, errorDetails)
            relatedResults[relatedConfig.key] = []
          }
        })

        await Promise.all(relatedPromises)
        setRelated(relatedResults)
      }
    } catch (err) {
      const errorDetails = err instanceof Error
        ? { message: err.message, name: err.name }
        : typeof err === "object" && err !== null
          ? JSON.stringify(err, null, 2)
          : String(err)
      console.error(`[useDetailPage] Error fetching ${currentConfig.table}:`, errorDetails)
      setError(err as Error)
      showError(`Failed to load data`)
    } finally {
      setLoading(false)
    }
  }, [enabled, id, router])

  // Initial fetch
  useEffect(() => {
    if (initialFetchDone.current) return
    initialFetchDone.current = true
    fetchData()
  }, [fetchData])

  // Refetch when id changes
  useEffect(() => {
    if (initialFetchDone.current && id) {
      fetchData()
    }
  }, [id, fetchData])

  return {
    data,
    setData,
    related,
    loading,
    error,
    refetch: fetchData,
  }
}
