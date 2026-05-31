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
    entity_id: "property-test-001",
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
    entity_id: "property-test-001",
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
    entity_id: "property-test-001",
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
    entity_id: "property-test-001",
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
  person1: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  person2: "dddddddd-dddd-dddd-dddd-dddddddddddd",
  expense1: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
  staff1: "ffffffff-ffff-ffff-ffff-ffffffffffff",
  library1: "11111111-2222-3333-4444-555555555555",
  libraryMember1: "22222222-3333-4444-5555-666666666666",
  librarySection1: "33333333-4444-5555-6666-777777777777",
  librarySeat1: "44444444-5555-6666-7777-888888888888",
  libraryLocker1: "55555555-6666-7777-8888-999999999999",
  libraryMembership1: "66666666-7777-8888-9999-aaaaaaaaaaaa",
  libraryAttendance1: "77777777-8888-9999-aaaa-bbbbbbbbbbbb",
  libraryPayment1: "88888888-9999-aaaa-bbbb-cccccccccccc",
} as const

// ============================================================================
// ENTITY FACTORY FUNCTIONS
// ============================================================================

/**
 * Entity factories for creating mock data in tests.
 *
 * Each factory returns a fully-populated entity with sensible Indian defaults.
 * Pass a partial override object to customize specific fields.
 *
 * @example
 * const tenant = createMockTenant({ status: "notice_period", monthly_rent: 12000 })
 * const bill = createMockBill({ total_amount: 15000, status: "overdue" })
 * const member = createMockLibraryMember({ hours_balance: 5, status: "expired" })
 */

// -- Helpers ------------------------------------------------------------------

const TODAY = new Date().toISOString().split("T")[0]
const NOW = new Date().toISOString()
const NEXT_MONTH = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0]
const LAST_MONTH = new Date(Date.now() - 30 * 86400000).toISOString().split("T")[0]

// -- Person -------------------------------------------------------------------

interface MockPerson {
  id: string
  owner_id: string
  name: string
  phone: string | null
  email: string | null
  photo_url: string | null
  date_of_birth: string | null
  gender: "male" | "female" | "other" | null
  phone_numbers: { number: string; type: string; is_whatsapp?: boolean; is_primary?: boolean }[]
  aadhaar_number: string | null
  pan_number: string | null
  id_documents: { type: string; number: string; verified?: boolean }[]
  permanent_address: string | null
  permanent_city: string | null
  permanent_state: string | null
  permanent_pincode: string | null
  current_address: string | null
  current_city: string | null
  occupation: string | null
  company_name: string | null
  designation: string | null
  emergency_contacts: { name: string; phone: string; relation: string }[]
  tags: string[]
  person_type: "individual" | "company" | "organization"
  is_verified: boolean
  verified_at: string | null
  verified_by: string | null
  verification_notes: string | null
  is_active: boolean
  is_blocked: boolean
  blocked_reason: string | null
  blocked_at: string | null
  blood_group: string | null
  notes: string | null
  custom_fields: Record<string, unknown>
  source: string | null
  source_id: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
}

export function createMockPerson(overrides?: Partial<MockPerson>): MockPerson {
  return {
    id: TEST_UUIDS.person1,
    owner_id: TEST_UUIDS.owner1,
    name: "Aarav Sharma",
    phone: "9876543210",
    email: "aarav.sharma@gmail.com",
    photo_url: null,
    date_of_birth: "1998-05-15",
    gender: "male",
    phone_numbers: [
      { number: "9876543210", type: "personal", is_whatsapp: true, is_primary: true },
    ],
    aadhaar_number: "234567890123",
    pan_number: "ABCDE1234F",
    id_documents: [
      { type: "aadhaar", number: "234567890123", verified: true },
    ],
    permanent_address: "45, Sector 12",
    permanent_city: "Noida",
    permanent_state: "Uttar Pradesh",
    permanent_pincode: "201301",
    current_address: "B-204, Green Park",
    current_city: "Delhi",
    occupation: "Software Engineer",
    company_name: "Infosys",
    designation: "Senior Developer",
    emergency_contacts: [
      { name: "Rajesh Sharma", phone: "9812345678", relation: "Father" },
    ],
    tags: ["tenant"],
    person_type: "individual",
    is_verified: true,
    verified_at: NOW,
    verified_by: TEST_UUIDS.owner1,
    verification_notes: null,
    is_active: true,
    is_blocked: false,
    blocked_reason: null,
    blocked_at: null,
    blood_group: "B+",
    notes: null,
    custom_fields: {},
    source: "tenant",
    source_id: null,
    created_at: NOW,
    updated_at: NOW,
    created_by: TEST_UUIDS.owner1,
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  }
}

// -- Property -----------------------------------------------------------------

interface MockProperty {
  id: string
  owner_id: string
  name: string
  address: string | null
  city: string
  state: string | null
  pincode: string | null
  phone: string | null
  email: string | null
  property_type: "pg" | "hostel" | "apartment" | "house"
  description: string | null
  amenities: string[]
  rules: string[]
  total_floors: number
  is_active: boolean
  settings: Record<string, unknown>
  created_at: string
  updated_at: string
  manager_name: string | null
  manager_phone: string | null
  website_slug: string | null
  website_enabled: boolean
  created_by?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
  room_count?: number
  tenant_count?: number
}

export function createMockProperty(overrides?: Partial<MockProperty>): MockProperty {
  return {
    id: TEST_UUIDS.property1,
    owner_id: TEST_UUIDS.owner1,
    name: "Sharma Boys PG",
    address: "B-12, Karol Bagh",
    city: "Delhi",
    state: "Delhi",
    pincode: "110005",
    phone: "9811234567",
    email: "sharmapg@gmail.com",
    property_type: "pg",
    description: "Well-maintained PG near metro station",
    amenities: ["wifi", "laundry", "parking"],
    rules: ["No smoking", "Gate closes at 11 PM"],
    total_floors: 3,
    is_active: true,
    settings: {},
    created_at: NOW,
    updated_at: NOW,
    manager_name: "Vikram Singh",
    manager_phone: "9898765432",
    website_slug: "sharma-boys-pg",
    website_enabled: false,
    created_by: TEST_UUIDS.owner1,
    deleted_at: null,
    deleted_by: null,
    ...overrides,
  }
}

// -- Room ---------------------------------------------------------------------

interface MockRoom {
  id: string
  owner_id: string
  entity_id: string
  room_number: string
  room_type: "single" | "double" | "triple" | "quad" | "dormitory"
  floor: number
  total_beds: number
  occupied_beds: number
  rent_amount: number
  deposit_amount: number | null
  status: string
  has_ac: boolean
  has_attached_bathroom: boolean
  has_balcony: boolean
  amenities: string[]
  notes: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  created_by?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
  property?: { id: string; name: string; address?: string | null } | null
}

export function createMockRoom(overrides?: Partial<MockRoom>): MockRoom {
  return {
    id: TEST_UUIDS.room1,
    owner_id: TEST_UUIDS.owner1,
    entity_id: TEST_UUIDS.property1,
    room_number: "101",
    room_type: "double",
    floor: 1,
    total_beds: 2,
    occupied_beds: 1,
    rent_amount: 7500,
    deposit_amount: 7500,
    status: "available",
    has_ac: true,
    has_attached_bathroom: true,
    has_balcony: false,
    amenities: ["cupboard", "study_table"],
    notes: null,
    is_active: true,
    created_at: NOW,
    updated_at: NOW,
    created_by: TEST_UUIDS.owner1,
    deleted_at: null,
    deleted_by: null,
    property: { id: TEST_UUIDS.property1, name: "Sharma Boys PG" },
    ...overrides,
  }
}

// -- Tenant -------------------------------------------------------------------

interface MockTenant {
  id: string
  owner_id: string
  person_id: string | null
  entity_id: string
  room_id: string | null
  name: string
  email: string | null
  phone: string
  photo_url: string | null
  profile_photo: string | null
  check_in_date: string
  check_out_date: string | null
  expected_exit_date: string | null
  notice_date: string | null
  monthly_rent: number
  security_deposit: number
  status: "active" | "notice_period" | "checked_out" | "moved_out"
  police_verification_status: "pending" | "submitted" | "verified"
  agreement_signed: boolean
  notes: string | null
  custom_fields: Record<string, string>
  guardian_contacts: { name: string; phone: string; relation: string }[] | null
  created_at: string
  updated_at: string
  created_by?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
  property?: { id: string; name: string; address?: string } | null
  room?: { id: string; room_number: string; room_type?: string } | null
  person?: MockPerson | null
}

export function createMockTenant(overrides?: Partial<MockTenant>): MockTenant {
  return {
    id: TEST_UUIDS.tenant1,
    owner_id: TEST_UUIDS.owner1,
    person_id: TEST_UUIDS.person1,
    entity_id: TEST_UUIDS.property1,
    room_id: TEST_UUIDS.room1,
    name: "Aarav Sharma",
    email: "aarav.sharma@gmail.com",
    phone: "9876543210",
    photo_url: null,
    profile_photo: null,
    check_in_date: LAST_MONTH,
    check_out_date: null,
    expected_exit_date: null,
    notice_date: null,
    monthly_rent: 8500,
    security_deposit: 8500,
    status: "active",
    police_verification_status: "pending",
    agreement_signed: false,
    notes: null,
    custom_fields: {},
    guardian_contacts: [
      { name: "Rajesh Sharma", phone: "9812345678", relation: "Father" },
    ],
    created_at: NOW,
    updated_at: NOW,
    created_by: TEST_UUIDS.owner1,
    deleted_at: null,
    deleted_by: null,
    property: { id: TEST_UUIDS.property1, name: "Sharma Boys PG" },
    room: { id: TEST_UUIDS.room1, room_number: "101", room_type: "double" },
    person: {
      id: TEST_UUIDS.person1,
      owner_id: TEST_UUIDS.owner1,
      name: "Aarav Sharma",
      phone: "9876543210",
      email: "aarav.sharma@gmail.com",
      photo_url: null,
      date_of_birth: null,
      gender: "male",
      phone_numbers: [],
      aadhaar_number: null,
      pan_number: null,
      id_documents: [],
      permanent_address: null,
      permanent_city: null,
      permanent_state: null,
      permanent_pincode: null,
      current_address: null,
      current_city: null,
      occupation: null,
      company_name: null,
      designation: null,
      emergency_contacts: [],
      tags: ["tenant"],
      person_type: "individual",
      is_verified: false,
      verified_at: null,
      verified_by: null,
      verification_notes: null,
      is_active: true,
      is_blocked: false,
      blocked_reason: null,
      blocked_at: null,
      blood_group: null,
      notes: null,
      custom_fields: {},
      source: "tenant",
      source_id: null,
      created_at: NOW,
      updated_at: NOW,
    },
    ...overrides,
  }
}

// -- Bill ---------------------------------------------------------------------

interface MockBill {
  id: string
  owner_id: string
  tenant_id: string
  entity_id: string
  bill_number: string
  bill_date: string
  due_date: string
  for_month: string
  total_amount: number
  paid_amount: number
  balance_due: number
  status: "unpaid" | "partial" | "paid" | "overdue" | "cancelled"
  line_items: { id: string; description: string; amount: number; quantity?: number }[]
  notes: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
  tenant?: { id: string; name: string; phone?: string; person_id?: string } | null
  property?: { id: string; name: string; address?: string } | null
}

export function createMockBill(overrides?: Partial<MockBill>): MockBill {
  return {
    id: TEST_UUIDS.bill1,
    owner_id: TEST_UUIDS.owner1,
    tenant_id: TEST_UUIDS.tenant1,
    entity_id: TEST_UUIDS.property1,
    bill_number: "BILL-2026-001",
    bill_date: TODAY,
    due_date: NEXT_MONTH,
    for_month: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }),
    total_amount: 8500,
    paid_amount: 0,
    balance_due: 8500,
    status: "unpaid",
    line_items: [
      { id: "li-001", description: "Monthly Rent", amount: 7500 },
      { id: "li-002", description: "Electricity Charges", amount: 600 },
      { id: "li-003", description: "Water Charges", amount: 400 },
    ],
    notes: null,
    created_at: NOW,
    updated_at: NOW,
    created_by: TEST_UUIDS.owner1,
    deleted_at: null,
    deleted_by: null,
    tenant: { id: TEST_UUIDS.tenant1, name: "Aarav Sharma", phone: "9876543210", person_id: TEST_UUIDS.person1 },
    property: { id: TEST_UUIDS.property1, name: "Sharma Boys PG" },
    ...overrides,
  }
}

// -- Payment ------------------------------------------------------------------

interface MockPayment {
  id: string
  owner_id: string
  tenant_id: string
  entity_id: string
  bill_id: string | null
  charge_type_id: string | null
  amount: number
  payment_date: string
  payment_method: "cash" | "upi" | "bank_transfer" | "cheque" | "card" | "other"
  receipt_number: string | null
  for_period: string | null
  transaction_reference: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
  tenant?: { id: string; name: string; phone?: string; person_id?: string } | null
  property?: { id: string; name: string } | null
  bill?: { id: string; bill_number: string; total_amount?: number; balance_due?: number } | null
  charge_type?: { id: string; name: string } | null
}

export function createMockPayment(overrides?: Partial<MockPayment>): MockPayment {
  return {
    id: TEST_UUIDS.payment1,
    owner_id: TEST_UUIDS.owner1,
    tenant_id: TEST_UUIDS.tenant1,
    entity_id: TEST_UUIDS.property1,
    bill_id: TEST_UUIDS.bill1,
    charge_type_id: null,
    amount: 8500,
    payment_date: TODAY,
    payment_method: "upi",
    receipt_number: "RCP-2026-001",
    for_period: null,
    transaction_reference: "UPI/426198734512",
    notes: null,
    created_at: NOW,
    updated_at: NOW,
    created_by: TEST_UUIDS.owner1,
    deleted_at: null,
    deleted_by: null,
    tenant: { id: TEST_UUIDS.tenant1, name: "Aarav Sharma", phone: "9876543210" },
    property: { id: TEST_UUIDS.property1, name: "Sharma Boys PG" },
    bill: { id: TEST_UUIDS.bill1, bill_number: "BILL-2026-001", total_amount: 8500, balance_due: 0 },
    charge_type: null,
    ...overrides,
  }
}

// -- Expense ------------------------------------------------------------------

interface MockExpense {
  id: string
  owner_id: string
  entity_id: string | null
  expense_type_id: string | null
  amount: number
  expense_date: string
  description: string
  vendor_name: string | null
  reference_number: string | null
  payment_method: string | null
  receipt_url: string | null
  notes: string | null
  status: "pending" | "approved" | "paid" | "rejected"
  approved_by: string | null
  approved_at: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
  property?: { id: string; name: string } | null
  expense_type?: { id: string; name: string; code: string } | null
}

export function createMockExpense(overrides?: Partial<MockExpense>): MockExpense {
  return {
    id: TEST_UUIDS.expense1,
    owner_id: TEST_UUIDS.owner1,
    entity_id: TEST_UUIDS.property1,
    expense_type_id: "etype-001",
    amount: 3500,
    expense_date: TODAY,
    description: "Plumber repair for bathroom on 2nd floor",
    vendor_name: "Gupta Plumbing Services",
    reference_number: null,
    payment_method: "cash",
    receipt_url: null,
    notes: null,
    status: "paid",
    approved_by: TEST_UUIDS.owner1,
    approved_at: NOW,
    created_at: NOW,
    updated_at: NOW,
    created_by: TEST_UUIDS.owner1,
    deleted_at: null,
    deleted_by: null,
    property: { id: TEST_UUIDS.property1, name: "Sharma Boys PG" },
    expense_type: { id: "etype-001", name: "Maintenance", code: "MAINT" },
    ...overrides,
  }
}

// -- Staff Member -------------------------------------------------------------

interface MockStaffMember {
  id: string
  owner_id: string
  person_id: string | null
  name: string
  email: string
  phone: string | null
  is_active: boolean
  user_id: string | null
  created_at: string
  updated_at: string
  person?: { id: string; photo_url: string | null } | null
}

export function createMockStaffMember(overrides?: Partial<MockStaffMember>): MockStaffMember {
  return {
    id: TEST_UUIDS.staff1,
    owner_id: TEST_UUIDS.owner1,
    person_id: TEST_UUIDS.person2,
    name: "Priya Verma",
    email: "priya.verma@gmail.com",
    phone: "9871234567",
    is_active: true,
    user_id: null,
    created_at: NOW,
    updated_at: NOW,
    person: { id: TEST_UUIDS.person2, photo_url: null },
    ...overrides,
  }
}

// -- Library Member -----------------------------------------------------------

interface MockLibraryMember {
  id: string
  owner_id: string
  workspace_id: string
  entity_id: string
  person_id: string | null
  name: string
  phone: string | null
  email: string | null
  member_code: string | null
  id_proof_type: string | null
  id_proof_number: string | null
  id_proof_photo_url: string | null
  current_subscription_id: string | null
  assigned_seat_id: string | null
  hours_balance: number
  hours_used: number
  preferred_slot: string | null
  status: "active" | "expired" | "suspended" | "cancelled"
  join_date: string
  expiry_date: string | null
  locker_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
  person?: MockPerson | null
  library?: { id: string; name: string } | null
  assigned_seat?: { id: string; seat_number: string; section?: { id: string; name: string } | null } | null
  locker?: { id: string; locker_number: string } | null
  current_subscription?: MockLibraryMembership | null
}

interface MockLibraryMembership {
  id: string
  owner_id: string
  workspace_id: string
  member_id: string
  plan_id: string | null
  plan_name: string
  hours_included: number | null
  amount: number
  discount_amount: number
  final_amount: number
  time_slot: string | null
  start_date: string
  end_date: string
  hours_remaining: number | null
  hours_used: number
  status: "active" | "expired" | "cancelled" | "upgraded"
  payment_id: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
  member?: { id: string; name: string; member_code: string | null } | null
  payment?: { id: string; receipt_number: string | null; amount: number } | null
}

export function createMockLibraryMember(overrides?: Partial<MockLibraryMember>): MockLibraryMember {
  return {
    id: TEST_UUIDS.libraryMember1,
    owner_id: TEST_UUIDS.owner1,
    workspace_id: TEST_UUIDS.workspace1,
    entity_id: TEST_UUIDS.library1,
    person_id: TEST_UUIDS.person1,
    name: "Neha Gupta",
    phone: "9654321098",
    email: "neha.gupta@gmail.com",
    member_code: "NGH-001",
    id_proof_type: "aadhaar",
    id_proof_number: "345678901234",
    id_proof_photo_url: null,
    current_subscription_id: TEST_UUIDS.libraryMembership1,
    assigned_seat_id: TEST_UUIDS.librarySeat1,
    hours_balance: 18,
    hours_used: 72,
    preferred_slot: "Morning",
    status: "active",
    join_date: LAST_MONTH,
    expiry_date: NEXT_MONTH,
    locker_id: TEST_UUIDS.libraryLocker1,
    notes: null,
    created_at: NOW,
    updated_at: NOW,
    created_by: TEST_UUIDS.owner1,
    deleted_at: null,
    deleted_by: null,
    person: null,
    library: { id: TEST_UUIDS.library1, name: "New Green High Library" },
    assigned_seat: { id: TEST_UUIDS.librarySeat1, seat_number: "A-12", section: { id: TEST_UUIDS.librarySection1, name: "AC Hall" } },
    locker: { id: TEST_UUIDS.libraryLocker1, locker_number: "L-05" },
    current_subscription: null,
    ...overrides,
  }
}

// -- Library Membership (Subscription) ----------------------------------------

export function createMockLibraryMembership(overrides?: Partial<MockLibraryMembership>): MockLibraryMembership {
  return {
    id: TEST_UUIDS.libraryMembership1,
    owner_id: TEST_UUIDS.owner1,
    workspace_id: TEST_UUIDS.workspace1,
    member_id: TEST_UUIDS.libraryMember1,
    plan_id: null,
    plan_name: "9 Hours Plan",
    hours_included: 9,
    amount: 900,
    discount_amount: 0,
    final_amount: 900,
    time_slot: "Morning",
    start_date: LAST_MONTH,
    end_date: NEXT_MONTH,
    hours_remaining: 18,
    hours_used: 72,
    status: "active",
    payment_id: TEST_UUIDS.libraryPayment1,
    created_at: NOW,
    updated_at: NOW,
    created_by: TEST_UUIDS.owner1,
    deleted_at: null,
    deleted_by: null,
    member: { id: TEST_UUIDS.libraryMember1, name: "Neha Gupta", member_code: "NGH-001" },
    payment: { id: TEST_UUIDS.libraryPayment1, receipt_number: "LRCP-001", amount: 900 },
    ...overrides,
  }
}

// -- Library Attendance -------------------------------------------------------

interface MockLibraryAttendance {
  id: string
  owner_id: string
  workspace_id: string
  member_id: string
  membership_id: string | null
  attendance_date: string
  check_in_time: string
  check_out_time: string | null
  hours_spent: number | null
  seat_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  created_by?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
  member?: { id: string; name: string; member_code: string | null; person?: { id: string; name: string; photo_url: string | null } | null } | null
  seat?: { id: string; seat_number: string } | null
}

export function createMockLibraryAttendance(overrides?: Partial<MockLibraryAttendance>): MockLibraryAttendance {
  return {
    id: TEST_UUIDS.libraryAttendance1,
    owner_id: TEST_UUIDS.owner1,
    workspace_id: TEST_UUIDS.workspace1,
    member_id: TEST_UUIDS.libraryMember1,
    membership_id: TEST_UUIDS.libraryMembership1,
    attendance_date: TODAY,
    check_in_time: `${TODAY}T08:30:00+05:30`,
    check_out_time: null,
    hours_spent: null,
    seat_id: TEST_UUIDS.librarySeat1,
    notes: null,
    created_at: NOW,
    updated_at: NOW,
    created_by: TEST_UUIDS.owner1,
    deleted_at: null,
    deleted_by: null,
    member: {
      id: TEST_UUIDS.libraryMember1,
      name: "Neha Gupta",
      member_code: "NGH-001",
      person: { id: TEST_UUIDS.person1, name: "Neha Gupta", photo_url: null },
    },
    seat: { id: TEST_UUIDS.librarySeat1, seat_number: "A-12" },
    ...overrides,
  }
}

// -- Library Payment ----------------------------------------------------------

interface MockLibraryPayment {
  id: string
  owner_id: string
  workspace_id: string
  member_id: string
  receipt_number: string | null
  payment_date: string
  amount: number
  payment_type: "subscription" | "locker_rent" | "locker_deposit" | "fine" | "other"
  payment_method: "cash" | "upi" | "card" | "bank_transfer" | "cheque" | "paytm" | "other"
  payment_reference: string | null
  membership_id: string | null
  locker_assignment_id: string | null
  notes: string | null
  status: "completed" | "pending" | "refunded"
  created_at: string
  updated_at: string
  created_by?: string | null
  deleted_at?: string | null
  deleted_by?: string | null
  member?: { id: string; name: string; member_code: string | null; person?: { id: string; name: string; photo_url: string | null } | null } | null
}

export function createMockLibraryPayment(overrides?: Partial<MockLibraryPayment>): MockLibraryPayment {
  return {
    id: TEST_UUIDS.libraryPayment1,
    owner_id: TEST_UUIDS.owner1,
    workspace_id: TEST_UUIDS.workspace1,
    member_id: TEST_UUIDS.libraryMember1,
    receipt_number: "LRCP-2026-001",
    payment_date: TODAY,
    amount: 900,
    payment_type: "subscription",
    payment_method: "upi",
    payment_reference: "UPI/938271645032",
    membership_id: TEST_UUIDS.libraryMembership1,
    locker_assignment_id: null,
    notes: null,
    status: "completed",
    created_at: NOW,
    updated_at: NOW,
    created_by: TEST_UUIDS.owner1,
    deleted_at: null,
    deleted_by: null,
    member: {
      id: TEST_UUIDS.libraryMember1,
      name: "Neha Gupta",
      member_code: "NGH-001",
      person: { id: TEST_UUIDS.person1, name: "Neha Gupta", photo_url: null },
    },
    ...overrides,
  }
}

// -- Convenience: create related entity sets ----------------------------------

/**
 * Creates a complete tenant setup: person + property + room + tenant.
 * Useful for tests that need a fully-linked tenant record.
 */
export function createMockTenantWithRelations(tenantOverrides?: Partial<MockTenant>) {
  const person = createMockPerson()
  const property = createMockProperty()
  const room = createMockRoom()
  const tenant = createMockTenant(tenantOverrides)
  return { person, property, room, tenant }
}

/**
 * Creates a complete library member setup: member + membership + attendance.
 * Useful for tests that need a fully-linked library member record.
 */
export function createMockLibraryMemberWithRelations(memberOverrides?: Partial<MockLibraryMember>) {
  const member = createMockLibraryMember(memberOverrides)
  const membership = createMockLibraryMembership()
  const attendance = createMockLibraryAttendance()
  const payment = createMockLibraryPayment()
  return { member, membership, attendance, payment }
}
