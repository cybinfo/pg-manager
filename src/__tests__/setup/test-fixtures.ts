/**
 * Test Fixtures
 *
 * Centralized test data constants to reduce duplication across test files.
 * Import from here instead of defining inline in each test.
 *
 * @example
 * import { ACTOR_FIXTURES, VALID_INPUTS, SAMPLE_ENTITIES } from '@/__tests__/setup/test-fixtures'
 *
 * const context = createWorkflowContext(
 *   'test_workflow',
 *   ACTOR_FIXTURES.owner.id,
 *   ACTOR_FIXTURES.owner.type,
 *   ACTOR_FIXTURES.workspace.id
 * )
 */

// ============================================================================
// ACTOR FIXTURES
// ============================================================================

export const ACTOR_FIXTURES = {
  owner: {
    id: "owner-123-test",
    type: "owner" as const,
    email: "owner@test.com",
    name: "Test Owner",
  },
  staff: {
    id: "staff-456-test",
    type: "staff" as const,
    email: "staff@test.com",
    name: "Test Staff",
  },
  tenant: {
    id: "tenant-789-test",
    type: "tenant" as const,
    email: "tenant@test.com",
    name: "Test Tenant",
  },
  admin: {
    id: "admin-000-test",
    type: "platform_admin" as const,
    email: "admin@test.com",
    name: "Platform Admin",
  },
  workspace: {
    id: "workspace-abc-test",
    name: "Test Workspace",
  },
} as const

// ============================================================================
// VALID INPUTS
// ============================================================================

export const VALID_INPUTS = {
  // Indian mobile numbers
  mobile: {
    tenDigit: "9876543210",
    withCountryCode: "+919876543210",
    withZeroPrefix: "09876543210",
    with91Prefix: "919876543210",
    withSpaces: "98765 43210",
    withDashes: "98765-43210",
  },

  // Email addresses
  email: {
    standard: "test@example.com",
    withSubdomain: "user@mail.example.com",
    withPlus: "user+tag@example.com",
    corporate: "user@company.co.in",
  },

  // Indian PAN numbers
  pan: {
    individual: "ABCDE1234F",
    company: "AAACB1234D",
  },

  // Indian Aadhaar numbers
  aadhaar: {
    valid: "123456789012",
    formatted: "1234 5678 9012",
  },

  // Indian PIN codes
  pincode: {
    delhi: "110001",
    mumbai: "400001",
    bangalore: "560001",
  },

  // GST numbers
  gst: {
    valid: "27AAPFU0939F1ZV",
    karnataka: "29AADCR8741C1ZN",
  },

  // Dates
  dates: {
    today: new Date().toISOString().split("T")[0],
    yesterday: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    lastMonth: new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0],
    nextMonth: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
  },

  // Amounts
  amounts: {
    small: 100,
    medium: 5000,
    large: 50000,
    monthlyRent: 8500,
  },
} as const

// ============================================================================
// INVALID INPUTS
// ============================================================================

export const INVALID_INPUTS = {
  mobile: {
    tooShort: "98765",
    tooLong: "98765432101234567",
    startsWith5: "5876543210",
    letters: "98765ABCDE",
  },

  email: {
    noAt: "testexample.com",
    noDomain: "test@",
    multipleAt: "test@@example.com",
    spaces: "test @example.com",
  },

  pan: {
    tooShort: "ABCDE123",
    wrongFormat: "12345ABCDE",
    lowercase: "abcde1234f",
  },

  aadhaar: {
    tooShort: "12345678901",
    tooLong: "1234567890123",
    letters: "12345678901A",
  },

  pincode: {
    tooShort: "11000",
    tooLong: "1100012",
    letters: "11000A",
  },
} as const

// ============================================================================
// SAMPLE ENTITIES
// ============================================================================

export const SAMPLE_ENTITIES = {
  property: {
    id: "property-test-001",
    name: "Test Property",
    address: "123 Test Street",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    owner_id: ACTOR_FIXTURES.owner.id,
    workspace_id: ACTOR_FIXTURES.workspace.id,
    created_at: new Date().toISOString(),
  },

  room: {
    id: "room-test-001",
    room_number: "101",
    room_type: "single",
    property_id: "property-test-001",
    rent_amount: 8500,
    total_beds: 1,
    occupied_beds: 0,
    status: "available",
    owner_id: ACTOR_FIXTURES.owner.id,
    workspace_id: ACTOR_FIXTURES.workspace.id,
  },

  tenant: {
    id: "tenant-test-001",
    name: "Test Tenant",
    email: "tenant@test.com",
    phone: "9876543210",
    property_id: "property-test-001",
    room_id: "room-test-001",
    monthly_rent: 8500,
    status: "active",
    check_in_date: new Date().toISOString().split("T")[0],
    owner_id: ACTOR_FIXTURES.owner.id,
    workspace_id: ACTOR_FIXTURES.workspace.id,
  },

  bill: {
    id: "bill-test-001",
    bill_number: "BILL-001",
    tenant_id: "tenant-test-001",
    property_id: "property-test-001",
    total_amount: 8500,
    paid_amount: 0,
    balance_due: 8500,
    status: "pending",
    bill_date: new Date().toISOString().split("T")[0],
    due_date: new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
    for_month: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    owner_id: ACTOR_FIXTURES.owner.id,
    workspace_id: ACTOR_FIXTURES.workspace.id,
  },

  payment: {
    id: "payment-test-001",
    receipt_number: "RCP-001",
    tenant_id: "tenant-test-001",
    bill_id: "bill-test-001",
    amount: 8500,
    payment_method: "upi",
    payment_date: new Date().toISOString().split("T")[0],
    owner_id: ACTOR_FIXTURES.owner.id,
    workspace_id: ACTOR_FIXTURES.workspace.id,
  },

  complaint: {
    id: "complaint-test-001",
    tenant_id: "tenant-test-001",
    property_id: "property-test-001",
    title: "Test Complaint",
    description: "This is a test complaint",
    status: "open",
    priority: "medium",
    owner_id: ACTOR_FIXTURES.owner.id,
    workspace_id: ACTOR_FIXTURES.workspace.id,
  },
} as const

// ============================================================================
// ERROR SCENARIOS
// ============================================================================

export const ERROR_SCENARIOS = {
  database: {
    connectionError: { message: "connection refused", code: "ECONNREFUSED" },
    duplicateKey: { message: "duplicate key value", code: "23505" },
    foreignKey: { message: "foreign key violation", code: "23503" },
    notNull: { message: "null value in column", code: "23502" },
  },

  auth: {
    invalidCredentials: { message: "Invalid login credentials", code: "invalid_credentials" },
    sessionExpired: { message: "Session expired", code: "session_expired" },
    unauthorized: { message: "Unauthorized", code: "unauthorized" },
  },

  validation: {
    requiredField: { message: "Field is required", field: "name" },
    invalidFormat: { message: "Invalid format", field: "email" },
    outOfRange: { message: "Value out of range", field: "amount" },
  },
} as const

// ============================================================================
// TEST UUIDS
// ============================================================================

/**
 * Pre-defined UUIDs for consistent test data
 */
export const TEST_UUIDS = {
  owner1: "11111111-1111-1111-1111-111111111111",
  owner2: "22222222-2222-2222-2222-222222222222",
  tenant1: "33333333-3333-3333-3333-333333333333",
  tenant2: "44444444-4444-4444-4444-444444444444",
  property1: "55555555-5555-5555-5555-555555555555",
  property2: "66666666-6666-6666-6666-666666666666",
  room1: "77777777-7777-7777-7777-777777777777",
  room2: "88888888-8888-8888-8888-888888888888",
  bill1: "99999999-9999-9999-9999-999999999999",
  payment1: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  workspace1: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
} as const
