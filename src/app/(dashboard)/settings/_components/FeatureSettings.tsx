"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Save, ChevronDown, ChevronRight, Building2, Plus } from "lucide-react"
import { useFeatureManagement } from "@/lib/features/use-features"
import { MODULES_CATALOG } from "@/lib/features/modules-catalog"
import { BUSINESS_TYPE_LABELS } from "@/lib/features/business-types"
import { enableModule, disableModule, toggleFeature } from "@/lib/features/checks"
import type { ModuleKey, WorkspaceModuleConfig } from "@/lib/features"
import { showSuccess, showError } from "@/lib/toast-helpers"
import type { BusinessType } from "@/lib/features"

export function FeatureSettings() {
  const {
    workspaces,
    selectedWorkspaceId,
    setSelectedWorkspaceId,
    selectedConfig,
    configs,
    setConfig,
    saveConfig,
    loading,
    saving,
  } = useFeatureManagement()

  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set())

  const toggleModuleExpanded = (moduleKey: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev)
      if (next.has(moduleKey)) next.delete(moduleKey)
      else next.add(moduleKey)
      return next
    })
  }

  const handleModuleToggle = (moduleKey: ModuleKey, currentlyEnabled: boolean) => {
    if (!selectedWorkspaceId) return
    const current = configs.get(selectedWorkspaceId) ?? {}
    const next = currentlyEnabled
      ? disableModule(current, moduleKey)
      : enableModule(current, moduleKey)
    setConfig(selectedWorkspaceId, next)
  }

  const handleFeatureToggle = (
    moduleKey: ModuleKey,
    featureKey: string,
    currentlyEnabled: boolean
  ) => {
    if (!selectedWorkspaceId) return
    const current = configs.get(selectedWorkspaceId) ?? {}
    const next = toggleFeature(current, moduleKey, featureKey, !currentlyEnabled)
    setConfig(selectedWorkspaceId, next)
  }

  const handleSave = async () => {
    if (!selectedWorkspaceId) return
    const ok = await saveConfig(selectedWorkspaceId)
    if (ok) showSuccess("Module settings saved")
    else showError("Failed to save module settings")
  }

  const enabledCount = Object.values(selectedConfig).filter((s) => s?.enabled).length
  const totalCount = MODULES_CATALOG.length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* Left pane — workspace (business) list */}
      <div className="w-64 shrink-0 space-y-2">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-muted-foreground">Your Businesses</p>
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Add Business" onClick={() => {}}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {workspaces.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No businesses found.</p>
        )}

        {workspaces.map((ws) => {
          const isSelected = ws.id === selectedWorkspaceId
          const wsConfig = configs.get(ws.id) ?? {}
          const wsEnabled = Object.values(wsConfig).filter((s) => s?.enabled).length

          return (
            <button
              key={ws.id}
              onClick={() => setSelectedWorkspaceId(ws.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${
                isSelected
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-background border-border hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium truncate">{ws.name}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Badge variant="outline" className="text-xs px-1.5 py-0">
                  {BUSINESS_TYPE_LABELS[ws.business_type as BusinessType] ?? ws.business_type}
                </Badge>
                <span className="text-xs text-muted-foreground">{wsEnabled} on</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Right pane — module cards */}
      <div className="flex-1 min-w-0">
        {!selectedWorkspaceId ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            Select a business to configure its modules.
          </div>
        ) : (
          <div className="space-y-4">
            {/* Summary bar */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-muted-foreground">
                  {enabledCount} of {totalCount} modules enabled
                </span>
                <div className="h-2 w-32 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${Math.round((enabledCount / totalCount) * 100)}%` }}
                  />
                </div>
              </div>
              <Button onClick={handleSave} disabled={saving} size="sm">
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Changes
              </Button>
            </div>

            {/* Module cards */}
            <ModuleCardList
              config={selectedConfig}
              expandedModules={expandedModules}
              onToggleExpanded={toggleModuleExpanded}
              onModuleToggle={handleModuleToggle}
              onFeatureToggle={handleFeatureToggle}
            />

            {/* Footer save */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                Disabling a module hides it from navigation. No data is deleted.
              </p>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save Module Settings
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Module card list ────────────────────────────────────────────────────────

interface ModuleCardListProps {
  config: WorkspaceModuleConfig
  expandedModules: Set<string>
  onToggleExpanded: (key: string) => void
  onModuleToggle: (key: ModuleKey, currentlyEnabled: boolean) => void
  onFeatureToggle: (module: ModuleKey, feature: string, currentlyEnabled: boolean) => void
}

function ModuleCardList({
  config,
  expandedModules,
  onToggleExpanded,
  onModuleToggle,
  onFeatureToggle,
}: ModuleCardListProps) {
  return (
    <div className="space-y-3">
      {MODULES_CATALOG.map((moduleDef) => {
        const moduleState = config[moduleDef.key]
        const isEnabled = moduleState?.enabled === true
        const isExpanded = expandedModules.has(moduleDef.key)
        const enabledFeatureCount = Object.values(moduleState?.features ?? {}).filter(Boolean).length

        return (
          <Card key={moduleDef.key} className={isEnabled ? "" : "opacity-70"}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">{moduleDef.name}</CardTitle>
                    {isEnabled && enabledFeatureCount > 0 && (
                      <Badge variant="outline" className="text-xs shrink-0">
                        {enabledFeatureCount} feature{enabledFeatureCount !== 1 ? "s" : ""} on
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1">{moduleDef.description}</CardDescription>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Module master toggle */}
                  <button
                    onClick={() => onModuleToggle(moduleDef.key, isEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      isEnabled ? "bg-primary" : "bg-muted"
                    }`}
                    title={isEnabled ? "Disable module" : "Enable module"}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        isEnabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                  {/* Expand / collapse — only show if module has features */}
                  {moduleDef.features.length > 0 && (
                    <button
                      onClick={() => onToggleExpanded(moduleDef.key)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
                      title={isExpanded ? "Collapse" : "Expand features"}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </CardHeader>

            {isExpanded && moduleDef.features.filter(f => f.wired !== false).length > 0 && (
              <CardContent className="pt-0 space-y-2">
                <div className="h-px bg-border mb-3" />
                {moduleDef.features.filter(f => f.wired !== false).map((featureDef) => {
                  const featureOn = moduleState?.features?.[featureDef.key] === true

                  return (
                    <div
                      key={featureDef.key}
                      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                        featureOn ? "bg-background" : "bg-muted/30"
                      }`}
                    >
                      <div className="flex-1 min-w-0 pr-4">
                        <p className={`text-sm font-medium ${!featureOn ? "text-muted-foreground" : ""}`}>
                          {featureDef.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{featureDef.description}</p>
                      </div>
                      <button
                        onClick={() => onFeatureToggle(moduleDef.key, featureDef.key, featureOn)}
                        disabled={!isEnabled}
                        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 ${
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
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
