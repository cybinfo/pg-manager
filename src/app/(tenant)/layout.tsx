"use client"

import { useState, useCallback } from "react"
import { Building2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PortalLayout } from "@/components/portal"
import { TENANT_NAVIGATION } from "@/lib/navigation/config"
import { TenantPortalInfo, RawTenantPortalInfo } from "@/types/tenants.types"
import { brandGradient } from "@/lib/design-tokens"

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
      brandGradient={brandGradient.values}
      brandIconColor="text-primary"
      icon={Building2}
      portalName="Tenant Portal"
      navItems={TENANT_NAVIGATION}
      entityInfoRenderer={renderEntityInfo}
      onAuthCheck={handleAuthCheck}
      logTag="TenantLayout"
    >
      {children}
    </PortalLayout>
  )
}
