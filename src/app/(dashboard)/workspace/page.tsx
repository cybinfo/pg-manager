"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { LayoutDashboard, Building2, Briefcase } from "lucide-react"
import { DetailHero, InfoCard, DetailListSection } from "@/components/ui"
import { TableBadge } from "@/components/ui/data-table"
import { PageLoading } from "@/components/ui/loading"
import { OwnerGuard } from "@/components/auth"
import { useCurrentContext } from "@/lib/auth"
import { createClient } from "@/lib/supabase/client"
import { ENTITY_TYPE_LABELS } from "@/types/entity.types"
import type { EntityType } from "@/types/entity.types"
import { BUSINESS_ENTITY_TYPE_LABELS } from "@/types/business.types"
import type { BusinessEntityType } from "@/types/business.types"

interface BusinessRow {
  id: string
  name: string
  business_type: BusinessEntityType | null
  is_active: boolean
}

interface EntityRow {
  id: string
  name: string
  type: EntityType
  city: string | null
  is_active: boolean
}

function WorkspacePageContent() {
  const { context, workspaceName } = useCurrentContext()
  const [businesses, setBusinesses] = useState<BusinessRow[]>([])
  const [entities, setEntities] = useState<EntityRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!context?.workspace_id) return
    const supabase = createClient()
    Promise.all([
      supabase
        .from("businesses")
        .select("id, name, business_type, is_active")
        .eq("workspace_id", context.workspace_id)
        .order("name"),
      supabase
        .from("entities")
        .select("id, name, type, city, is_active")
        .eq("workspace_id", context.workspace_id)
        .order("name"),
    ]).then(([biz, ent]) => {
      setBusinesses((biz.data || []) as BusinessRow[])
      setEntities((ent.data || []) as EntityRow[])
      setLoading(false)
    })
  }, [context?.workspace_id])

  if (!context || loading) return <PageLoading message="Loading workspace..." />

  return (
    <OwnerGuard>
      <div className="space-y-6">
        <DetailHero
          title={workspaceName || "My Workspace"}
          subtitle="Workspace identity and account overview"
          backHref="/dashboard"
          icon={LayoutDashboard}
          breadcrumbs={[{ label: "Workspace" }]}
        />

        <div className="grid grid-cols-2 gap-4">
          <InfoCard
            label="Businesses"
            value={String(businesses.length)}
            icon={Briefcase}
          />
          <InfoCard
            label="Entities"
            value={String(entities.length)}
            icon={Building2}
          />
        </div>

        <DetailListSection
          title="My Businesses"
          description="Legal entities under this workspace"
          icon={Briefcase}
          items={businesses}
          keyExtractor={(b) => b.id}
          viewAllHref="/businesses"
          viewAllLabel="View All Businesses"
          emptyIcon={Briefcase}
          emptyText="No businesses added yet"
          emptyAction={{ label: "Add Business", href: "/businesses/new" }}
          itemSpacing="none"
          renderItem={(business) => (
            <Link href={`/businesses/${business.id}`}>
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{business.name}</div>
                    {business.business_type && (
                      <div className="text-xs text-muted-foreground">
                        {BUSINESS_ENTITY_TYPE_LABELS[business.business_type]}
                      </div>
                    )}
                  </div>
                </div>
                <TableBadge variant={business.is_active ? "success" : "muted"}>
                  {business.is_active ? "Active" : "Inactive"}
                </TableBadge>
              </div>
            </Link>
          )}
        />

        <DetailListSection
          title="My Entities"
          description="Operational locations under this workspace"
          icon={Building2}
          items={entities}
          keyExtractor={(e) => e.id}
          viewAllHref="/entities"
          viewAllLabel="View All Entities"
          emptyIcon={Building2}
          emptyText="No entities added yet"
          emptyAction={{ label: "Add Entity", href: "/entities/new" }}
          itemSpacing="none"
          renderItem={(entity) => (
            <Link href={`/entities/${entity.id}`}>
              <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <div className="font-medium text-sm">{entity.name}</div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <TableBadge variant="info">
                        {ENTITY_TYPE_LABELS[entity.type] || entity.type}
                      </TableBadge>
                      {entity.city && <span>{entity.city}</span>}
                    </div>
                  </div>
                </div>
                <TableBadge variant={entity.is_active ? "success" : "muted"}>
                  {entity.is_active ? "Active" : "Inactive"}
                </TableBadge>
              </div>
            </Link>
          )}
        />
      </div>
    </OwnerGuard>
  )
}

export default function WorkspacePage() {
  return <WorkspacePageContent />
}
