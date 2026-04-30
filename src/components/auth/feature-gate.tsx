"use client"

import { ReactNode } from "react"
import { useFeatures } from "@/lib/features/use-features"
import type { ModuleKey } from "@/lib/features"
import { MODULE_MAP } from "@/lib/features"
import { Lock } from "lucide-react"

interface ModuleGateProps {
  module: ModuleKey
  children: ReactNode
  fallback?: ReactNode
  showDisabledMessage?: boolean
}

interface FeatureGateProps extends ModuleGateProps {
  feature: string
}

/**
 * Conditionally renders children based on module flag status.
 * Use ModuleGuard for page-level blocking; use this for inline conditional rendering.
 */
export function ModuleGate({
  module,
  children,
  fallback,
  showDisabledMessage = false,
}: ModuleGateProps) {
  const { isModuleEnabled, loading } = useFeatures()

  if (loading) return null

  if (isModuleEnabled(module)) return <>{children}</>

  if (fallback) return <>{fallback}</>

  if (showDisabledMessage) {
    const def = MODULE_MAP.get(module)
    return (
      <div className="p-4 border border-dashed rounded-lg bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span className="font-medium">{def?.name ?? module}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          This module is currently disabled. Enable it in Settings → Feature Control Center.
        </p>
      </div>
    )
  }

  return null
}

/**
 * Conditionally renders children when both module and feature are enabled.
 */
export function FeatureGate({
  module,
  feature,
  children,
  fallback,
  showDisabledMessage = false,
}: FeatureGateProps) {
  const { isFeatureEnabled, loading } = useFeatures()

  if (loading) return null

  if (isFeatureEnabled(module, feature)) return <>{children}</>

  if (fallback) return <>{fallback}</>

  if (showDisabledMessage) {
    const def = MODULE_MAP.get(module)
    const featureDef = def?.features.find((f) => f.key === feature)
    return (
      <div className="p-4 border border-dashed rounded-lg bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span className="font-medium">{featureDef?.name ?? feature}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          This feature is currently disabled. Enable it in Settings → Feature Control Center.
        </p>
      </div>
    )
  }

  return null
}

/** Hook for programmatic module checks */
export function useModuleCheck(module: ModuleKey): boolean {
  const { isModuleEnabled } = useFeatures()
  return isModuleEnabled(module)
}

/** Hook for programmatic feature checks */
export function useFeatureCheck(module: ModuleKey, feature: string): boolean {
  const { isFeatureEnabled } = useFeatures()
  return isFeatureEnabled(module, feature)
}
