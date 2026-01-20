/**
 * useTableViews Hook
 *
 * Manages saved table views for list pages. Provides CRUD operations
 * for views and tracks active view state.
 *
 * @example
 * const {
 *   views,
 *   activeView,
 *   createView,
 *   applyView,
 *   resetToSystemDefault
 * } = useTableViews({ tableKey: "tenants" })
 */

"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"

// ============================================
// Types
// ============================================

export interface TableViewConfig {
  sort?: { key: string; direction: "asc" | "desc" }
  filters?: Record<string, string>
  groupBy?: string[]
  pageSize?: number
  hiddenColumns?: string[]
}

export interface TableView {
  id: string
  user_id: string
  table_key: string
  name: string
  description: string | null
  is_default: boolean
  config: TableViewConfig
  use_count: number
  last_used_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateViewInput {
  name: string
  description?: string
  is_default?: boolean
  config: TableViewConfig
}

export interface UpdateViewInput {
  name?: string
  description?: string
  config?: TableViewConfig
}

export interface UseTableViewsOptions {
  tableKey: string
  onViewApplied?: (config: TableViewConfig | null) => void
}

export interface UseTableViewsReturn {
  // Data
  views: TableView[]
  activeView: TableView | null
  activeViewId: string | null
  loading: boolean
  error: Error | null

  // Actions
  createView: (input: CreateViewInput) => Promise<TableView | null>
  updateView: (id: string, input: UpdateViewInput) => Promise<boolean>
  deleteView: (id: string) => Promise<boolean>
  setDefaultView: (id: string) => Promise<boolean>
  clearDefaultView: () => Promise<boolean>
  applyView: (id: string) => void
  resetToSystemDefault: () => void
  refetch: () => Promise<void>
}

// ============================================
// Hook Implementation
// ============================================

export function useTableViews(options: UseTableViewsOptions): UseTableViewsReturn {
  const { tableKey, onViewApplied } = options

  // State
  const [views, setViews] = useState<TableView[]>([])
  const [activeViewId, setActiveViewId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Refs
  const tableKeyRef = useRef(tableKey)
  const onViewAppliedRef = useRef(onViewApplied)

  // Update refs when props change
  useEffect(() => {
    tableKeyRef.current = tableKey
    onViewAppliedRef.current = onViewApplied
  }, [tableKey, onViewApplied])

  // Computed: active view object
  const activeView = activeViewId
    ? views.find((v) => v.id === activeViewId) || null
    : null

  // Fetch views
  const fetchViews = useCallback(async () => {
    const currentTableKey = tableKeyRef.current
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()

      const { data, error: fetchError } = await supabase
        .from("table_views")
        .select("*")
        .eq("table_key", currentTableKey)
        .order("is_default", { ascending: false })
        .order("use_count", { ascending: false })
        .order("name")

      if (fetchError) {
        throw fetchError
      }

      const fetchedViews = (data || []) as TableView[]
      setViews(fetchedViews)

      // Auto-apply default view if one exists and no view is currently active
      const defaultView = fetchedViews.find((v) => v.is_default)
      if (defaultView && !activeViewId) {
        setActiveViewId(defaultView.id)
        onViewAppliedRef.current?.(defaultView.config)
        // Record usage in background (don't await)
        recordUsage(defaultView.id)
      }
    } catch (err) {
      console.error("[useTableViews] Error fetching views:", err)
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [activeViewId])

  // Initial fetch
  useEffect(() => {
    fetchViews()
  }, [fetchViews])

  // Record view usage (fire and forget)
  const recordUsage = async (viewId: string) => {
    try {
      const supabase = createClient()
      await supabase.rpc("record_table_view_usage", { p_view_id: viewId })
    } catch (err) {
      // Silent fail - usage tracking is not critical
      console.debug("[useTableViews] Usage recording failed:", err)
    }
  }

  // Create view
  const createView = useCallback(
    async (input: CreateViewInput): Promise<TableView | null> => {
      const currentTableKey = tableKeyRef.current

      try {
        const supabase = createClient()

        // Get current user ID
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) {
          toast.error("You must be logged in to save views")
          return null
        }

        // If setting as default, clear existing default first
        if (input.is_default) {
          await supabase.rpc("clear_default_table_view", { p_table_key: currentTableKey })
        }

        const { data, error: insertError } = await supabase
          .from("table_views")
          .insert({
            user_id: user.id,
            table_key: currentTableKey,
            name: input.name,
            description: input.description || null,
            is_default: input.is_default || false,
            config: input.config,
          })
          .select()
          .single()

        if (insertError) {
          throw insertError
        }

        const newView = data as TableView
        setViews((prev) => [...prev, newView])

        // Auto-apply new view
        setActiveViewId(newView.id)
        onViewAppliedRef.current?.(newView.config)

        toast.success(`View "${input.name}" saved`)
        return newView
      } catch (err) {
        console.error("[useTableViews] Error creating view:", err)
        toast.error("Failed to save view")
        return null
      }
    },
    []
  )

  // Update view
  const updateView = useCallback(
    async (id: string, input: UpdateViewInput): Promise<boolean> => {
      try {
        const supabase = createClient()

        const updateData: Record<string, unknown> = {}
        if (input.name !== undefined) updateData.name = input.name
        if (input.description !== undefined) updateData.description = input.description
        if (input.config !== undefined) updateData.config = input.config

        const { error: updateError } = await supabase
          .from("table_views")
          .update(updateData)
          .eq("id", id)

        if (updateError) {
          throw updateError
        }

        // Update local state
        setViews((prev) =>
          prev.map((v) => (v.id === id ? { ...v, ...updateData } : v))
        )

        // If this is the active view and config changed, re-apply
        if (activeViewId === id && input.config) {
          onViewAppliedRef.current?.(input.config)
        }

        toast.success("View updated")
        return true
      } catch (err) {
        console.error("[useTableViews] Error updating view:", err)
        toast.error("Failed to update view")
        return false
      }
    },
    [activeViewId]
  )

  // Delete view
  const deleteView = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const supabase = createClient()

        const { error: deleteError } = await supabase
          .from("table_views")
          .delete()
          .eq("id", id)

        if (deleteError) {
          throw deleteError
        }

        // Update local state
        setViews((prev) => prev.filter((v) => v.id !== id))

        // If this was the active view, reset to system default
        if (activeViewId === id) {
          setActiveViewId(null)
          onViewAppliedRef.current?.(null)
        }

        toast.success("View deleted")
        return true
      } catch (err) {
        console.error("[useTableViews] Error deleting view:", err)
        toast.error("Failed to delete view")
        return false
      }
    },
    [activeViewId]
  )

  // Set default view
  const setDefaultView = useCallback(async (id: string): Promise<boolean> => {
    try {
      const supabase = createClient()

      const { data: success, error: rpcError } = await supabase.rpc(
        "set_default_table_view",
        { p_view_id: id }
      )

      if (rpcError) {
        throw rpcError
      }

      if (!success) {
        toast.error("View not found or access denied")
        return false
      }

      // Update local state
      setViews((prev) =>
        prev.map((v) => ({
          ...v,
          is_default: v.id === id,
        }))
      )

      toast.success("Default view updated")
      return true
    } catch (err) {
      console.error("[useTableViews] Error setting default:", err)
      toast.error("Failed to set default view")
      return false
    }
  }, [])

  // Clear default view
  const clearDefaultView = useCallback(async (): Promise<boolean> => {
    const currentTableKey = tableKeyRef.current

    try {
      const supabase = createClient()

      const { error: rpcError } = await supabase.rpc("clear_default_table_view", {
        p_table_key: currentTableKey,
      })

      if (rpcError) {
        throw rpcError
      }

      // Update local state
      setViews((prev) =>
        prev.map((v) => ({
          ...v,
          is_default: false,
        }))
      )

      toast.success("Default view cleared")
      return true
    } catch (err) {
      console.error("[useTableViews] Error clearing default:", err)
      toast.error("Failed to clear default view")
      return false
    }
  }, [])

  // Apply view (switch to a different view)
  const applyView = useCallback(
    (id: string) => {
      const view = views.find((v) => v.id === id)
      if (!view) {
        toast.error("View not found")
        return
      }

      setActiveViewId(id)
      onViewAppliedRef.current?.(view.config)
      recordUsage(id)
    },
    [views]
  )

  // Reset to system default (no view applied)
  const resetToSystemDefault = useCallback(() => {
    setActiveViewId(null)
    onViewAppliedRef.current?.(null)
  }, [])

  return {
    views,
    activeView,
    activeViewId,
    loading,
    error,
    createView,
    updateView,
    deleteView,
    setDefaultView,
    clearDefaultView,
    applyView,
    resetToSystemDefault,
    refetch: fetchViews,
  }
}
