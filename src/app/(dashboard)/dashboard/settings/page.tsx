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
  MailCheck
} from "lucide-react"
import { toast } from "sonner"
import { sendTestEmail } from "@/lib/email"

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

const defaultNotificationSettings: NotificationSettings = {
  email_reminders_enabled: true,
  reminder_days_before: 5,
  send_on_due_date: true,
  send_overdue_alerts: true,
  overdue_alert_frequency: "weekly",
}

export default function SettingsPage() {
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

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [ownerRes, chargeTypesRes, configRes] = await Promise.all([
        supabase.from("owners").select("*").eq("id", user.id).single(),
        supabase.from("charge_types").select("*").order("display_order"),
        supabase.from("owner_config").select("*").eq("owner_id", user.id).single(),
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
    if (!config) return

    setSaving(true)
    try {
      const supabase = createClient()

      const { error } = await supabase
        .from("owner_config")
        .update({
          auto_billing_settings: autoBillingSettings,
        })
        .eq("id", config.id)

      if (error) throw error

      toast.success("Auto billing settings saved")
    } catch (error) {
      toast.error("Failed to save auto billing settings")
    } finally {
      setSaving(false)
    }
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

  const tabs = [
    { id: "profile", label: "Profile", icon: User },
    { id: "billing", label: "Billing & Charges", icon: CreditCard },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "defaults", label: "Default Settings", icon: Settings },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and preferences</p>
      </div>

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
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === "billing" && (
        <div className="grid gap-6 max-w-2xl">
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
  )
}
