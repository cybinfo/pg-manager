"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField, Select } from "@/components/ui/form-components"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, Check } from "lucide-react"
import { useSettingsMutation } from "@/lib/hooks/useSettingsMutation"
import { OwnerConfig } from "@/types/settings.types"
import { NOTICE_PERIOD_OPTIONS, AVAILABLE_AMENITIES, BILLING_DAY_OPTIONS } from "@/lib/constants/form-options"

interface DefaultSettingsProps {
  configForm: {
    default_notice_period: number
    default_rent_due_day: number
    default_grace_period: number
  }
  setConfigForm: (form: {
    default_notice_period: number
    default_rent_due_day: number
    default_grace_period: number
  }) => void
  config: OwnerConfig | null
  setConfig: (config: OwnerConfig) => void
}

export function DefaultSettings({ configForm, setConfigForm, config, setConfig }: DefaultSettingsProps) {
  const { saving, save } = useSettingsMutation({ configId: config?.id, setConfig })

  const saveConfig = async () => {
    if (!config) return
    const ok = await save(
      {
        default_notice_period: configForm.default_notice_period,
        default_rent_due_day: configForm.default_rent_due_day,
        default_grace_period: configForm.default_grace_period,
      },
      { successMessage: "Settings updated successfully", errorMessage: "Failed to update settings" }
    )
    if (ok) setConfig({ ...config, ...configForm })
  }

  return (
    <div className="grid gap-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Billing Defaults</CardTitle>
          <CardDescription>Default settings for new properties and tenants</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Rent Due Day" htmlFor="default_rent_due_day" hint="Day when rent becomes due">
              <Select
                id="default_rent_due_day"
                value={configForm.default_rent_due_day.toString()}
                onChange={(e) => setConfigForm({ ...configForm, default_rent_due_day: parseInt(e.target.value) })}
                options={BILLING_DAY_OPTIONS}
              />
            </FormField>

            <FormField label="Grace Period (Days)" htmlFor="default_grace_period" hint="Days after due date before late fee">
              <Input
                id="default_grace_period"
                type="number"
                min="0"
                max="30"
                value={configForm.default_grace_period}
                onChange={(e) => setConfigForm({ ...configForm, default_grace_period: parseInt(e.target.value) || 0 })}
              />
            </FormField>
          </div>

          <FormField label="Notice Period (Days)" htmlFor="default_notice_period" hint="Required notice before tenant checkout">
            <Select
              id="default_notice_period"
              value={configForm.default_notice_period.toString()}
              onChange={(e) => setConfigForm({ ...configForm, default_notice_period: parseInt(e.target.value) })}
              options={NOTICE_PERIOD_OPTIONS}
            />
          </FormField>

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
            {AVAILABLE_AMENITIES.map((amenity) => (
              <div
                key={amenity.key}
                className="flex items-center gap-2 p-2 border rounded-lg"
              >
                <Check className="h-4 w-4 text-success" />
                <span className="text-sm">{amenity.label}</span>
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

          <div className="flex items-center justify-between p-4 border rounded-lg border-destructive/20 bg-destructive/10">
            <div>
              <p className="font-medium text-destructive">Delete Account</p>
              <p className="text-sm text-destructive">
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
  )
}
