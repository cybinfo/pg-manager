"use client"

import { useEffect, useState } from "react"
import {
  LayoutDashboard,
  Building2,
  Briefcase,
} from "lucide-react"
import { DetailHero, InfoCard } from "@/components/ui"
import { PageLoading } from "@/components/ui/loading"
import { OwnerGuard } from "@/components/auth"
import { useCurrentContext } from "@/lib/auth"
import { createClient } from "@/lib/supabase/client"
import { ConfigureDialog } from "@/components/shared/ConfigureDialog"
import { WorkspacePanel } from "@/components/settings-panels"

function WorkspacePageContent() {
  const { context, workspaceName } = useCurrentContext()
  const [businessCount, setBusinessCount] = useState<number | null>(null)
  const [entityCount, setEntityCount] = useState<number | null>(null)

  useEffect(() => {
    if (!context?.workspace_id) return
    const supabase = createClient()
    Promise.all([
      supabase.from("businesses").select("id", { count: "exact", head: true }).eq("workspace_id", context.workspace_id),
      supabase.from("entities").select("id", { count: "exact", head: true }).eq("workspace_id", context.workspace_id),
    ]).then(([biz, ent]) => {
      setBusinessCount(biz.count ?? 0)
      setEntityCount(ent.count ?? 0)
    })
  }, [context?.workspace_id])

  if (!context) return <PageLoading message="Loading workspace..." />

  return (
    <OwnerGuard>
      <div className="space-y-6">
        <DetailHero
          title={workspaceName || "My Workspace"}
          subtitle="Workspace identity and account overview"
          backHref="/dashboard"
          icon={LayoutDashboard}
          breadcrumbs={[{ label: "Workspace" }]}
          actions={
            <ConfigureDialog
              title="Workspace Defaults"
              description="Configure workspace-wide default settings"
            >
              <WorkspacePanel />
            </ConfigureDialog>
          }
        />

        <div className="grid grid-cols-2 gap-4">
          <InfoCard
            label="Businesses"
            value={businessCount !== null ? String(businessCount) : "—"}
            icon={Briefcase}
          />
          <InfoCard
            label="Entities"
            value={entityCount !== null ? String(entityCount) : "—"}
            icon={Building2}
          />
        </div>
      </div>
    </OwnerGuard>
  )
}

export default function WorkspacePage() {
  return <WorkspacePageContent />
}
