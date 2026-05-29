"use client"

import * as React from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth, useCurrentContext } from "@/lib/auth"
import { saveUserPreferences } from "@/lib/services/user-preferences"
import { brandGradient } from "@/lib/design-tokens"
import { cn } from "@/lib/utils"
import { showSuccess, showError } from "@/lib/toast-helpers"
import {
  Bell,
  MessageCircle,
  Mail,
  Settings,
  LogOut,
  ChevronDown,
  CreditCard,
  MessageSquare,
  ClipboardCheck,
  Megaphone,
  Wrench,
  CheckCheck,
} from "lucide-react"

interface NotificationPrefs {
  in_app: boolean
  email: boolean
  whatsapp: boolean
  payment_reminders: boolean
  complaint_updates: boolean
  approval_updates: boolean
  notice_updates: boolean
  system_alerts: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  in_app: true,
  email: true,
  whatsapp: false,
  payment_reminders: true,
  complaint_updates: true,
  approval_updates: true,
  notice_updates: true,
  system_alerts: true,
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      onClick={onChange}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cn(
        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        checked ? "bg-primary" : "bg-muted"
      )}
    >
      <span
        className={cn(
          "inline-block h-3 w-3 transform rounded-full bg-white transition-transform",
          checked ? "translate-x-5" : "translate-x-1"
        )}
      />
    </button>
  )
}

export function UserMenu({ displayName, displayEmail, onLogout }: {
  displayName: string
  displayEmail: string | undefined
  onLogout: () => void
}) {
  const { profile } = useAuth()
  const { isOwner, context } = useCurrentContext()
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [prefs, setPrefs] = React.useState<NotificationPrefs>(DEFAULT_PREFS)
  const ref = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (profile?.preferences?.notifications) {
      const n = profile.preferences.notifications
      setPrefs({
        in_app: n.in_app ?? true,
        email: n.email ?? true,
        whatsapp: n.whatsapp ?? false,
        payment_reminders: n.payment_reminders ?? true,
        complaint_updates: n.complaint_updates ?? true,
        approval_updates: n.approval_updates ?? true,
        notice_updates: n.notice_updates ?? true,
        system_alerts: n.system_alerts ?? true,
      })
    }
  }, [profile])

  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false)
    }
    if (open) {
      document.addEventListener("mousedown", onClickOutside)
      document.addEventListener("keydown", onKeyDown)
    }
    return () => {
      document.removeEventListener("mousedown", onClickOutside)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])

  const toggle = (key: keyof NotificationPrefs) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const savePrefs = async () => {
    if (!profile?.user_id) return
    setSaving(true)
    try {
      const supabase = createClient()
      const currentPrefs = (profile.preferences as unknown as Record<string, unknown>) || {}
      await saveUserPreferences(supabase, profile.user_id, {
        ...currentPrefs,
        notifications: {
          ...((currentPrefs.notifications as Record<string, unknown>) || {}),
          ...prefs,
        },
      })
      showSuccess("Notification preferences saved")
      setOpen(false)
    } catch {
      showError("Failed to save preferences")
    } finally {
      setSaving(false)
    }
  }

  const contextLabel = context?.context_type === "owner"
    ? "Owner"
    : context?.context_type === "staff"
    ? "Staff"
    : context?.context_type === "tenant"
    ? "Tenant"
    : null

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(prev => !prev)}
        className={cn(
          "flex items-center gap-1 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        )}
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <div className={`h-9 w-9 rounded-full ${brandGradient.solid} flex items-center justify-center text-white text-sm font-medium shadow-md ${brandGradient.shadow}`}>
          {displayName[0]?.toUpperCase() || "?"}
        </div>
        <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-80 rounded-xl border bg-popover shadow-xl z-[var(--z-dropdown)] animate-in slide-in-from-top-2 duration-200"
          role="dialog"
          aria-label="User preferences"
        >
          {/* Profile header */}
          <div className="flex items-center gap-3 p-4 border-b">
            <div className={`h-10 w-10 rounded-full ${brandGradient.solid} flex items-center justify-center text-white text-sm font-semibold shadow-sm flex-shrink-0`}>
              {displayName[0]?.toUpperCase() || "?"}
            </div>
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{displayName}</p>
              <p className="text-xs text-muted-foreground truncate">{displayEmail}</p>
              {contextLabel && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary mt-0.5">
                  {contextLabel}
                </span>
              )}
            </div>
          </div>

          {/* Notification preferences */}
          <div className="p-4 border-b">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Notification Channels
            </p>
            <div className="space-y-2.5">
              {[
                { key: "in_app" as const, icon: Bell, label: "In-app bell" },
                { key: "email" as const, icon: Mail, label: "Email" },
                { key: "whatsapp" as const, icon: MessageCircle, label: "WhatsApp" },
              ].map(({ key, icon: Icon, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{label}</span>
                  </div>
                  <Toggle checked={prefs[key]} onChange={() => toggle(key)} label={`Toggle ${label}`} />
                </div>
              ))}
            </div>

            {prefs.in_app && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 mt-4">
                  In-App Types
                </p>
                <div className="space-y-2.5">
                  {[
                    { key: "payment_reminders" as const, icon: CreditCard, label: "Payments" },
                    { key: "complaint_updates" as const, icon: MessageSquare, label: "Complaints" },
                    { key: "approval_updates" as const, icon: ClipboardCheck, label: "Approvals" },
                    { key: "notice_updates" as const, icon: Megaphone, label: "Announcements" },
                    { key: "system_alerts" as const, icon: Wrench, label: "System" },
                  ].map(({ key, icon: Icon, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{label}</span>
                      </div>
                      <Toggle checked={prefs[key]} onChange={() => toggle(key)} label={`Toggle ${label} notifications`} />
                    </div>
                  ))}
                </div>
              </>
            )}

            <button
              onClick={savePrefs}
              disabled={saving}
              className="mt-4 w-full flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 transition-colors"
            >
              <CheckCheck className="h-4 w-4" />
              {saving ? "Saving…" : "Save preferences"}
            </button>
          </div>

          {/* Footer links */}
          <div className="p-2">
            {isOwner && (
              <Link
                href="/settings"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors"
              >
                <Settings className="h-4 w-4 text-muted-foreground" />
                Settings
              </Link>
            )}
            <button
              onClick={() => { setOpen(false); onLogout() }}
              className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
