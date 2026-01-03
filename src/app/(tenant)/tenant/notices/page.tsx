"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Bell,
  Megaphone,
  AlertTriangle,
  Wrench,
  CreditCard,
  Calendar,
  Clock
} from "lucide-react"
import { PageLoader } from "@/components/ui/page-loader"
import { formatDate, formatTimeAgo } from "@/lib/format"

interface Notice {
  id: string
  title: string
  content: string
  type: string
  created_at: string
  expires_at: string | null
  property: {
    name: string
  } | null
}

interface RawNotice {
  id: string
  title: string
  content: string
  type: string
  created_at: string
  expires_at: string | null
  target_audience: string
  target_rooms: string[] | null
  property: {
    name: string
  }[] | null
}

const typeConfig: Record<string, { label: string; color: string; bgColor: string; icon: any }> = {
  general: { label: "General", color: "text-blue-700", bgColor: "bg-blue-100", icon: Megaphone },
  maintenance: { label: "Maintenance", color: "text-orange-700", bgColor: "bg-orange-100", icon: Wrench },
  payment_reminder: { label: "Payment", color: "text-green-700", bgColor: "bg-green-100", icon: CreditCard },
  emergency: { label: "Emergency", color: "text-red-700", bgColor: "bg-red-100", icon: AlertTriangle },
}

export default function TenantNoticesPage() {
  const [loading, setLoading] = useState(true)
  const [notices, setNotices] = useState<Notice[]>([])

  useEffect(() => {
    const fetchNotices = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) return

      // Get tenant's property
      const { data: tenant } = await supabase
        .from("tenants")
        .select("property_id, room_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (!tenant) {
        setLoading(false)
        return
      }

      // Fetch active notices for tenant's property
      const now = new Date().toISOString()
      const { data: noticesData } = await supabase
        .from("notices")
        .select(`
          id,
          title,
          content,
          type,
          created_at,
          expires_at,
          target_audience,
          target_rooms,
          property:properties(name)
        `)
        .eq("is_active", true)
        .or(`property_id.is.null,property_id.eq.${tenant.property_id}`)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false })

      // Filter notices based on target audience
      const filteredNotices = ((noticesData as RawNotice[]) || []).filter((notice) => {
        if (notice.target_audience === "all") return true
        if (notice.target_audience === "tenants_only") return true
        if (notice.target_audience === "specific_rooms") {
          return notice.target_rooms?.includes(tenant.room_id)
        }
        return true
      })

      // Transform the data from arrays to single objects
      const transformedNotices: Notice[] = filteredNotices.map((notice) => ({
        id: notice.id,
        title: notice.title,
        content: notice.content,
        type: notice.type,
        created_at: notice.created_at,
        expires_at: notice.expires_at,
        property: notice.property && notice.property.length > 0 ? notice.property[0] : null,
      }))
      setNotices(transformedNotices)
      setLoading(false)
    }

    fetchNotices()
  }, [])


  const isNew = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    return diffHours < 24
  }

  if (loading) {
    return <PageLoader />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Notices</h1>
        <p className="text-muted-foreground">Announcements from your PG administrator</p>
      </div>

      {/* Notices List */}
      {notices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No notices</h3>
            <p className="text-muted-foreground text-center">
              There are no active notices at the moment
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notices.map((notice) => {
            const config = typeConfig[notice.type] || typeConfig.general
            const Icon = config.icon

            return (
              <Card
                key={notice.id}
                className={notice.type === "emergency" ? "border-red-200 bg-red-50/50" : ""}
              >
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`p-3 rounded-lg shrink-0 ${config.bgColor}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.color}`}>
                          {config.label}
                        </span>
                        {isNew(notice.created_at) && (
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-primary text-primary-foreground">
                            New
                          </span>
                        )}
                        {notice.expires_at && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Expires {formatDate(notice.expires_at)}
                          </span>
                        )}
                      </div>

                      <h3 className="font-semibold text-lg mb-2">{notice.title}</h3>

                      <div className="prose prose-sm max-w-none text-muted-foreground">
                        <p className="whitespace-pre-wrap">{notice.content}</p>
                      </div>

                      <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatTimeAgo(notice.created_at)}
                        </span>
                        {notice.property && (
                          <span>{notice.property.name}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Info Card */}
      {notices.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Showing {notices.length} active notice{notices.length !== 1 ? "s" : ""}.
              Notices are posted by your PG administrator.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
