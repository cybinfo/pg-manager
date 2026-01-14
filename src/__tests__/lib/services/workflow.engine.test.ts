/**
 * Workflow Engine Tests
 *
 * Tests for the central workflow orchestration engine.
 */

import {
  createWorkflowContext,
  executeStep,
  executeWorkflow,
  wrapOperation,
  WorkflowDefinition,
} from '@/lib/services/workflow.engine'
import {
  ServiceResult,
  WorkflowContext,
  createServiceError,
  createSuccessResult,
  createErrorResult,
  ERROR_CODES,
} from '@/lib/services/types'

// ============================================
// Mocks
// ============================================

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    rpc: jest.fn().mockResolvedValue({ data: [{ is_duplicate: false }], error: null }),
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
      delete: jest.fn(() => ({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      })),
    })),
  })),
}))

// Mock audit service
jest.mock('@/lib/services/audit.service', () => ({
  logAuditEvent: jest.fn().mockResolvedValue({ success: true }),
  logAuditEvents: jest.fn().mockResolvedValue({ success: true, data: ['audit-1', 'audit-2'] }),
  createAuditEvent: jest.fn((entityType, entityId, action, actor, changes) => ({
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_id: actor.actor_id,
    actor_type: actor.actor_type,
    workspace_id: actor.workspace_id,
    changes,
  })),
}))

// Mock notification service
jest.mock('@/lib/services/notification.service', () => ({
  sendNotification: jest.fn().mockResolvedValue({ success: true }),
  sendNotifications: jest.fn().mockResolvedValue({ success: true, data: ['notif-1'] }),
}))

// ============================================
// Test Data
// ============================================

const testActorId = 'actor-123'
const testWorkspaceId = 'workspace-456'
const testActorType = 'owner' as const

// ============================================
// createWorkflowContext Tests
// ============================================

describe('createWorkflowContext', () => {
  it('should create a valid workflow context', () => {
    const context = createWorkflowContext(
      'test_workflow',
      testActorId,
      testActorType,
      testWorkspaceId
    )

    expect(context).toBeDefined()
    expect(context.workflow_id).toMatch(/^wf_/)
    expect(context.workflow_type).toBe('test_workflow')
    expect(context.actor_id).toBe(testActorId)
    expect(context.actor_type).toBe(testActorType)
    expect(context.workspace_id).toBe(testWorkspaceId)
    expect(context.started_at).toBeInstanceOf(Date)
    expect(context.steps).toEqual([])
    expect(context.metadata).toEqual({})
  })

  it('should include metadata when provided', () => {
    const metadata = { key: 'value', count: 42 }
    const context = createWorkflowContext(
      'test_workflow',
      testActorId,
      testActorType,
      testWorkspaceId,
      metadata
    )

    expect(context.metadata).toEqual(metadata)
  })

  it('should generate unique workflow IDs', () => {
    const context1 = createWorkflowContext('test', testActorId, testActorType, testWorkspaceId)
    const context2 = createWorkflowContext('test', testActorId, testActorType, testWorkspaceId)

    expect(context1.workflow_id).not.toBe(context2.workflow_id)
  })
})

// ============================================
// executeStep Tests
// ============================================

describe('executeStep', () => {
  let context: WorkflowContext

  beforeEach(() => {
    context = createWorkflowContext('test', testActorId, testActorType, testWorkspaceId)
  })

  it('should execute a successful step', async () => {
    const executor = jest.fn().mockResolvedValue(createSuccessResult({ id: '123' }))

    const result = await executeStep(context, 'test_step', executor)

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ id: '123' })
    expect(context.steps).toHaveLength(1)
    expect(context.steps[0].name).toBe('test_step')
    expect(context.steps[0].status).toBe('completed')
    expect(context.steps[0].result).toEqual({ id: '123' })
  })

  it('should handle step failure', async () => {
    const error = createServiceError(ERROR_CODES.VALIDATION_ERROR, 'Test error')
    const executor = jest.fn().mockResolvedValue(createErrorResult(error))

    const result = await executeStep(context, 'failing_step', executor)

    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
    expect(context.steps).toHaveLength(1)
    expect(context.steps[0].status).toBe('failed')
    expect(context.steps[0].error).toBeDefined()
  })

  it('should handle executor exceptions', async () => {
    const executor = jest.fn().mockRejectedValue(new Error('Unexpected error'))

    const result = await executeStep(context, 'exception_step', executor)

    expect(result.success).toBe(false)
    expect(result.error?.code).toBe(ERROR_CODES.WORKFLOW_STEP_FAILED)
    expect(context.steps[0].status).toBe('failed')
  })

  it('should track step timing', async () => {
    const executor = jest.fn().mockResolvedValue(createSuccessResult({}))

    await executeStep(context, 'timed_step', executor)

    expect(context.steps[0].started_at).toBeInstanceOf(Date)
    expect(context.steps[0].completed_at).toBeInstanceOf(Date)
  })

  it('should assign sequential step IDs', async () => {
    const executor = jest.fn().mockResolvedValue(createSuccessResult({}))

    await executeStep(context, 'step1', executor)
    await executeStep(context, 'step2', executor)
    await executeStep(context, 'step3', executor)

    expect(context.steps[0].id).toBe('step_1')
    expect(context.steps[1].id).toBe('step_2')
    expect(context.steps[2].id).toBe('step_3')
  })
})

// ============================================
// executeWorkflow Tests
// ============================================

describe('executeWorkflow', () => {
  interface TestInput {
    name: string
    value: number
  }

  interface TestOutput {
    result: string
    total: number
  }

  const createTestWorkflow = (
    steps: WorkflowDefinition<TestInput, TestOutput>['steps']
  ): WorkflowDefinition<TestInput, TestOutput> => ({
    name: 'test_workflow',
    steps,
    buildOutput: (results) => ({
      result: (results.step1 as { name: string })?.name || 'default',
      total: (results.step2 as { value: number })?.value || 0,
    }),
  })

  it('should execute a successful workflow', async () => {
    const workflow = createTestWorkflow([
      {
        name: 'step1',
        execute: async (ctx, input) => createSuccessResult({ name: input.name }),
      },
      {
        name: 'step2',
        execute: async (ctx, input) => createSuccessResult({ value: input.value * 2 }),
      },
    ])

    const result = await executeWorkflow(
      workflow,
      { name: 'test', value: 10 },
      testActorId,
      testActorType,
      testWorkspaceId
    )

    expect(result.success).toBe(true)
    expect(result.data).toEqual({ result: 'test', total: 20 })
    expect(result.steps_completed).toBe(2)
    expect(result.steps_total).toBe(2)
    expect(result.workflow_id).toMatch(/^wf_/)
  })

  it('should fail and rollback on step failure', async () => {
    const rollbackFn = jest.fn()

    const workflow = createTestWorkflow([
      {
        name: 'step1',
        execute: async () => createSuccessResult({ name: 'done' }),
        rollback: rollbackFn,
      },
      {
        name: 'step2',
        execute: async () => createErrorResult(
          createServiceError(ERROR_CODES.VALIDATION_ERROR, 'Step 2 failed')
        ),
      },
    ])

    const result = await executeWorkflow(
      workflow,
      { name: 'test', value: 10 },
      testActorId,
      testActorType,
      testWorkspaceId
    )

    expect(result.success).toBe(false)
    expect(result.errors).toHaveLength(1)
    expect(result.errors![0].message).toBe('Step 2 failed')
    expect(rollbackFn).toHaveBeenCalled()
  })

  it('should continue on optional step failure', async () => {
    const workflow = createTestWorkflow([
      {
        name: 'step1',
        execute: async () => createSuccessResult({ name: 'done' }),
      },
      {
        name: 'optional_step',
        execute: async () => createErrorResult(
          createServiceError(ERROR_CODES.UNKNOWN_ERROR, 'Optional failed')
        ),
        optional: true,
      },
      {
        name: 'step2',
        execute: async () => createSuccessResult({ value: 100 }),
      },
    ])

    const result = await executeWorkflow(
      workflow,
      { name: 'test', value: 10 },
      testActorId,
      testActorType,
      testWorkspaceId
    )

    expect(result.success).toBe(true)
    expect(result.steps_completed).toBe(2) // step1 and step2 completed
    expect(result.failed_optional_steps).toContain('optional_step')
  })

  it('should pass previous results to subsequent steps', async () => {
    const step2Fn = jest.fn().mockResolvedValue(createSuccessResult({ value: 0 }))

    const workflow = createTestWorkflow([
      {
        name: 'step1',
        execute: async () => createSuccessResult({ name: 'from_step1', extra: 42 }),
      },
      {
        name: 'step2',
        execute: step2Fn,
      },
    ])

    await executeWorkflow(
      workflow,
      { name: 'test', value: 10 },
      testActorId,
      testActorType,
      testWorkspaceId
    )

    expect(step2Fn).toHaveBeenCalled()
    const callArgs = step2Fn.mock.calls[0]
    expect(callArgs[2]).toHaveProperty('step1')
    expect(callArgs[2].step1).toEqual({ name: 'from_step1', extra: 42 })
  })

  it('should skip audit when skip_audit option is true', async () => {
    const { logAuditEvents } = require('@/lib/services/audit.service')

    const workflow: WorkflowDefinition<TestInput, TestOutput> = {
      name: 'test_workflow',
      steps: [
        {
          name: 'step1',
          execute: async () => createSuccessResult({ name: 'done' }),
        },
      ],
      auditEvents: () => [{
        entity_type: 'tenant',
        entity_id: '123',
        action: 'create',
        actor_id: testActorId,
        actor_type: testActorType,
        workspace_id: testWorkspaceId,
      }],
      buildOutput: () => ({ result: '', total: 0 }),
    }

    await executeWorkflow(
      workflow,
      { name: 'test', value: 10 },
      testActorId,
      testActorType,
      testWorkspaceId,
      { skip_audit: true }
    )

    expect(logAuditEvents).not.toHaveBeenCalled()
  })

  it('should skip notifications when skip_notifications option is true', async () => {
    const { sendNotifications } = require('@/lib/services/notification.service')

    const workflow: WorkflowDefinition<TestInput, TestOutput> = {
      name: 'test_workflow',
      steps: [
        {
          name: 'step1',
          execute: async () => createSuccessResult({ name: 'done' }),
        },
      ],
      notifications: () => [{
        type: 'welcome',
        recipient_id: '123',
        recipient_type: 'tenant',
        channels: ['email'],
        data: {},
      }],
      buildOutput: () => ({ result: '', total: 0 }),
    }

    await executeWorkflow(
      workflow,
      { name: 'test', value: 10 },
      testActorId,
      testActorType,
      testWorkspaceId,
      { skip_notifications: true }
    )

    expect(sendNotifications).not.toHaveBeenCalled()
  })

  it('should rollback in reverse order', async () => {
    const rollbackOrder: string[] = []

    const workflow = createTestWorkflow([
      {
        name: 'step1',
        execute: async () => createSuccessResult({}),
        rollback: async () => { rollbackOrder.push('step1') },
      },
      {
        name: 'step2',
        execute: async () => createSuccessResult({}),
        rollback: async () => { rollbackOrder.push('step2') },
      },
      {
        name: 'step3',
        execute: async () => createErrorResult(
          createServiceError(ERROR_CODES.UNKNOWN_ERROR, 'Failed')
        ),
      },
    ])

    await executeWorkflow(
      workflow,
      { name: 'test', value: 10 },
      testActorId,
      testActorType,
      testWorkspaceId
    )

    expect(rollbackOrder).toEqual(['step2', 'step1'])
  })

  it('should handle rollback errors gracefully', async () => {
    const workflow = createTestWorkflow([
      {
        name: 'step1',
        execute: async () => createSuccessResult({}),
        rollback: async () => { throw new Error('Rollback failed') },
      },
      {
        name: 'step2',
        execute: async () => createErrorResult(
          createServiceError(ERROR_CODES.UNKNOWN_ERROR, 'Failed')
        ),
      },
    ])

    // Should not throw even if rollback fails
    const result = await executeWorkflow(
      workflow,
      { name: 'test', value: 10 },
      testActorId,
      testActorType,
      testWorkspaceId
    )

    expect(result.success).toBe(false)
  })
})

// ============================================
// wrapOperation Tests
// ============================================

describe('wrapOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should execute operation and log audit', async () => {
    const { logAuditEvent } = require('@/lib/services/audit.service')
    const operation = jest.fn().mockResolvedValue(createSuccessResult({ id: '123' }))

    const result = await wrapOperation(operation, {
      entityType: 'tenant',
      entityId: '123',
      action: 'create',
      actorId: testActorId,
      actorType: testActorType,
      workspaceId: testWorkspaceId,
    })

    expect(result.success).toBe(true)
    expect(operation).toHaveBeenCalled()
    expect(logAuditEvent).toHaveBeenCalled()
  })

  it('should not log audit when operation fails', async () => {
    const { logAuditEvent } = require('@/lib/services/audit.service')
    const operation = jest.fn().mockResolvedValue(
      createErrorResult(createServiceError(ERROR_CODES.UNKNOWN_ERROR, 'Failed'))
    )

    const result = await wrapOperation(operation, {
      entityType: 'tenant',
      entityId: '123',
      action: 'create',
      actorId: testActorId,
      actorType: testActorType,
      workspaceId: testWorkspaceId,
    })

    expect(result.success).toBe(false)
    expect(logAuditEvent).not.toHaveBeenCalled()
  })

  it('should skip audit when skipAudit is true', async () => {
    const { logAuditEvent } = require('@/lib/services/audit.service')
    const operation = jest.fn().mockResolvedValue(createSuccessResult({}))

    await wrapOperation(operation, {
      entityType: 'tenant',
      entityId: '123',
      action: 'create',
      actorId: testActorId,
      actorType: testActorType,
      workspaceId: testWorkspaceId,
      skipAudit: true,
    })

    expect(logAuditEvent).not.toHaveBeenCalled()
  })

  it('should send notifications when provided', async () => {
    const { sendNotifications } = require('@/lib/services/notification.service')
    const operation = jest.fn().mockResolvedValue(createSuccessResult({}))

    await wrapOperation(operation, {
      entityType: 'tenant',
      entityId: '123',
      action: 'create',
      actorId: testActorId,
      actorType: testActorType,
      workspaceId: testWorkspaceId,
      notifications: [{
        type: 'welcome',
        recipient_id: '123',
        recipient_type: 'tenant',
        channels: ['email'],
        data: {},
      }],
    })

    expect(sendNotifications).toHaveBeenCalled()
  })

  it('should skip notifications when skipNotifications is true', async () => {
    const { sendNotifications } = require('@/lib/services/notification.service')
    const operation = jest.fn().mockResolvedValue(createSuccessResult({}))

    await wrapOperation(operation, {
      entityType: 'tenant',
      entityId: '123',
      action: 'create',
      actorId: testActorId,
      actorType: testActorType,
      workspaceId: testWorkspaceId,
      notifications: [{
        type: 'welcome',
        recipient_id: '123',
        recipient_type: 'tenant',
        channels: ['email'],
        data: {},
      }],
      skipNotifications: true,
    })

    expect(sendNotifications).not.toHaveBeenCalled()
  })

  it('should pass before/after data to audit event', async () => {
    const { createAuditEvent } = require('@/lib/services/audit.service')
    const operation = jest.fn().mockResolvedValue(createSuccessResult({}))

    await wrapOperation(operation, {
      entityType: 'tenant',
      entityId: '123',
      action: 'update',
      actorId: testActorId,
      actorType: testActorType,
      workspaceId: testWorkspaceId,
      before: { name: 'Old Name' },
      after: { name: 'New Name' },
    })

    expect(createAuditEvent).toHaveBeenCalledWith(
      'tenant',
      '123',
      'update',
      expect.any(Object),
      expect.objectContaining({
        before: { name: 'Old Name' },
        after: { name: 'New Name' },
      })
    )
  })
})

// ============================================
// Edge Cases
// ============================================

describe('Edge Cases', () => {
  it('should handle empty workflow', async () => {
    const workflow: WorkflowDefinition<{}, {}> = {
      name: 'empty_workflow',
      steps: [],
      buildOutput: () => ({}),
    }

    const result = await executeWorkflow(
      workflow,
      {},
      testActorId,
      testActorType,
      testWorkspaceId
    )

    expect(result.success).toBe(true)
    expect(result.steps_completed).toBe(0)
    expect(result.steps_total).toBe(0)
  })

  it('should handle workflow with only optional steps that all fail', async () => {
    const workflow: WorkflowDefinition<{}, { done: boolean }> = {
      name: 'all_optional_fail',
      steps: [
        {
          name: 'opt1',
          execute: async () => createErrorResult(
            createServiceError(ERROR_CODES.UNKNOWN_ERROR, 'Failed')
          ),
          optional: true,
        },
        {
          name: 'opt2',
          execute: async () => createErrorResult(
            createServiceError(ERROR_CODES.UNKNOWN_ERROR, 'Failed')
          ),
          optional: true,
        },
      ],
      buildOutput: () => ({ done: true }),
    }

    const result = await executeWorkflow(
      workflow,
      {},
      testActorId,
      testActorType,
      testWorkspaceId
    )

    expect(result.success).toBe(true)
    expect(result.failed_optional_steps).toHaveLength(2)
  })

  it('should handle null/undefined in step results', async () => {
    const workflow: WorkflowDefinition<{}, { value: null }> = {
      name: 'null_result',
      steps: [
        {
          name: 'null_step',
          execute: async () => createSuccessResult(null),
        },
      ],
      buildOutput: (results) => ({ value: results.null_step as null }),
    }

    const result = await executeWorkflow(
      workflow,
      {},
      testActorId,
      testActorType,
      testWorkspaceId
    )

    expect(result.success).toBe(true)
    expect(result.data?.value).toBeNull()
  })
})
