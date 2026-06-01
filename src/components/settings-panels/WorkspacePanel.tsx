"use client"

import { useSettingsData } from "@/lib/hooks/useSettingsData"
import { DefaultSettings, ApprovalSettings } from "@/app/(dashboard)/settings/_components"
import { PageSkeleton } from "@/components/ui/loading"
import { FeatureGuard } from "@/components/auth"

export function WorkspacePanel() {
  const {
    loading,
    config, setConfig,
    configForm, setConfigForm,
  } = useSettingsData()

  if (loading) return <PageSkeleton variant="form" />

  return (
    <div className="space-y-6">
      <DefaultSettings
        configForm={configForm}
        setConfigForm={setConfigForm}
        config={config}
        setConfig={(c) => setConfig(c)}
      />
      <FeatureGuard module="approvals" feature="autoApproval">
        <ApprovalSettings />
      </FeatureGuard>
    </div>
  )
}
