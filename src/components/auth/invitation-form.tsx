"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Invitation, Role, CONTEXT_TYPE_CONFIG } from '@/lib/auth/types'
import { withCreatedBy } from '@/lib/audit'
import { Mail, Phone, Send, Loader2, UserPlus } from 'lucide-react'
import { showSuccess, showError } from '@/lib/toast-helpers'

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
      showError('Please provide email or phone number')
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
          .insert(
            withCreatedBy({
              user_id: existingUser[0].user_id,
              workspace_id: workspaceId,
              context_type: contextType,
              role_id: contextType === 'staff' ? formData.role_id || null : null,
              entity_id: entityId || null,
              is_active: true,
              invited_by: user.id,
              invited_at: new Date().toISOString(),
              accepted_at: new Date().toISOString(),
            }, user.id)
          )
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

        showSuccess(`${formData.name || 'User'} has been added and can now access the system`)
        onSuccess?.(context as unknown as Invitation)
      } else {
        // Create invitation
        const { data: invitation, error: inviteError } = await supabase
          .from('invitations')
          .insert(
            withCreatedBy({
              workspace_id: workspaceId,
              invited_by: user.id,
              name: formData.name || null,
              email: formData.email || null,
              phone: formData.phone || null,
              context_type: contextType,
              role_id: contextType === 'staff' ? formData.role_id || null : null,
              entity_id: entityId || null,
              message: formData.message || null,
            }, user.id)
          )
          .select()
          .single()

        if (inviteError) throw inviteError

        showSuccess('Invitation created successfully')
        onSuccess?.(invitation as Invitation)
      }
    } catch (error: any) {
      console.error('Error creating invitation:', error)
      showError(error.message || 'Failed to create invitation')
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
