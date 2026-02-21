# ManageKar - Testing Guide

> How to write, organize, and run tests for the ManageKar codebase.

---

## Running Tests

```bash
npm test                # Run full test suite
npm run test:watch      # Run in watch mode (re-runs on file change)
npm run test:coverage   # Run with coverage report

# Run a specific test file
npx jest src/__tests__/lib/supabase/transforms.test.ts

# Run tests matching a pattern
npx jest --testPathPattern="auth"

# Run with verbose output
npx jest --verbose
```

---

## Test File Organization

Tests mirror the `src/` directory structure inside `src/__tests__/`:

```
src/
├── lib/
│   ├── supabase/transforms.ts        # Source
│   ├── auth/types.ts                  # Source
│   └── api-response.ts               # Source
└── __tests__/
    ├── setup/                         # Shared fixtures, helpers, mocks (excluded from test runs)
    │   ├── index.ts                   # Centralized re-exports
    │   ├── test-fixtures.ts           # Reusable test data (UUIDs, actors, entities)
    │   ├── test-helpers.ts            # Response helpers, date utils, assertions
    │   └── mock-services.ts           # Mock factories for Supabase, audit, notifications
    ├── lib/
    │   ├── api-response.test.ts       # API response utilities
    │   ├── csrf.test.ts               # CSRF protection
    │   ├── rate-limit.test.ts         # Rate limiter
    │   ├── format.test.ts             # Formatting utilities
    │   ├── validators.test.ts         # Input validators
    │   ├── validators-extended.test.ts
    │   ├── workflow-engine.test.ts
    │   ├── supabase/
    │   │   └── transforms.test.ts     # Supabase JOIN transforms
    │   ├── auth/
    │   │   └── permissions.test.ts    # Permission types & evaluation logic
    │   └── services/
    │       ├── types.test.ts
    │       └── workflow.engine.test.ts
    └── components/
        └── currency.test.tsx          # Currency component
```

**Convention**: For a source file at `src/lib/foo/bar.ts`, the test goes at `src/__tests__/lib/foo/bar.test.ts`.

---

## Jest Configuration

- **Config file**: `jest.config.js` (uses `next/jest`)
- **Setup file**: `jest.setup.js` (runs after test framework initialization)
- **Environment**: `jest-environment-jsdom`
- **Path alias**: `@/` maps to `src/`
- **Excluded from runs**: `src/__tests__/setup/` (shared utilities only)

---

## Mocking Patterns

### Supabase Client (Global Mock)

The Supabase client is globally mocked in `jest.setup.js`. Every test gets a chainable mock client by default:

```typescript
// Already mocked globally - no setup needed for basic tests
// The mock returns { data: null, error: null } by default
```

For tests needing specific Supabase responses, use the mock factory:

```typescript
import { createMockSupabaseClient } from '@/__tests__/setup'

const mockClient = createMockSupabaseClient({
  selectResult: { data: [{ id: '1', name: 'Test Tenant' }], error: null },
  singleResult: { data: { id: '1', name: 'Test Tenant' }, error: null },
  user: { id: 'user-123', email: 'test@example.com' },
})
```

### Next.js Router (Global Mock)

Mocked globally in `jest.setup.js`:

```typescript
// Already available - useRouter, usePathname, useSearchParams all mocked
```

### NextResponse (Global Mock)

Mocked globally in `jest.setup.js` with a MockNextResponse class. Tests can call `.json()` on responses:

```typescript
import { apiSuccess } from '@/lib/api-response'

const response = apiSuccess({ id: 1 })
const body = await response.json()
expect(body.success).toBe(true)
```

### Audit & Notification Services

```typescript
import { createMockAuditService, createMockNotificationService } from '@/__tests__/setup'

const auditService = createMockAuditService()
const notifService = createMockNotificationService()
```

### Console Mocking

```typescript
import { mockConsole } from '@/__tests__/setup'

const consoleMocks = mockConsole()
// ... code that logs ...
expect(consoleMocks.warn).toHaveBeenCalledWith('expected warning')
consoleMocks.restore() // Always restore in afterEach
```

### Timer Mocking

```typescript
import { mockTimers } from '@/__tests__/setup'

const timers = mockTimers()
// ... code using setTimeout ...
timers.advanceBy(5000)
timers.restore()
```

---

## Test Structure Template

Follow this pattern when writing tests:

```typescript
/**
 * Tests for [module name]
 */

import { functionUnderTest } from '@/lib/path/to/module'

describe('Module Name', () => {
  describe('functionUnderTest', () => {
    it('handles the primary use case', () => {
      const result = functionUnderTest(validInput)
      expect(result).toEqual(expectedOutput)
    })

    it('handles null/undefined input', () => {
      expect(functionUnderTest(null)).toBeNull()
    })

    it('handles edge case: empty array', () => {
      expect(functionUnderTest([])).toEqual([])
    })
  })
})
```

Key conventions observed in this codebase:
- Top-level `describe` for the module/file
- Nested `describe` for each exported function
- `it` blocks with descriptive names starting with a verb
- Test real behavior and edge cases, not implementation details
- Use typed helper interfaces for response bodies when testing API responses
- Pure utility functions are preferred over testing React hooks directly

---

## Shared Test Fixtures

Import from `@/__tests__/setup` for commonly needed test data:

```typescript
import {
  TEST_UUIDS,           // Pre-defined UUIDs for deterministic tests
  ACTOR_FIXTURES,       // Mock actors (owner, staff, tenant)
  VALID_INPUTS,         // Valid input data for common entities
  SAMPLE_ENTITIES,      // Sample database records
  ERROR_SCENARIOS,      // Common error conditions
  mockUuid,             // Generate mock UUIDs
  mockPhone,            // Generate mock phone numbers
  mockEmail,            // Generate mock emails
} from '@/__tests__/setup'
```

---

## Modules Needing Test Coverage

The following modules are currently untested or under-tested and should be prioritized:

### High Priority (Core Business Logic)

| Module | Path | Why |
|--------|------|-----|
| Audit utilities | `src/lib/audit/audit-utils.ts` | Used on every write operation (withCreatedBy, softDelete, cascadeSoftDelete) |
| Navigation config | `src/lib/navigation/config.ts` | Controls what users see; filterNavigation logic |
| Logger | `src/lib/logger.ts` | Structured logging used everywhere |
| Feature flags | `src/lib/features/` | Controls module visibility |
| Email service | `src/lib/email/` | Cron-triggered notifications |

### Medium Priority (Data Layer)

| Module | Path | Why |
|--------|------|-----|
| Auth session utilities | `src/lib/auth/session.ts` | getSession, signOut, stored context ID management |
| Constants | `src/lib/constants.ts` | Shared config values |
| List page hook | `src/lib/hooks/use-list-page.ts` | Core data fetching for all list pages |

### Lower Priority (UI Components)

| Module | Path | Why |
|--------|------|-----|
| StatusBadge | `src/components/ui/status-badge.tsx` | Status display logic |
| PermissionGuard | `src/components/auth/` | Conditional rendering based on permissions |
| ListPageTemplate | `src/components/shared/` | Shared layout for 30+ pages |

---

## Tips

- **Test pure functions first**: Functions like `transformJoin`, `isValidPermission`, `withCreatedBy` are the easiest to test and most valuable.
- **Avoid testing React context internals directly**: Replicate the logic as a pure function if needed (see `permissions.test.ts` for an example).
- **Use the setup utilities**: Do not redefine mocks inline when `@/__tests__/setup` already provides them.
- **TypeScript strict mode**: Always add explicit types to callback parameters to avoid `implicit any` errors.
- **Check column names**: Use the correct column names from CLAUDE.md Section 5.3 (e.g., `total_beds` not `bed_count`).
