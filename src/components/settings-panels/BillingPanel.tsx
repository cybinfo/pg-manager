"use client"

import { useSettingsData } from "@/lib/hooks/useSettingsData"
import { BillingSettings } from "@/app/(dashboard)/settings/_components"
import { PageSkeleton } from "@/components/ui/loading"

export function BillingPanel() {
  const {
    loading,
    chargeTypes, setChargeTypes,
    config, setConfig,
    configForm, setConfigForm,
    autoBillingSettings, setAutoBillingSettings,
    propertyTypePricing,
    billingCycleMode, setBillingCycleMode,
    utilityRates, setUtilityRates,
  } = useSettingsData()

  if (loading) return <PageSkeleton variant="form" />

  return (
    <BillingSettings
      chargeTypes={chargeTypes}
      setChargeTypes={setChargeTypes}
      utilityRates={utilityRates}
      setUtilityRates={setUtilityRates}
      autoBillingSettings={autoBillingSettings}
      setAutoBillingSettings={setAutoBillingSettings}
      billingCycleMode={billingCycleMode}
      setBillingCycleMode={setBillingCycleMode}
      configForm={configForm}
      config={config}
      setConfig={(c) => setConfig(c)}
      propertyTypePricing={propertyTypePricing}
    />
  )
}
