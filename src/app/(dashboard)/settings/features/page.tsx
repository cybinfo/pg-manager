/**
 * Feature Control Center — Standalone Page
 *
 * Dedicated route: /settings/features
 * Workspace owners can enable or disable platform features without
 * navigating the full settings tab UI.
 *
 * State is driven by useFeatureManagement, which reads from and
 * writes to owner_config.feature_flags in Supabase. The configId
 * is forwarded to FeatureSettings so its internal Save button works.
 *
 * Protected by OwnerGuard — only workspace owners can change feature flags.
 */

"use client"

import { Suspense } from "react"
import { ToggleLeft } from "lucide-react"
import { PageHeader } from "@/components/ui/page-header"
import { PageSkeleton } from "@/components/ui/loading"
import { OwnerGuard } from "@/components/auth"
import { useFeatureManagement } from "@/lib/features/use-features"
import type { FeatureFlags } from "@/lib/features"
import type { OwnerConfig } from "@/types/settings.types"
import { FeatureSettings } from "../_components"

function FeatureControlContent() {
  const { flags, loading, configId, setFeature } = useFeatureManagement()

  if (loading) {
    return <PageSkeleton variant="form" />
  }

  // Adapt hook's per-flag setter into the bulk-setter FeatureSettings expects
  const handleSetFeatureFlags = (updated: FeatureFlags) => {
    for (const [key, value] of Object.entries(updated)) {
      setFeature(key as Parameters<typeof setFeature>[0], value)
    }
  }

  // Build a minimal config shape that satisfies FeatureSettings → useSettingsMutation.
  // Only `id` is required by useSettingsMutation to update owner_config.
  const config: OwnerConfig | null = configId
    ? ({
        id: configId,
        default_notice_period: 30,
        default_rent_due_day: 1,
        default_grace_period: 5,
        currency: "INR",
      } as OwnerConfig)
    : null

  return (
    <div className="space-y-6">
      <PageHeader
        title="Feature Control Center"
        description="Enable or disable features for your workspace. Disabling a feature hides it from navigation — no data is deleted."
        icon={ToggleLeft}
        breadcrumbs={[
          { label: "Settings", href: "/settings" },
          { label: "Features" },
        ]}
      />

      <FeatureSettings
        featureFlags={flags}
        setFeatureFlags={handleSetFeatureFlags}
        config={config}
      />
    </div>
  )
}

export default function FeaturesPage() {
  return (
    <OwnerGuard>
      <Suspense fallback={<PageSkeleton variant="form" />}>
        <FeatureControlContent />
      </Suspense>
    </OwnerGuard>
  )
}
