"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Invitation, CONTEXT_TYPE_CONFIG } from '@/lib/auth/types'
import { Clock, Copy, Loader2, RefreshCw, Trash2 } from 'lucide-react'
import { showSuccess, showError } from '@/lib/toast-helpers'
import { cn } from '@/lib/utils'

// ============================================
// Invitation List Component
// Shows pending invitations for a workspace
// ============================================

interface InvitationListProps {
  workspaceId: string
  onInvitationChange?: () => void
}

export function InvitationList({ workspaceId, onInvitationChange }: InvitationListProps) {
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const fetchInvitations = async () => {
    setIsLoading(true)
    const { data, error } = await supabase
      .from('invitations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invitations:', error)
    } else {
      setInvitations(data || [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchInvitations()
  }, [workspaceId])

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/invite/${token}`
    navigator.clipboard.writeText(link)
    showSuccess('Invitation link copied!')
  }

  const revokeInvitation = async (id: string) => {
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('id', id)

    if (error) {
      showError('Failed to revoke invitation')
    } else {
      showSuccess('Invitation revoked')
      fetchInvitations()
      onInvitationChange?.()
    }
  }

  const resendInvitation = async (invitation: Invitation) => {
    // In a real app, this would trigger an email/SMS
    showSuccess('Invitation reminder sent!')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No pending invitations
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {invitations.map((inv) => {
        const config = CONTEXT_TYPE_CONFIG[inv.context_type]
        const isExpired = new Date(inv.expires_at) < new Date()

        return (
          <div
            key={inv.id}
            className={cn(
              "p-4 rounded-lg border",
              isExpired && "opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{inv.name || 'Unnamed'}</span>
                  <span className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    config.color
                  )}>
                    {config.label}
                  </span>
                </div>

                <div className="text-sm text-muted-foreground mt-1">
                  {inv.email && <span className="mr-3">{inv.email}</span>}
                  {inv.phone && <span>{inv.phone}</span>}
                </div>

                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Clock className="h-3 w-3" />
                  {isExpired ? (
                    <span className="text-rose-600">Expired</span>
                  ) : (
                    <span>
                      Expires {new Date(inv.expires_at).toLocaleDateString('en-IN')}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyInviteLink(inv.token)}
                  title="Copy invitation link"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => resendInvitation(inv)}
                  title="Resend invitation"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => revokeInvitation(inv.id)}
                  title="Revoke invitation"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
