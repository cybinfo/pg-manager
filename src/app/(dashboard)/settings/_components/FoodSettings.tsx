"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, Check, UtensilsCrossed } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { FoodSettings as FoodSettingsType, OwnerConfig } from "@/types/settings.types"

interface FoodSettingsProps {
  foodSettings: FoodSettingsType
  setFoodSettings: (settings: FoodSettingsType) => void
  configId: string | undefined
}

export function FoodSettings({ foodSettings, setFoodSettings, configId }: FoodSettingsProps) {
  const [saving, setSaving] = useState(false)

  const saveFoodSettings = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("owner_config")
        .update({ food_settings: foodSettings })
        .eq("id", configId)

      if (error) throw error
      showSuccess("Food settings saved!")
    } catch (error) {
      showError("Failed to save food settings")
    } finally {
      setSaving(false)
    }
  }

  return (
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

          <Button onClick={saveFoodSettings} disabled={saving}>
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
  )
}
