/**
 * Tests for getStatusConfig, getStatusInfo from src/lib/status/shared.ts
 * and labelsToOptions from src/lib/status/billing.ts.
 */

import { getStatusConfig, getStatusInfo } from "@/lib/status/shared"
import { labelsToOptions } from "@/lib/status/billing"

// ============================================================================
// getStatusConfig
// ============================================================================

describe("getStatusConfig", () => {
  describe("tenant status", () => {
    it("returns config for active tenant", () => {
      const config = getStatusConfig("tenant", "active")
      expect(config.label).toBeTruthy()
      expect(config.variant).toBeTruthy()
    })

    it("returns config for checked_out tenant", () => {
      const config = getStatusConfig("tenant", "checked_out")
      expect(config.label).toBeTruthy()
    })

    it("returns config for notice_period tenant", () => {
      const config = getStatusConfig("tenant", "notice_period")
      expect(config.label).toBeTruthy()
    })
  })

  describe("complaint status", () => {
    it("returns config for open complaint", () => {
      const config = getStatusConfig("complaint", "open")
      expect(config.label).toBeTruthy()
    })

    it("returns config for resolved complaint", () => {
      const config = getStatusConfig("complaint", "resolved")
      expect(config.label).toBeTruthy()
    })
  })

  describe("refund status", () => {
    it("returns config for pending refund", () => {
      const config = getStatusConfig("refund", "pending")
      expect(config.label).toBeTruthy()
    })

    it("returns config for completed refund", () => {
      const config = getStatusConfig("refund", "completed")
      expect(config.label).toBeTruthy()
    })
  })

  describe("exit_clearance status", () => {
    it("returns config for initiated clearance", () => {
      const config = getStatusConfig("exit_clearance", "initiated")
      expect(config.label).toBeTruthy()
    })

    it("returns config for cleared status", () => {
      const config = getStatusConfig("exit_clearance", "cleared")
      expect(config.label).toBeTruthy()
    })
  })

  describe("unknown/fallback behavior", () => {
    it("falls back gracefully for unknown entity type", () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const config = getStatusConfig("unknown_entity" as any, "active")
      expect(config.label).toBe("active")
      expect(config.variant).toBe("muted")
    })

    it("falls back gracefully for unknown status value", () => {
      const config = getStatusConfig("tenant", "nonexistent_status")
      expect(config.label).toBe("nonexistent_status")
      expect(config.variant).toBe("muted")
    })

    it("returns the unknown status string as label", () => {
      const config = getStatusConfig("complaint", "bogus")
      expect(config.label).toBe("bogus")
    })
  })
})

// ============================================================================
// getStatusInfo
// ============================================================================

describe("getStatusInfo", () => {
  it("returns status and label properties", () => {
    const info = getStatusInfo("tenant", "active")
    expect(info.status).toBeTruthy()
    expect(info.label).toBeTruthy()
  })

  it("maps 'default' variant to 'muted' for StatusDot compatibility", () => {
    // Find a status with variant="default" — if any, verify it's converted
    // For statuses with other variants, confirm they pass through
    const info = getStatusInfo("visitor", "checked_in")
    // StatusDot only supports success/warning/error/info/muted — not "default"
    expect(info.status).not.toBe("default")
  })

  it("falls back to unknown status string as label", () => {
    const info = getStatusInfo("tenant", "made_up_status")
    expect(info.label).toBe("made_up_status")
    expect(info.status).toBe("muted")
  })

  it("preserves non-default variants (success, warning, error, info, muted)", () => {
    // Active status for tenant is typically "success"
    const info = getStatusInfo("tenant", "active")
    // Should be one of the valid StatusDot variants
    expect(["success", "warning", "error", "info", "muted"]).toContain(info.status)
  })
})

// ============================================================================
// labelsToOptions
// ============================================================================

describe("labelsToOptions", () => {
  const LABELS = { cash: "Cash", upi: "UPI", card: "Card", cheque: "Cheque" }

  it("returns all entries when no keys are specified", () => {
    const opts = labelsToOptions(LABELS)
    expect(opts).toHaveLength(4)
  })

  it("returns objects with value and label fields", () => {
    const opts = labelsToOptions(LABELS)
    expect(opts[0]).toHaveProperty("value")
    expect(opts[0]).toHaveProperty("label")
  })

  it("maps keys to value fields and label strings to label fields", () => {
    const opts = labelsToOptions({ cash: "Cash" })
    expect(opts[0]).toEqual({ value: "cash", label: "Cash" })
  })

  it("returns only the specified keys when keys are provided", () => {
    const opts = labelsToOptions(LABELS, ["cash", "upi"])
    expect(opts).toHaveLength(2)
    expect(opts.map((o) => o.value)).toEqual(["cash", "upi"])
  })

  it("preserves the order of the provided keys array", () => {
    const opts = labelsToOptions(LABELS, ["card", "cash", "upi"])
    expect(opts.map((o) => o.value)).toEqual(["card", "cash", "upi"])
  })

  it("skips keys that are not present in the labels object", () => {
    const opts = labelsToOptions(LABELS, ["cash", "nonexistent", "upi"])
    expect(opts).toHaveLength(2)
    expect(opts.map((o) => o.value)).toEqual(["cash", "upi"])
  })

  it("returns an empty array when given an empty labels object", () => {
    const opts = labelsToOptions({})
    expect(opts).toEqual([])
  })

  it("returns an empty array when keys array is empty", () => {
    const opts = labelsToOptions(LABELS, [])
    expect(opts).toEqual([])
  })
})
