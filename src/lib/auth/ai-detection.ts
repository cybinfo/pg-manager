import { createClient } from '@/lib/supabase/client'
import { IdentityConflict } from './types'

// ============================================
// AI Detection Utilities
// Smart identity detection and anomaly checking
// ============================================

/**
 * Detect potential identity conflicts when adding new staff/tenant
 * Checks for existing users with same email/phone
 */
export async function detectIdentityConflicts(
  email?: string,
  phone?: string
): Promise<IdentityConflict[]> {
  if (!email && !phone) return []

  const supabase = createClient()

  const { data, error } = await supabase.rpc('detect_identity_conflicts', {
    p_email: email || null,
    p_phone: phone || null,
  })

  if (error) {
    console.error('Error detecting conflicts:', error)
    return []
  }

  return (data || []) as IdentityConflict[]
}

/**
 * Check if a user already exists with given email or phone
 */
export async function findExistingUser(email?: string, phone?: string) {
  if (!email && !phone) return null

  const supabase = createClient()

  const { data, error } = await supabase.rpc('find_user_by_identity', {
    p_email: email || null,
    p_phone: phone || null,
  })

  if (error || !data || data.length === 0) {
    return null
  }

  return data[0] as {
    user_id: string
    name: string
    email: string | null
    phone: string | null
    has_contexts: boolean
  }
}

/**
 * Anomaly detection types
 */
export type AnomalyType =
  | 'duplicate_role_same_workspace' // Same person has multiple contexts of same type in one workspace
  | 'staff_and_tenant_same_workspace' // Person is both staff and tenant at same property
  | 'rapid_context_switching' // Unusual frequency of context switches
  | 'inactive_account_access' // Attempt to access inactive context
  | 'unusual_login_location' // Login from unusual IP/location
  | 'permission_escalation' // Attempt to access resources beyond permission

export interface Anomaly {
  type: AnomalyType
  severity: 'low' | 'medium' | 'high'
  message: string
  details: Record<string, unknown>
  detectedAt: string
}

/**
 * Check for anomalies in user's contexts
 */
export async function checkContextAnomalies(userId: string): Promise<Anomaly[]> {
  const supabase = createClient()
  const anomalies: Anomaly[] = []

  // Fetch user's contexts
  const { data: contexts } = await supabase
    .from('user_contexts')
    .select(`
      *,
      workspace:workspaces(id, name)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)

  if (!contexts || contexts.length === 0) return anomalies

  // Check for staff + tenant at same workspace
  const workspaceContexts = new Map<string, string[]>()
  contexts.forEach(ctx => {
    const wsId = ctx.workspace_id
    if (!workspaceContexts.has(wsId)) {
      workspaceContexts.set(wsId, [])
    }
    workspaceContexts.get(wsId)!.push(ctx.context_type)
  })

  workspaceContexts.forEach((types, wsId) => {
    if (types.includes('staff') && types.includes('tenant')) {
      const workspace = contexts.find(c => c.workspace_id === wsId)?.workspace
      anomalies.push({
        type: 'staff_and_tenant_same_workspace',
        severity: 'medium',
        message: `User is both staff and tenant at ${Array.isArray(workspace) ? workspace[0]?.name : workspace?.name || 'Unknown'}`,
        details: { workspace_id: wsId, context_types: types },
        detectedAt: new Date().toISOString(),
      })
    }
  })

  // Check for rapid context switching
  const { data: switches } = await supabase
    .from('context_switches')
    .select('*')
    .eq('user_id', userId)
    .gte('switched_at', new Date(Date.now() - 60000).toISOString()) // Last minute
    .order('switched_at', { ascending: false })

  if (switches && switches.length > 10) {
    anomalies.push({
      type: 'rapid_context_switching',
      severity: 'high',
      message: `${switches.length} context switches in the last minute`,
      details: { switch_count: switches.length },
      detectedAt: new Date().toISOString(),
    })
  }

  return anomalies
}

/**
 * Log a permission check for analytics
 */
export async function logPermissionCheck(
  contextId: string,
  permission: string,
  resourceType: string,
  resourceId: string | null,
  action: 'granted' | 'denied' | 'used'
) {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('permission_audit_log').insert({
    user_id: user.id,
    context_id: contextId,
    permission,
    resource_type: resourceType,
    resource_id: resourceId,
    action,
  })
}

/**
 * Smart suggestions for identity linking
 */
export interface LinkSuggestion {
  type: 'link_existing_user' | 'merge_accounts' | 'create_new'
  confidence: number // 0-1
  message: string
  action: {
    type: string
    data: Record<string, unknown>
  }
}

export async function getSuggestionsForIdentity(
  email?: string,
  phone?: string,
  name?: string
): Promise<LinkSuggestion[]> {
  const suggestions: LinkSuggestion[] = []

  // Check for existing user
  const existingUser = await findExistingUser(email, phone)

  if (existingUser) {
    suggestions.push({
      type: 'link_existing_user',
      confidence: 0.95,
      message: `Found existing user "${existingUser.name}" with matching ${email ? 'email' : 'phone'}. Link this account instead of creating new.`,
      action: {
        type: 'link',
        data: { user_id: existingUser.user_id },
      },
    })
  }

  // Check for conflicts
  const conflicts = await detectIdentityConflicts(email, phone)

  if (conflicts.length > 0) {
    const staffConflicts = conflicts.filter(c => c.source_type === 'staff' && !c.has_user_id)
    const tenantConflicts = conflicts.filter(c => c.source_type === 'tenant' && !c.has_user_id)

    if (staffConflicts.length > 0) {
      suggestions.push({
        type: 'link_existing_user',
        confidence: 0.8,
        message: `This ${email ? 'email' : 'phone'} is already associated with a staff member at "${staffConflicts[0].workspace_name}". Consider linking accounts.`,
        action: {
          type: 'link_staff',
          data: { staff_id: staffConflicts[0].source_id },
        },
      })
    }

    if (tenantConflicts.length > 0) {
      suggestions.push({
        type: 'link_existing_user',
        confidence: 0.8,
        message: `This ${email ? 'email' : 'phone'} is already associated with a tenant at "${tenantConflicts[0].workspace_name}". Consider linking accounts.`,
        action: {
          type: 'link_tenant',
          data: { tenant_id: tenantConflicts[0].source_id },
        },
      })
    }

    // Check for pending invitations
    const inviteConflicts = conflicts.filter(c => c.source_type === 'invitation')
    if (inviteConflicts.length > 0) {
      suggestions.push({
        type: 'link_existing_user',
        confidence: 0.9,
        message: `There's a pending invitation for this ${email ? 'email' : 'phone'} at "${inviteConflicts[0].workspace_name}".`,
        action: {
          type: 'accept_invitation',
          data: { invitation_id: inviteConflicts[0].source_id },
        },
      })
    }
  }

  // If no conflicts, suggest creating new
  if (suggestions.length === 0) {
    suggestions.push({
      type: 'create_new',
      confidence: 1,
      message: 'No existing accounts found. Safe to create new user.',
      action: {
        type: 'create',
        data: {},
      },
    })
  }

  // Sort by confidence
  suggestions.sort((a, b) => b.confidence - a.confidence)

  return suggestions
}

/**
 * Validate invitation before sending
 * Returns warnings/errors if any issues detected
 */
export interface InvitationValidation {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export async function validateInvitation(
  workspaceId: string,
  email?: string,
  phone?: string,
  contextType?: string
): Promise<InvitationValidation> {
  const result: InvitationValidation = {
    isValid: true,
    errors: [],
    warnings: [],
  }

  if (!email && !phone) {
    result.isValid = false
    result.errors.push('Email or phone is required')
    return result
  }

  const supabase = createClient()

  // Check for existing context in same workspace
  const existingUser = await findExistingUser(email, phone)

  if (existingUser) {
    const { data: existingContext } = await supabase
      .from('user_contexts')
      .select('*')
      .eq('user_id', existingUser.user_id)
      .eq('workspace_id', workspaceId)
      .eq('context_type', contextType)
      .single()

    if (existingContext) {
      result.isValid = false
      result.errors.push(`This user already has ${contextType} access to this workspace`)
      return result
    }

    // Check if adding staff+tenant to same workspace
    if (contextType === 'staff') {
      const { data: tenantContext } = await supabase
        .from('user_contexts')
        .select('*')
        .eq('user_id', existingUser.user_id)
        .eq('workspace_id', workspaceId)
        .eq('context_type', 'tenant')
        .single()

      if (tenantContext) {
        result.warnings.push('This user is already a tenant at this property. They will have both staff and tenant access.')
      }
    }
  }

  // Check for pending invitation
  const { data: pendingInvite } = await supabase
    .from('invitations')
    .select('*')
    .eq('workspace_id', workspaceId)
    .eq('status', 'pending')
    .or(`email.eq.${email},phone.eq.${phone}`)
    .single()

  if (pendingInvite) {
    result.warnings.push('There is already a pending invitation for this email/phone')
  }

  return result
}
