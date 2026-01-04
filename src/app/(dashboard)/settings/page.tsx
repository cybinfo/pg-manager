"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Settings,
  Loader2,
  Save,
  User,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  Clock,
  Bell,
  Check,
  Plus,
  Trash2,
  IndianRupee,
  Send,
  MailCheck,
  Cog,
  Home,
  Bed,
  UtensilsCrossed,
  ToggleLeft
} from "lucide-react"
import {
  FEATURE_FLAGS,
  FeatureFlagKey,
  FeatureFlags,
  getDefaultFeatureFlags,
  getFeaturesByCategory,
  CATEGORY_LABELS,
} from "@/lib/features"
import { formatCurrency } from "@/lib/format"
import { PageHeader } from "@/components/ui/page-header"
import { PageLoader } from "@/components/ui/page-loader"
import { OwnerGuard, EmailVerificationCard } from "@/components/auth"
import { toast } from "sonner"
import { sendTestEmail } from "@/lib/email"
import { useAuth } from "@/lib/auth"

interface Owner {
  id: string
  name: string
  email: string
  phone: string | null
  business_name: string | null
}

interface ChargeType {
  id: string
  name: string
  code: string
  category: string
  is_enabled: boolean
  is_refundable: boolean
  apply_late_fee: boolean
  display_order: number
  calculation_config?: {
    rate_per_unit?: number
    default_amount?: number
    split_by?: 'occupants' | 'room'
  } | null
}

interface UtilityRate {
  id: string
  name: string
  code: string
  billing_type: 'per_unit' | 'flat_rate'
  rate_per_unit: number
  flat_amount: number
  split_by: 'occupants' | 'room'
  unit_label: string
}

interface ExpenseType {
  id: string
  name: string
  code: string
  description: string | null
  is_enabled: boolean
  display_order: number
}

interface OwnerConfig {
  id: string
  default_notice_period: number
  default_rent_due_day: number
  default_grace_period: number
  currency: string
  notification_settings?: NotificationSettings
}

interface NotificationSettings {
  email_reminders_enabled: boolean
  reminder_days_before: number
  send_on_due_date: boolean
  send_overdue_alerts: boolean
  overdue_alert_frequency: "daily" | "weekly"
}

interface RoomTypePricing {
  single: { rent: number; deposit: number }
  double: { rent: number; deposit: number }
  triple: { rent: number; deposit: number }
  dormitory: { rent: number; deposit: number }
}

interface PropertyTypePricing {
  pg: RoomTypePricing
  hostel: RoomTypePricing
  coliving: RoomTypePricing
}

// Configurable room type (new)
interface ConfigurableRoomType {
  code: string
  name: string
  default_rent: number
  default_deposit: number
  is_enabled: boolean
  display_order: number
}

type BillingCycleMode = 'calendar_month' | 'checkin_anniversary'

const defaultRoomTypePricing: RoomTypePricing = {
  single: { rent: 8000, deposit: 16000 },
  double: { rent: 6000, deposit: 12000 },
  triple: { rent: 5000, deposit: 10000 },
  dormitory: { rent: 4000, deposit: 8000 },
}

const defaultPropertyTypePricing: PropertyTypePricing = {
  pg: {
    single: { rent: 8000, deposit: 16000 },
    double: { rent: 6000, deposit: 12000 },
    triple: { rent: 5000, deposit: 10000 },
    dormitory: { rent: 4000, deposit: 8000 },
  },
  hostel: {
    single: { rent: 6000, deposit: 12000 },
    double: { rent: 4500, deposit: 9000 },
    triple: { rent: 3500, deposit: 7000 },
    dormitory: { rent: 2500, deposit: 5000 },
  },
  coliving: {
    single: { rent: 12000, deposit: 24000 },
    double: { rent: 9000, deposit: 18000 },
    triple: { rent: 7000, deposit: 14000 },
    dormitory: { rent: 5000, deposit: 10000 },
  },
}

const propertyTypeLabels = {
  pg: "PG (Paying Guest)",
  hostel: "Hostel",
  coliving: "Co-Living Space",
}

interface AutoBillingSettings {
  enabled: boolean
  billing_day: number
  due_day_offset: number
  include_pending_charges: boolean
  auto_send_notification: boolean
  last_generated_month: string | null
}

const defaultAutoBillingSettings: AutoBillingSettings = {
  enabled: false,
  billing_day: 1,
  due_day_offset: 10,
  include_pending_charges: true,
  auto_send_notification: true,
  last_generated_month: null,
}

interface FoodSettings {
  enabled: boolean
  meals: {
    breakfast: { enabled: boolean; default_rate: number }
    lunch: { enabled: boolean; default_rate: number }
    dinner: { enabled: boolean; default_rate: number }
    snacks: { enabled: boolean; default_rate: number }
  }
  billing_frequency: "daily" | "weekly" | "monthly"
}

const defaultFoodSettings: FoodSettings = {
  enabled: false,
  meals: {
    breakfast: { enabled: true, default_rate: 50 },
    lunch: { enabled: true, default_rate: 80 },
    dinner: { enabled: true, default_rate: 80 },
    snacks: { enabled: false, default_rate: 30 },
  },
  billing_frequency: "monthly",
}

const defaultNotificationSettings: NotificationSettings = {
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
  const [saving, setSaving] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")

  // Profile
  const [owner, setOwner] = useState<Owner | null>(null)
  const [profileForm, setProfileForm] = useState({
    name: "",
    phone: "",
    business_name: "",
  })

  // Charge Types
  const [chargeTypes, setChargeTypes] = useState<ChargeType[]>([])
  const [newChargeType, setNewChargeType] = useState({ name: "", code: "" })
  const [showAddCharge, setShowAddCharge] = useState(false)

  // Expense Types
  const [expenseTypes, setExpenseTypes] = useState<ExpenseType[]>([])
  const [newExpenseType, setNewExpenseType] = useState({ name: "", code: "" })
  const [showAddExpense, setShowAddExpense] = useState(false)

  // Config
  const [config, setConfig] = useState<OwnerConfig | null>(null)
  const [configForm, setConfigForm] = useState({
    default_notice_period: 30,
    default_rent_due_day: 1,
    default_grace_period: 5,
  })

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(defaultNotificationSettings)
  const [sendingTestEmail, setSendingTestEmail] = useState(false)

  // Auto Billing Settings
  const [autoBillingSettings, setAutoBillingSettings] = useState<AutoBillingSettings>(defaultAutoBillingSettings)

  // Room Type Pricing (legacy flat pricing)
  const [roomTypePricing, setRoomTypePricing] = useState<RoomTypePricing>(defaultRoomTypePricing)

  // Property Type Pricing (new - pricing by property type)
  const [propertyTypePricing, setPropertyTypePricing] = useState<PropertyTypePricing>(defaultPropertyTypePricing)
  const [selectedPropertyType, setSelectedPropertyType] = useState<keyof PropertyTypePricing>("pg")

  // Food Settings
  const [foodSettings, setFoodSettings] = useState<FoodSettings>(defaultFoodSettings)

  // Feature Flags
  const [featureFlags, setFeatureFlags] = useState<FeatureFlags>(getDefaultFeatureFlags())

  // Configurable Room Types (new)
  const [configurableRoomTypes, setConfigurableRoomTypes] = useState<ConfigurableRoomType[]>(defaultConfigurableRoomTypes)
  const [showAddRoomType, setShowAddRoomType] = useState(false)
  const [newRoomType, setNewRoomType] = useState({ name: "", code: "", default_rent: 5000, default_deposit: 5000 })
  const [editingRoomType, setEditingRoomType] = useState<string | null>(null)

  // Billing Cycle Mode (new)
  const [billingCycleMode, setBillingCycleMode] = useState<BillingCycleMode>('calendar_month')

  // Utility Rates (for meter-based charges like Electricity, Water, Gas)
  const [utilityRates, setUtilityRates] = useState<UtilityRate[]>([])
  const [savingUtilityRates, setSavingUtilityRates] = useState(false)

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
        setProfileForm({
          name: ownerRes.data.name || "",
          phone: ownerRes.data.phone || "",
          business_name: ownerRes.data.business_name || "",
        })
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
            ...defaultAutoBillingSettings,
            ...configRes.data.auto_billing_settings,
          })
        }
        // Load room type pricing if available (legacy flat pricing)
        if (configRes.data.room_type_pricing) {
          setRoomTypePricing({
            ...defaultRoomTypePricing,
            ...configRes.data.room_type_pricing,
          })
        }
        // Load property type pricing if available
        if (configRes.data.property_type_pricing) {
          setPropertyTypePricing({
            ...defaultPropertyTypePricing,
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

  const saveProfile = async () => {
    if (!owner) return

    setSaving(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("owners")
        .update({
          name: profileForm.name,
          phone: profileForm.phone || null,
          business_name: profileForm.business_name || null,
        })
        .eq("id", owner.id)

      if (error) throw error

      setOwner({ ...owner, ...profileForm })
      toast.success("Profile updated successfully")
    } catch (error) {
      toast.error("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const saveConfig = async () => {
    if (!config) return

    setSaving(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("owner_config")
        .update({
          default_notice_period: configForm.default_notice_period,
          default_rent_due_day: configForm.default_rent_due_day,
          default_grace_period: configForm.default_grace_period,
        })
        .eq("id", config.id)

      if (error) throw error

      setConfig({ ...config, ...configForm })
      toast.success("Settings updated successfully")
    } catch (error) {
      toast.error("Failed to update settings")
    } finally {
      setSaving(false)
    }
  }

  const toggleChargeType = async (chargeType: ChargeType) => {
    const supabase = createClient()

    const { error } = await supabase
      .from("charge_types")
      .update({ is_enabled: !chargeType.is_enabled })
      .eq("id", chargeType.id)

    if (error) {
      toast.error("Failed to update charge type")
      return
    }

    setChargeTypes(chargeTypes.map((ct) =>
      ct.id === chargeType.id ? { ...ct, is_enabled: !ct.is_enabled } : ct
    ))
  }

  const addChargeType = async () => {
    if (!newChargeType.name || !newChargeType.code) {
      toast.error("Please enter name and code")
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from("charge_types")
        .insert({
          owner_id: user?.id,
          name: newChargeType.name,
          code: newChargeType.code.toLowerCase().replace(/\s+/g, "_"),
          category: "custom",
          is_enabled: true,
          display_order: chargeTypes.length + 1,
        })
        .select()
        .single()

      if (error) throw error

      setChargeTypes([...chargeTypes, data])
      setNewChargeType({ name: "", code: "" })
      setShowAddCharge(false)
      toast.success("Charge type added")
    } catch (error: any) {
      toast.error(error.message || "Failed to add charge type")
    } finally {
      setSaving(false)
    }
  }

  const saveNotificationSettings = async () => {
    if (!config) return

    setSaving(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("owner_config")
        .update({
          notification_settings: notificationSettings,
        })
        .eq("id", config.id)

      if (error) throw error

      setConfig({ ...config, notification_settings: notificationSettings })
      toast.success("Notification settings saved")
    } catch (error) {
      toast.error("Failed to save notification settings")
    } finally {
      setSaving(false)
    }
  }

  const saveAutoBillingSettings = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      if (config) {
        // Update existing config
        const { error } = await supabase
          .from("owner_config")
          .update({
            auto_billing_settings: autoBillingSettings,
          })
          .eq("id", config.id)

        if (error) throw error
      } else {
        // Create new config if doesn't exist
        const { data, error } = await supabase
          .from("owner_config")
          .insert({
            owner_id: user.id,
            auto_billing_settings: autoBillingSettings,
          })
          .select()
          .single()

        if (error) throw error
        setConfig(data)
      }

      toast.success("Auto billing settings saved")
    } catch (error) {
      console.error("Save error:", error)
      toast.error("Failed to save auto billing settings")
    } finally {
      setSaving(false)
    }
  }

  const saveRoomTypePricing = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Save room type pricing (using PG pricing as the default)
      const updateData = {
        room_type_pricing: propertyTypePricing.pg,
      }

      if (config) {
        // Update existing config
        const { error } = await supabase
          .from("owner_config")
          .update(updateData)
          .eq("id", config.id)

        if (error) throw error
      } else {
        // Create new config if doesn't exist
        const { data, error } = await supabase
          .from("owner_config")
          .insert({
            owner_id: user.id,
            ...updateData,
          })
          .select()
          .single()

        if (error) throw error
        setConfig(data)
      }

      toast.success("Room pricing saved")
    } catch (error) {
      console.error("Save error:", error)
      toast.error("Failed to save room pricing")
    } finally {
      setSaving(false)
    }
  }

  // Save configurable room types
  const saveConfigurableRoomTypes = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const updateData = { room_types: configurableRoomTypes }

      if (config) {
        const { error } = await supabase
          .from("owner_config")
          .update(updateData)
          .eq("id", config.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("owner_config")
          .insert({ owner_id: user.id, ...updateData })
          .select()
          .single()
        if (error) throw error
        setConfig(data)
      }

      toast.success("Room types saved")
    } catch (error) {
      console.error("Save error:", error)
      toast.error("Failed to save room types")
    } finally {
      setSaving(false)
    }
  }

  // Save billing cycle mode
  const saveBillingCycleMode = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      const updateData = { billing_cycle_mode: billingCycleMode }

      if (config) {
        const { error } = await supabase
          .from("owner_config")
          .update(updateData)
          .eq("id", config.id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("owner_config")
          .insert({ owner_id: user.id, ...updateData })
          .select()
          .single()
        if (error) throw error
        setConfig(data)
      }

      toast.success("Billing cycle mode saved")
    } catch (error) {
      console.error("Save error:", error)
      toast.error("Failed to save billing cycle mode")
    } finally {
      setSaving(false)
    }
  }

  // Save utility rates
  const saveUtilityRates = async () => {
    setSavingUtilityRates(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // Update each utility charge type's calculation_config
      for (const utility of utilityRates) {
        const calculation_config = utility.billing_type === 'per_unit'
          ? { rate_per_unit: utility.rate_per_unit, split_by: utility.split_by }
          : { default_amount: utility.flat_amount, split_by: utility.split_by }

        const { error } = await supabase
          .from("charge_types")
          .update({ calculation_config })
          .eq("id", utility.id)

        if (error) throw error
      }

      toast.success("Utility rates saved")
    } catch (error) {
      console.error("Save error:", error)
      toast.error("Failed to save utility rates")
    } finally {
      setSavingUtilityRates(false)
    }
  }

  // Update utility rate
  const updateUtilityRate = (id: string, field: keyof UtilityRate, value: string | number) => {
    setUtilityRates(utilityRates.map(rate =>
      rate.id === id ? { ...rate, [field]: value } : rate
    ))
  }

  // Add new room type
  const addRoomType = () => {
    if (!newRoomType.name || !newRoomType.code) {
      toast.error("Please enter name and code")
      return
    }
    // Check for duplicate code
    if (configurableRoomTypes.some(rt => rt.code === newRoomType.code.toLowerCase())) {
      toast.error("A room type with this code already exists")
      return
    }
    const newType: ConfigurableRoomType = {
      code: newRoomType.code.toLowerCase().replace(/\s+/g, '_'),
      name: newRoomType.name,
      default_rent: newRoomType.default_rent,
      default_deposit: newRoomType.default_deposit,
      is_enabled: true,
      display_order: configurableRoomTypes.length + 1,
    }
    setConfigurableRoomTypes([...configurableRoomTypes, newType])
    setNewRoomType({ name: "", code: "", default_rent: 5000, default_deposit: 5000 })
    setShowAddRoomType(false)
  }

  // Delete room type
  const deleteRoomType = (code: string) => {
    if (!confirm("Delete this room type? Make sure no rooms are using it.")) return
    setConfigurableRoomTypes(configurableRoomTypes.filter(rt => rt.code !== code))
  }

  // Toggle room type enabled/disabled
  const toggleRoomType = (code: string) => {
    setConfigurableRoomTypes(configurableRoomTypes.map(rt =>
      rt.code === code ? { ...rt, is_enabled: !rt.is_enabled } : rt
    ))
  }

  // Update room type pricing
  const updateRoomTypePricing = (code: string, field: 'default_rent' | 'default_deposit', value: number) => {
    setConfigurableRoomTypes(configurableRoomTypes.map(rt =>
      rt.code === code ? { ...rt, [field]: value } : rt
    ))
  }

  const handleSendTestEmail = async () => {
    if (!owner?.email) {
      toast.error("No email address found")
      return
    }

    setSendingTestEmail(true)
    try {
      const result = await sendTestEmail(owner.email, owner.name || "User")
      if (result.success) {
        toast.success("Test email sent! Check your inbox.")
      } else {
        toast.error(result.error || "Failed to send test email")
      }
    } catch (error) {
      toast.error("Failed to send test email")
    } finally {
      setSendingTestEmail(false)
    }
  }

  const deleteChargeType = async (chargeType: ChargeType) => {
    if (chargeType.category !== "custom") {
      toast.error("Cannot delete system charge types")
      return
    }

    if (!confirm(`Delete "${chargeType.name}"? This cannot be undone.`)) return

    const supabase = createClient()

    const { error } = await supabase
      .from("charge_types")
      .delete()
      .eq("id", chargeType.id)

    if (error) {
      toast.error("Failed to delete charge type")
      return
    }

    setChargeTypes(chargeTypes.filter((ct) => ct.id !== chargeType.id))
    toast.success("Charge type deleted")
  }

  const toggleExpenseType = async (expenseType: ExpenseType) => {
    const supabase = createClient()

    const { error } = await supabase
      .from("expense_types")
      .update({ is_enabled: !expenseType.is_enabled })
      .eq("id", expenseType.id)

    if (error) {
      toast.error("Failed to update expense type")
      return
    }

    setExpenseTypes(expenseTypes.map((et) =>
      et.id === expenseType.id ? { ...et, is_enabled: !et.is_enabled } : et
    ))
  }

  const addExpenseType = async () => {
    if (!newExpenseType.name || !newExpenseType.code) {
      toast.error("Please enter name and code")
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const { data, error } = await supabase
        .from("expense_types")
        .insert({
          owner_id: user?.id,
          name: newExpenseType.name,
          code: newExpenseType.code.toLowerCase().replace(/\s+/g, "_"),
          is_enabled: true,
          display_order: expenseTypes.length + 1,
        })
        .select()
        .single()

      if (error) throw error

      setExpenseTypes([...expenseTypes, data])
      setNewExpenseType({ name: "", code: "" })
      setShowAddExpense(false)
      toast.success("Expense category added")
    } catch (error: any) {
      toast.error(error.message || "Failed to add expense category")
    } finally {
      setSaving(false)
    }
  }

  const deleteExpenseType = async (expenseType: ExpenseType) => {
    if (!confirm(`Delete "${expenseType.name}"? This cannot be undone.`)) return

    const supabase = createClient()

    const { error } = await supabase
      .from("expense_types")
      .delete()
      .eq("id", expenseType.id)

    if (error) {
      toast.error("Failed to delete expense category. It may be in use.")
      return
    }

    setExpenseTypes(expenseTypes.filter((et) => et.id !== expenseType.id))
    toast.success("Expense category deleted")
  }

  const toggleFeatureFlag = (feature: FeatureFlagKey) => {
    setFeatureFlags((prev) => ({
      ...prev,
      [feature]: !prev[feature],
    }))
  }

  const saveFeatureFlags = async () => {
    if (!config) return

    setSaving(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("owner_config")
        .update({
          feature_flags: featureFlags,
        })
        .eq("id", config.id)

      if (error) throw error

      toast.success("Feature settings saved")
    } catch (error) {
      toast.error("Failed to save feature settings")
    } finally {
      setSaving(false)
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
    return <PageLoader />
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
        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>Your business information displayed on receipts</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name</Label>
                <Input
                  id="business_name"
                  placeholder="e.g., Sunrise PG Accommodations"
                  value={profileForm.business_name}
                  onChange={(e) => setProfileForm({ ...profileForm, business_name: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  This will appear on receipts and notices
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  placeholder="Your full name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={owner?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={profileForm.phone}
                  onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                />
              </div>

              <Button onClick={saveProfile} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Profile
              </Button>
            </CardContent>
          </Card>

          {/* Email Verification */}
          {user && owner?.email && (
            <EmailVerificationCard
              userId={user.id}
              email={owner.email}
              userName={owner.name || profile?.name || "User"}
              emailVerified={profile?.email_verified || false}
              emailVerifiedAt={profile?.email_verified_at}
            />
          )}
        </div>
      )}

      {/* Room Types Tab */}
      {activeTab === "room-types" && (
        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bed className="h-5 w-5" />
                    Room Types
                  </CardTitle>
                  <CardDescription>
                    Configure room types available in your properties with default pricing
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddRoomType(!showAddRoomType)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Room Type
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Room Type Form */}
              {showAddRoomType && (
                <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                  <h4 className="font-medium">Add Custom Room Type</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="roomtype_name">Name</Label>
                      <Input
                        id="roomtype_name"
                        placeholder="e.g., AC Single"
                        value={newRoomType.name}
                        onChange={(e) => setNewRoomType({ ...newRoomType, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="roomtype_code">Code</Label>
                      <Input
                        id="roomtype_code"
                        placeholder="e.g., ac_single"
                        value={newRoomType.code}
                        onChange={(e) => setNewRoomType({ ...newRoomType, code: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="roomtype_rent">Default Rent</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input
                          id="roomtype_rent"
                          type="number"
                          min="0"
                          step="500"
                          className="pl-8"
                          value={newRoomType.default_rent}
                          onChange={(e) => setNewRoomType({ ...newRoomType, default_rent: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="roomtype_deposit">Default Deposit</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                        <Input
                          id="roomtype_deposit"
                          type="number"
                          min="0"
                          step="500"
                          className="pl-8"
                          value={newRoomType.default_deposit}
                          onChange={(e) => setNewRoomType({ ...newRoomType, default_deposit: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addRoomType}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddRoomType(false)}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Room Types List */}
              <div className="space-y-3">
                {configurableRoomTypes.map((roomType) => (
                  <div
                    key={roomType.code}
                    className={`p-4 border rounded-lg transition-colors ${
                      roomType.is_enabled ? "bg-background" : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${roomType.is_enabled ? "bg-primary/10" : "bg-muted"}`}>
                          <Home className={`h-4 w-4 ${roomType.is_enabled ? "text-primary" : "text-muted-foreground"}`} />
                        </div>
                        <div>
                          <p className={`font-medium ${!roomType.is_enabled && "text-muted-foreground"}`}>
                            {roomType.name}
                          </p>
                          <p className="text-xs text-muted-foreground">{roomType.code}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleRoomType(roomType.code)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            roomType.is_enabled ? "bg-primary" : "bg-muted"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              roomType.is_enabled ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-600"
                          onClick={() => deleteRoomType(roomType.code)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Default Rent</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                          <Input
                            type="number"
                            min="0"
                            step="500"
                            className="pl-8 h-9"
                            value={roomType.default_rent}
                            onChange={(e) => updateRoomTypePricing(roomType.code, 'default_rent', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Default Deposit</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">₹</span>
                          <Input
                            type="number"
                            min="0"
                            step="500"
                            className="pl-8 h-9"
                            value={roomType.default_deposit}
                            onChange={(e) => updateRoomTypePricing(roomType.code, 'default_deposit', parseInt(e.target.value) || 0)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={saveConfigurableRoomTypes} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Room Types
              </Button>

              <p className="text-xs text-muted-foreground">
                These room types will appear in the dropdown when creating rooms.
                Default pricing is used when a room type is selected.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === "billing" && (
        <div className="grid gap-6 max-w-2xl">
          {/* Billing Cycle Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Billing Cycle Mode
              </CardTitle>
              <CardDescription>
                Choose how billing periods are calculated for tenants
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="billing_cycle"
                    value="calendar_month"
                    checked={billingCycleMode === 'calendar_month'}
                    onChange={() => setBillingCycleMode('calendar_month')}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">Calendar Month</p>
                    <p className="text-sm text-muted-foreground">
                      Bill period is 1st to end of month. All tenants billed on same cycle.
                    </p>
                  </div>
                </label>
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <input
                    type="radio"
                    name="billing_cycle"
                    value="checkin_anniversary"
                    checked={billingCycleMode === 'checkin_anniversary'}
                    onChange={() => setBillingCycleMode('checkin_anniversary')}
                    className="mt-1"
                  />
                  <div>
                    <p className="font-medium">Check-in Anniversary</p>
                    <p className="text-sm text-muted-foreground">
                      Bill period aligns with tenant&apos;s check-in date. E.g., if tenant joined on 15th, bill runs 15th to 14th.
                    </p>
                  </div>
                </label>
              </div>
              <Button onClick={saveBillingCycleMode} disabled={saving} size="sm">
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Billing Mode
              </Button>
            </CardContent>
          </Card>

          {/* Utility Rates */}
          {utilityRates.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cog className="h-5 w-5" />
                  Utility Rates
                </CardTitle>
                <CardDescription>
                  Configure rates for meter-based utilities like Electricity, Water, Gas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {utilityRates.map((utility) => (
                  <div key={utility.id} className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{utility.name}</h4>
                      <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded">
                        {utility.code}
                      </span>
                    </div>

                    {/* Billing Type Selection */}
                    <div className="space-y-2">
                      <Label className="text-sm">Billing Method</Label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`billing_type_${utility.id}`}
                            checked={utility.billing_type === 'per_unit'}
                            onChange={() => updateUtilityRate(utility.id, 'billing_type', 'per_unit')}
                          />
                          <span className="text-sm">Per Unit ({utility.unit_label})</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name={`billing_type_${utility.id}`}
                            checked={utility.billing_type === 'flat_rate'}
                            onChange={() => updateUtilityRate(utility.id, 'billing_type', 'flat_rate')}
                          />
                          <span className="text-sm">Flat Rate</span>
                        </label>
                      </div>
                    </div>

                    {/* Rate Input */}
                    <div className="grid grid-cols-2 gap-4">
                      {utility.billing_type === 'per_unit' ? (
                        <div className="space-y-2">
                          <Label className="text-sm">Rate per {utility.unit_label}</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              min="0"
                              step="0.5"
                              value={utility.rate_per_unit}
                              onChange={(e) => updateUtilityRate(utility.id, 'rate_per_unit', parseFloat(e.target.value) || 0)}
                              className="pl-7"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <Label className="text-sm">Flat Amount per Month</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              min="0"
                              value={utility.flat_amount}
                              onChange={(e) => updateUtilityRate(utility.id, 'flat_amount', parseFloat(e.target.value) || 0)}
                              className="pl-7"
                            />
                          </div>
                        </div>
                      )}

                      {/* Split By Selection */}
                      <div className="space-y-2">
                        <Label className="text-sm">Split Charges</Label>
                        <select
                          value={utility.split_by}
                          onChange={(e) => updateUtilityRate(utility.id, 'split_by', e.target.value)}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        >
                          <option value="occupants">Per Occupant</option>
                          <option value="room">Per Room</option>
                        </select>
                      </div>
                    </div>

                    {/* Preview */}
                    <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                      {utility.billing_type === 'per_unit' ? (
                        <>Example: 100 {utility.unit_label} × ₹{utility.rate_per_unit} = {formatCurrency(100 * utility.rate_per_unit)}</>
                      ) : (
                        <>Monthly charge: {formatCurrency(utility.flat_amount)} {utility.split_by === 'occupants' ? '(split among room occupants)' : '(per room)'}</>
                      )}
                    </div>
                  </div>
                ))}

                <Button onClick={saveUtilityRates} disabled={savingUtilityRates} size="sm">
                  {savingUtilityRates ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save Utility Rates
                </Button>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Charge Types</CardTitle>
                  <CardDescription>Configure what you charge tenants for</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCharge(!showAddCharge)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Custom
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Charge Form */}
              {showAddCharge && (
                <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                  <h4 className="font-medium">Add Custom Charge Type</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="charge_name">Name</Label>
                      <Input
                        id="charge_name"
                        placeholder="e.g., Laundry"
                        value={newChargeType.name}
                        onChange={(e) => setNewChargeType({ ...newChargeType, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="charge_code">Code</Label>
                      <Input
                        id="charge_code"
                        placeholder="e.g., laundry"
                        value={newChargeType.code}
                        onChange={(e) => setNewChargeType({ ...newChargeType, code: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addChargeType} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddCharge(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Charge Types List */}
              <div className="space-y-2">
                {chargeTypes.map((chargeType) => (
                  <div
                    key={chargeType.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      chargeType.is_enabled ? "bg-background" : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${chargeType.is_enabled ? "bg-primary/10" : "bg-muted"}`}>
                        <IndianRupee className={`h-4 w-4 ${chargeType.is_enabled ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className={`font-medium ${!chargeType.is_enabled && "text-muted-foreground"}`}>
                          {chargeType.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {chargeType.code} • {chargeType.category}
                          {chargeType.is_refundable && " • Refundable"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleChargeType(chargeType)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          chargeType.is_enabled ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            chargeType.is_enabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      {chargeType.category === "custom" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-red-600"
                          onClick={() => deleteChargeType(chargeType)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {chargeTypes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No charge types configured
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Late Fee Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Late Fee Settings</CardTitle>
              <CardDescription>Configure late payment penalties</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted/50 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Late fee calculation is based on the grace period set in Default Settings.
                  Payments made after the grace period will be marked as late.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Grace Period</span>
                  </div>
                  <p className="text-2xl font-bold">{configForm.default_grace_period} days</p>
                  <p className="text-xs text-muted-foreground">After due date</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Due Day</span>
                  </div>
                  <p className="text-2xl font-bold">{configForm.default_rent_due_day}</p>
                  <p className="text-xs text-muted-foreground">Of each month</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Auto Billing Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Automatic Bill Generation
              </CardTitle>
              <CardDescription>Configure automated monthly bill generation for all active tenants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${autoBillingSettings.enabled ? "bg-primary/10" : "bg-muted"}`}>
                    <CreditCard className={`h-5 w-5 ${autoBillingSettings.enabled ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-medium">Enable Auto Billing</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically generate monthly bills for all active tenants
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setAutoBillingSettings({
                    ...autoBillingSettings,
                    enabled: !autoBillingSettings.enabled
                  })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoBillingSettings.enabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      autoBillingSettings.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {autoBillingSettings.enabled && (
                <>
                  {/* Billing Schedule */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Billing Schedule</h4>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="billing_day">Bill Generation Day</Label>
                        <select
                          id="billing_day"
                          value={autoBillingSettings.billing_day}
                          onChange={(e) => setAutoBillingSettings({
                            ...autoBillingSettings,
                            billing_day: parseInt(e.target.value)
                          })}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        >
                          {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                            <option key={day} value={day}>
                              {day}{day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"} of month
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground">
                          Day when bills are automatically generated
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="due_day_offset">Due Date (Days After)</Label>
                        <select
                          id="due_day_offset"
                          value={autoBillingSettings.due_day_offset}
                          onChange={(e) => setAutoBillingSettings({
                            ...autoBillingSettings,
                            due_day_offset: parseInt(e.target.value)
                          })}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        >
                          {[5, 7, 10, 15, 20, 30].map((days) => (
                            <option key={days} value={days}>
                              {days} days after bill date
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-muted-foreground">
                          Payment due date offset from bill date
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Bill Options */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Bill Options</h4>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Include Pending Charges</p>
                        <p className="text-xs text-muted-foreground">Add pending electricity, water, and other charges to the bill</p>
                      </div>
                      <button
                        onClick={() => setAutoBillingSettings({
                          ...autoBillingSettings,
                          include_pending_charges: !autoBillingSettings.include_pending_charges
                        })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          autoBillingSettings.include_pending_charges ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            autoBillingSettings.include_pending_charges ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Send Notification</p>
                        <p className="text-xs text-muted-foreground">Send email notification when bill is generated</p>
                      </div>
                      <button
                        onClick={() => setAutoBillingSettings({
                          ...autoBillingSettings,
                          auto_send_notification: !autoBillingSettings.auto_send_notification
                        })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          autoBillingSettings.auto_send_notification ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            autoBillingSettings.auto_send_notification ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Last Generated Info */}
                  {autoBillingSettings.last_generated_month && (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-700">
                          Last generated: <strong>{autoBillingSettings.last_generated_month}</strong>
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Button onClick={saveAutoBillingSettings} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Auto Billing Settings
              </Button>

              <p className="text-xs text-muted-foreground">
                Note: Bills are generated automatically at 11:30 AM IST on the configured day each month.
                This includes monthly rent and any pending charges for active tenants.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Food Tab */}
      {activeTab === "food" && (
        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <UtensilsCrossed className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>Food & Meal Settings</CardTitle>
                  <CardDescription>Configure meal options for your tenants</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable Food */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Enable Food Tracking</p>
                  <p className="text-sm text-muted-foreground">
                    Allow tenants to opt-in for meals
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setFoodSettings({ ...foodSettings, enabled: !foodSettings.enabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    foodSettings.enabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      foodSettings.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {foodSettings.enabled && (
                <>
                  {/* Meal Options */}
                  <div className="space-y-4">
                    <Label className="text-base">Meal Options & Rates</Label>
                    <div className="grid gap-3">
                      {(["breakfast", "lunch", "dinner", "snacks"] as const).map((meal) => (
                        <div key={meal} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => setFoodSettings({
                                ...foodSettings,
                                meals: {
                                  ...foodSettings.meals,
                                  [meal]: {
                                    ...foodSettings.meals[meal],
                                    enabled: !foodSettings.meals[meal].enabled
                                  }
                                }
                              })}
                              className={`h-5 w-5 rounded flex items-center justify-center border-2 transition-colors ${
                                foodSettings.meals[meal].enabled
                                  ? "bg-primary border-primary text-white"
                                  : "border-muted-foreground/30"
                              }`}
                            >
                              {foodSettings.meals[meal].enabled && <Check className="h-3 w-3" />}
                            </button>
                            <span className="capitalize font-medium">{meal}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              value={foodSettings.meals[meal].default_rate}
                              onChange={(e) => setFoodSettings({
                                ...foodSettings,
                                meals: {
                                  ...foodSettings.meals,
                                  [meal]: {
                                    ...foodSettings.meals[meal],
                                    default_rate: parseFloat(e.target.value) || 0
                                  }
                                }
                              })}
                              className="w-24 h-8"
                              min="0"
                              disabled={!foodSettings.meals[meal].enabled}
                            />
                            <span className="text-sm text-muted-foreground">/day</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Billing Frequency */}
                  <div className="space-y-2">
                    <Label>Billing Frequency</Label>
                    <select
                      value={foodSettings.billing_frequency}
                      onChange={(e) => setFoodSettings({
                        ...foodSettings,
                        billing_frequency: e.target.value as "daily" | "weekly" | "monthly"
                      })}
                      className="w-full h-10 px-3 rounded-md border bg-background"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                    <p className="text-xs text-muted-foreground">
                      How often food charges are added to tenant bills
                    </p>
                  </div>
                </>
              )}

              <Button
                onClick={async () => {
                  setSaving(true)
                  try {
                    const supabase = createClient()
                    const { error } = await supabase
                      .from("owner_config")
                      .update({ food_settings: foodSettings })
                      .eq("id", config?.id)

                    if (error) throw error
                    toast.success("Food settings saved!")
                  } catch (error) {
                    toast.error("Failed to save food settings")
                  } finally {
                    setSaving(false)
                  }
                }}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Food Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Expenses Tab */}
      {activeTab === "expenses" && (
        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Expense Categories</CardTitle>
                  <CardDescription>Configure categories for tracking expenses</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddExpense(!showAddExpense)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Category
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Expense Type Form */}
              {showAddExpense && (
                <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                  <h4 className="font-medium">Add Expense Category</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="expense_name">Name</Label>
                      <Input
                        id="expense_name"
                        placeholder="e.g., Pest Control"
                        value={newExpenseType.name}
                        onChange={(e) => setNewExpenseType({ ...newExpenseType, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="expense_code">Code</Label>
                      <Input
                        id="expense_code"
                        placeholder="e.g., pest_control"
                        value={newExpenseType.code}
                        onChange={(e) => setNewExpenseType({ ...newExpenseType, code: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={addExpenseType} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setShowAddExpense(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Expense Types List */}
              <div className="space-y-2">
                {expenseTypes.map((expenseType) => (
                  <div
                    key={expenseType.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      expenseType.is_enabled ? "bg-background" : "bg-muted/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${expenseType.is_enabled ? "bg-rose-100" : "bg-muted"}`}>
                        <IndianRupee className={`h-4 w-4 ${expenseType.is_enabled ? "text-rose-600" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className={`font-medium ${!expenseType.is_enabled && "text-muted-foreground"}`}>
                          {expenseType.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {expenseType.code}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleExpenseType(expenseType)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          expenseType.is_enabled ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            expenseType.is_enabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                        onClick={() => deleteExpenseType(expenseType)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                {expenseTypes.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No expense categories yet.</p>
                    <p className="text-sm mt-1">Add your first expense to create default categories automatically.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <IndianRupee className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="font-medium text-blue-900">Track Your Expenses</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    Go to Dashboard → Expenses to record and track all your property-related expenses.
                    Expenses are shown in Reports for profitability analysis.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Notifications
              </CardTitle>
              <CardDescription>Configure automated email reminders for tenants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Master Toggle */}
              <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${notificationSettings.email_reminders_enabled ? "bg-primary/10" : "bg-muted"}`}>
                    <Bell className={`h-5 w-5 ${notificationSettings.email_reminders_enabled ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <div>
                    <p className="font-medium">Email Reminders</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically send payment reminders to tenants
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setNotificationSettings({
                    ...notificationSettings,
                    email_reminders_enabled: !notificationSettings.email_reminders_enabled
                  })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notificationSettings.email_reminders_enabled ? "bg-primary" : "bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notificationSettings.email_reminders_enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {notificationSettings.email_reminders_enabled && (
                <>
                  {/* Reminder Schedule */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Reminder Schedule</h4>

                    <div className="space-y-2">
                      <Label htmlFor="reminder_days">Days Before Due Date</Label>
                      <select
                        id="reminder_days"
                        value={notificationSettings.reminder_days_before}
                        onChange={(e) => setNotificationSettings({
                          ...notificationSettings,
                          reminder_days_before: parseInt(e.target.value)
                        })}
                        className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                      >
                        {[1, 2, 3, 5, 7, 10].map((days) => (
                          <option key={days} value={days}>
                            {days} day{days > 1 ? "s" : ""} before
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground">
                        Send reminder this many days before rent is due
                      </p>
                    </div>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Send on Due Date</p>
                        <p className="text-xs text-muted-foreground">Remind tenants on the day rent is due</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings({
                          ...notificationSettings,
                          send_on_due_date: !notificationSettings.send_on_due_date
                        })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          notificationSettings.send_on_due_date ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            notificationSettings.send_on_due_date ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Overdue Alerts */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Overdue Alerts</h4>

                    <div className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium text-sm">Send Overdue Alerts</p>
                        <p className="text-xs text-muted-foreground">Alert tenants when payment is overdue</p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings({
                          ...notificationSettings,
                          send_overdue_alerts: !notificationSettings.send_overdue_alerts
                        })}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                          notificationSettings.send_overdue_alerts ? "bg-primary" : "bg-muted"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                            notificationSettings.send_overdue_alerts ? "translate-x-5" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>

                    {notificationSettings.send_overdue_alerts && (
                      <div className="space-y-2">
                        <Label htmlFor="overdue_frequency">Overdue Alert Frequency</Label>
                        <select
                          id="overdue_frequency"
                          value={notificationSettings.overdue_alert_frequency}
                          onChange={(e) => setNotificationSettings({
                            ...notificationSettings,
                            overdue_alert_frequency: e.target.value as "daily" | "weekly"
                          })}
                          className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                        >
                          <option value="daily">Daily</option>
                          <option value="weekly">Weekly</option>
                        </select>
                      </div>
                    )}
                  </div>
                </>
              )}

              <Button onClick={saveNotificationSettings} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Settings
              </Button>
            </CardContent>
          </Card>

          {/* Test Email */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Test Email
              </CardTitle>
              <CardDescription>Send a test email to verify your setup</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Send Test Email</p>
                  <p className="text-sm text-muted-foreground">
                    Send to: {owner?.email}
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleSendTestEmail}
                  disabled={sendingTestEmail}
                >
                  {sendingTestEmail ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MailCheck className="mr-2 h-4 w-4" />
                  )}
                  Send Test
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Note: Email reminders run automatically every day at 2:30 PM IST.
                Only tenants with pending dues and valid email addresses will receive reminders.
              </p>
            </CardContent>
          </Card>

          {/* WhatsApp Info */}
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Phone className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h4 className="font-medium text-green-900">WhatsApp Notifications</h4>
                  <p className="text-sm text-green-700 mt-1">
                    WhatsApp reminders are available via manual send buttons on the Payments page.
                    Go to Payments → Send Reminders to send WhatsApp messages to tenants with pending dues.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Features Tab */}
      {activeTab === "features" && (
        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ToggleLeft className="h-5 w-5" />
                Feature Management
              </CardTitle>
              <CardDescription>
                Enable or disable features for your workspace.
                Changes take effect immediately after saving.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {Object.entries(getFeaturesByCategory()).map(([category, features]) => (
                <div key={category} className="space-y-3">
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    {CATEGORY_LABELS[category] || category}
                  </h4>
                  <div className="space-y-2">
                    {features.map((feature) => (
                      <div
                        key={feature.key}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                          featureFlags[feature.key as FeatureFlagKey] ? "bg-background" : "bg-muted/30"
                        }`}
                      >
                        <div className="flex-1">
                          <p className={`font-medium ${!featureFlags[feature.key as FeatureFlagKey] && "text-muted-foreground"}`}>
                            {feature.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {feature.description}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleFeatureFlag(feature.key as FeatureFlagKey)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            featureFlags[feature.key as FeatureFlagKey] ? "bg-primary" : "bg-muted"
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              featureFlags[feature.key as FeatureFlagKey] ? "translate-x-6" : "translate-x-1"
                            }`}
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <Button onClick={saveFeatureFlags} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Feature Settings
              </Button>

              <p className="text-xs text-muted-foreground">
                Note: Some features may require additional configuration in their respective settings tabs.
                Disabling a feature hides it from navigation but does not delete any data.
              </p>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <h4 className="font-medium text-blue-900 mb-3">Feature Summary</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-2xl font-bold text-blue-900">
                    {Object.values(featureFlags).filter(Boolean).length}
                  </p>
                  <p className="text-sm text-blue-700">Features enabled</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-900">
                    {Object.values(featureFlags).filter(v => !v).length}
                  </p>
                  <p className="text-sm text-blue-700">Features disabled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Defaults Tab */}
      {activeTab === "defaults" && (
        <div className="grid gap-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Billing Defaults</CardTitle>
              <CardDescription>Default settings for new properties and tenants</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="default_rent_due_day">Rent Due Day</Label>
                  <select
                    id="default_rent_due_day"
                    value={configForm.default_rent_due_day}
                    onChange={(e) => setConfigForm({ ...configForm, default_rent_due_day: parseInt(e.target.value) })}
                    className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <option key={day} value={day}>
                        {day}{day === 1 ? "st" : day === 2 ? "nd" : day === 3 ? "rd" : "th"} of month
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    Day when rent becomes due
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="default_grace_period">Grace Period (Days)</Label>
                  <Input
                    id="default_grace_period"
                    type="number"
                    min="0"
                    max="30"
                    value={configForm.default_grace_period}
                    onChange={(e) => setConfigForm({ ...configForm, default_grace_period: parseInt(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Days after due date before late fee
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_notice_period">Notice Period (Days)</Label>
                <select
                  id="default_notice_period"
                  value={configForm.default_notice_period}
                  onChange={(e) => setConfigForm({ ...configForm, default_notice_period: parseInt(e.target.value) })}
                  className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                >
                  <option value={7}>7 days</option>
                  <option value={15}>15 days</option>
                  <option value={30}>30 days (1 month)</option>
                  <option value={60}>60 days (2 months)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Required notice before tenant checkout
                </p>
              </div>

              <Button onClick={saveConfig} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Settings
              </Button>
            </CardContent>
          </Card>

          {/* Room Amenities */}
          <Card>
            <CardHeader>
              <CardTitle>Room Amenities</CardTitle>
              <CardDescription>Available amenities for rooms</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {[
                  "AC",
                  "Attached Bathroom",
                  "Balcony",
                  "TV",
                  "WiFi",
                  "Geyser",
                  "Wardrobe",
                  "Study Table",
                  "Chair",
                  "Bed",
                  "Mattress",
                  "Fan",
                  "Window",
                  "Power Backup",
                  "Refrigerator",
                ].map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-2 p-2 border rounded-lg"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{amenity}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                These amenities can be selected when adding or editing rooms
              </p>
            </CardContent>
          </Card>

          {/* Data & Privacy */}
          <Card>
            <CardHeader>
              <CardTitle>Data & Privacy</CardTitle>
              <CardDescription>Manage your data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Export All Data</p>
                  <p className="text-sm text-muted-foreground">
                    Download all your data in CSV format
                  </p>
                </div>
                <Button variant="outline">
                  Export
                </Button>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg border-red-200 bg-red-50">
                <div>
                  <p className="font-medium text-red-700">Delete Account</p>
                  <p className="text-sm text-red-600">
                    Permanently delete your account and all data
                  </p>
                </div>
                <Button variant="destructive" disabled>
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
    </OwnerGuard>
  )
}
