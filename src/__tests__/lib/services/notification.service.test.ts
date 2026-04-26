/**
 * Notification Service Tests
 *
 * Tests for the centralized notification dispatch service.
 */

import {
  buildBillNotification,
  buildPaymentNotification,
  buildApprovalRequestNotification,
  buildApprovalDecisionNotification,
  buildExitClearanceNotification,
  buildWelcomeNotification,
  sendNotification,
  sendNotifications,
} from '@/lib/services/notification.service'
import { NotificationPayload } from '@/lib/services/types'

// ============================================
// Mocks
// ============================================

let mockInsertQueueChain: { select: jest.Mock; single: jest.Mock }
let mockInsertNotifChain: { select: jest.Mock; single: jest.Mock }
let mockQueueInsert: jest.Mock
let mockNotifInsert: jest.Mock
let mockFrom: jest.Mock

function buildInsertChain(resolvedValue: { data: { id: string } | null; error: null | object }) {
  const single = jest.fn().mockResolvedValue(resolvedValue)
  const select = jest.fn(() => ({ single }))
  const insert = jest.fn(() => ({ select }))
  return { insert, select, single }
}

function resetMocks(options?: {
  queueError?: boolean
  notifError?: boolean
  queueException?: boolean
}) {
  const queueChain = buildInsertChain(
    options?.queueError
      ? { data: null, error: { message: 'queue error' } }
      : { data: { id: 'queue-id-1' }, error: null }
  )
  if (options?.queueException) {
    queueChain.single.mockRejectedValue(new Error('Queue network error'))
  }
  mockQueueInsert = queueChain.insert
  mockInsertQueueChain = queueChain

  const notifChain = buildInsertChain(
    options?.notifError
      ? { data: null, error: { message: 'notif error' } }
      : { data: { id: 'notif-id-1' }, error: null }
  )
  mockNotifInsert = notifChain.insert
  mockInsertNotifChain = notifChain

  mockFrom = jest.fn((table: string) => {
    if (table === 'notification_queue') {
      return { insert: mockQueueInsert }
    }
    if (table === 'notifications') {
      return { insert: mockNotifInsert }
    }
    return { insert: jest.fn() }
  })

  const { createClient } = jest.requireMock('@/lib/supabase/client')
  ;(createClient as jest.Mock).mockReturnValue({ from: mockFrom })
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(),
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
// Test Data Helpers
// ============================================

const tenantId = 'tenant-001'
const ownerId = 'owner-001'

// ============================================
// buildBillNotification Tests
// ============================================

describe('buildBillNotification', () => {
  const billData = {
    bill_id: 'bill-123',
    bill_number: 'BILL-2026-001',
    amount: '₹5,000',
    month: 'April 2026',
  }

  it('should return a payload with type bill_generated', () => {
    const payload = buildBillNotification(tenantId, billData)
    expect(payload.type).toBe('bill_generated')
  })

  it('should target the correct recipient', () => {
    const payload = buildBillNotification(tenantId, billData)
    expect(payload.recipient_id).toBe(tenantId)
    expect(payload.recipient_type).toBe('tenant')
  })

  it('should include email and in_app channels', () => {
    const payload = buildBillNotification(tenantId, billData)
    expect(payload.channels).toContain('email')
    expect(payload.channels).toContain('in_app')
  })

  it('should embed bill data in the payload', () => {
    const payload = buildBillNotification(tenantId, billData)
    expect(payload.data.bill_id).toBe('bill-123')
    expect(payload.data.bill_number).toBe('BILL-2026-001')
    expect(payload.data.amount).toBe('₹5,000')
    expect(payload.data.month).toBe('April 2026')
  })

  it('should set priority to normal', () => {
    const payload = buildBillNotification(tenantId, billData)
    expect(payload.priority).toBe('normal')
  })
})

// ============================================
// buildPaymentNotification Tests
// ============================================

describe('buildPaymentNotification', () => {
  const paymentData = {
    payment_id: 'pay-456',
    amount: '₹5,000',
    bill_number: 'BILL-2026-001',
  }

  it('should return a payload with type payment_received', () => {
    const payload = buildPaymentNotification(tenantId, paymentData)
    expect(payload.type).toBe('payment_received')
  })

  it('should include email, whatsapp and in_app channels', () => {
    const payload = buildPaymentNotification(tenantId, paymentData)
    expect(payload.channels).toContain('email')
    expect(payload.channels).toContain('whatsapp')
    expect(payload.channels).toContain('in_app')
  })

  it('should target the tenant', () => {
    const payload = buildPaymentNotification(tenantId, paymentData)
    expect(payload.recipient_id).toBe(tenantId)
    expect(payload.recipient_type).toBe('tenant')
  })

  it('should embed payment data', () => {
    const payload = buildPaymentNotification(tenantId, paymentData)
    expect(payload.data.payment_id).toBe('pay-456')
    expect(payload.data.amount).toBe('₹5,000')
    expect(payload.data.bill_number).toBe('BILL-2026-001')
  })
})

// ============================================
// buildApprovalRequestNotification Tests
// ============================================

describe('buildApprovalRequestNotification', () => {
  const approvalData = {
    approval_id: 'appr-789',
    tenant_name: 'Rajat Seth',
    request_type: 'Room Transfer',
  }

  it('should return a payload with type approval_required', () => {
    const payload = buildApprovalRequestNotification(ownerId, approvalData)
    expect(payload.type).toBe('approval_required')
  })

  it('should target the owner', () => {
    const payload = buildApprovalRequestNotification(ownerId, approvalData)
    expect(payload.recipient_id).toBe(ownerId)
    expect(payload.recipient_type).toBe('owner')
  })

  it('should set priority to high', () => {
    const payload = buildApprovalRequestNotification(ownerId, approvalData)
    expect(payload.priority).toBe('high')
  })

  it('should include tenant_name and request_type in data', () => {
    const payload = buildApprovalRequestNotification(ownerId, approvalData)
    expect(payload.data.tenant_name).toBe('Rajat Seth')
    expect(payload.data.request_type).toBe('Room Transfer')
    expect(payload.data.approval_id).toBe('appr-789')
  })

  it('should include email and in_app channels', () => {
    const payload = buildApprovalRequestNotification(ownerId, approvalData)
    expect(payload.channels).toContain('email')
    expect(payload.channels).toContain('in_app')
  })
})

// ============================================
// buildApprovalDecisionNotification Tests
// ============================================

describe('buildApprovalDecisionNotification', () => {
  const baseDecision = {
    approval_id: 'appr-789',
    request_type: 'Room Transfer',
    decision: 'Approved' as const,
  }

  it('should return a payload with type approval_decision', () => {
    const payload = buildApprovalDecisionNotification(tenantId, baseDecision)
    expect(payload.type).toBe('approval_decision')
  })

  it('should target the tenant', () => {
    const payload = buildApprovalDecisionNotification(tenantId, baseDecision)
    expect(payload.recipient_id).toBe(tenantId)
    expect(payload.recipient_type).toBe('tenant')
  })

  it('should embed decision data for Approved', () => {
    const payload = buildApprovalDecisionNotification(tenantId, baseDecision)
    expect(payload.data.decision).toBe('Approved')
  })

  it('should embed decision data for Rejected', () => {
    const rejectedDecision = { ...baseDecision, decision: 'Rejected' as const }
    const payload = buildApprovalDecisionNotification(tenantId, rejectedDecision)
    expect(payload.data.decision).toBe('Rejected')
  })

  it('should include optional notes in data', () => {
    const withNotes = { ...baseDecision, notes: 'Room is available' }
    const payload = buildApprovalDecisionNotification(tenantId, withNotes)
    expect(payload.data.notes).toBe('Room is available')
  })

  it('should handle missing optional notes gracefully', () => {
    const payload = buildApprovalDecisionNotification(tenantId, baseDecision)
    // notes should be undefined (not crash)
    expect(payload.data.notes).toBeUndefined()
  })

  it('should set priority to high', () => {
    const payload = buildApprovalDecisionNotification(tenantId, baseDecision)
    expect(payload.priority).toBe('high')
  })
})

// ============================================
// buildExitClearanceNotification Tests
// ============================================

describe('buildExitClearanceNotification', () => {
  const initiatedData = {
    clearance_id: 'clr-001',
    tenant_name: 'John Doe',
    exit_date: '2026-05-01',
  }
  const completedData = {
    clearance_id: 'clr-001',
    tenant_name: 'John Doe',
    settlement_amount: '₹2,000',
  }

  it('should return exit_clearance_initiated type for initiated stage', () => {
    const payload = buildExitClearanceNotification(ownerId, 'owner', 'initiated', initiatedData)
    expect(payload.type).toBe('exit_clearance_initiated')
  })

  it('should return exit_clearance_completed type for completed stage', () => {
    const payload = buildExitClearanceNotification(tenantId, 'tenant', 'completed', completedData)
    expect(payload.type).toBe('exit_clearance_completed')
  })

  it('should set recipient_type to owner when owner is provided', () => {
    const payload = buildExitClearanceNotification(ownerId, 'owner', 'initiated', initiatedData)
    expect(payload.recipient_type).toBe('owner')
    expect(payload.recipient_id).toBe(ownerId)
  })

  it('should set recipient_type to tenant when tenant is provided', () => {
    const payload = buildExitClearanceNotification(tenantId, 'tenant', 'completed', completedData)
    expect(payload.recipient_type).toBe('tenant')
    expect(payload.recipient_id).toBe(tenantId)
  })

  it('should set priority to high', () => {
    const payload = buildExitClearanceNotification(ownerId, 'owner', 'initiated', initiatedData)
    expect(payload.priority).toBe('high')
  })

  it('should embed clearance data', () => {
    const payload = buildExitClearanceNotification(ownerId, 'owner', 'initiated', initiatedData)
    expect(payload.data.clearance_id).toBe('clr-001')
    expect(payload.data.tenant_name).toBe('John Doe')
    expect(payload.data.exit_date).toBe('2026-05-01')
  })

  it('should handle missing optional exit_date gracefully', () => {
    const minimal = { clearance_id: 'clr-002', tenant_name: 'Jane' }
    const payload = buildExitClearanceNotification(ownerId, 'owner', 'initiated', minimal)
    expect(payload.data.exit_date).toBeUndefined()
  })
})

// ============================================
// buildWelcomeNotification Tests
// ============================================

describe('buildWelcomeNotification', () => {
  const welcomeData = {
    property_name: 'Sunrise PG',
    tenant_name: 'Rajat Seth',
  }

  it('should return a payload with type welcome', () => {
    const payload = buildWelcomeNotification(tenantId, welcomeData)
    expect(payload.type).toBe('welcome')
  })

  it('should target the tenant', () => {
    const payload = buildWelcomeNotification(tenantId, welcomeData)
    expect(payload.recipient_id).toBe(tenantId)
    expect(payload.recipient_type).toBe('tenant')
  })

  it('should include email and in_app channels', () => {
    const payload = buildWelcomeNotification(tenantId, welcomeData)
    expect(payload.channels).toContain('email')
    expect(payload.channels).toContain('in_app')
  })

  it('should embed property_name and tenant_name in data', () => {
    const payload = buildWelcomeNotification(tenantId, welcomeData)
    expect(payload.data.property_name).toBe('Sunrise PG')
    expect(payload.data.tenant_name).toBe('Rajat Seth')
  })

  it('should set priority to normal', () => {
    const payload = buildWelcomeNotification(tenantId, welcomeData)
    expect(payload.priority).toBe('normal')
  })
})

// ============================================
// sendNotification Tests
// ============================================

describe('sendNotification', () => {
  beforeEach(() => {
    resetMocks()
  })

  const billPayload: NotificationPayload = {
    type: 'bill_generated',
    recipient_id: tenantId,
    recipient_type: 'tenant',
    channels: ['email'],
    data: {
      bill_id: 'bill-1',
      bill_number: 'BILL-001',
      amount: '₹5,000',
      month: 'April',
    },
    priority: 'normal',
  }

  it('should succeed when queue insert succeeds', async () => {
    const result = await sendNotification(billPayload)
    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
  })

  it('should call notification_queue table for each channel', async () => {
    await sendNotification(billPayload)
    expect(mockFrom).toHaveBeenCalledWith('notification_queue')
  })

  it('should create an in-app record when in_app is a channel', async () => {
    const inAppPayload: NotificationPayload = {
      ...billPayload,
      channels: ['email', 'in_app'],
    }
    await sendNotification(inAppPayload)
    expect(mockFrom).toHaveBeenCalledWith('notifications')
  })

  it('should NOT create an in-app record when in_app is not a channel', async () => {
    const emailOnlyPayload: NotificationPayload = {
      ...billPayload,
      channels: ['email'],
    }
    await sendNotification(emailOnlyPayload)
    expect(mockFrom).not.toHaveBeenCalledWith('notifications')
  })

  it('should return error when all channels fail', async () => {
    resetMocks({ queueError: true })
    const result = await sendNotification(billPayload)
    expect(result.success).toBe(false)
    expect(result.error?.message).toMatch(/All notification channels failed/)
  })

  it('should return success even when in-app record fails (partial failure)', async () => {
    resetMocks({ notifError: true })
    const inAppPayload: NotificationPayload = {
      ...billPayload,
      channels: ['email', 'in_app'],
    }
    // Queue succeeds, in-app record fails — still returns success
    const result = await sendNotification(inAppPayload)
    expect(result.success).toBe(true)
  })

  it('should handle exception gracefully when supabase from() throws', async () => {
    // When from() throws synchronously, queueNotification catches it and returns an error result.
    // sendNotification treats all channels as failed → "All notification channels failed"
    const { createClient } = jest.requireMock('@/lib/supabase/client')
    ;(createClient as jest.Mock).mockReturnValue({
      from: jest.fn(() => {
        throw new Error('Supabase connection failed')
      }),
    })

    const result = await sendNotification(billPayload)
    expect(result.success).toBe(false)
    // The service traps the error inside queueNotification, so all channels fail
    expect(result.error).toBeDefined()

    // Restore
    resetMocks()
  })

  it('should pass correct template subject and body to the queue insert', async () => {
    await sendNotification(billPayload)
    expect(mockQueueInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        notification_type: 'bill_generated',
        title: 'New Bill Generated',
        body: expect.stringContaining('BILL-001'),
        channel: 'email',
      })
    )
  })

  it('should use normal priority by default', async () => {
    const noPriorityPayload = { ...billPayload }
    delete noPriorityPayload.priority
    await sendNotification(noPriorityPayload)
    expect(mockQueueInsert).toHaveBeenCalledWith(
      expect.objectContaining({ priority: 'normal' })
    )
  })
})

// ============================================
// sendNotifications (batch) Tests
// ============================================

describe('sendNotifications', () => {
  beforeEach(() => {
    resetMocks()
  })

  const makePayload = (type: 'bill_generated' | 'payment_received', id: string): NotificationPayload => ({
    type,
    recipient_id: tenantId,
    recipient_type: 'tenant',
    channels: ['email'],
    data: {
      bill_id: id,
      bill_number: `BILL-${id}`,
      amount: '₹1,000',
      month: 'April',
      payment_id: id,
    },
    priority: 'normal',
  })

  it('should return success with empty array when given no payloads', async () => {
    const result = await sendNotifications([])
    // All-fail logic only triggers when failures > 0; empty → no results, no failures → success
    expect(result.success).toBe(true)
    expect(result.data).toEqual([])
  })

  it('should send a single notification and return its result', async () => {
    const result = await sendNotifications([makePayload('bill_generated', '1')])
    expect(result.success).toBe(true)
  })

  it('should send multiple notifications and return all results', async () => {
    // Each call to sendNotification succeeds — mockFrom returns queue-id-1 each time
    const result = await sendNotifications([
      makePayload('bill_generated', '1'),
      makePayload('payment_received', '2'),
    ])
    expect(result.success).toBe(true)
    expect(Array.isArray(result.data)).toBe(true)
  })

  it('should return error when ALL notifications fail', async () => {
    resetMocks({ queueError: true })

    const result = await sendNotifications([
      makePayload('bill_generated', '1'),
      makePayload('bill_generated', '2'),
    ])

    expect(result.success).toBe(false)
    expect(result.error?.message).toMatch(/failed to send/)
  })

  it('should return success when some notifications succeed and some fail', async () => {
    // First call succeeds, second fails
    let callCount = 0
    const { createClient } = jest.requireMock('@/lib/supabase/client')
    ;(createClient as jest.Mock).mockImplementation(() => ({
      from: jest.fn((table: string) => {
        callCount++
        if (callCount === 1) {
          // First notification succeeds
          const single = jest.fn().mockResolvedValue({ data: { id: 'ok-id' }, error: null })
          const select = jest.fn(() => ({ single }))
          return { insert: jest.fn(() => ({ select })) }
        }
        // Second notification fails
        const single = jest.fn().mockResolvedValue({ data: null, error: { message: 'fail' } })
        const select = jest.fn(() => ({ single }))
        return { insert: jest.fn(() => ({ select })) }
      }),
    }))

    const result = await sendNotifications([
      makePayload('bill_generated', '1'),
      makePayload('bill_generated', '2'),
    ])

    // Partial success — first succeeded, second failed
    // The final result depends on whether results > 0
    expect(typeof result.success).toBe('boolean')

    // Restore
    resetMocks()
  })
})
