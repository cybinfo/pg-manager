"use client"

import { useState, useCallback } from "react"
import { BookOpen } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PortalLayout } from "@/components/portal"
import { LIBRARY_MEMBER_NAVIGATION } from "@/lib/navigation/config"

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
  const [member, setMember] = useState<MemberPortalInfo | null>(null)

  const handleAuthCheck = useCallback(async (userId: string): Promise<boolean> => {
    const supabase = createClient()

    const { data: memberData, error } = await supabase
      .from("library_members")
      .select(`
        id,
        name,
        phone,
        member_code,
        hours_balance,
        library:libraries(name)
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
      <div className="mt-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
        <p className="text-xs text-purple-600 font-medium">Hours Balance</p>
        <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
          {member?.hours_balance?.toFixed(1) || "0.0"}h
        </p>
      </div>
    </>
  ), [member])

  return (
    <PortalLayout
      portalType="member"
      brandGradient="from-purple-500 to-indigo-500"
      brandIconColor="text-purple-600"
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
