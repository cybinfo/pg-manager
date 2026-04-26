/**
 * Tests for isSoftDeletableTable from src/lib/audit/constants.ts
 *
 * Covers: positive membership (known tables), negative membership (unknown tables),
 * type narrowing guarantee, and boundary cases.
 */

import { isSoftDeletableTable, SOFT_DELETABLE_TABLES } from "@/lib/audit/constants"

// ============================================================================
// isSoftDeletableTable
// ============================================================================

describe("isSoftDeletableTable", () => {
  describe("known soft-deletable tables — return true", () => {
    it("returns true for 'tenants'", () => {
      expect(isSoftDeletableTable("tenants")).toBe(true)
    })

    it("returns true for 'bills'", () => {
      expect(isSoftDeletableTable("bills")).toBe(true)
    })

    it("returns true for 'payments'", () => {
      expect(isSoftDeletableTable("payments")).toBe(true)
    })

    it("returns true for 'people'", () => {
      expect(isSoftDeletableTable("people")).toBe(true)
    })

    it("returns true for 'properties'", () => {
      expect(isSoftDeletableTable("properties")).toBe(true)
    })

    it("returns true for 'rooms'", () => {
      expect(isSoftDeletableTable("rooms")).toBe(true)
    })

    it("returns true for 'complaints'", () => {
      expect(isSoftDeletableTable("complaints")).toBe(true)
    })

    it("returns true for 'library_members'", () => {
      expect(isSoftDeletableTable("library_members")).toBe(true)
    })

    it("returns true for 'library_payments'", () => {
      expect(isSoftDeletableTable("library_payments")).toBe(true)
    })

    it("returns true for 'tenant_documents'", () => {
      expect(isSoftDeletableTable("tenant_documents")).toBe(true)
    })
  })

  describe("unknown tables — return false", () => {
    it("returns false for 'user_profiles' (not soft-deletable)", () => {
      expect(isSoftDeletableTable("user_profiles")).toBe(false)
    })

    it("returns false for 'workspaces'", () => {
      expect(isSoftDeletableTable("workspaces")).toBe(false)
    })

    it("returns false for an empty string", () => {
      expect(isSoftDeletableTable("")).toBe(false)
    })

    it("returns false for a random unknown name", () => {
      expect(isSoftDeletableTable("foobar_table")).toBe(false)
    })

    it("returns false for a partial match (no prefix matching)", () => {
      expect(isSoftDeletableTable("tenant")).toBe(false)
    })

    it("returns false for a table name with wrong casing", () => {
      expect(isSoftDeletableTable("Tenants")).toBe(false)
    })
  })

  describe("exhaustive coverage — all SOFT_DELETABLE_TABLES entries", () => {
    it("returns true for every entry in SOFT_DELETABLE_TABLES", () => {
      for (const table of SOFT_DELETABLE_TABLES) {
        expect(isSoftDeletableTable(table)).toBe(true)
      }
    })
  })
})
