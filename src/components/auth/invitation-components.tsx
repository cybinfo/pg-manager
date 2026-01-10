"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Invitation, Role, CONTEXT_TYPE_CONFIG } from '@/lib/auth/types'
import {
  Mail, Phone, Send, Copy, Clock, Check, X, Loader2,
  UserPlus, RefreshCw, Trash2, ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

// ============================================
// Invitation Form Component
// For owners to invite staff/tenants
// ============================================

interface InvitationFormProps {
  workspaceId: string
  contextType: 'staff' | 'tenant'
  entityId?: string // staff_members.id or tenants.id
  roles?: Role[] // Available roles for staff
  defaultRoleId?: string
  onSuccess?: (invitation: Invitation) => void
  onCancel?: () => void
}

export function InvitationForm({
  workspaceId,
  contextType,
  entityId,
  roles = [],
  defaultRoleId,
  onSuccess,
  onCancel,
}: InvitationFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role_id: defaultRoleId || '',
    message: '',
  })

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.email && !formData.phone) {
      toast.error('Please provide email or phone number')
      return
    }

    setIsLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Check if user already exists
      const { data: existingUser } = await (supabase.rpc as Function)('find_user_by_identity', {
        p_email: formData.email || null,
        p_phone: formData.phone || null,
      })

      if (existingUser && existingUser.length > 0) {
        // User exists - create context directly
        const { data: context, error: contextError } = await supabase
          .from('user_contexts')
          .insert({
            user_id: existingUser[0].user_id,
            workspace_id: workspaceId,
            context_type: contextType,
            role_id: contextType === 'staff' ? formData.role_id || null : null,
            entity_id: entityId || null,
            is_active: true,
            invited_by: user.id,
            invited_at: new Date().toISOString(),
            accepted_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (contextError) throw contextError

        // Link user_id to entity
        if (entityId) {
          const table = contextType === 'staff' ? 'staff_members' : 'tenants'
          await supabase
            .from(table)
            .update({ user_id: existingUser[0].user_id })
            .eq('id', entityId)
        }

        toast.success(`${formData.name || 'User'} has been added and can now access the system`)
        onSuccess?.(context as unknown as Invitation)
      } else {
        // Create invitation
        const { data: invitation, error: inviteError } = await supabase
          .from('invitations')
          .insert({
            workspace_id: workspaceId,
            invited_by: user.id,
            name: formData.name || null,
            email: formData.email || null,
            phone: formData.phone || null,
            context_type: contextType,
            role_id: contextType === 'staff' ? formData.role_id || null : null,
            entity_id: entityId || null,
            message: formData.message || null,
          })
          .select()
          .single()

        if (inviteError) throw inviteError

        toast.success('Invitation created successfully')
        onSuccess?.(invitation as Invitation)
      }
    } catch (error: any) {
      console.error('Error creating invitation:', error)
      toast.error(error.message || 'Failed to create invitation')
    } finally {
      setIsLoading(false)
    }
  }

  const config = CONTEXT_TYPE_CONFIG[contextType]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Invite {config.label}
        </CardTitle>
        <CardDescription>
          Send an invitation to join your PG as {contextType === 'staff' ? 'a staff member' : 'a tenant'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="Enter name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  className="pl-10"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="9876543210"
                  className="pl-10"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  disabled={isLoading}
                />
              </div>
            </div>
          </div>

          {contextType === 'staff' && roles.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={formData.role_id}
                onChange={(e) => setFormData(prev => ({ ...prev, role_id: e.target.value }))}
                className="w-full h-10 px-3 rounded-md border border-input bg-background"
                disabled={isLoading}
              >
                <option value="">Select a role</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="message">Personal Message (optional)</Label>
            <textarea
              id="message"
              placeholder="Add a personal message to the invitation..."
              className="w-full min-h-[80px] px-3 py-2 rounded-md border border-input bg-background text-sm"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

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
    toast.success('Invitation link copied!')
  }

  const revokeInvitation = async (id: string) => {
    const { error } = await supabase
      .from('invitations')
      .update({ status: 'revoked' })
      .eq('id', id)

    if (error) {
      toast.error('Failed to revoke invitation')
    } else {
      toast.success('Invitation revoked')
      fetchInvitations()
      onInvitationChange?.()
    }
  }

  const resendInvitation = async (invitation: Invitation) => {
    // In a real app, this would trigger an email/SMS
    toast.success('Invitation reminder sent!')
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
      const { data: contextId, error } = await (supabase.rpc as Function)('accept_invitation', {
        p_token: token,
        p_user_id: user.id,
      })

      if (error) throw error

      toast.success('Invitation accepted!')

      // Redirect based on context type
      if (invitation?.context_type === 'tenant') {
        router.push('/tenant')
      } else {
        router.push('/dashboard')
      }
    } catch (error: any) {
      console.error('Error accepting invitation:', error)
      toast.error(error.message || 'Failed to accept invitation')
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
            <div className="p-3 rounded-full bg-rose-100 text-rose-600 w-fit mx-auto mb-4">
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
              Expires {new Date(invitation.expires_at).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
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
