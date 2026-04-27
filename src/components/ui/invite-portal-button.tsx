"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Share2, Copy, Check, ExternalLink, Loader2 } from "lucide-react"
import { showError } from "@/lib/toast-helpers"
import { cn } from "@/lib/utils"

interface InvitePortalButtonProps {
  tenantId: string
  tenantName: string
  workspaceId: string
}

export function InvitePortalButton({ tenantId, tenantName, workspaceId }: InvitePortalButtonProps) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const getOrCreateInvite = async () => {
    if (!user) return

    setLoading(true)
    try {
      const supabase = createClient()

      // Look for an existing pending invitation for this tenant
      const { data: existing } = await supabase
        .from("invitations")
        .select("token, status, expires_at")
        .eq("entity_id", tenantId)
        .eq("context_type", "tenant")
        .order("created_at", { ascending: false })
        .limit(1)
        .single()

      let token: string

      if (existing?.status === "pending" && new Date(existing.expires_at) > new Date()) {
        token = existing.token
      } else {
        // Create a fresh invitation (7-day expiry)
        const { data: created, error } = await supabase
          .from("invitations")
          .insert({
            workspace_id: workspaceId,
            invited_by: user.id,
            context_type: "tenant",
            entity_id: tenantId,
            name: tenantName,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select("token")
          .single()

        if (error || !created) {
          showError("Failed to generate invite link")
          return
        }
        token = created.token
      }

      const baseUrl = window.location.origin
      setInviteUrl(`${baseUrl}/invite/${token}`)
    } catch {
      showError("Failed to generate invite link")
    } finally {
      setLoading(false)
    }
  }

  const copyLink = async () => {
    if (!inviteUrl) return
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (inviteUrl) {
    return (
      <div className="flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2 py-1">
        <span className="text-xs text-muted-foreground truncate max-w-[140px]" title={inviteUrl}>
          {inviteUrl.replace(/^https?:\/\//, "").substring(0, 30)}…
        </span>
        <button
          onClick={copyLink}
          className={cn(
            "flex-shrink-0 p-1 rounded transition-colors",
            copied ? "text-success" : "text-muted-foreground hover:text-foreground"
          )}
          title={copied ? "Copied!" : "Copy link"}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <a
          href={inviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-shrink-0 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Open invite page"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    )
  }

  return (
    <Button variant="outline" size="sm" onClick={getOrCreateInvite} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Share2 className="mr-2 h-4 w-4" />
      )}
      Invite to Portal
    </Button>
  )
}
