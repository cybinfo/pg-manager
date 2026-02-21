"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Loader2, Save, Plus, Trash2, IndianRupee,
  Calendar, Clock, CreditCard, Check, Cog,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { withCreatedBy } from "@/lib/audit"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { formatCurrency } from "@/lib/format"
import {
  ChargeType,
  UtilityRate,
  OwnerConfig,
  AutoBillingSettings,
  BillingCycleMode,
  PropertyTypePricing,
  DEFAULT_AUTO_BILLING_SETTINGS,
} from "@/types/settings.types"

interface BillingSettingsProps {
  chargeTypes: ChargeType[]
  setChargeTypes: (types: ChargeType[]) => void
  utilityRates: UtilityRate[]
  setUtilityRates: (rates: UtilityRate[]) => void
  autoBillingSettings: AutoBillingSettings
  setAutoBillingSettings: (settings: AutoBillingSettings) => void
  billingCycleMode: BillingCycleMode
  setBillingCycleMode: (mode: BillingCycleMode) => void
  configForm: {
    default_grace_period: number
    default_rent_due_day: number
  }
  config: OwnerConfig | null
  setConfig: (config: OwnerConfig) => void
  propertyTypePricing: PropertyTypePricing
}

export function BillingSettings({
  chargeTypes,
  setChargeTypes,
  utilityRates,
  setUtilityRates,
  autoBillingSettings,
  setAutoBillingSettings,
  billingCycleMode,
  setBillingCycleMode,
  configForm,
  config,
  setConfig,
  propertyTypePricing,
}: BillingSettingsProps) {
  const [saving, setSaving] = useState(false)
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

    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

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
    } catch (error: any) {
      showError(error.message || "Failed to add charge type")
    } finally {
      setSaving(false)
    }
  }

  const deleteChargeType = async (chargeType: ChargeType) => {
    if (chargeType.category !== "custom") {
      showError("Cannot delete system charge types")
      return
    }

    if (!confirm(`Delete "${chargeType.name}"? This cannot be undone.`)) return

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
  }

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
          .insert(withCreatedBy({ owner_id: user.id, ...updateData }, user.id))
          .select()
          .single()
        if (error) throw error
        setConfig(data)
      }

      showSuccess("Billing cycle mode saved")
    } catch (error) {
      console.error("Save error:", error)
      showError("Failed to save billing cycle mode")
    } finally {
      setSaving(false)
    }
  }

  const updateUtilityRate = (id: string, field: keyof UtilityRate, value: string | number) => {
    setUtilityRates(utilityRates.map(rate =>
      rate.id === id ? { ...rate, [field]: value } : rate
    ))
  }

  const saveUtilityRates = async () => {
    setSavingUtilityRates(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

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

      showSuccess("Utility rates saved")
    } catch (error) {
      console.error("Save error:", error)
      showError("Failed to save utility rates")
    } finally {
      setSavingUtilityRates(false)
    }
  }

  const saveAutoBillingSettings = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      if (config) {
        const { error } = await supabase
          .from("owner_config")
          .update({
            auto_billing_settings: autoBillingSettings,
          })
          .eq("id", config.id)

        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from("owner_config")
          .insert(
            withCreatedBy({
              owner_id: user.id,
              auto_billing_settings: autoBillingSettings,
            }, user.id)
          )
          .select()
          .single()

        if (error) throw error
        setConfig(data)
      }

      showSuccess("Auto billing settings saved")
    } catch (error) {
      console.error("Save error:", error)
      showError("Failed to save auto billing settings")
    } finally {
      setSaving(false)
    }
  }

  return (
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
  )
}
