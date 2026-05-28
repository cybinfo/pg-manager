"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { logger } from "@/lib/logger"
import { FeatureFlags, getDefaultFeatureFlags } from "@/lib/features"
import { METER_TYPE_CONFIG, MeterType } from "@/types/meters.types"
import {
  Owner,
  ChargeType,
  UtilityRate,
  ExpenseType,
  OwnerConfig,
  NotificationSettings,
  RoomTypePricing,
  PropertyTypePricing,
  ConfigurableRoomType,
  BillingCycleMode,
  AutoBillingSettings,
  FoodSettings,
  DEFAULT_ROOM_TYPE_PRICING,
  DEFAULT_PROPERTY_TYPE_PRICING,
  DEFAULT_AUTO_BILLING_SETTINGS,
} from "@/types/settings.types"

export const DEFAULT_FOOD_SETTINGS: FoodSettings = {
  enabled: false,
  meals: {
    breakfast: { enabled: true, default_rate: 50 },
    lunch: { enabled: true, default_rate: 80 },
    dinner: { enabled: true, default_rate: 80 },
    snacks: { enabled: false, default_rate: 30 },
  },
  billing_frequency: "monthly",
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email_reminders_enabled: true,
  reminder_days_before: 5,
  send_on_due_date: true,
  send_overdue_alerts: true,
  overdue_alert_frequency: "weekly",
}

export const DEFAULT_CONFIGURABLE_ROOM_TYPES: ConfigurableRoomType[] = [
  { code: "single", name: "Single", default_rent: 8000, default_deposit: 8000, is_enabled: true, display_order: 1 },
  { code: "double", name: "Double Sharing", default_rent: 6000, default_deposit: 6000, is_enabled: true, display_order: 2 },
  { code: "triple", name: "Triple Sharing", default_rent: 5000, default_deposit: 5000, is_enabled: true, display_order: 3 },
  { code: "dormitory", name: "Dormitory", default_rent: 4000, default_deposit: 4000, is_enabled: false, display_order: 4 },
]

export interface ConfigForm {
  default_notice_period: number
  default_rent_due_day: number
  default_grace_period: number
}

export interface UseSettingsDataReturn {
  loading: boolean
  owner: Owner | null
  setOwner: (o: Owner | null) => void
  chargeTypes: ChargeType[]
  setChargeTypes: (ct: ChargeType[]) => void
  expenseTypes: ExpenseType[]
  setExpenseTypes: (et: ExpenseType[]) => void
  config: OwnerConfig | null
  setConfig: (c: OwnerConfig | null) => void
  configForm: ConfigForm
  setConfigForm: (cf: ConfigForm) => void
  notificationSettings: NotificationSettings
  setNotificationSettings: (ns: NotificationSettings) => void
  autoBillingSettings: AutoBillingSettings
  setAutoBillingSettings: (abs: AutoBillingSettings) => void
  propertyTypePricing: PropertyTypePricing
  setPropertyTypePricing: (ptp: PropertyTypePricing) => void
  foodSettings: FoodSettings
  setFoodSettings: (fs: FoodSettings) => void
  featureFlags: FeatureFlags
  setFeatureFlags: (ff: FeatureFlags) => void
  configurableRoomTypes: ConfigurableRoomType[]
  setConfigurableRoomTypes: (crt: ConfigurableRoomType[]) => void
  billingCycleMode: BillingCycleMode
  setBillingCycleMode: (bcm: BillingCycleMode) => void
  utilityRates: UtilityRate[]
  setUtilityRates: (ur: UtilityRate[]) => void
}

export function useSettingsData(): UseSettingsDataReturn {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [owner, setOwner] = useState<Owner | null>(null)
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([])
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [config, setConfig] = useState<OwnerConfig | null>(null)
  const [configForm, setConfigForm] = useState<ConfigForm>({
    default_notice_period: 30,
    default_rent_due_day: 1,
    default_grace_period: 5,
  })
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS)
  const [autoBillingSettings, setAutoBillingSettings] = useState<AutoBillingSettings>(DEFAULT_AUTO_BILLING_SETTINGS)
  const [, setRoomTypePricing] = useState<RoomTypePricing>(DEFAULT_ROOM_TYPE_PRICING)
  const [propertyTypePricing, setPropertyTypePricing] = useState<PropertyTypePricing>(DEFAULT_PROPERTY_TYPE_PRICING)
  const [foodSettings, setFoodSettings] = useState<FoodSettings>(DEFAULT_FOOD_SETTINGS)
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(getDefaultFeatureFlags())
  const [configurableRoomTypes, setConfigurableRoomTypes] = useState<ConfigurableRoomType[]>(DEFAULT_CONFIGURABLE_ROOM_TYPES)
  const [billingCycleMode, setBillingCycleMode] = useState<BillingCycleMode>("calendar_month")
  const [utilityRates, setUtilityRates] = useState<UtilityRate[]>([])

  useEffect(() => {
    if (!user) return

    async function fetchData() {
      const supabase = createClient()
      try {
        const [ownerRes, chargeTypesRes, configRes, expenseTypesRes] = await Promise.all([
          supabase.from("owners").select("*").eq("id", user!.id).single(),
          supabase.from("charge_types").select("*").eq("owner_id", user!.id).order("display_order"),
          supabase.from("owner_config").select("*").eq("owner_id", user!.id).single(),
          supabase.from("expense_types").select("*").eq("owner_id", user!.id).order("display_order"),
        ])

        if (ownerRes.data) setOwner(ownerRes.data)

        if (chargeTypesRes.data) {
          setChargeTypes(chargeTypesRes.data)
          const utilityCodes = ["electricity", "water", "gas"]
          const utilities = chargeTypesRes.data
            .filter((ct: ChargeType) => utilityCodes.includes(ct.code))
            .map((ct: ChargeType): UtilityRate => ({
              id: ct.id,
              name: ct.name,
              code: ct.code,
              billing_type: ct.calculation_config?.rate_per_unit ? "per_unit" : "flat_rate",
              rate_per_unit: ct.calculation_config?.rate_per_unit || 0,
              flat_amount: ct.calculation_config?.default_amount || 0,
              split_by: ct.calculation_config?.split_by || "occupants",
              unit_label: METER_TYPE_CONFIG[ct.code as MeterType]?.unit || "units",
            }))
          setUtilityRates(utilities)
        }

        if (expenseTypesRes.data) setExpenseTypes(expenseTypesRes.data)

        if (configRes.data) {
          setConfig(configRes.data)
          setConfigForm({
            default_notice_period: configRes.data.default_notice_period || 30,
            default_rent_due_day: configRes.data.default_rent_due_day || 1,
            default_grace_period: configRes.data.default_grace_period || 5,
          })
          if (configRes.data.notification_settings) {
            setNotificationSettings({ ...DEFAULT_NOTIFICATION_SETTINGS, ...configRes.data.notification_settings })
          }
          if (configRes.data.auto_billing_settings) {
            setAutoBillingSettings({ ...DEFAULT_AUTO_BILLING_SETTINGS, ...configRes.data.auto_billing_settings })
          }
          if (configRes.data.room_type_pricing) {
            setRoomTypePricing({ ...DEFAULT_ROOM_TYPE_PRICING, ...configRes.data.room_type_pricing })
          }
          if (configRes.data.property_type_pricing) {
            setPropertyTypePricing({ ...DEFAULT_PROPERTY_TYPE_PRICING, ...configRes.data.property_type_pricing })
          }
          if (configRes.data.feature_flags) {
            setFeatureFlags({ ...getDefaultFeatureFlags(), ...configRes.data.feature_flags })
          }
          if (configRes.data.room_types) setConfigurableRoomTypes(configRes.data.room_types)
          if (configRes.data.billing_cycle_mode) setBillingCycleMode(configRes.data.billing_cycle_mode)
        }
      } catch (error) {
        logger.error("Error fetching settings:", { detail: error })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user])

  return {
    loading,
    owner, setOwner,
    chargeTypes, setChargeTypes,
    expenseTypes, setExpenseTypes,
    config, setConfig,
    configForm, setConfigForm,
    notificationSettings, setNotificationSettings,
    autoBillingSettings, setAutoBillingSettings,
    propertyTypePricing, setPropertyTypePricing,
    foodSettings, setFoodSettings,
    featureFlags, setFeatureFlags,
    configurableRoomTypes, setConfigurableRoomTypes,
    billingCycleMode, setBillingCycleMode,
    utilityRates, setUtilityRates,
  }
}
