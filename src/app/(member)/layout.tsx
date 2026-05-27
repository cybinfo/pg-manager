"use client"

import { useState, useCallback } from "react"
import { BookOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PortalLayout } from "@/components/portal"
import { LIBRARY_MEMBER_NAVIGATION } from "@/lib/navigation/config"
import { brandGradient } from "@/lib/design-tokens"
import { isFeatureEnabled } from "@/lib/features/checks"
import type { WorkspaceModuleConfig } from "@/lib/features"

interface MemberPortalInfo {
  id: string
  name: string
  phone: string | null
  email: string
  member_code: string | null
  hours_balance: number
  library: {
    name: string
  } | null
}

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const [member, setMember] = useState<MemberPortalInfo | null>(null)

  const handleAuthCheck = useCallback(async (userId: string): Promise<boolean> => {

    const { data: memberData, error } = await supabase
      .from("library_members")
      .select(`
        id,
        name,
        phone,
        member_code,
        hours_balance,
        library:libraries(name, workspace_id)
      `)
      .eq("user_id", userId)
      .eq("status", "active")
      .single()

    if (error || !memberData) {
      return false
    }

    const library = Array.isArray(memberData.library)
      ? memberData.library[0]
      : memberData.library

    // Check if memberPortal feature is enabled for this workspace
    if (library?.workspace_id) {
      const { data: workspace } = await supabase
        .from("workspaces")
        .select("module_config")
        .eq("id", library.workspace_id)
        .single()

      if (workspace) {
        const config = workspace.module_config as WorkspaceModuleConfig | null
        if (!isFeatureEnabled(config, "members", "memberPortal")) {
          return false
        }
      }
    }

    setMember({
      id: memberData.id,
      name: memberData.name,
      phone: memberData.phone,
      email: "",
      member_code: memberData.member_code,
      hours_balance: memberData.hours_balance,
      library,
    })
    return true
  }, [])

  const renderEntityInfo = useCallback(() => (
    <>
      <div className="p-3 bg-muted rounded-lg">
        <p className="font-medium truncate">{member?.name}</p>
        <p className="text-sm text-muted-foreground truncate">
          {member?.library?.name}
        </p>
        {member?.member_code && (
          <p className="text-xs font-mono text-muted-foreground mt-1">
            {member.member_code}
          </p>
        )}
      </div>
      {/* Hours Balance */}
      <div className="mt-3 p-3 bg-primary/10 rounded-lg">
        <p className="text-xs text-primary font-medium">Hours Balance</p>
        <p className="text-2xl font-bold text-primary">
          {member?.hours_balance?.toFixed(1) || "0.0"}h
        </p>
      </div>
    </>
  ), [member])

  return (
    <PortalLayout
      portalType="member"
      brandGradient={brandGradient.memberValues}
      brandIconColor="text-primary"
      icon={BookOpen}
      portalName="Member Portal"
      navItems={LIBRARY_MEMBER_NAVIGATION}
      entityInfoRenderer={renderEntityInfo}
      onAuthCheck={handleAuthCheck}
      logTag="MemberLayout"
    >
      {children}
    </PortalLayout>
  )
}
