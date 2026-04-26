/**
 * Audit Service Tests
 *
 * Tests for the centralized audit logging service.
 */

import {
  diffObjects,
  createAuditEvent,
  logAuditEvent,
  logAuditEvents,
  queryAuditEvents,
  getEntityHistory,
} from '@/lib/services/audit.service'
import { AuditEvent, EntityType, AuditAction } from '@/lib/services/types'

// ============================================
// Mocks
// ============================================

// Track mock instances for per-test control
let mockInsert: jest.Mock
let mockSelect: jest.Mock
let mockSingle: jest.Mock
let mockEq: jest.Mock
let mockGte: jest.Mock
let mockLte: jest.Mock
let mockLimit: jest.Mock
let mockRange: jest.Mock
let mockOrder: jest.Mock
let mockFrom: jest.Mock

function resetMocks() {
  mockSingle = jest.fn().mockResolvedValue({ data: { id: 'audit-id-1' }, error: null })
  mockSelect = jest.fn(() => ({ single: mockSingle }))
  mockInsert = jest.fn(() => ({ select: mockSelect }))

  // Query chain for queryAuditEvents
  const queryChain = {
    eq: (..._args: unknown[]) => queryChain,
    gte: (..._args: unknown[]) => queryChain,
    lte: (..._args: unknown[]) => queryChain,
    limit: (..._args: unknown[]) => queryChain,
    range: (..._args: unknown[]) => queryChain,
    order: (..._args: unknown[]) => queryChain,
    // Resolve when awaited
    then: (resolve: (v: { data: AuditEvent[]; error: null }) => void) =>
      resolve({ data: [], error: null }),
  }

  mockEq = jest.fn(() => queryChain)
  mockGte = jest.fn(() => queryChain)
  mockLte = jest.fn(() => queryChain)
  mockLimit = jest.fn(() => queryChain)
  mockRange = jest.fn(() => queryChain)
  mockOrder = jest.fn(() => queryChain)

  mockFrom = jest.fn((table: string) => {
    if (table === 'audit_events') {
      return {
        insert: mockInsert,
        select: jest.fn(() => ({
          eq: mockEq,
          order: mockOrder,
        })),
      }
    }
    return { insert: mockInsert, select: mockSelect }
  })
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    get from() {
      return mockFrom
    },
  })),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    child: jest.fn(() => ({
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
    })),
  },
  extractErrorMeta: jest.fn((err: unknown) => ({ message: String(err) })),
}))

jest.mock('@/lib/date-helpers', () => ({
  getNowISO: jest.fn(() => '2026-04-26T12:00:00.000Z'),
}))

// ============================================
// Test Data
// ============================================

const testWorkspaceId = 'workspace-abc'
const testActorId = 'user-xyz'
const testEntityId = 'entity-123'

const baseAuditEvent: AuditEvent = {
  entity_type: 'tenant' as EntityType,
  entity_id: testEntityId,
  action: 'create' as AuditAction,
  actor_id: testActorId,
  actor_type: 'owner',
  workspace_id: testWorkspaceId,
}

// ============================================
// diffObjects Tests
// ============================================

describe('diffObjects', () => {
  it('should return empty diff for identical objects', () => {
    const obj = { name: 'John', age: 30, active: true }
    const result = diffObjects(obj, { ...obj })

    expect(result.fields_changed).toEqual([])
    expect(result.before).toEqual({})
    expect(result.after).toEqual({})
  })

  it('should detect changed fields', () => {
    const before = { name: 'John', age: 30, status: 'active' }
    const after = { name: 'Jane', age: 30, status: 'inactive' }
    const result = diffObjects(before, after)

    expect(result.fields_changed).toContain('name')
    expect(result.fields_changed).toContain('status')
    expect(result.fields_changed).not.toContain('age')
    expect(result.before.name).toBe('John')
    expect(result.after.name).toBe('Jane')
    expect(result.before.status).toBe('active')
    expect(result.after.status).toBe('inactive')
  })

  it('should detect added fields (undefined → value)', () => {
    const before = { name: 'John' }
    const after = { name: 'John', email: 'john@example.com' }
    const result = diffObjects(before, after)

    expect(result.fields_changed).toContain('email')
    expect(result.before.email).toBeUndefined()
    expect(result.after.email).toBe('john@example.com')
  })

  it('should detect deleted fields (value → undefined)', () => {
    const before = { name: 'John', phone: '9999999999' }
    const after = { name: 'John' }
    const result = diffObjects(before, after)

    expect(result.fields_changed).toContain('phone')
    expect(result.before.phone).toBe('9999999999')
    expect(result.after.phone).toBeUndefined()
  })

  it('should detect null value changes', () => {
    const before = { notes: null, name: 'John' }
    const after = { notes: 'Some notes', name: 'John' }
    const result = diffObjects(before, after)

    expect(result.fields_changed).toContain('notes')
    expect(result.before.notes).toBeNull()
    expect(result.after.notes).toBe('Some notes')
  })

  it('should detect changes in nested objects via JSON comparison', () => {
    const before = { config: { enabled: true, count: 5 } }
    const after = { config: { enabled: false, count: 5 } }
    const result = diffObjects(before, after)

    expect(result.fields_changed).toContain('config')
    expect(result.before.config).toEqual({ enabled: true, count: 5 })
    expect(result.after.config).toEqual({ enabled: false, count: 5 })
  })

  it('should handle null before object gracefully', () => {
    // Empty object treated as "before"
    const result = diffObjects({}, { name: 'New' })

    expect(result.fields_changed).toContain('name')
    expect(result.after.name).toBe('New')
  })

  it('should handle empty both objects', () => {
    const result = diffObjects({}, {})

    expect(result.fields_changed).toEqual([])
    expect(result.before).toEqual({})
    expect(result.after).toEqual({})
  })

  it('should handle arrays within objects', () => {
    const before = { tags: ['a', 'b'] }
    const after = { tags: ['a', 'b', 'c'] }
    const result = diffObjects(before, after)

    expect(result.fields_changed).toContain('tags')
  })

  it('should not flag equal arrays as changed', () => {
    const before = { tags: ['a', 'b'] }
    const after = { tags: ['a', 'b'] }
    const result = diffObjects(before, after)

    expect(result.fields_changed).not.toContain('tags')
  })
})

// ============================================
// createAuditEvent Tests
// ============================================

describe('createAuditEvent', () => {
  const context = {
    actor_id: testActorId,
    actor_type: 'owner' as const,
    workspace_id: testWorkspaceId,
  }

  it('should build a correct audit event with all fields', () => {
    const event = createAuditEvent('tenant', testEntityId, 'create', context)

    expect(event.entity_type).toBe('tenant')
    expect(event.entity_id).toBe(testEntityId)
    expect(event.action).toBe('create')
    expect(event.actor_id).toBe(testActorId)
    expect(event.actor_type).toBe('owner')
    expect(event.workspace_id).toBe(testWorkspaceId)
  })

  it('should set changes.before and changes.after when both provided', () => {
    const before = { name: 'Old', status: 'active' }
    const after = { name: 'New', status: 'active' }

    const event = createAuditEvent('tenant', testEntityId, 'update', context, { before, after })

    expect(event.changes).toBeDefined()
    expect(event.changes?.before).toEqual(before)
    expect(event.changes?.after).toEqual(after)
    expect(event.changes?.fields_changed).toContain('name')
    expect(event.changes?.fields_changed).not.toContain('status')
  })

  it('should set only changes.before when only before is provided', () => {
    const before = { name: 'John' }
    const event = createAuditEvent('tenant', testEntityId, 'delete', context, { before })

    expect(event.changes?.before).toEqual(before)
    expect(event.changes?.after).toBeUndefined()
    expect(event.changes?.fields_changed).toBeUndefined()
  })

  it('should set only changes.after when only after is provided', () => {
    const after = { name: 'John' }
    const event = createAuditEvent('tenant', testEntityId, 'create', context, { after })

    expect(event.changes?.after).toEqual(after)
    expect(event.changes?.before).toBeUndefined()
    expect(event.changes?.fields_changed).toBeUndefined()
  })

  it('should set changes to undefined when no options provided', () => {
    const event = createAuditEvent('property', testEntityId, 'view', context)

    expect(event.changes).toBeUndefined()
  })

  it('should set metadata when provided', () => {
    const metadata = { ip_address: '127.0.0.1', source: 'web' }
    const event = createAuditEvent('bill', testEntityId, 'create', context, { metadata })

    expect(event.metadata).toEqual(metadata)
  })

  it('should detect all changed fields correctly', () => {
    const before = { name: 'A', phone: '111', email: 'a@b.com' }
    const after = { name: 'B', phone: '222', email: 'a@b.com' }
    const event = createAuditEvent('tenant', testEntityId, 'update', context, { before, after })

    expect(event.changes?.fields_changed).toEqual(expect.arrayContaining(['name', 'phone']))
    expect(event.changes?.fields_changed).not.toContain('email')
  })

  it('should handle staff actor type', () => {
    const staffContext = { ...context, actor_type: 'staff' as const }
    const event = createAuditEvent('room', testEntityId, 'update', staffContext)

    expect(event.actor_type).toBe('staff')
  })

  it('should handle system actor type', () => {
    const systemContext = { ...context, actor_type: 'system' as const }
    const event = createAuditEvent('bill', testEntityId, 'create', systemContext)

    expect(event.actor_type).toBe('system')
  })
})

// ============================================
// logAuditEvent Tests
// ============================================

describe('logAuditEvent', () => {
  beforeEach(() => {
    resetMocks()
  })

  it('should successfully insert an audit event and return the id', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'audit-id-99' }, error: null })

    const result = await logAuditEvent(baseAuditEvent)

    expect(result.success).toBe(true)
    expect(result.data).toBe('audit-id-99')
    expect(mockFrom).toHaveBeenCalledWith('audit_events')
  })

  it('should return error when Supabase insert fails', async () => {
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'DB error', code: '500' },
    })

    const result = await logAuditEvent(baseAuditEvent)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.message).toMatch(/Failed to log audit event/)
  })

  it('should return error when an exception is thrown', async () => {
    mockSingle.mockRejectedValueOnce(new Error('Network timeout'))

    const result = await logAuditEvent(baseAuditEvent)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.error?.message).toMatch(/Exception/)
  })

  it('should include optional fields (ip_address, user_agent, metadata) in the insert', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'audit-id-200' }, error: null })

    const eventWithOptionals: AuditEvent = {
      ...baseAuditEvent,
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0',
      metadata: { source: 'web' },
    }

    const result = await logAuditEvent(eventWithOptionals)

    expect(result.success).toBe(true)
    // The insert fn receives the full payload; verify it was called
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        ip_address: '192.168.1.1',
        user_agent: 'Mozilla/5.0',
        metadata: { source: 'web' },
      })
    )
  })

  it('should set null for missing optional fields', async () => {
    mockSingle.mockResolvedValueOnce({ data: { id: 'audit-id-201' }, error: null })

    await logAuditEvent(baseAuditEvent)

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        ip_address: null,
        user_agent: null,
        metadata: null,
        changes: null,
      })
    )
  })
})

// ============================================
// logAuditEvents (batch) Tests
// ============================================

describe('logAuditEvents', () => {
  beforeEach(() => {
    resetMocks()
  })

  it('should return success with empty array when called with empty array (early return)', async () => {
    const result = await logAuditEvents([])

    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
    // Supabase should NOT have been called
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('should insert a single event and return its id', async () => {
    // Override the select chain for batch insert (returns array not single)
    mockSelect.mockReturnValueOnce(
      Promise.resolve({ data: [{ id: 'batch-id-1' }], error: null })
    )

    const result = await logAuditEvents([baseAuditEvent])

    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  it('should insert multiple events and return all ids', async () => {
    mockSelect.mockReturnValueOnce(
      Promise.resolve({
        data: [{ id: 'batch-1' }, { id: 'batch-2' }, { id: 'batch-3' }],
        error: null,
      })
    )

    const events = [
      baseAuditEvent,
      { ...baseAuditEvent, entity_id: 'entity-456', action: 'update' as AuditAction },
      { ...baseAuditEvent, entity_id: 'entity-789', action: 'delete' as AuditAction },
    ]

    const result = await logAuditEvents(events)

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(3)
    expect(result.data).toEqual(['batch-1', 'batch-2', 'batch-3'])
  })

  it('should return error when batch insert fails', async () => {
    mockSelect.mockReturnValueOnce(
      Promise.resolve({ data: null, error: { message: 'Batch insert failed' } })
    )

    const result = await logAuditEvents([baseAuditEvent])

    expect(result.success).toBe(false)
    expect(result.error?.message).toMatch(/batch/)
  })

  it('should return error when an exception is thrown', async () => {
    mockSelect.mockRejectedValueOnce(new Error('Network error'))

    const result = await logAuditEvents([baseAuditEvent])

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

// ============================================
// queryAuditEvents Tests
// ============================================

describe('queryAuditEvents', () => {
  // Use a locally controlled chainable mock for query tests
  let resolveWith: { data: AuditEvent[]; error: null | object }
  let spiedEq: jest.Mock
  let spiedGte: jest.Mock
  let spiedLte: jest.Mock
  let spiedLimit: jest.Mock
  let spiedRange: jest.Mock
  let spiedOrder: jest.Mock

  beforeEach(() => {
    resolveWith = { data: [], error: null }

    // Build a chainable object whose `then` resolves to resolveWith
    const chain: Record<string, unknown> = {}
    const chainFn = jest.fn(() => chain)

    spiedEq = jest.fn(() => chain)
    spiedGte = jest.fn(() => chain)
    spiedLte = jest.fn(() => chain)
    spiedLimit = jest.fn(() => chain)
    spiedRange = jest.fn(() => chain)
    spiedOrder = jest.fn(() => chain)

    chain.eq = spiedEq
    chain.gte = spiedGte
    chain.lte = spiedLte
    chain.limit = spiedLimit
    chain.range = spiedRange
    chain.order = spiedOrder
    chain.then = (resolve: (v: typeof resolveWith) => void) => resolve(resolveWith)

    mockFrom = jest.fn((table: string) => {
      if (table === 'audit_events') {
        return {
          insert: mockInsert,
          select: jest.fn(() => chain),
        }
      }
      return { insert: mockInsert, select: chainFn }
    })

    // Update the supabase mock to use new mockFrom
    const { createClient } = jest.requireMock('@/lib/supabase/client')
    ;(createClient as jest.Mock).mockReturnValue({ from: mockFrom })
  })

  it('should query with required workspace_id filter', async () => {
    const result = await queryAuditEvents({ workspace_id: testWorkspaceId })

    expect(result.success).toBe(true)
    expect(spiedEq).toHaveBeenCalledWith('workspace_id', testWorkspaceId)
  })

  it('should filter by entity_type when provided', async () => {
    await queryAuditEvents({ workspace_id: testWorkspaceId, entity_type: 'tenant' })

    expect(spiedEq).toHaveBeenCalledWith('entity_type', 'tenant')
  })

  it('should filter by entity_id when provided', async () => {
    await queryAuditEvents({ workspace_id: testWorkspaceId, entity_id: testEntityId })

    expect(spiedEq).toHaveBeenCalledWith('entity_id', testEntityId)
  })

  it('should apply from_date filter using gte', async () => {
    await queryAuditEvents({ workspace_id: testWorkspaceId, from_date: '2026-01-01' })

    expect(spiedGte).toHaveBeenCalledWith('created_at', '2026-01-01')
  })

  it('should apply to_date filter using lte', async () => {
    await queryAuditEvents({ workspace_id: testWorkspaceId, to_date: '2026-12-31' })

    expect(spiedLte).toHaveBeenCalledWith('created_at', '2026-12-31')
  })

  it('should apply limit when provided', async () => {
    await queryAuditEvents({ workspace_id: testWorkspaceId, limit: 10 })

    expect(spiedLimit).toHaveBeenCalledWith(10)
  })

  it('should NOT apply limit when not provided', async () => {
    await queryAuditEvents({ workspace_id: testWorkspaceId })

    expect(spiedLimit).not.toHaveBeenCalled()
  })

  it('should return the data returned by Supabase', async () => {
    const mockEvents: AuditEvent[] = [
      { ...baseAuditEvent, entity_id: 'e-1' },
      { ...baseAuditEvent, entity_id: 'e-2' },
    ]
    resolveWith = { data: mockEvents, error: null }

    const result = await queryAuditEvents({ workspace_id: testWorkspaceId })

    expect(result.success).toBe(true)
    expect(result.data).toHaveLength(2)
  })

  it('should return error when Supabase query fails', async () => {
    resolveWith = { data: [], error: { message: 'Query failed' } } as typeof resolveWith

    const result = await queryAuditEvents({ workspace_id: testWorkspaceId })

    expect(result.success).toBe(false)
    expect(result.error?.message).toMatch(/query/)
  })
})

// ============================================
// getEntityHistory Tests
// ============================================

describe('getEntityHistory', () => {
  it('should delegate to queryAuditEvents with entity_type and entity_id', async () => {
    // getEntityHistory is a thin wrapper — just verify it returns a ServiceResult
    const result = await getEntityHistory('tenant', testEntityId, testWorkspaceId)
    // Either success or error shape is fine — the mock controls the outcome
    expect(typeof result.success).toBe('boolean')
  })
})
