"use client"

import { useState, useEffect, useCallback } from "react"
import { logger } from "@/lib/logger"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"
import { isFeatureEnabled } from "@/lib/features/checks"
import type { WorkspaceModuleConfig } from "@/lib/features"
import type { TenantWithContext } from "@/types/tenants.types"

export interface TenantDocument {
  id: string
  name: string
  document_type: string
  description: string | null
  file_url: string
  file_name: string
  mime_type: string | null
  status: "pending" | "approved" | "rejected"
  review_notes: string | null
  uploaded_at: string
  reviewed_at: string | null
}

export interface UseTenantDocumentsReturn {
  documents: TenantDocument[]
  tenantInfo: TenantWithContext | null
  featureEnabled: boolean
  loading: boolean
  refetch: () => void
}

export function useTenantDocuments(): UseTenantDocumentsReturn {
  const [documents, setDocuments] = useState<TenantDocument[]>([])
  const [tenantInfo, setTenantInfo] = useState<TenantWithContext | null>(null)
  const [featureEnabled, setFeatureEnabled] = useState(true)
  const [loading, setLoading] = useState(true)

  const fetchDocuments = useCallback(async () => {
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data: tenant } = await supabase
        .from("tenants")
        .select("id, owner_id, property:properties(owner_id)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (!tenant) {
        setLoading(false)
        return
      }

      const property = transformJoin(tenant.property)
      const ownerId = property?.owner_id || tenant.owner_id

      const { data: workspace } = await supabase
        .from("workspaces")
        .select("id, module_config")
        .eq("owner_user_id", ownerId)
        .single()

      if (workspace) {
        const config = workspace.module_config as WorkspaceModuleConfig | null
        if (!isFeatureEnabled(config, "tenants", "documentsUpload")) {
          setFeatureEnabled(false)
          setLoading(false)
          return
        }
      }

      setTenantInfo({
        id: tenant.id,
        workspace_id: workspace?.id || "",
        owner_id: ownerId,
      })

      const { data: docs } = await supabase
        .from("tenant_documents")
        .select("*")
        .eq("tenant_id", tenant.id)
        .is("deleted_at", null)
        .order("uploaded_at", { ascending: false })

      setDocuments((docs as TenantDocument[]) || [])
    } catch (err) {
      logger.error("useTenantDocuments: failed to fetch documents", { error: String(err) })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  return {
    documents,
    tenantInfo,
    featureEnabled,
    loading,
    refetch: fetchDocuments,
  }
}
