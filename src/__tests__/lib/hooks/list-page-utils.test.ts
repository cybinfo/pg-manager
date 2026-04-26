/**
 * Tests for getNestedValue from src/lib/hooks/list-page/utils.ts
 *
 * Covers dot-notation path resolution on nested objects.
 */

import { getNestedValue } from "@/lib/hooks/list-page/utils"

describe("getNestedValue", () => {
  describe("flat paths", () => {
    it("returns top-level value", () => {
      const obj = { name: "Rajat", status: "active" }
      expect(getNestedValue(obj, "name")).toBe("Rajat")
    })

    it("returns undefined for missing key", () => {
      const obj = { name: "Rajat" }
      expect(getNestedValue(obj, "email")).toBeUndefined()
    })
  })

  describe("dot-notation paths", () => {
    it("resolves one level deep", () => {
      const obj = { person: { name: "Rajat" } }
      expect(getNestedValue(obj, "person.name")).toBe("Rajat")
    })

    it("resolves two levels deep", () => {
      const obj = { property: { address: { city: "Mumbai" } } }
      expect(getNestedValue(obj, "property.address.city")).toBe("Mumbai")
    })

    it("returns undefined when intermediate key is missing", () => {
      const obj = { person: null }
      expect(getNestedValue(obj, "person.name")).toBeUndefined()
    })

    it("returns undefined when intermediate key is undefined", () => {
      const obj = { person: undefined }
      expect(getNestedValue(obj, "person.name")).toBeUndefined()
    })

    it("handles arrays at a leaf", () => {
      const obj = { tags: ["a", "b"] }
      expect(getNestedValue(obj, "tags")).toEqual(["a", "b"])
    })
  })

  describe("null / undefined safety", () => {
    it("returns undefined when traversal hits null", () => {
      const obj = { a: { b: null } }
      expect(getNestedValue(obj, "a.b.c")).toBeUndefined()
    })

    it("returns null when value itself is null", () => {
      const obj = { email: null }
      expect(getNestedValue(obj, "email")).toBeNull()
    })

    it("returns 0 for zero-value numbers", () => {
      const obj = { count: 0 }
      expect(getNestedValue(obj, "count")).toBe(0)
    })

    it("returns false for boolean false", () => {
      const obj = { active: false }
      expect(getNestedValue(obj, "active")).toBe(false)
    })
  })
})
