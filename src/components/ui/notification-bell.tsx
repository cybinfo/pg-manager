"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Bell, CheckCheck, Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useNotifications } from "@/lib/hooks/useNotifications"
import { useAuth } from "@/lib/auth"
import { formatTimeAgo } from "@/lib/format"
import { cn } from "@/lib/utils"
import { NOTIFICATION_TYPE_STYLES } from "@/lib/status"

function notificationStyle(type: string) {
  return NOTIFICATION_TYPE_STYLES[type] ?? NOTIFICATION_TYPE_STYLES.system
}

export function NotificationBell() {
  const { profile } = useAuth()
  const inAppEnabled = profile?.preferences?.notifications?.in_app ?? true
  const typePrefs = profile?.preferences?.notifications

  const { notifications: allNotifications, isLoading, markAsRead, markAllAsRead } = useNotifications()

  // Filter by user's type preferences
  const notifications = inAppEnabled
    ? allNotifications.filter((n) => {
        if (!typePrefs) return true
        if (n.type === "payment" || n.type === "bill") return typePrefs.payment_reminders ?? true
        if (n.type === "complaint") return typePrefs.complaint_updates ?? true
        if (n.type === "approval") return typePrefs.approval_updates ?? true
        if (n.type === "notice") return typePrefs.notice_updates ?? true
        if (n.type === "system") return typePrefs.system_alerts ?? true
        return true
      })
    : []

  const unreadCount = notifications.filter((n) => !n.read).length
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", handle)
    return () => document.removeEventListener("mousedown", handle)
  }, [open])

  // Close on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) document.addEventListener("keydown", handle)
    return () => document.removeEventListener("keydown", handle)
  }, [open])

  return (
    <div ref={ref} className="relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="relative hover:bg-muted"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground flex items-center justify-center leading-none tabular-nums">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </Button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 mt-2 w-80 sm:w-96 bg-card border rounded-xl shadow-xl z-[var(--z-dropdown)] animate-in slide-in-from-top-2 duration-200 overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1.5"
                onClick={() => markAllAsRead()}
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </Button>
            )}
          </div>

          {/* Notification list */}
          <div className="max-h-[420px] overflow-y-auto custom-scrollbar">
            {isLoading ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12 px-4 text-center">
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <Inbox className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium">All caught up</p>
                  <p className="text-xs text-muted-foreground mt-1">No notifications yet</p>
                </div>
              </div>
            ) : (
              <ul>
                {notifications.map((n) => {
                  const content = (
                    <div
                      className={cn(
                        "flex gap-3 px-4 py-3 transition-colors",
                        !n.read && "bg-primary/5 hover:bg-primary/8",
                        n.read && "hover:bg-muted/50"
                      )}
                      onClick={() => {
                        if (!n.read) markAsRead(n.id)
                        if (n.action_url) setOpen(false)
                      }}
                    >
                      {/* Type dot */}
                      <div className={cn("mt-1 h-2 w-2 rounded-full shrink-0", !n.read ? "bg-primary" : "bg-transparent")} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn("text-sm leading-snug", !n.read && "font-medium")}>{n.title}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap tabular-nums shrink-0">
                            {formatTimeAgo(n.created_at)}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        {n.type && (
                          <span className={cn("mt-1.5 inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full capitalize", notificationStyle(n.type))}>
                            {n.type}
                          </span>
                        )}
                      </div>
                    </div>
                  )

                  return (
                    <li key={n.id} className="border-b last:border-0">
                      {n.action_url ? (
                        <Link href={n.action_url}>{content}</Link>
                      ) : (
                        <button className="w-full text-left">{content}</button>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t px-4 py-2 bg-muted/20">
              <p className="text-[11px] text-muted-foreground text-center">
                Showing last {notifications.length} notification{notifications.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
