/**
 * Test Setup Utilities
 *
 * Centralized exports for all test utilities.
 * Import from here for convenience.
 *
 * @example
 * import {
 *   // Fixtures
 *   ACTOR_FIXTURES,
 *   VALID_INPUTS,
 *   SAMPLE_ENTITIES,
 *
 *   // Helpers
 *   getResponseBody,
 *   createWorkflowContextFixture,
 *   wait,
 *
 *   // Mocks
 *   createMockSupabaseClient,
 *   createMockAuditService,
 * } from '@/__tests__/setup'
 */

// Test Fixtures
export {
  ACTOR_FIXTURES,
  VALID_INPUTS,
  INVALID_INPUTS,
  SAMPLE_ENTITIES,
  ERROR_SCENARIOS,
  TEST_UUIDS,
} from "./test-fixtures"

// Test Helpers
export {
  // Response types
  type SuccessResponseBody,
  type ErrorResponseBody,
  type ResponseBody,

  // Response helpers
  getResponseBody,
  getErrorBody,
  getSuccessBody,

  // Workflow helpers
  type WorkflowContextFixture,
  createWorkflowContextFixture,

  // Async helpers
  wait,
  waitFor,
  retry,

  // Assertion helpers
  assertHasKeys,
  assertInRange,
  assertRecentDate,

  // Mock data generators
  randomString,
  mockUuid,
  mockPhone,
  mockEmail,

  // Date helpers
  getToday,
  getRelativeDate,
  getFirstOfMonth,
  getLastOfMonth,
} from "./test-helpers"

// Mock Services
export {
  // Types
  type MockSupabaseResult,
  type MockSupabaseQueryBuilder,
  type MockSupabaseClient,
  type MockAuditService,
  type MockNotificationService,
  type ServiceResult,

  // Supabase mocks
  createMockSupabaseClient,

  // Service mocks
  createMockAuditService,
  createMockNotificationService,

  // Result helpers
  mockSuccessResult,
  mockErrorResult,

  // Request/Response mocks
  createMockRequest,

  // Timer mocks
  mockTimers,

  // Console mocks
  mockConsole,
} from "./mock-services"
