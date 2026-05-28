"use client"

import { Card, CardContent } from "@/components/ui/card"
import {
  Bell,
  Megaphone,
  AlertTriangle,
  Wrench,
  CreditCard,
  Calendar,
  Clock,
  AlertCircle,
  type LucideIcon,
} from "lucide-react"
import { PageSkeleton } from "@/components/ui/loading"
import { formatDate, formatTimeAgo } from "@/lib/format"
import { useMemberPortalData } from "@/lib/hooks/useMemberPortalData"
import { useMemberNotices } from "@/lib/hooks/useMemberNotices"

const typeConfig: Record<string, { label: string; color: string; bgColor: string; icon: LucideIcon }> = {
  general: { label: "General", color: "text-info", bgColor: "bg-info/10", icon: Megaphone },
  maintenance: { label: "Maintenance", color: "text-warning", bgColor: "bg-warning/10", icon: Wrench },
  payment_reminder: { label: "Payment", color: "text-success", bgColor: "bg-success/10", icon: CreditCard },
  emergency: { label: "Emergency", color: "text-destructive", bgColor: "bg-destructive/10", icon: AlertTriangle },
}

export default function MemberNoticesPage() {
  const { member, loading: memberLoading } = useMemberPortalData()
  const { notices, loading } = useMemberNotices(member, memberLoading)

  const isNew = (dateString: string) => {
    const diffHours = (new Date().getTime() - new Date(dateString).getTime()) / (1000 * 60 * 60)
    return diffHours < 24
  }

  if (memberLoading || loading) {
    return <PageSkeleton variant="list" />
  }

  if (!member) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No Active Membership</h2>
        <p className="text-muted-foreground">You don&apos;t have an active library membership.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Notices</h1>
        <p className="text-muted-foreground">Announcements from {member.library?.name || "your library"}</p>
      </div>

      {/* Notices List */}
      {notices.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" aria-hidden="true" />
            <h3 className="text-lg font-medium mb-2">No notices</h3>
            <p className="text-muted-foreground text-center">
              There are no active notices from your library at the moment
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
                className={notice.type === "emergency" ? "border-destructive/20 bg-destructive/5" : ""}
              >
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-lg shrink-0 ${config.bgColor}`}>
                      <Icon className={`h-5 w-5 ${config.color}`} aria-hidden="true" />
                    </div>
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
                            <Clock className="h-3 w-3" aria-hidden="true" />
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
                          <Calendar className="h-3 w-3" aria-hidden="true" />
                          {formatTimeAgo(notice.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {notices.length > 0 && (
        <Card className="bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              Showing {notices.length} active notice{notices.length !== 1 ? "s" : ""} from {member.library?.name || "your library"}.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
