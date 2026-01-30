/**
 * Test Helpers
 *
 * Centralized helper functions for tests to reduce duplication.
 * Import from here instead of defining inline in each test.
 *
 * @example
 * import {
 *   getResponseBody,
 *   getErrorBody,
 *   createWorkflowContextFixture,
 *   waitFor,
 * } from '@/__tests__/setup/test-helpers'
 */

import { ACTOR_FIXTURES } from "./test-fixtures"

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface SuccessResponseBody<T = unknown> {
  success: true
  data: T
  message?: string
  meta?: {
    page?: number
    pageSize?: number
    total?: number
    [key: string]: unknown
  }
}

export interface ErrorResponseBody {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
}

export type ResponseBody<T = unknown> = SuccessResponseBody<T> | ErrorResponseBody

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

/**
 * Extract JSON body from a Response object
 *
 * @example
 * const response = apiSuccess({ id: 1 })
 * const body = await getResponseBody(response)
 * expect(body.success).toBe(true)
 */
export async function getResponseBody<T = unknown>(
  response: Response
): Promise<ResponseBody<T>> {
  return response.json() as Promise<ResponseBody<T>>
}

/**
 * Extract JSON body from a Response expecting an error
 *
 * @example
 * const response = badRequest('Invalid input')
 * const body = await getErrorBody(response)
 * expect(body.error.message).toBe('Invalid input')
 */
export async function getErrorBody(response: Response): Promise<ErrorResponseBody> {
  return response.json() as Promise<ErrorResponseBody>
}

/**
 * Extract JSON body from a Response expecting success
 *
 * @example
 * const response = apiSuccess({ id: 1, name: 'Test' })
 * const body = await getSuccessBody<{ id: number; name: string }>(response)
 * expect(body.data.name).toBe('Test')
 */
export async function getSuccessBody<T = unknown>(
  response: Response
): Promise<SuccessResponseBody<T>> {
  return response.json() as Promise<SuccessResponseBody<T>>
}

// ============================================================================
// WORKFLOW CONTEXT HELPERS
// ============================================================================

export interface WorkflowContextFixture {
  workflow_id: string
  workflow_type: string
  actor_id: string
  actor_type: "owner" | "staff" | "tenant" | "platform_admin"
  workspace_id: string
  started_at: Date
  steps: Array<{
    name: string
    status: "pending" | "running" | "completed" | "failed"
    started_at?: Date
    completed_at?: Date
    error?: string
  }>
  metadata: Record<string, unknown>
}

/**
 * Create a workflow context fixture for testing
 *
 * @example
 * const context = createWorkflowContextFixture('payment_workflow')
 * expect(context.workflow_type).toBe('payment_workflow')
 */
export function createWorkflowContextFixture(
  workflowType: string,
  overrides: Partial<WorkflowContextFixture> = {}
): WorkflowContextFixture {
  return {
    workflow_id: `wf_test_${Date.now()}`,
    workflow_type: workflowType,
    actor_id: ACTOR_FIXTURES.owner.id,
    actor_type: ACTOR_FIXTURES.owner.type,
    workspace_id: ACTOR_FIXTURES.workspace.id,
    started_at: new Date(),
    steps: [],
    metadata: {},
    ...overrides,
  }
}

// ============================================================================
// ASYNC HELPERS
// ============================================================================

/**
 * Wait for a specified duration
 *
 * @example
 * await wait(100) // Wait 100ms
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Wait for a condition to be true, with timeout
 *
 * @example
 * await waitFor(() => element.textContent === 'Loaded', { timeout: 1000 })
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: { timeout?: number; interval?: number } = {}
): Promise<void> {
  const { timeout = 5000, interval = 50 } = options
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return
    }
    await wait(interval)
  }

  throw new Error(`waitFor timed out after ${timeout}ms`)
}

/**
 * Retry a function until it succeeds or max attempts reached
 *
 * @example
 * const result = await retry(() => fetchData(), { maxAttempts: 3 })
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; delay?: number } = {}
): Promise<T> {
  const { maxAttempts = 3, delay = 100 } = options
  let lastError: Error | undefined

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      if (attempt < maxAttempts) {
        await wait(delay)
      }
    }
  }

  throw lastError
}

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

/**
 * Assert that an object has all required keys
 *
 * @example
 * assertHasKeys(user, ['id', 'name', 'email'])
 */
export function assertHasKeys<T extends object>(
  obj: T,
  keys: (keyof T)[]
): void {
  for (const key of keys) {
    if (!(key in obj)) {
      throw new Error(`Expected object to have key: ${String(key)}`)
    }
  }
}

/**
 * Assert that a value is within a range
 *
 * @example
 * assertInRange(response.status, 200, 299)
 */
export function assertInRange(
  value: number,
  min: number,
  max: number,
  message?: string
): void {
  if (value < min || value > max) {
    throw new Error(
      message || `Expected ${value} to be between ${min} and ${max}`
    )
  }
}

/**
 * Assert that a date is recent (within specified milliseconds)
 *
 * @example
 * assertRecentDate(response.createdAt, 1000) // Within last second
 */
export function assertRecentDate(
  date: Date | string,
  withinMs: number = 5000
): void {
  const dateObj = typeof date === "string" ? new Date(date) : date
  const now = Date.now()
  const diff = Math.abs(now - dateObj.getTime())

  if (diff > withinMs) {
    throw new Error(
      `Expected date to be within ${withinMs}ms of now, but was ${diff}ms`
    )
  }
}

// ============================================================================
// MOCK DATA GENERATORS
// ============================================================================

/**
 * Generate a random string of specified length
 *
 * @example
 * const id = randomString(10) // 'a1b2c3d4e5'
 */
export function randomString(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Generate a mock UUID
 *
 * @example
 * const id = mockUuid() // 'test-uuid-1234567890'
 */
let uuidCounter = 0
export function mockUuid(): string {
  return `test-uuid-${Date.now()}-${++uuidCounter}`
}

/**
 * Generate a mock phone number
 *
 * @example
 * const phone = mockPhone() // '9123456789'
 */
export function mockPhone(): string {
  const start = ["9", "8", "7", "6"][Math.floor(Math.random() * 4)]
  const rest = Array.from({ length: 9 }, () =>
    Math.floor(Math.random() * 10)
  ).join("")
  return start + rest
}

/**
 * Generate a mock email
 *
 * @example
 * const email = mockEmail('test') // 'test-1234567890@test.com'
 */
export function mockEmail(prefix: string = "user"): string {
  return `${prefix}-${Date.now()}@test.com`
}

// ============================================================================
// DATE HELPERS
// ============================================================================

/**
 * Get ISO date string for today
 *
 * @example
 * const today = getToday() // '2024-01-15'
 */
export function getToday(): string {
  return new Date().toISOString().split("T")[0]
}

/**
 * Get ISO date string for a date relative to today
 *
 * @example
 * const lastWeek = getRelativeDate(-7) // 7 days ago
 * const nextMonth = getRelativeDate(30) // 30 days from now
 */
export function getRelativeDate(daysFromToday: number): string {
  const date = new Date()
  date.setDate(date.getDate() + daysFromToday)
  return date.toISOString().split("T")[0]
}

/**
 * Get the first day of current month
 *
 * @example
 * const firstOfMonth = getFirstOfMonth() // '2024-01-01'
 */
export function getFirstOfMonth(): string {
  const date = new Date()
  date.setDate(1)
  return date.toISOString().split("T")[0]
}

/**
 * Get the last day of current month
 *
 * @example
 * const lastOfMonth = getLastOfMonth() // '2024-01-31'
 */
export function getLastOfMonth(): string {
  const date = new Date()
  date.setMonth(date.getMonth() + 1)
  date.setDate(0)
  return date.toISOString().split("T")[0]
}
