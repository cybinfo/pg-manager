"use client"

import { useState, useCallback } from "react"
import {
  Home,
  User,
  CreditCard,
  FileText,
  MessageSquare,
  Bell,
  Building2,
  FolderOpen
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PortalLayout, PortalNavItem } from "@/components/portal"
import { TenantPortalInfo, RawTenantPortalInfo } from "@/types/tenants.types"

const navigation: PortalNavItem[] = [
  { name: "Home", href: "/tenant", icon: Home },
  { name: "My Profile", href: "/tenant/profile", icon: User },
  { name: "My Bills", href: "/tenant/bills", icon: FileText },
  { name: "Payments", href: "/tenant/payments", icon: CreditCard },
  { name: "Documents", href: "/tenant/documents", icon: FolderOpen },
  { name: "Complaints", href: "/tenant/complaints", icon: MessageSquare },
  { name: "Notices", href: "/tenant/notices", icon: Bell },
]

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [tenant, setTenant] = useState<TenantPortalInfo | null>(null)

  const handleAuthCheck = useCallback(async (userId: string): Promise<boolean> => {
    const supabase = createClient()

    const { data: tenantData, error } = await supabase
      .from("tenants")
      .select(`
        id,
        name,
        phone,
        property:properties(name),
        room:rooms(room_number)
      `)
      .eq("user_id", userId)
      .eq("status", "active")
      .single()

    if (error || !tenantData) {
      return false
    }

    const rawData = tenantData as RawTenantPortalInfo
    setTenant({
      id: rawData.id,
      name: rawData.name,
      phone: rawData.phone,
      email: "",
      property: rawData.property && rawData.property.length > 0 ? rawData.property[0] : null,
      room: rawData.room && rawData.room.length > 0 ? rawData.room[0] : null,
    })
    return true
  }, [])

  const renderEntityInfo = useCallback(() => (
    <div className="p-3 bg-muted rounded-lg">
      <p className="font-medium truncate">{tenant?.name}</p>
      <p className="text-sm text-muted-foreground truncate">
        {tenant?.property?.name} • Room {tenant?.room?.room_number}
      </p>
    </div>
  ), [tenant])

  return (
    <PortalLayout
      portalType="tenant"
      brandGradient="from-teal-500 to-emerald-500"
      brandIconColor="text-primary"
      icon={Building2}
      portalName="Tenant Portal"
      navItems={navigation}
      entityInfoRenderer={renderEntityInfo}
      onAuthCheck={handleAuthCheck}
      logTag="TenantLayout"
    >
      {children}
    </PortalLayout>
  )
}
