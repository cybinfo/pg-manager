import { createClient } from '@/lib/supabase/client'

// ============================================
// Context Analytics & Business Intelligence
// ============================================

/**
 * Context usage metrics for a workspace
 */
export interface ContextMetrics {
  workspace_id: string
  workspace_name: string
  context_type: string
  user_count: number
  active_last_7_days: number
  active_last_30_days: number
  avg_access_count: number
  last_activity: string | null
}

/**
 * Get context usage metrics for a workspace
 */
export async function getContextMetrics(workspaceId: string): Promise<ContextMetrics[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('context_analytics')
    .select('*')
    .eq('workspace_id', workspaceId)

  if (error) {
    console.error('Error fetching context metrics:', error)
    return []
  }

  return data as ContextMetrics[]
}

/**
 * Permission usage analytics
 */
export interface PermissionUsage {
  workspace_id: string
  permission: string
  action: string
  usage_count: number
  unique_users: number
  last_used: string | null
}

/**
 * Get permission usage analytics for a workspace
 */
export async function getPermissionUsage(workspaceId: string): Promise<PermissionUsage[]> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('permission_usage_analytics')
    .select('*')
    .eq('workspace_id', workspaceId)

  if (error) {
    console.error('Error fetching permission usage:', error)
    return []
  }

  return data as PermissionUsage[]
}

/**
 * Context switch patterns
 */
export interface SwitchPattern {
  from_context_type: string | null
  to_context_type: string
  switch_count: number
  avg_time_in_context: number // minutes
  peak_hours: number[]
}

/**
 * Get context switching patterns for a user
 */
export async function getUserSwitchPatterns(userId: string): Promise<SwitchPattern[]> {
  const supabase = createClient()

  // Get all switches in last 30 days
  const { data: switches, error } = await supabase
    .from('context_switches')
    .select(`
      *,
      from_context:user_contexts!context_switches_from_context_id_fkey(context_type),
      to_context:user_contexts!context_switches_to_context_id_fkey(context_type)
    `)
    .eq('user_id', userId)
    .gte('switched_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
    .order('switched_at', { ascending: true })

  if (error || !switches) {
    return []
  }

  // Analyze patterns
  const patternMap = new Map<string, {
    count: number
    totalTime: number
    hours: number[]
  }>()

  for (let i = 0; i < switches.length; i++) {
    const sw = switches[i]
    const fromType = Array.isArray(sw.from_context)
      ? sw.from_context[0]?.context_type
      : sw.from_context?.context_type || null
    const toType = Array.isArray(sw.to_context)
      ? sw.to_context[0]?.context_type
      : sw.to_context?.context_type

    const key = `${fromType || 'start'}->${toType}`
    const hour = new Date(sw.switched_at).getHours()

    if (!patternMap.has(key)) {
      patternMap.set(key, { count: 0, totalTime: 0, hours: [] })
    }

    const pattern = patternMap.get(key)!
    pattern.count++
    pattern.hours.push(hour)

    // Calculate time in previous context
    if (i > 0) {
      const prevTime = new Date(switches[i - 1].switched_at).getTime()
      const currTime = new Date(sw.switched_at).getTime()
      pattern.totalTime += (currTime - prevTime) / 60000 // minutes
    }
  }

  // Convert to array
  const patterns: SwitchPattern[] = []
  patternMap.forEach((data, key) => {
    const [from, to] = key.split('->')

    // Find peak hours
    const hourCounts = new Map<number, number>()
    data.hours.forEach(h => hourCounts.set(h, (hourCounts.get(h) || 0) + 1))
    const sortedHours = Array.from(hourCounts.entries()).sort((a, b) => b[1] - a[1])
    const peakHours = sortedHours.slice(0, 3).map(([h]) => h)

    patterns.push({
      from_context_type: from === 'start' ? null : from,
      to_context_type: to,
      switch_count: data.count,
      avg_time_in_context: data.count > 0 ? Math.round(data.totalTime / data.count) : 0,
      peak_hours: peakHours,
    })
  })

  return patterns
}

/**
 * Staff productivity metrics
 */
export interface StaffProductivity {
  staff_id: string
  staff_name: string
  role_name: string
  login_count: number
  avg_session_duration: number // minutes
  actions_performed: number
  most_used_permissions: string[]
  last_active: string | null
}

/**
 * Get staff productivity metrics for a workspace
 */
export async function getStaffProductivity(workspaceId: string): Promise<StaffProductivity[]> {
  const supabase = createClient()

  // Get all staff contexts
  const { data: staffContexts } = await supabase
    .from('user_contexts')
    .select(`
      id,
      entity_id,
      access_count,
      last_accessed_at,
      role:roles(name),
      staff:staff_members!user_contexts_entity_id_fkey(name)
    `)
    .eq('workspace_id', workspaceId)
    .eq('context_type', 'staff')
    .eq('is_active', true)

  if (!staffContexts) return []

  const productivity: StaffProductivity[] = []

  for (const ctx of staffContexts) {
    // Get permission usage for this context
    const { data: permUsage } = await supabase
      .from('permission_audit_log')
      .select('permission')
      .eq('context_id', ctx.id)
      .eq('action', 'used')
      .limit(100)

    // Count permission usage
    const permCounts = new Map<string, number>()
    permUsage?.forEach((p: { permission: string }) => {
      permCounts.set(p.permission, (permCounts.get(p.permission) || 0) + 1)
    })

    const topPerms = Array.from(permCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([p]) => p)

    const role = Array.isArray(ctx.role) ? ctx.role[0] : ctx.role
    const staff = Array.isArray(ctx.staff) ? ctx.staff[0] : ctx.staff

    productivity.push({
      staff_id: ctx.entity_id || '',
      staff_name: staff?.name || 'Unknown',
      role_name: role?.name || 'No Role',
      login_count: ctx.access_count || 0,
      avg_session_duration: 0, // Would need session tracking
      actions_performed: permUsage?.length || 0,
      most_used_permissions: topPerms,
      last_active: ctx.last_accessed_at,
    })
  }

  return productivity
}

/**
 * Dashboard analytics summary
 */
export interface AnalyticsSummary {
  total_users: number
  active_users_today: number
  active_users_week: number
  total_context_switches: number
  avg_contexts_per_user: number
  context_distribution: {
    owner: number
    staff: number
    tenant: number
  }
  most_active_time: string
  permission_denials_today: number
}

/**
 * Get analytics summary for a workspace
 */
export async function getAnalyticsSummary(workspaceId: string): Promise<AnalyticsSummary | null> {
  const supabase = createClient()

  // Get context counts
  const { data: contexts } = await supabase
    .from('user_contexts')
    .select('user_id, context_type, last_accessed_at')
    .eq('workspace_id', workspaceId)
    .eq('is_active', true)

  if (!contexts) return null

  type ContextType = { user_id: string; last_accessed_at?: string; context_type: string }
  const uniqueUsers = new Set(contexts.map((c: ContextType) => c.user_id))
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

  const activeToday = contexts.filter((c: ContextType) =>
    c.last_accessed_at && new Date(c.last_accessed_at) >= today
  ).length

  const activeWeek = contexts.filter((c: ContextType) =>
    c.last_accessed_at && new Date(c.last_accessed_at) >= weekAgo
  ).length

  // Get context switches count
  const { count: switchCount } = await supabase
    .from('context_switches')
    .select('*', { count: 'exact', head: true })
    .in('to_context_id', contexts.map((c: ContextType) => c.user_id))
    .gte('switched_at', weekAgo.toISOString())

  // Get permission denials
  const { count: denialCount } = await supabase
    .from('permission_audit_log')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'denied')
    .gte('created_at', today.toISOString())

  // Calculate context distribution
  const distribution = { owner: 0, staff: 0, tenant: 0 }
  contexts.forEach((c: ContextType) => {
    if (c.context_type in distribution) {
      distribution[c.context_type as keyof typeof distribution]++
    }
  })

  return {
    total_users: uniqueUsers.size,
    active_users_today: activeToday,
    active_users_week: activeWeek,
    total_context_switches: switchCount || 0,
    avg_contexts_per_user: uniqueUsers.size > 0 ? contexts.length / uniqueUsers.size : 0,
    context_distribution: distribution,
    most_active_time: '10:00 AM - 12:00 PM', // Would need more data
    permission_denials_today: denialCount || 0,
  }
}

/**
 * Track a user action for analytics
 */
export async function trackAction(
  contextId: string,
  action: string,
  resourceType: string,
  resourceId?: string,
  metadata?: Record<string, unknown>
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return

  await supabase.from('permission_audit_log').insert({
    user_id: user.id,
    context_id: contextId,
    permission: action,
    resource_type: resourceType,
    resource_id: resourceId || null,
    action: 'used',
    metadata: metadata || {},
  })
}

/**
 * Export analytics data to CSV format
 */
export function exportToCSV(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return

  const headers = Object.keys(data[0])
  const csvContent = [
    headers.join(','),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h]
        if (typeof val === 'string' && val.includes(',')) {
          return `"${val}"`
        }
        return val ?? ''
      }).join(',')
    )
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
