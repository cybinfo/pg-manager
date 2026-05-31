"use client"

import { useState } from "react"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { useAuth, useCurrentContext } from "@/lib/auth"
import { DetailHero, EmptyState } from "@/components/ui"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { FormField } from "@/components/ui/form-components"
import { Badge } from "@/components/ui/badge"
import { Avatar } from "@/components/ui/avatar"
import { showSuccess, showError } from "@/lib/toast-helpers"
import { useConfirmDialog } from "@/lib/hooks/useConfirmDialog"
import { Textarea } from "@/components/ui/textarea"
import { useAdminsData, type AdminRow } from "@/lib/hooks/useAdminsData"
import { grantPlatformAdmin } from "@/lib/services/admin.service"
import { formatDate } from "@/lib/format"
import { brandGradient } from "@/lib/design-tokens"
import { logger } from "@/lib/logger"
import { getNowISO } from "@/lib/date-helpers"
import {
  Shield,
  AlertTriangle,
  Loader2,
  UserPlus,
  Trash2,
  Search,
} from "lucide-react"

interface FoundUser {
  user_id: string
  name: string
  email: string | null
}

export default function PlatformAdminsPage() {
  const { user } = useAuth()
  const { isPlatformAdmin } = useCurrentContext()
  const { confirm, ConfirmDialogElement } = useConfirmDialog()

  const { admins, loading: loadingAdmins, refetch: refetchAdmins } = useAdminsData()

  // Add admin form state
  const [searchEmail, setSearchEmail] = useState("")
  const [searching, setSearching] = useState(false)
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null)
  const [notes, setNotes] = useState("")
  const [granting, setGranting] = useState(false)

  // Revoke state — track which user_id is being revoked
  const [revokingId, setRevokingId] = useState<string | null>(null)

  // ─── Search user by email ──────────────────────────────────────────
  const handleSearch = async () => {
    const email = searchEmail.trim().toLowerCase()
    if (!email) {
      showError("Please enter an email address to search")
      return
    }

    setSearching(true)
    setFoundUser(null)

    const supabase = createClient()
    const { data, error } = await supabase
      .from("user_profiles")
      .select("user_id, name, email")
      .eq("email", email)
      .maybeSingle()

    setSearching(false)

    if (error) {
      showError("Error searching for user")
      return
    }

    if (!data) {
      showError("No user found with that email address")
      return
    }

    setFoundUser({ user_id: data.user_id, name: data.name, email: data.email })
  }

  // ─── Grant admin access ────────────────────────────────────────────
  const handleGrant = async () => {
    if (!foundUser || !user) return

    setGranting(true)
    try {
      await grantPlatformAdmin(
        createClient(),
        foundUser.user_id,
        user.id,
        foundUser.email,
        foundUser.name,
        notes.trim() || null
      )
      showSuccess(`${foundUser.name} has been granted platform admin access`)
      setSearchEmail("")
      setFoundUser(null)
      setNotes("")
      await refetchAdmins()
    } catch (err) {
      showError(String(err instanceof Error ? err.message : err))
    } finally {
      setGranting(false)
    }
  }

  // ─── Revoke admin access ───────────────────────────────────────────
  const handleRevoke = (admin: AdminRow) => {
    const name = admin.profile?.name ?? "This user"

    confirm({
      title: "Remove Platform Admin",
      description: `Remove ${name} as platform admin? They will immediately lose all admin access.`,
      confirmText: "Remove",
      destructive: true,
      onConfirm: async () => {
        setRevokingId(admin.user_id)
        const supabase = createClient()

        const { error } = await supabase
          .from("platform_admins")
          .delete()
          .eq("user_id", admin.user_id)

        setRevokingId(null)

        if (error) {
          showError("Failed to revoke admin access", error.message)
          return
        }

        // Audit log: platform_admin.revoked (non-blocking — do not gate success on this)
        if (user) {
          supabase.from("audit_events").insert({
            entity_type: "platform_admin",
            entity_id: admin.user_id,
            action: "delete",
            actor_id: user.id,
            actor_type: "owner",
            workspace_id: null,
            changes: {
              before: {
                user_id: admin.user_id,
                notes: admin.notes,
              },
            },
            metadata: {
              event: "platform_admin.revoked",
              revoked_name: name,
              revoked_email: admin.profile?.email ?? null,
            },
            created_at: getNowISO(),
          }).then(({ error: auditError }: { error: { message: string } | null }) => {
            if (auditError) {
              // Audit failure is non-fatal — revoke already succeeded
              logger.warn("Failed to log platform_admin.revoked audit event", { error: String(auditError) })
            }
          })
        }

        showSuccess(`${name} has been removed as platform admin`)
        await refetchAdmins()
      },
    })
  }

  // ─── Access denied ─────────────────────────────────────────────────
  if (!isPlatformAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">
          You do not have platform administrator privileges.
        </p>
        <Link href="/dashboard">
          <Button>Back to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {ConfirmDialogElement}

      <DetailHero
        title="Platform Admins"
        subtitle="Manage who has platform-level administrator access"
        icon={Shield}
        backHref="/admin"
        backLabel="Back to Admin"
        breadcrumbs={[
          { label: "Admin", href: "/admin" },
          { label: "Platform Admins" },
        ]}
      />

      {/* ── Admin list ─────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            Current Platform Admins
          </CardTitle>
          <CardDescription>
            These users have unrestricted access to all workspaces and data
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingAdmins ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : admins.length === 0 ? (
            <EmptyState icon={Shield} title="No platform admins" description="No platform administrators have been added" />
          ) : (
            <div className="divide-y">
              {admins.map((admin) => {
                const name = admin.profile?.name ?? "Unknown User"
                const email = admin.profile?.email ?? null
                const isCurrentUser = admin.user_id === user?.id

                return (
                  <div
                    key={admin.user_id}
                    className="flex items-center justify-between py-4 gap-4"
                  >
                    {/* Avatar + identity */}
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar name={name} size="md" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium truncate">{name}</span>
                          {isCurrentUser && (
                            <Badge
                              variant="secondary"
                              className={`text-xs ${brandGradient.solid} text-white border-0`}
                            >
                              You
                            </Badge>
                          )}
                        </div>
                        {email && (
                          <div className="text-sm text-muted-foreground truncate">{email}</div>
                        )}
                        {admin.notes && (
                          <div className="text-xs text-muted-foreground mt-0.5 truncate">
                            {admin.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Added date + revoke */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-sm text-muted-foreground text-right hidden sm:block">
                        <div className="text-xs">Added on</div>
                        <div>{formatDate(admin.created_at)}</div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                        disabled={isCurrentUser || revokingId === admin.user_id}
                        title={
                          isCurrentUser
                            ? "Cannot revoke your own access"
                            : `Remove ${name} as platform admin`
                        }
                        onClick={() => handleRevoke(admin)}
                      >
                        {revokingId === admin.user_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                        <span className="hidden sm:inline">Revoke</span>
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Grant access section ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Grant Admin Access
          </CardTitle>
          <CardDescription>
            Search for an existing user by email and grant them platform admin privileges
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email search */}
          <div className="space-y-2">
            <Label htmlFor="search-email">Search by Email</Label>
            <div className="flex gap-2">
              <Input
                id="search-email"
                type="email"
                placeholder="user@example.com"
                value={searchEmail}
                onChange={(e) => {
                  setSearchEmail(e.target.value)
                  setFoundUser(null)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleSearch()
                  }
                }}
                disabled={searching || granting}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleSearch}
                disabled={searching || granting || !searchEmail.trim()}
              >
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
                <span className="ml-1.5">Search</span>
              </Button>
            </div>
          </div>

          {/* Found user preview */}
          {foundUser && (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
              <Avatar name={foundUser.name} size="sm" />
              <div className="min-w-0">
                <div className="font-medium">{foundUser.name}</div>
                {foundUser.email && (
                  <div className="text-sm text-muted-foreground">{foundUser.email}</div>
                )}
              </div>
              <Badge variant="outline" className="ml-auto shrink-0">
                Found
              </Badge>
            </div>
          )}

          {/* Notes */}
          <FormField label="Notes (optional)" htmlFor="admin-notes">
            <Textarea
              id="admin-notes"
              className="min-h-[80px] resize-none"
              placeholder="Reason for granting access, role, etc."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={granting}
            />
          </FormField>

          {/* Grant button */}
          <div className="flex justify-end">
            <Button
              type="button"
              onClick={handleGrant}
              disabled={!foundUser || granting}
              className={`gap-2 ${brandGradient.button} text-white border-0`}
            >
              {granting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Shield className="h-4 w-4" />
              )}
              Grant Admin Access
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
