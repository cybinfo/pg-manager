"use client"

import { ReactNode } from "react"
import { useFeatures } from "@/lib/features/use-features"
import { FeatureFlagKey, FEATURE_FLAGS } from "@/lib/features"
import { Lock } from "lucide-react"

interface FeatureGateProps {
  feature: FeatureFlagKey
  children: ReactNode
  /** Content to show when feature is disabled (optional) */
  fallback?: ReactNode
  /** If true, show a "feature disabled" message instead of nothing */
  showDisabledMessage?: boolean
}

/**
 * Component that conditionally renders children based on feature flag status.
 *
 * Usage:
 * <FeatureGate feature="food">
 *   <FoodSettingsSection />
 * </FeatureGate>
 */
export function FeatureGate({
  feature,
  children,
  fallback,
  showDisabledMessage = false,
}: FeatureGateProps) {
  const { isEnabled, loading } = useFeatures()

  if (loading) {
    return null // Or a loading skeleton
  }

  if (isEnabled(feature)) {
    return <>{children}</>
  }

  if (fallback) {
    return <>{fallback}</>
  }

  if (showDisabledMessage) {
    const config = FEATURE_FLAGS[feature]
    return (
      <div className="p-4 border border-dashed rounded-lg bg-muted/30">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Lock className="h-4 w-4" />
          <span className="font-medium">{config?.name || feature}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          This feature is currently disabled. Enable it in Settings → Features.
        </p>
      </div>
    )
  }

  return null
}

/**
 * Hook-based feature check for programmatic use.
 * Use FeatureGate component when possible for cleaner JSX.
 */
export function useFeatureCheck(feature: FeatureFlagKey): boolean {
  const { isEnabled } = useFeatures()
  return isEnabled(feature)
}
