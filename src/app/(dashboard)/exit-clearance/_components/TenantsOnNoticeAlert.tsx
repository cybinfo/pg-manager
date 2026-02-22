/**
 * TenantsOnNoticeAlert
 *
 * Extracted from exit-clearance/page.tsx.
 * Shows a dismissible card listing tenants currently on notice period
 * with quick links to initiate their clearance process.
 */

"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AlertCircle, User, ArrowRight } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { transformJoin } from "@/lib/supabase/transforms"

// ============================================
// Types
// ============================================

interface TenantOnNotice {
  id: string
  name: string
  phone: string
  property: { id: string; name: string }
  room: { room_number: string }
}

// ============================================
// Component
// ============================================

export function TenantsOnNoticeAlert() {
  const [tenantsOnNotice, setTenantsOnNotice] = useState<TenantOnNotice[]>([])

  useEffect(() => {
    const fetchTenantsOnNotice = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from("tenants")
        .select(`id, name, phone, property:properties(id, name), room:rooms(room_number)`)
        .eq("status", "notice_period")
        .order("name")

      if (data) {
        const transformed = data
          .filter((t: Record<string, unknown>) => t.property && t.room)
          .map((t: Record<string, unknown>) => ({
            id: t.id as string,
            name: t.name as string,
            phone: t.phone as string,
            property: transformJoin(t.property),
            room: transformJoin(t.room),
          })) as TenantOnNotice[]
        setTenantsOnNotice(transformed)
      }
    }
    fetchTenantsOnNotice()
  }, [])

  if (tenantsOnNotice.length === 0) return null

  return (
    <Card className="border-warning/20 bg-warning/10 mb-6">
      <CardContent className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2 text-warning">
          <AlertCircle className="h-4 w-4" />
          Tenants on Notice Period ({tenantsOnNotice.length})
        </h3>
        <div className="space-y-2">
          {tenantsOnNotice.slice(0, 3).map((tenant) => (
            <div
              key={tenant.id}
              className="flex items-center justify-between p-3 bg-card rounded-lg border border-warning/20"
            >
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="font-medium">{tenant.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {tenant.property?.name || "\u2014"} • Room {tenant.room?.room_number || "\u2014"}
                  </p>
                </div>
              </div>
              <Link href={`/exit-clearance/new?tenant=${tenant.id}`}>
                <Button size="sm" variant="outline">
                  Start Clearance
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
          {tenantsOnNotice.length > 3 && (
            <p className="text-sm text-muted-foreground text-center pt-2">
              +{tenantsOnNotice.length - 3} more tenants on notice
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
