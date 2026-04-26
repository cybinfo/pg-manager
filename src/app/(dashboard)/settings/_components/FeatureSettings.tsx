"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Save, ChevronDown, ChevronRight, AlertTriangle, Info, Sparkles } from "lucide-react"
import { useSettingsMutation } from "@/lib/hooks/useSettingsMutation"
import { FeatureFlagKey, FeatureFlags, FEATURE_FLAGS } from "@/lib/features"
import { invalidateFeatureCache } from "@/lib/features/use-features"
import {
  DOMAIN_MODULES,
  CoreModule,
  DomainModule,
  getDependentFeatures,
  countEnabledFeatures,
} from "@/lib/features/feature-control-config"
import { OwnerConfig } from "@/types/settings.types"

interface FeatureSettingsProps {
  featureFlags: FeatureFlags
  setFeatureFlags: (flags: FeatureFlags) => void
  config: OwnerConfig | null
}

interface DependencyWarning {
  featureKey: FeatureFlagKey
  featureName: string
  dependentNames: string[]
  dependentKeys: FeatureFlagKey[]
}

export function FeatureSettings({ featureFlags, setFeatureFlags, config }: FeatureSettingsProps) {
  const { saving, save } = useSettingsMutation({ configId: config?.id })
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())
  const [warning, setWarning] = useState<DependencyWarning | null>(null)

  const toggleModuleExpanded = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
  }

  const isFeatureOn = (key: FeatureFlagKey) => featureFlags[key] !== false

  const isModulePartiallyOn = (module: CoreModule) =>
    module.features.some((f) => isFeatureOn(f.key))

  const isModuleFullyOn = (module: CoreModule) =>
    module.features.every((f) => isFeatureOn(f.key))

  const setAllModuleFeatures = (module: CoreModule, enabled: boolean) => {
    const updates = { ...featureFlags }
    for (const f of module.features) updates[f.key] = enabled
    setFeatureFlags(updates)
  }

  const handleFeatureToggle = (key: FeatureFlagKey, domain: DomainModule) => {
    const currentlyOn = isFeatureOn(key)
    if (currentlyOn) {
      const dependents = getDependentFeatures(key, domain).filter((d) => isFeatureOn(d.key))
      if (dependents.length > 0) {
        setWarning({
          featureKey: key,
          featureName: FEATURE_FLAGS[key]?.name ?? key,
          dependentNames: dependents.map((d) => d.name),
          dependentKeys: dependents.map((d) => d.key),
        })
        return
      }
    }
    setFeatureFlags({ ...featureFlags, [key]: !currentlyOn })
  }

  const confirmDisable = () => {
    if (!warning) return
    const updates = { ...featureFlags, [warning.featureKey]: false }
    for (const k of warning.dependentKeys) updates[k] = false
    setFeatureFlags(updates)
    setWarning(null)
  }

  const saveFeatureFlags = async () => {
    const ok = await save(
      { feature_flags: featureFlags },
      { successMessage: "Feature settings saved", errorMessage: "Failed to save feature settings" }
    )
    // Invalidate cache so all mounted useFeatures() hooks re-fetch immediately —
    // this makes navigation and FeatureGuard update without a page reload.
    if (ok) {
      invalidateFeatureCache()
    }
  }

  const { enabled, total } = countEnabledFeatures(featureFlags)

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Trial banner */}
      <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <Sparkles className="h-4 w-4 text-amber-600 shrink-0" />
        <p className="text-sm text-amber-800">
          <strong>Trial Mode</strong> — All features are available free during the trial period.
          Enable or disable to customise your workspace.
        </p>
      </div>

      {/* Summary bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {enabled} of {total} features enabled
          </span>
          <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${Math.round((enabled / total) * 100)}%` }}
            />
          </div>
        </div>
        <Button onClick={saveFeatureFlags} disabled={saving} size="sm">
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      {/* Dependency warning */}
      {warning && (
        <div className="flex items-start gap-3 bg-orange-50 border border-orange-200 rounded-lg px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-orange-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm text-orange-800">
              <strong>{warning.featureName}</strong> is required by{" "}
              <strong>{warning.dependentNames.join(", ")}</strong>. Disabling it will also
              disable those features.
            </p>
            <div className="flex gap-3 mt-2">
              <button onClick={confirmDisable} className="text-xs font-medium text-orange-700 underline">
                Disable all
              </button>
              <button onClick={() => setWarning(null)} className="text-xs text-muted-foreground underline">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Domain Tabs */}
      <Tabs defaultValue={DOMAIN_MODULES[0].id}>
        <TabsList className="w-full justify-start">
          {DOMAIN_MODULES.map((domain) => (
            <TabsTrigger key={domain.id} value={domain.id}>
              {domain.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {DOMAIN_MODULES.map((domain) => (
          <TabsContent key={domain.id} value={domain.id} className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">{domain.description}</p>

            {domain.modules.map((module) => {
              const isExpanded = expandedModules.has(module.id)
              const fullyOn = isModuleFullyOn(module)
              const partiallyOn = isModulePartiallyOn(module)

              return (
                <Card key={module.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{module.name}</CardTitle>
                          {partiallyOn && !fullyOn && (
                            <Badge variant="outline" className="text-xs shrink-0">
                              Partial
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="mt-1">{module.description}</CardDescription>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Module-level toggle */}
                        <button
                          onClick={() => setAllModuleFeatures(module, !fullyOn)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            partiallyOn ? "bg-primary" : "bg-muted"
                          }`}
                          title={fullyOn ? "Disable all in module" : "Enable all in module"}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                              fullyOn ? "translate-x-6" : partiallyOn ? "translate-x-3" : "translate-x-1"
                            }`}
                          />
                        </button>
                        {/* Expand / collapse */}
                        <button
                          onClick={() => toggleModuleExpanded(module.id)}
                          className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                          title={isExpanded ? "Collapse" : "Expand features"}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </CardHeader>

                  {isExpanded && (
                    <CardContent className="pt-0 space-y-2">
                      <div className="h-px bg-border mb-3" />
                      {module.features.map((feature) => {
                        const featureOn = isFeatureOn(feature.key)
                        return (
                          <div
                            key={feature.key}
                            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                              featureOn ? "bg-background" : "bg-muted/30"
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-4">
                              <p
                                className={`text-sm font-medium ${
                                  !featureOn ? "text-muted-foreground" : ""
                                }`}
                              >
                                {feature.name}
                              </p>
                              <p className="text-xs text-muted-foreground">{feature.description}</p>
                              {feature.dependsOn && feature.dependsOn.length > 0 && (
                                <p className="text-xs text-amber-600 mt-0.5 flex items-center gap-1">
                                  <Info className="h-3 w-3 shrink-0" />
                                  Requires:{" "}
                                  {feature.dependsOn
                                    .map((k) => FEATURE_FLAGS[k]?.name ?? k)
                                    .join(", ")}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleFeatureToggle(feature.key, domain)}
                              className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                                featureOn ? "bg-primary" : "bg-muted"
                              }`}
                            >
                              <span
                                className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                                  featureOn ? "translate-x-5" : "translate-x-1"
                                }`}
                              />
                            </button>
                          </div>
                        )
                      })}
                      {module.disabledNote && (
                        <p className="text-xs text-muted-foreground pt-1 flex items-start gap-1.5">
                          <Info className="h-3 w-3 shrink-0 mt-0.5 text-blue-500" />
                          {module.disabledNote}
                        </p>
                      )}
                    </CardContent>
                  )}
                </Card>
              )
            })}
          </TabsContent>
        ))}
      </Tabs>

      {/* Footer save */}
      <div className="flex items-center justify-between pt-2">
        <p className="text-xs text-muted-foreground">
          Disabling a feature hides it from navigation. No data is deleted.
        </p>
        <Button onClick={saveFeatureFlags} disabled={saving}>
          {saving ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Feature Settings
        </Button>
      </div>
    </div>
  )
}
