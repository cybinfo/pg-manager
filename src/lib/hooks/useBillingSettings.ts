"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { withCreatedBy } from "@/lib/audit"
import { useAuth } from "@/lib/auth"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { useSettingsMutation } from "@/lib/hooks/useSettingsMutation"
import { logger } from "@/lib/logger"
import { saveUtilityRates } from "@/lib/services/billing-settings"
import {
  ChargeType,
  UtilityRate,
  OwnerConfig,
  AutoBillingSettings,
  BillingCycleMode,
} from "@/types/settings.types"

interface UseBillingSettingsOptions {
  chargeTypes: ChargeType[]
  setChargeTypes: (types: ChargeType[]) => void
  utilityRates: UtilityRate[]
  setUtilityRates: (rates: UtilityRate[]) => void
  autoBillingSettings: AutoBillingSettings
  setAutoBillingSettings: (settings: AutoBillingSettings) => void
  billingCycleMode: BillingCycleMode
  setBillingCycleMode: (mode: BillingCycleMode) => void
  config: OwnerConfig | null
  setConfig: (config: OwnerConfig) => void
}

export function useBillingSettings({
  chargeTypes,
  setChargeTypes,
  utilityRates,
  setUtilityRates,
  autoBillingSettings,
  setAutoBillingSettings,
  billingCycleMode,
  setBillingCycleMode,
  config,
  setConfig,
}: UseBillingSettingsOptions) {
  const { user } = useAuth()
  const { confirm, ConfirmDialogElement } = useConfirmDialog()
  const { saving, save: saveOwnerConfig } = useSettingsMutation({ configId: config?.id, setConfig })
  const [savingCharge, setSavingCharge] = useState(false)
  const [savingUtilityRates, setSavingUtilityRates] = useState(false)
  const [newChargeType, setNewChargeType] = useState({ name: "", code: "" })
  const [showAddCharge, setShowAddCharge] = useState(false)

  const toggleChargeType = async (chargeType: ChargeType) => {
    const supabase = createClient()

    const { error } = await supabase
      .from("charge_types")
      .update({ is_enabled: !chargeType.is_enabled })
      .eq("id", chargeType.id)

    if (error) {
      showError("Failed to update charge type")
      return
    }

    setChargeTypes(chargeTypes.map((ct) =>
      ct.id === chargeType.id ? { ...ct, is_enabled: !ct.is_enabled } : ct
    ))
  }

  const addChargeType = async () => {
    if (!newChargeType.name || !newChargeType.code) {
      showError("Please enter name and code")
      return
    }

    setSavingCharge(true)
    try {
      if (!user) {
        showError("Not authenticated")
        return
      }
      const supabase = createClient()

      const { data, error } = await supabase
        .from("charge_types")
        .insert(
          withCreatedBy({
            owner_id: user?.id,
            name: newChargeType.name,
            code: newChargeType.code.toLowerCase().replace(/\s+/g, "_"),
            category: "custom",
            is_enabled: true,
            display_order: chargeTypes.length + 1,
          }, user!.id)
        )
        .select()
        .single()

      if (error) throw error

      setChargeTypes([...chargeTypes, data])
      setNewChargeType({ name: "", code: "" })
      setShowAddCharge(false)
      showSuccess("Charge type added")
    } catch (error: unknown) {
      showError(error instanceof Error ? error.message : "Failed to add charge type")
    } finally {
      setSavingCharge(false)
    }
  }

  const deleteChargeType = (chargeType: ChargeType) => {
    if (chargeType.category !== "custom") {
      showError("Cannot delete system charge types")
      return
    }

    confirm({
      title: "Delete Charge Type",
      description: `Delete "${chargeType.name}"? This cannot be undone.`,
      destructive: true,
      onConfirm: async () => {
        const supabase = createClient()

        const { error } = await supabase
          .from("charge_types")
          .delete()
          .eq("id", chargeType.id)

        if (error) {
          showError("Failed to delete charge type")
          return
        }

        setChargeTypes(chargeTypes.filter((ct) => ct.id !== chargeType.id))
        showSuccess("Charge type deleted")
      },
    })
  }

  const saveBillingCycleMode = async () => {
    await saveOwnerConfig(
      { billing_cycle_mode: billingCycleMode },
      { successMessage: "Billing cycle mode saved", errorMessage: "Failed to save billing cycle mode" }
    )
  }

  const updateUtilityRate = (id: string, field: keyof UtilityRate, value: string | number) => {
    setUtilityRates(utilityRates.map(rate =>
      rate.id === id ? { ...rate, [field]: value } : rate
    ))
  }

  const handleSaveUtilityRates = async () => {
    setSavingUtilityRates(true)
    try {
      if (!user) throw new Error("Not authenticated")
      await saveUtilityRates(createClient(), utilityRates)
      showSuccess("Utility rates saved")
    } catch (error) {
      logger.error("Save utility rates failed", { error: String(error) })
      showError("Failed to save utility rates")
    } finally {
      setSavingUtilityRates(false)
    }
  }

  const saveAutoBillingSettings = async () => {
    await saveOwnerConfig(
      { auto_billing_settings: autoBillingSettings },
      { successMessage: "Auto billing settings saved", errorMessage: "Failed to save auto billing settings" }
    )
  }

  return {
    saving,
    savingCharge,
    savingUtilityRates,
    newChargeType,
    setNewChargeType,
    showAddCharge,
    setShowAddCharge,
    toggleChargeType,
    addChargeType,
    deleteChargeType,
    saveBillingCycleMode,
    updateUtilityRate,
    handleSaveUtilityRates,
    saveAutoBillingSettings,
    ConfirmDialogElement,
  }
}
