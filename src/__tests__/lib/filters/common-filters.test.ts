/**
 * Tests for createMonthYearFields from src/lib/filters/common-filters.ts
 */

import { createMonthYearFields } from "@/lib/filters/common-filters"

describe("createMonthYearFields", () => {
  describe("valid dates", () => {
    it("creates month and year fields with the given prefix", () => {
      const result = createMonthYearFields("2024-01-15", "created")
      expect(result).toHaveProperty("created_month")
      expect(result).toHaveProperty("created_year")
    })

    it("formats month as 'Month Year' locale string", () => {
      const result = createMonthYearFields("2024-06-15", "payment")
      expect(result["payment_month"]).toContain("June")
      expect(result["payment_month"]).toContain("2024")
    })

    it("formats year as a 4-digit string", () => {
      const result = createMonthYearFields("2024-01-01", "created")
      expect(result["created_year"]).toBe("2024")
    })

    it("uses the given prefix in both keys", () => {
      const result = createMonthYearFields("2025-03-10", "expiry")
      expect(Object.keys(result)).toEqual(["expiry_month", "expiry_year"])
    })
  })

  describe("null/undefined/empty dates", () => {
    it("returns Unknown month and year for null", () => {
      const result = createMonthYearFields(null, "created")
      expect(result["created_month"]).toBe("Unknown")
      expect(result["created_year"]).toBe("Unknown")
    })

    it("returns Unknown month and year for undefined", () => {
      const result = createMonthYearFields(undefined, "created")
      expect(result["created_month"]).toBe("Unknown")
      expect(result["created_year"]).toBe("Unknown")
    })

    it("returns Unknown month and year for empty string", () => {
      const result = createMonthYearFields("", "payment")
      expect(result["payment_month"]).toBe("Unknown")
      expect(result["payment_year"]).toBe("Unknown")
    })
  })
})
