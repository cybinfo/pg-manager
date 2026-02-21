"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Save, ToggleLeft } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { showSuccess, showError } from "@/lib/toast-helpers"
import {
  FeatureFlagKey,
  FeatureFlags,
  getFeaturesByCategory,
  CATEGORY_LABELS,
} from "@/lib/features"
import { OwnerConfig } from "@/types/settings.types"

interface FeatureSettingsProps {
  featureFlags: FeatureFlags
  setFeatureFlags: (flags: FeatureFlags) => void
  config: OwnerConfig | null
}

export function FeatureSettings({ featureFlags, setFeatureFlags, config }: FeatureSettingsProps) {
  const [saving, setSaving] = useState(false)

  const toggleFeatureFlag = (feature: FeatureFlagKey) => {
    setFeatureFlags({
      ...featureFlags,
      [feature]: !featureFlags[feature],
    })
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

      showSuccess("Feature settings saved")
    } catch (error) {
      showError("Failed to save feature settings")
    } finally {
      setSaving(false)
    }
  }

  return (
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
  )
}
