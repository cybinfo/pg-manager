/**
 * Tests for Audit Utilities
 *
 * Tests all exported functions from audit-utils.ts:
 * - withCreatedBy - adds created_by field
 * - withCreatedByBatch - adds created_by to array
 * - softDelete - calls supabase update with deleted_at/deleted_by
 * - softDeleteBatch - soft deletes multiple records
 * - restoreRecord - clears deleted_at/deleted_by
 * - isDeleted - checks if record is soft-deleted
 * - filterActive - filters out soft-deleted records
 * - cascadeSoftDelete - deletes parent's related children
 */

const mockFrom = jest.fn()

/**
 * Build a chainable Supabase mock that supports any chain order.
 * Uses lazy getters to avoid infinite recursion.
 */
function buildChainableMock(resolvedValue: { data: unknown; error: unknown }): Record<string, unknown> {
  const handler: ProxyHandler<Record<string, unknown>> = {
    get(_target, prop: string) {
      if (prop === "then" || prop === "catch" || prop === "finally") {
        // Make the proxy thenable so it can resolve at any point in the chain
        return undefined
      }
      if (prop === "single") {
        return jest.fn().mockResolvedValue(resolvedValue)
      }
      // All other methods return a new proxy (lazy, no recursion)
      return jest.fn().mockReturnValue(new Proxy({}, handler))
    },
  }
  return new Proxy({}, handler)
}

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (...args: unknown[]) => mockFrom(...args),
  }),
}))

import {
  withCreatedBy,
  withCreatedByBatch,
  softDelete,
  softDeleteBatch,
  restoreRecord,
  isDeleted,
  filterActive,
  cascadeSoftDelete,
} from "@/lib/audit"

describe("Audit Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ==========================================================================
  // withCreatedBy
  // ==========================================================================

  describe("withCreatedBy", () => {
    it("adds created_by field to data object", () => {
      const data = { name: "John", phone: "1234567890" }
      const result = withCreatedBy(data, "user-123")

      expect(result).toEqual({
        name: "John",
        phone: "1234567890",
        created_by: "user-123",
      })
    })

    it("preserves all original fields", () => {
      const data = { a: 1, b: "two", c: true, d: null, e: [1, 2] }
      const result = withCreatedBy(data, "user-456")

      expect(result.a).toBe(1)
      expect(result.b).toBe("two")
      expect(result.c).toBe(true)
      expect(result.d).toBeNull()
      expect(result.e).toEqual([1, 2])
      expect(result.created_by).toBe("user-456")
    })

    it("overrides existing created_by field", () => {
      const data = { name: "John", created_by: "old-user" }
      const result = withCreatedBy(data, "new-user")

      expect(result.created_by).toBe("new-user")
    })

    it("works with empty object", () => {
      const result = withCreatedBy({}, "user-789")

      expect(result).toEqual({ created_by: "user-789" })
    })

    it("returns a new object (does not mutate original)", () => {
      const data = { name: "John" }
      const result = withCreatedBy(data, "user-123")

      expect(result).not.toBe(data)
      expect(data).not.toHaveProperty("created_by")
    })
  })

  // ==========================================================================
  // withCreatedByBatch
  // ==========================================================================

  describe("withCreatedByBatch", () => {
    it("adds created_by to all records in array", () => {
      const records = [
        { name: "Alice" },
        { name: "Bob" },
        { name: "Charlie" },
      ]
      const result = withCreatedByBatch(records, "user-123")

      expect(result).toHaveLength(3)
      result.forEach((item) => {
        expect(item.created_by).toBe("user-123")
      })
      expect(result[0].name).toBe("Alice")
      expect(result[1].name).toBe("Bob")
      expect(result[2].name).toBe("Charlie")
    })

    it("handles empty array", () => {
      const result = withCreatedByBatch([], "user-123")

      expect(result).toEqual([])
    })

    it("handles single item array", () => {
      const result = withCreatedByBatch([{ name: "Solo" }], "user-1")

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ name: "Solo", created_by: "user-1" })
    })
  })

  // ==========================================================================
  // softDelete
  // ==========================================================================

  describe("softDelete", () => {
    it("calls supabase update with deleted_at and deleted_by, returns data on success", async () => {
      const mockRecord = { id: "record-1", name: "Test", deleted_at: "2025-01-01", deleted_by: "user-1" }
      const chain = buildChainableMock({ data: mockRecord, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await softDelete("tenants", "record-1", "user-1")

      expect(mockFrom).toHaveBeenCalledWith("tenants")
      expect(result.data).toEqual(mockRecord)
      expect(result.error).toBeNull()
    })

    it("returns error when supabase update fails", async () => {
      const chain = buildChainableMock({ data: null, error: { message: "Record not found" } })
      mockFrom.mockReturnValue(chain)

      const result = await softDelete("tenants", "nonexistent", "user-1")

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error!.message).toBe("Record not found")
    })

    it("works with different table types", async () => {
      const chain1 = buildChainableMock({ data: { id: "1" }, error: null })
      mockFrom.mockReturnValue(chain1)

      await softDelete("payments", "pay-1", "user-1")
      expect(mockFrom).toHaveBeenCalledWith("payments")

      const chain2 = buildChainableMock({ data: { id: "2" }, error: null })
      mockFrom.mockReturnValue(chain2)

      await softDelete("expenses", "exp-1", "user-2")
      expect(mockFrom).toHaveBeenCalledWith("expenses")
    })
  })

  // ==========================================================================
  // softDeleteBatch
  // ==========================================================================

  describe("softDeleteBatch", () => {
    it("soft deletes multiple records and returns count", async () => {
      // Chain: from().update().in().is().select()
      // select here returns a promise (not chainable further)
      const selectResult = { data: [{ id: "1" }, { id: "2" }, { id: "3" }], error: null }
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue(selectResult),
            }),
          }),
        }),
      })

      const result = await softDeleteBatch(
        "payments",
        ["pay-1", "pay-2", "pay-3"],
        "user-1"
      )

      expect(mockFrom).toHaveBeenCalledWith("payments")
      expect(result.count).toBe(3)
      expect(result.error).toBeNull()
    })

    it("returns 0 count when no records found", async () => {
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      })

      const result = await softDeleteBatch("payments", ["nonexistent"], "user-1")

      expect(result.count).toBe(0)
      expect(result.error).toBeNull()
    })

    it("returns error when supabase fails", async () => {
      mockFrom.mockReturnValue({
        update: jest.fn().mockReturnValue({
          in: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({ data: null, error: { message: "Database error" } }),
            }),
          }),
        }),
      })

      const result = await softDeleteBatch("payments", ["1", "2"], "user-1")

      expect(result.count).toBe(0)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error!.message).toBe("Database error")
    })
  })

  // ==========================================================================
  // restoreRecord
  // ==========================================================================

  describe("restoreRecord", () => {
    it("clears deleted_at and deleted_by fields", async () => {
      const mockRestored = { id: "record-1", name: "Test", deleted_at: null, deleted_by: null }
      const chain = buildChainableMock({ data: mockRestored, error: null })
      mockFrom.mockReturnValue(chain)

      const result = await restoreRecord("tenants", "record-1")

      expect(mockFrom).toHaveBeenCalledWith("tenants")
      expect(result.data).toEqual(mockRestored)
      expect(result.error).toBeNull()
    })

    it("returns error when record is not found or already active", async () => {
      const chain = buildChainableMock({ data: null, error: { message: "No rows found" } })
      mockFrom.mockReturnValue(chain)

      const result = await restoreRecord("tenants", "nonexistent")

      expect(result.data).toBeNull()
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error!.message).toBe("No rows found")
    })
  })

  // ==========================================================================
  // isDeleted
  // ==========================================================================

  describe("isDeleted", () => {
    it("returns true when deleted_at is set", () => {
      expect(isDeleted({ deleted_at: "2025-01-01T00:00:00Z" })).toBe(true)
    })

    it("returns false when deleted_at is null", () => {
      expect(isDeleted({ deleted_at: null })).toBe(false)
    })

    it("returns false when deleted_at is undefined", () => {
      expect(isDeleted({ deleted_at: undefined })).toBe(false)
    })

    it("returns false when deleted_at is not present", () => {
      expect(isDeleted({})).toBe(false)
    })
  })

  // ==========================================================================
  // filterActive
  // ==========================================================================

  describe("filterActive", () => {
    it("filters out soft-deleted records", () => {
      const records = [
        { id: "1", name: "Active 1", deleted_at: null },
        { id: "2", name: "Deleted", deleted_at: "2025-01-01T00:00:00Z" },
        { id: "3", name: "Active 2", deleted_at: null },
      ]

      const active = filterActive(records)

      expect(active).toHaveLength(2)
      expect(active.map((r) => r.id)).toEqual(["1", "3"])
    })

    it("returns empty array when all are deleted", () => {
      const records = [
        { id: "1", deleted_at: "2025-01-01T00:00:00Z" },
        { id: "2", deleted_at: "2025-01-02T00:00:00Z" },
      ]

      const active = filterActive(records)
      expect(active).toHaveLength(0)
    })

    it("returns all records when none are deleted", () => {
      const records = [
        { id: "1", deleted_at: null },
        { id: "2", deleted_at: null },
        { id: "3", deleted_at: undefined },
      ]

      const active = filterActive(records)
      expect(active).toHaveLength(3)
    })

    it("handles empty array", () => {
      expect(filterActive([])).toEqual([])
    })

    it("handles records without deleted_at field", () => {
      const records = [{ id: "1" }, { id: "2" }] as Array<{ id: string; deleted_at?: string | null }>
      const active = filterActive(records)
      expect(active).toHaveLength(2)
    })
  })

  // ==========================================================================
  // cascadeSoftDelete
  // ==========================================================================

  describe("cascadeSoftDelete", () => {
    it("soft deletes children across multiple tables", async () => {
      // Chain for cascade: from().update().eq().is().select()
      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        const data = callCount === 1
          ? [{ id: "room-1" }, { id: "room-2" }]
          : [{ id: "meter-1" }]

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue({ data, error: null }),
              }),
            }),
          }),
        }
      })

      const result = await cascadeSoftDelete("property-1", "user-1", [
        { table: "rooms", foreignKey: "property_id" },
        { table: "meters", foreignKey: "property_id" },
      ])

      expect(result.errors).toHaveLength(0)
      expect(result.results.rooms).toBe(2)
      expect(result.results.meters).toBe(1)
    })

    it("collects errors from failed cascade operations", async () => {
      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        const response = callCount === 1
          ? { data: [{ id: "room-1" }], error: null }
          : { data: null, error: { message: "Permission denied" } }

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                select: jest.fn().mockResolvedValue(response),
              }),
            }),
          }),
        }
      })

      const result = await cascadeSoftDelete("property-1", "user-1", [
        { table: "rooms", foreignKey: "property_id" },
        { table: "meters", foreignKey: "property_id" },
      ])

      expect(result.results.rooms).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain("meters")
      expect(result.errors[0]).toContain("Permission denied")
    })

    it("handles exceptions in cascade operations", async () => {
      let callCount = 0
      mockFrom.mockImplementation(() => {
        callCount++
        if (callCount === 1) {
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                is: jest.fn().mockReturnValue({
                  select: jest.fn().mockResolvedValue({ data: [{ id: "1" }], error: null }),
                }),
              }),
            }),
          }
        }
        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              is: jest.fn().mockReturnValue({
                select: jest.fn().mockRejectedValue(new Error("Network error")),
              }),
            }),
          }),
        }
      })

      const result = await cascadeSoftDelete("parent-1", "user-1", [
        { table: "rooms", foreignKey: "property_id" },
        { table: "meters", foreignKey: "property_id" },
      ])

      expect(result.results.rooms).toBe(1)
      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain("meters")
      expect(result.errors[0]).toContain("Network error")
    })

    it("handles empty cascades array", async () => {
      const result = await cascadeSoftDelete("parent-1", "user-1", [])

      expect(result.results).toEqual({})
      expect(result.errors).toHaveLength(0)
    })

    it("records 0 count when no matching children exist", async () => {
      mockFrom.mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      }))

      const result = await cascadeSoftDelete("parent-1", "user-1", [
        { table: "rooms", foreignKey: "property_id" },
      ])

      expect(result.results.rooms).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it("records 0 count when data is null (line 230 data?.length || 0 branch)", async () => {
      mockFrom.mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              select: jest.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        }),
      }))

      const result = await cascadeSoftDelete("parent-1", "user-1", [
        { table: "rooms", foreignKey: "property_id" },
      ])

      expect(result.results.rooms).toBe(0)
      expect(result.errors).toHaveLength(0)
    })

    it("catches non-Error throws and uses 'Unknown error' (line 233 false branch)", async () => {
      mockFrom.mockImplementation(() => ({
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            is: jest.fn().mockReturnValue({
              // throw a plain string, not an Error
              select: jest.fn().mockRejectedValue("connection reset"),
            }),
          }),
        }),
      }))

      const result = await cascadeSoftDelete("parent-1", "user-1", [
        { table: "rooms", foreignKey: "property_id" },
      ])

      expect(result.errors).toHaveLength(1)
      expect(result.errors[0]).toContain("Unknown error")
    })

    it("sets correct deleted_by for cascade", async () => {
      const mockUpdate = jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          is: jest.fn().mockReturnValue({
            select: jest.fn().mockResolvedValue({ data: [{ id: "1" }], error: null }),
          }),
        }),
      })

      mockFrom.mockReturnValue({ update: mockUpdate })

      await cascadeSoftDelete("parent-1", "deleter-user", [
        { table: "rooms", foreignKey: "property_id" },
      ])

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(String),
          deleted_by: "deleter-user",
        })
      )
    })
  })
})
