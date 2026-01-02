"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  FeatureFlags,
  FeatureFlagKey,
  getDefaultFeatureFlags,
  isFeatureEnabled,
} from "./index"

/**
 * Hook to check if features are enabled for the current owner.
 *
 * Usage:
 * const { isEnabled, loading } = useFeatures()
 * if (isEnabled("food")) { ... }
 */
export function useFeatures() {
  const [flags, setFlags] = useState<FeatureFlags>(getDefaultFeatureFlags())
  const [loading, setLoading] = useState(true)

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
            .select("feature_flags")
            .eq("owner_id", user.id)
            .single()

          if (data?.feature_flags) {
            setFlags({
              ...getDefaultFeatureFlags(),
              ...data.feature_flags,
            })
          }
        }
      } catch (error) {
        console.error("Error fetching feature flags:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFeatures()
  }, [])

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
        console.error("Error fetching feature flags:", error)
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
      return true
    } catch (error) {
      console.error("Error saving feature flags:", error)
      return false
    } finally {
      setSaving(false)
    }
  }

  return {
    flags,
    loading,
    saving,
    toggleFeature,
    setFeature,
    saveFeatures,
  }
}
