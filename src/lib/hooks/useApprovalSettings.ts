"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { useCurrentContext } from "@/lib/auth"

interface UseApprovalSettingsOptions {
  workspaceId?: string
}

export function useApprovalSettings({ workspaceId: propWorkspaceId }: UseApprovalSettingsOptions = {}) {
  const { context } = useCurrentContext()
  const workspaceId = propWorkspaceId || context?.workspace_id

  const [autoTypes, setAutoTypes] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!workspaceId) return
    const fetchConfig = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("workspaces")
        .select("module_config")
        .eq("id", workspaceId)
        .single()
      if (data?.module_config) {
        const config = data.module_config as Record<string, unknown>
        const approvals = config.approvals as Record<string, unknown> | undefined
        if (approvals?.auto_approval_types) {
          setAutoTypes(approvals.auto_approval_types as string[])
        }
      }
      setLoading(false)
    }
    fetchConfig()
  }, [workspaceId])

  return {
    workspaceId,
    autoTypes,
    setAutoTypes,
    loading,
  }
}
