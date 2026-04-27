/**
 * useSettingsMutation Hook
 *
 * Centralizes the owner_config save pattern used across all settings components.
 * Handles saving state, upsert logic (update if exists, insert if not),
 * Supabase client creation, authentication, withCreatedBy, and toast messages.
 *
 * Usage:
 *   const { saving, save } = useSettingsMutation({ configId: config?.id, setConfig })
 *   const ok = await save({ food_settings: value }, { successMessage: "Saved!" })
 *   if (ok) { // do post-save work }
 */

"use client"

import { logger } from "@/lib/logger"
import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"
import type { OwnerConfig } from "@/types/settings.types"

interface UseSettingsMutationOptions {
  /** The owner_config row ID. Null/undefined triggers insert (upsert mode). */
  configId: string | null | undefined
  /** Callback to update parent state after a new config row is created. */
  setConfig?: (config: OwnerConfig) => void
}

interface SaveMessages {
  successMessage?: string
  errorMessage?: string
}

/**
 * Hook for saving settings to the owner_config table.
 * Returns `saving` state and a `save` function that handles the full update/insert flow.
 */
export function useSettingsMutation({ configId, setConfig }: UseSettingsMutationOptions) {
  const [saving, setSaving] = useState(false)

  const save = async (
    fields: Record<string, unknown>,
    messages?: SaveMessages
  ): Promise<boolean> => {
    setSaving(true)
    try {
      const supabase = createClient()

      if (configId) {
        const { error } = await supabase
          .from("owner_config")
          .update(fields)
          .eq("id", configId)
        if (error) throw error
      } else {
        // Upsert: create new config row
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) throw new Error("Not authenticated")

        const { data, error } = await supabase
          .from("owner_config")
          .insert(withCreatedBy({ owner_id: user.id, ...fields }, user.id))
          .select()
          .single()
        if (error) throw error
        setConfig?.(data)
      }

      showSuccess(messages?.successMessage || "Settings saved")
      return true
    } catch (error) {
      logger.error("Settings save error:", { error: String(error) })
      showError(messages?.errorMessage || "Failed to save settings")
      return false
    } finally {
      setSaving(false)
    }
  }

  return { saving, save }
}
