"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Settings,
  User,
  CreditCard,
  Bell,
  IndianRupee,
  Cog,
  Bed,
  UtensilsCrossed,
  ToggleLeft
} from "lucide-react"
import {
  FeatureFlags,
  getDefaultFeatureFlags,
} from "@/lib/features"
import { PageHeader } from "@/components/ui/page-header"
import { PageSkeleton } from "@/components/ui/loading"
import { OwnerGuard } from "@/components/auth"
import { useAuth } from "@/lib/auth"
import {
  Owner,
  ChargeType,
  UtilityRate,
  ExpenseType,
  OwnerConfig,
  NotificationSettings as NotificationSettingsType,
  RoomTypePricing,
  PropertyTypePricing,
  ConfigurableRoomType,
  BillingCycleMode,
  AutoBillingSettings,
  FoodSettings as FoodSettingsType,
  DEFAULT_ROOM_TYPE_PRICING,
  DEFAULT_PROPERTY_TYPE_PRICING,
  DEFAULT_AUTO_BILLING_SETTINGS,
} from "@/types/settings.types"

import {
  ProfileSettings,
  RoomTypeSettings,
  BillingSettings,
  FoodSettings,
  ExpenseTypeSettings,
  NotificationSettings,
  FeatureSettings,
  DefaultSettings,
} from "./_components"

// Page-specific defaults that differ from type defaults
const defaultFoodSettings: FoodSettingsType = {
  enabled: false,
  meals: {
    breakfast: { enabled: true, default_rate: 50 },
    lunch: { enabled: true, default_rate: 80 },
    dinner: { enabled: true, default_rate: 80 },
    snacks: { enabled: false, default_rate: 30 },
  },
  billing_frequency: "monthly",
}

const defaultNotificationSettings: NotificationSettingsType = {
  email_reminders_enabled: true,
  reminder_days_before: 5,
  send_on_due_date: true,
  send_overdue_alerts: true,
  overdue_alert_frequency: "weekly",
}

const defaultConfigurableRoomTypes: ConfigurableRoomType[] = [
  { code: "single", name: "Single", default_rent: 8000, default_deposit: 8000, is_enabled: true, display_order: 1 },
  { code: "double", name: "Double Sharing", default_rent: 6000, default_deposit: 6000, is_enabled: true, display_order: 2 },
  { code: "triple", name: "Triple Sharing", default_rent: 5000, default_deposit: 5000, is_enabled: true, display_order: 3 },
  { code: "dormitory", name: "Dormitory", default_rent: 4000, default_deposit: 4000, is_enabled: false, display_order: 4 },
]

export default function SettingsPage() {
  const { user, profile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("profile")

  // Profile
  const [owner, setOwner] = useState<Owner | null>(null)

  // Charge Types
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([])

  // Expense Types
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])

  // Config
  const [config, setConfig] = useState<OwnerConfig | null>(null)
  const [configForm, setConfigForm] = useState({
    default_notice_period: 30,
    default_rent_due_day: 1,
    default_grace_period: 5,
  })

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettingsType>(defaultNotificationSettings)

  // Auto Billing Settings
  const [autoBillingSettings, setAutoBillingSettings] = useState<AutoBillingSettings>(DEFAULT_AUTO_BILLING_SETTINGS)

  // Room Type Pricing (legacy flat pricing)
  const [roomTypePricing, setRoomTypePricing] = useState<RoomTypePricing>(DEFAULT_ROOM_TYPE_PRICING)

  // Property Type Pricing (new - pricing by property type)
  const [propertyTypePricing, setPropertyTypePricing] = useState<PropertyTypePricing>(DEFAULT_PROPERTY_TYPE_PRICING)

  // Food Settings
  const [foodSettings, setFoodSettings] = useState<FoodSettingsType>(defaultFoodSettings)

  // Feature Flags
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(getDefaultFeatureFlags())

  // Configurable Room Types (new)
  const [configurableRoomTypes, setConfigurableRoomTypes] = useState<ConfigurableRoomType[]>(defaultConfigurableRoomTypes)

  // Billing Cycle Mode (new)
  const [billingCycleMode, setBillingCycleMode] = useState<BillingCycleMode>('calendar_month')

  // Utility Rates (for meter-based charges like Electricity, Water, Gas)
  const [utilityRates, setUtilityRates] = useState<UtilityRate[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [ownerRes, chargeTypesRes, configRes, expenseTypesRes] = await Promise.all([
        supabase.from("owners").select("*").eq("id", user.id).single(),
        supabase.from("charge_types").select("*").eq("owner_id", user.id).order("display_order"),
        supabase.from("owner_config").select("*").eq("owner_id", user.id).single(),
        supabase.from("expense_types").select("*").eq("owner_id", user.id).order("display_order"),
      ])

      if (ownerRes.data) {
        setOwner(ownerRes.data)
      }

      if (chargeTypesRes.data) {
        setChargeTypes(chargeTypesRes.data)

        // Extract utility rates from charge types with calculation_config
        const utilityCodes = ['electricity', 'water', 'gas']
        const unitLabels: Record<string, string> = {
          electricity: 'kWh',
          water: 'L',
          gas: 'm³'
        }
        const utilities = chargeTypesRes.data
          .filter((ct: ChargeType) => utilityCodes.includes(ct.code))
          .map((ct: ChargeType): UtilityRate => ({
            id: ct.id,
            name: ct.name,
            code: ct.code,
            billing_type: ct.calculation_config?.rate_per_unit ? 'per_unit' : 'flat_rate',
            rate_per_unit: ct.calculation_config?.rate_per_unit || 0,
            flat_amount: ct.calculation_config?.default_amount || 0,
            split_by: ct.calculation_config?.split_by || 'occupants',
            unit_label: unitLabels[ct.code] || 'units'
          }))
        setUtilityRates(utilities)
      }

      if (expenseTypesRes.data) {
        setExpenseTypes(expenseTypesRes.data)
      }

      if (configRes.data) {
        setConfig(configRes.data)
        setConfigForm({
          default_notice_period: configRes.data.default_notice_period || 30,
          default_rent_due_day: configRes.data.default_rent_due_day || 1,
          default_grace_period: configRes.data.default_grace_period || 5,
        })
        // Load notification settings if available
        if (configRes.data.notification_settings) {
          setNotificationSettings({
            ...defaultNotificationSettings,
            ...configRes.data.notification_settings,
          })
        }
        // Load auto billing settings if available
        if (configRes.data.auto_billing_settings) {
          setAutoBillingSettings({
            ...DEFAULT_AUTO_BILLING_SETTINGS,
            ...configRes.data.auto_billing_settings,
          })
        }
        // Load room type pricing if available (legacy flat pricing)
        if (configRes.data.room_type_pricing) {
          setRoomTypePricing({
            ...DEFAULT_ROOM_TYPE_PRICING,
            ...configRes.data.room_type_pricing,
          })
        }
        // Load property type pricing if available
        if (configRes.data.property_type_pricing) {
          setPropertyTypePricing({
            ...DEFAULT_PROPERTY_TYPE_PRICING,
            ...configRes.data.property_type_pricing,
          })
        }
        // Load feature flags if available
        if (configRes.data.feature_flags) {
          setFeatureFlags({
            ...getDefaultFeatureFlags(),
            ...configRes.data.feature_flags,
          })
        }
        // Load configurable room types if available
        if (configRes.data.room_types) {
          setConfigurableRoomTypes(configRes.data.room_types)
        }
        // Load billing cycle mode if available
        if (configRes.data.billing_cycle_mode) {
          setBillingCycleMode(configRes.data.billing_cycle_mode)
        }
      }
    } catch (error) {
      console.error("Error fetching settings:", error)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "room-types", label: "Room Types", icon: Bed },
    { id: "billing", label: "Billing & Charges", icon: CreditCard },
    { id: "food", label: "Food & Meals", icon: UtensilsCrossed },
    { id: "expenses", label: "Expense Categories", icon: IndianRupee },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "features", label: "Features", icon: ToggleLeft },
    { id: "defaults", label: "Default Settings", icon: Settings },
  ]

  if (loading) {
    return <PageSkeleton variant="form" />
  }

  return (
    <OwnerGuard>
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your account and preferences"
        icon={Cog}
        breadcrumbs={[{ label: "Settings" }]}
      />

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <ProfileSettings
          owner={owner}
          setOwner={(o) => setOwner(o)}
          userId={user?.id}
          profile={profile}
        />
      )}

      {/* Room Types Tab */}
      {activeTab === "room-types" && (
        <RoomTypeSettings
          configurableRoomTypes={configurableRoomTypes}
          setConfigurableRoomTypes={setConfigurableRoomTypes}
          config={config}
          setConfig={(c) => setConfig(c)}
        />
      )}

      {/* Billing Tab */}
      {activeTab === "billing" && (
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
      )}

      {/* Food Tab */}
      {activeTab === "food" && (
        <FoodSettings
          foodSettings={foodSettings}
          setFoodSettings={setFoodSettings}
          configId={config?.id}
        />
      )}

      {/* Expenses Tab */}
      {activeTab === "expenses" && (
        <ExpenseTypeSettings
          expenseTypes={expenseTypes}
          setExpenseTypes={setExpenseTypes}
        />
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <NotificationSettings
          notificationSettings={notificationSettings}
          setNotificationSettings={setNotificationSettings}
          config={config}
          owner={owner}
        />
      )}

      {/* Features Tab */}
      {activeTab === "features" && (
        <FeatureSettings
          featureFlags={featureFlags}
          setFeatureFlags={setFeatureFlags}
          config={config}
        />
      )}

      {/* Defaults Tab */}
      {activeTab === "defaults" && (
        <DefaultSettings
          configForm={configForm}
          setConfigForm={setConfigForm}
          config={config}
          setConfig={(c) => setConfig(c)}
        />
      )}
    </div>
    </OwnerGuard>
  )
}
