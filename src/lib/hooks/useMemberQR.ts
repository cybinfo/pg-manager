"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { logger } from "@/lib/logger"
import { isFeatureEnabled } from "@/lib/features/checks"
import type { WorkspaceModuleConfig } from "@/lib/features"

export interface MemberQRData {
  id: string
  name: string
  member_code: string | null
  entity_id: string
  library: {
    name: string
    workspace_id: string
  } | null
  person: {
    name: string
  } | null
}

export interface UseMemberQRReturn {
  member: MemberQRData | null
  featureAvailable: boolean
  loading: boolean
}

export function useMemberQR(): UseMemberQRReturn {
  const [loading, setLoading] = useState(true)
  const [member, setMember] = useState<MemberQRData | null>(null)
  const [featureAvailable, setFeatureAvailable] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setLoading(false)
        return
      }

      const { data: memberData } = await supabase
        .from("entity_members")
        .select(
          `
          id,
          name,
          member_code,
          entity_id,
          library:libraries(name, workspace_id),
          person:people(name)
        `
        )
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (memberData) {
        const library = Array.isArray(memberData.library)
          ? memberData.library[0]
          : memberData.library
        const person = Array.isArray(memberData.person)
          ? memberData.person[0]
          : memberData.person

        if (library?.workspace_id) {
          const { data: workspace } = await supabase
            .from("workspaces")
            .select("module_config")
            .eq("id", library.workspace_id)
            .single()

          if (workspace) {
            const config = workspace.module_config as WorkspaceModuleConfig | null
            if (!isFeatureEnabled(config, "members", "memberQrCode")) {
              setFeatureAvailable(false)
              setLoading(false)
              return
            }
          }
        }

        setMember({
          ...memberData,
          library,
          person,
        })
      }
      setLoading(false)
    }

    fetchData().catch((err: unknown) => {
      logger.error("useMemberQR: fetch failed", { error: String(err) })
      setLoading(false)
    })
  }, [])

  return { member, featureAvailable, loading }
}
