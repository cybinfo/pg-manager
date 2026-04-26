"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Invitation, CONTEXT_TYPE_CONFIG } from '@/lib/auth/types'
import { Clock, Check, X, Loader2 } from 'lucide-react'
import { showSuccess, showError } from '@/lib/toast-helpers'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'

// ============================================
// Accept Invitation Component
// Page for accepting an invitation
// ============================================

interface AcceptInvitationProps {
  token: string
}

export function AcceptInvitation({ token }: AcceptInvitationProps) {
  const router = useRouter()
  const [invitation, setInvitation] = useState<Invitation | null>(null)
  const [workspaceName, setWorkspaceName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)
  const [isAccepting, setIsAccepting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const fetchInvitation = async () => {
      const { data, error } = await supabase
        .from('invitations')
        .select(`
          *,
          workspace:workspaces(name)
        `)
        .eq('token', token)
        .single()

      if (error || !data) {
        setError('Invalid or expired invitation')
      } else if (data.status !== 'pending') {
        setError('This invitation has already been used or revoked')
      } else if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired')
      } else {
        setInvitation(data as Invitation)
        const ws = data.workspace as { name: string }[] | { name: string }
        setWorkspaceName(Array.isArray(ws) ? ws[0]?.name : ws?.name || 'Unknown')
      }
      setIsLoading(false)
    }

    fetchInvitation()
  }, [token, supabase])

  const handleAccept = async () => {
    setIsAccepting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Redirect to register with invitation token
        router.push(`/register?invite=${token}`)
        return
      }

      // Accept the invitation
      const { error } = await (supabase.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: Error | null }>)('accept_invitation', {
        p_token: token,
        p_user_id: user.id,
      })

      if (error) throw error

      showSuccess('Invitation accepted!')

      // Redirect based on context type
      if (invitation?.context_type === 'tenant') {
        router.push('/tenant')
      } else {
        router.push('/dashboard')
      }
    } catch (error: unknown) {
      console.error('Error accepting invitation:', error)
      showError((error as Error).message || 'Failed to accept invitation')
    } finally {
      setIsAccepting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <Card className="max-w-md mx-auto">
        <CardContent className="pt-6">
          <div className="text-center">
            <div className="p-3 rounded-full bg-destructive/10 text-destructive w-fit mx-auto mb-4">
              <X className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">Invalid Invitation</h3>
            <p className="text-sm text-muted-foreground mt-1">{error}</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/login')}
            >
              Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!invitation) return null

  const config = CONTEXT_TYPE_CONFIG[invitation.context_type]

  return (
    <Card className="max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className={cn(
          "p-3 rounded-full w-fit mx-auto mb-2",
          config.color
        )}>
          <span className="text-2xl">{config.icon}</span>
        </div>
        <CardTitle>You&apos;re Invited!</CardTitle>
        <CardDescription>
          You&apos;ve been invited to join <strong>{workspaceName}</strong> as a {config.label.toLowerCase()}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {invitation.message && (
          <div className="p-3 bg-muted rounded-lg text-sm">
            <p className="text-muted-foreground italic">&quot;{invitation.message}&quot;</p>
          </div>
        )}

        <div className="text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span>
              Expires {formatDate(invitation.expires_at)}
            </span>
          </div>
        </div>

        <Button
          className="w-full"
          size="lg"
          onClick={handleAccept}
          disabled={isAccepting}
        >
          {isAccepting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Accepting...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Accept Invitation
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
