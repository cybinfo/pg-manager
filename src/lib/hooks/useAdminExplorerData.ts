"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import type { User } from "@supabase/supabase-js"

export interface AdminWorkspace {
  id: string
  name: string
  created_at: string
  owner_user_id: string
  owner_name?: string
  owner_email?: string
  total_properties: number
  total_tenants: number
  total_rooms: number
}

interface UseAdminExplorerDataResult {
  loading: boolean
  isPlatformAdmin: boolean
  workspaces: AdminWorkspace[]
  refreshing: boolean
  fetchWorkspaces: () => Promise<void>
}

export function useAdminExplorerData(user: User | null): UseAdminExplorerDataResult {
  const [loading, setLoading] = useState(true)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [workspaces, setWorkspaces] = useState<AdminWorkspace[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const fetchWorkspaces = async () => {
    setRefreshing(true)
    const supabase = createClient()

    const { data: workspacesData, error: wsError } = await (supabase.rpc as unknown as (fn: string) => Promise<{ data: unknown; error: unknown }>)("get_all_workspaces_admin")

    if (wsError) {
      logger.error("Admin explorer: error fetching workspaces", { detail: wsError })
    }

    if (workspacesData) {
      type WorkspaceData = {
        id: string; name: string; created_at: string; owner_user_id: string
        owner_name: string; owner_email: string
        total_properties?: number; total_rooms?: number; total_tenants?: number
      }
      setWorkspaces((workspacesData as WorkspaceData[]).map((ws) => ({
        ...ws,
        total_properties: ws.total_properties || 0,
        total_rooms: ws.total_rooms || 0,
        total_tenants: ws.total_tenants || 0,
      })))
    }

    setLoading(false)
    setRefreshing(false)
  }

  useEffect(() => {
    if (!user) return

    const checkAdmin = async () => {
      const supabase = createClient()
      const { data: adminCheck } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", user.id)
        .single()

      if (!adminCheck) {
        setIsPlatformAdmin(false)
        setLoading(false)
        return
      }

      setIsPlatformAdmin(true)
      await fetchWorkspaces()
    }

    checkAdmin()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return { loading, isPlatformAdmin, workspaces, refreshing, fetchWorkspaces }
}
