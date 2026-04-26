"use client"

import { useEffect, useState, useCallback } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  FeatureFlags,
  FeatureFlagKey,
  getDefaultFeatureFlags,
  isFeatureEnabled,
} from "./index"
import { logger, extractErrorMeta } from "@/lib/logger"

const featureLogger = logger.child("features")

// AUTH-016: Add feature flags caching to prevent multiple Supabase calls
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
let cachedFlags: FeatureFlags | null = null
let cacheTimestamp: number | null = null
let cachedUserId: string | null = null
let fetchPromise: Promise<FeatureFlags> | null = null

/**
 * Set of re-fetch callbacks — one per mounted useFeatures() instance.
 * invalidateFeatureCache() calls all of them so every consumer updates
 * immediately when features are saved from the Feature Control Center.
 */
const cacheListeners = new Set<() => void>()

function isCacheValid(userId: string): boolean {
  if (!cachedFlags || !cacheTimestamp || !cachedUserId) return false
  if (cachedUserId !== userId) return false
  return Date.now() - cacheTimestamp < CACHE_TTL_MS
}

export function invalidateFeatureCache(): void {
  cachedFlags = null
  cacheTimestamp = null
  cachedUserId = null
  fetchPromise = null
  // Notify all mounted useFeatures() hooks to re-fetch fresh flags from DB
  cacheListeners.forEach((fn) => fn())
}

/**
 * Hook to check if features are enabled for the current owner.
 *
 * Usage:
 * const { isEnabled, loading } = useFeatures()
 * if (isEnabled("food")) { ... }
 *
 * Re-fetches automatically whenever the Feature Control Center saves changes.
 * invalidateFeatureCache() broadcasts to all mounted useFeatures() instances
 * via a module-level listener set, so navigation and FeatureGuard update
 * immediately without a page reload.
 */
export function useFeatures() {
  const [flags, setFlags] = useState<FeatureFlags>(cachedFlags || getDefaultFeatureFlags())
  const [loading, setLoading] = useState(!cachedFlags)

  const fetchFeatures = useCallback(async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        // Check cache first
        if (isCacheValid(user.id)) {
          setFlags(cachedFlags!)
          setLoading(false)
          return
        }

        // If already fetching, wait for that promise
        if (fetchPromise) {
          const result = await fetchPromise
          setFlags(result)
          setLoading(false)
          return
        }

        // Start new fetch
        fetchPromise = (async () => {
          const { data } = await supabase
            .from("owner_config")
            .select("feature_flags")
            .eq("owner_id", user.id)
            .single()

          const newFlags = {
            ...getDefaultFeatureFlags(),
            ...(data?.feature_flags || {}),
          }

          // Update cache
          cachedFlags = newFlags
          cacheTimestamp = Date.now()
          cachedUserId = user.id
          fetchPromise = null

          return newFlags
        })()

        const result = await fetchPromise
        setFlags(result)
      }
    } catch (error) {
      featureLogger.error("Error fetching feature flags", extractErrorMeta(error))
      fetchPromise = null
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch on mount
  useEffect(() => {
    fetchFeatures()
  }, [fetchFeatures])

  // Subscribe to cache invalidation events.
  // When the Feature Control Center saves, invalidateFeatureCache() is called,
  // which notifies every mounted useFeatures() to re-fetch fresh flags from DB.
  // This ensures navigation items and FeatureGuard update without a page reload.
  useEffect(() => {
    cacheListeners.add(fetchFeatures)
    return () => {
      cacheListeners.delete(fetchFeatures)
    }
  }, [fetchFeatures])

  const isEnabled = (feature: FeatureFlagKey): boolean => {
    return isFeatureEnabled(flags, feature)
  }

  return { isEnabled, flags, loading }
}

/**
 * Hook to manage feature flags (for settings page).
 * Returns functions to toggle and save feature flags.
 */
export function useFeatureManagement() {
  const [flags, setFlags] = useState<FeatureFlags>(getDefaultFeatureFlags())
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [configId, setConfigId] = useState<string | null>(null)

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (user) {
          const { data } = await supabase
            .from("owner_config")
            .select("id, feature_flags")
            .eq("owner_id", user.id)
            .single()

          if (data) {
            setConfigId(data.id)
            if (data.feature_flags) {
              setFlags({
                ...getDefaultFeatureFlags(),
                ...data.feature_flags,
              })
            }
          }
        }
      } catch (error) {
        featureLogger.error("Error fetching feature flags", extractErrorMeta(error))
      } finally {
        setLoading(false)
      }
    }

    fetchFeatures()
  }, [])

  const toggleFeature = (feature: FeatureFlagKey) => {
    setFlags((prev) => ({
      ...prev,
      [feature]: !prev[feature],
    }))
  }

  const setFeature = (feature: FeatureFlagKey, enabled: boolean) => {
    setFlags((prev) => ({
      ...prev,
      [feature]: enabled,
    }))
  }

  const saveFeatures = async (): Promise<boolean> => {
    if (!configId) return false

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("owner_config")
        .update({ feature_flags: flags })
        .eq("id", configId)

      if (error) throw error

      // Invalidate cache after successful save so other components get fresh data
      invalidateFeatureCache()

      return true
    } catch (error) {
      featureLogger.error("Error saving feature flags", extractErrorMeta(error))
      return false
    } finally {
      setSaving(false)
    }
  }

  return {
    flags,
    loading,
    saving,
    /** The owner_config row id — needed to pass as config.id to FeatureSettings */
    configId,
    toggleFeature,
    setFeature,
    saveFeatures,
  }
}
