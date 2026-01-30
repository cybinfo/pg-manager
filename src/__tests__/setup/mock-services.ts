/**
 * Mock Services
 *
 * Centralized mock factories for external services and APIs.
 * Import from here instead of defining mocks inline in each test.
 *
 * @example
 * import {
 *   createMockSupabaseClient,
 *   createMockAuditService,
 *   createMockNotificationService,
 * } from '@/__tests__/setup/mock-services'
 *
 * const supabase = createMockSupabaseClient({
 *   selectResult: { data: [mockTenant], error: null }
 * })
 */

// ============================================================================
// TYPES
// ============================================================================

export interface MockSupabaseResult<T = unknown> {
  data: T | null
  error: { message: string; code?: string } | null
}

export interface MockSupabaseQueryBuilder {
  select: jest.Mock
  insert: jest.Mock
  update: jest.Mock
  delete: jest.Mock
  upsert: jest.Mock
  eq: jest.Mock
  neq: jest.Mock
  in: jest.Mock
  gte: jest.Mock
  lte: jest.Mock
  like: jest.Mock
  ilike: jest.Mock
  is: jest.Mock
  or: jest.Mock
  order: jest.Mock
  limit: jest.Mock
  range: jest.Mock
  single: jest.Mock
  maybeSingle: jest.Mock
}

export interface MockSupabaseClient {
  auth: {
    getUser: jest.Mock
    getSession: jest.Mock
    signInWithPassword: jest.Mock
    signUp: jest.Mock
    signOut: jest.Mock
    resetPasswordForEmail: jest.Mock
    updateUser: jest.Mock
    onAuthStateChange: jest.Mock
  }
  from: jest.Mock
  rpc: jest.Mock
  storage: {
    from: jest.Mock
  }
}

// ============================================================================
// SUPABASE MOCK
// ============================================================================

interface CreateMockSupabaseOptions {
  /** Default result for select queries */
  selectResult?: MockSupabaseResult
  /** Default result for insert queries */
  insertResult?: MockSupabaseResult
  /** Default result for update queries */
  updateResult?: MockSupabaseResult
  /** Default result for delete queries */
  deleteResult?: MockSupabaseResult
  /** Default result for single() */
  singleResult?: MockSupabaseResult
  /** Default result for rpc calls */
  rpcResult?: MockSupabaseResult
  /** Mock user for auth.getUser() */
  user?: { id: string; email: string } | null
  /** Mock session for auth.getSession() */
  session?: { user: { id: string; email: string } } | null
}

/**
 * Create a mock Supabase client for testing
 *
 * @example
 * const mockClient = createMockSupabaseClient({
 *   selectResult: { data: [{ id: '1', name: 'Test' }], error: null },
 *   user: { id: 'user-123', email: 'test@example.com' },
 * })
 */
export function createMockSupabaseClient(
  options: CreateMockSupabaseOptions = {}
): MockSupabaseClient {
  const {
    selectResult = { data: [], error: null },
    insertResult = { data: null, error: null },
    updateResult = { data: null, error: null },
    deleteResult = { data: null, error: null },
    singleResult = { data: null, error: null },
    rpcResult = { data: null, error: null },
    user = null,
    session = null,
  } = options

  // Create chainable query builder
  const createQueryBuilder = (): MockSupabaseQueryBuilder => {
    const builder: MockSupabaseQueryBuilder = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      is: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue(singleResult),
      maybeSingle: jest.fn().mockResolvedValue(singleResult),
    }

    // Make the builder resolve to selectResult by default
    Object.assign(builder, {
      then: (resolve: (value: MockSupabaseResult) => void) =>
        resolve(selectResult),
    })

    return builder
  }

  return {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session }, error: null }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user, session },
        error: null,
      }),
      signUp: jest.fn().mockResolvedValue({
        data: { user, session },
        error: null,
      }),
      signOut: jest.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({ error: null }),
      updateUser: jest.fn().mockResolvedValue({ data: { user }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },
    from: jest.fn().mockReturnValue(createQueryBuilder()),
    rpc: jest.fn().mockResolvedValue(rpcResult),
    storage: {
      from: jest.fn().mockReturnValue({
        upload: jest.fn().mockResolvedValue({ data: { path: "test/path" }, error: null }),
        download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
        remove: jest.fn().mockResolvedValue({ data: null, error: null }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: "https://example.com/test.jpg" },
        }),
      }),
    },
  }
}

// ============================================================================
// AUDIT SERVICE MOCK
// ============================================================================

export interface MockAuditService {
  logAuditEvent: jest.Mock
  logAuditEvents: jest.Mock
  createAuditEvent: jest.Mock
}

/**
 * Create a mock audit service for testing
 *
 * @example
 * const auditService = createMockAuditService()
 * jest.mock('@/lib/services/audit.service', () => auditService)
 */
export function createMockAuditService(): MockAuditService {
  return {
    logAuditEvent: jest.fn().mockResolvedValue({ success: true }),
    logAuditEvents: jest.fn().mockResolvedValue({
      success: true,
      data: ["audit-1", "audit-2"],
    }),
    createAuditEvent: jest.fn(
      (entityType, entityId, action, actor, changes) => ({
        id: `audit-${Date.now()}`,
        entity_type: entityType,
        entity_id: entityId,
        action,
        actor_id: actor.actor_id,
        actor_type: actor.actor_type,
        workspace_id: actor.workspace_id,
        changes,
        created_at: new Date().toISOString(),
      })
    ),
  }
}

// ============================================================================
// NOTIFICATION SERVICE MOCK
// ============================================================================

export interface MockNotificationService {
  sendNotification: jest.Mock
  sendNotifications: jest.Mock
  sendEmail: jest.Mock
  sendSMS: jest.Mock
  sendWhatsApp: jest.Mock
}

/**
 * Create a mock notification service for testing
 *
 * @example
 * const notificationService = createMockNotificationService()
 * jest.mock('@/lib/services/notification.service', () => notificationService)
 */
export function createMockNotificationService(): MockNotificationService {
  return {
    sendNotification: jest.fn().mockResolvedValue({ success: true }),
    sendNotifications: jest.fn().mockResolvedValue({
      success: true,
      data: ["notif-1", "notif-2"],
    }),
    sendEmail: jest.fn().mockResolvedValue({ success: true, messageId: "msg-1" }),
    sendSMS: jest.fn().mockResolvedValue({ success: true, messageId: "sms-1" }),
    sendWhatsApp: jest.fn().mockResolvedValue({ success: true, messageId: "wa-1" }),
  }
}

// ============================================================================
// SERVICE RESULT HELPERS
// ============================================================================

export interface ServiceResult<T> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: unknown
  }
}

/**
 * Create a success service result
 *
 * @example
 * const result = mockSuccessResult({ id: '1', name: 'Test' })
 */
export function mockSuccessResult<T>(data: T): ServiceResult<T> {
  return {
    success: true,
    data,
  }
}

/**
 * Create an error service result
 *
 * @example
 * const result = mockErrorResult('VALIDATION_ERROR', 'Invalid input')
 */
export function mockErrorResult(
  code: string,
  message: string,
  details?: unknown
): ServiceResult<never> {
  return {
    success: false,
    error: { code, message, details },
  }
}

// ============================================================================
// REQUEST/RESPONSE MOCKS
// ============================================================================

/**
 * Create a mock Request object for API testing
 *
 * @example
 * const request = createMockRequest('https://example.com/api/tenants', {
 *   method: 'POST',
 *   body: { name: 'Test' },
 *   headers: { 'Content-Type': 'application/json' },
 * })
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string
    body?: unknown
    headers?: Record<string, string>
  } = {}
): Request {
  const { method = "GET", body, headers = {} } = options

  return new Request(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  })
}

// ============================================================================
// TIMER MOCKS
// ============================================================================

/**
 * Mock timers for testing setTimeout/setInterval
 *
 * @example
 * const timerMocks = mockTimers()
 * // ... test code using setTimeout ...
 * timerMocks.advanceBy(1000) // Advance by 1 second
 * timerMocks.restore()
 */
export function mockTimers() {
  jest.useFakeTimers()

  return {
    advanceBy: (ms: number) => jest.advanceTimersByTime(ms),
    runAll: () => jest.runAllTimers(),
    runPending: () => jest.runOnlyPendingTimers(),
    restore: () => jest.useRealTimers(),
  }
}

// ============================================================================
// CONSOLE MOCKS
// ============================================================================

/**
 * Mock console methods for testing
 *
 * @example
 * const consoleMocks = mockConsole()
 * // ... test code that logs ...
 * expect(consoleMocks.error).toHaveBeenCalledWith('Error message')
 * consoleMocks.restore()
 */
export function mockConsole() {
  const originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
  }

  const mocks = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    restore: () => {
      console.log = originalConsole.log
      console.error = originalConsole.error
      console.warn = originalConsole.warn
      console.info = originalConsole.info
    },
  }

  console.log = mocks.log
  console.error = mocks.error
  console.warn = mocks.warn
  console.info = mocks.info

  return mocks
}
