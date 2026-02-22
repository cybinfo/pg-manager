"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, Check } from "lucide-react"
import { useSettingsMutation } from "@/lib/hooks/useSettingsMutation"
import { OwnerConfig } from "@/types/settings.types"

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
                <Check className="h-4 w-4 text-success" />
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
