/**
 * Barrel export smoke tests
 *
 * These files are pure re-export index files. Importing them and checking
 * a few key exports is sufficient to drive statement/line coverage to 100%.
 */

// ============================================================================
// src/lib/hooks/index.ts
// ============================================================================

describe("lib/hooks barrel", () => {
  it("exports useAsyncOperation", async () => {
    const mod = await import("@/lib/hooks")
    expect(typeof mod.useAsyncOperation).toBe("function")
  })

  it("exports useDebounce", async () => {
    const mod = await import("@/lib/hooks")
    expect(typeof mod.useDebounce).toBe("function")
  })

  it("exports useCopyToClipboard", async () => {
    const mod = await import("@/lib/hooks")
    expect(typeof mod.useCopyToClipboard).toBe("function")
  })

  it("exports useDialogState", async () => {
    const mod = await import("@/lib/hooks")
    expect(typeof mod.useDialogState).toBe("function")
  })

  it("exports useDeleteConfirmation", async () => {
    const mod = await import("@/lib/hooks")
    expect(typeof mod.useDeleteConfirmation).toBe("function")
  })

  it("exports useMemberPortalData", async () => {
    const mod = await import("@/lib/hooks")
    expect(typeof mod.useMemberPortalData).toBe("function")
  })

  it("exports useTableViews (selective export)", async () => {
    const mod = await import("@/lib/hooks")
    expect(typeof mod.useTableViews).toBe("function")
  })

  it("exports useCountUp", async () => {
    const mod = await import("@/lib/hooks")
    expect(typeof mod.useCountUp).toBe("function")
  })
})

// ============================================================================
// src/lib/columns/index.ts
// ============================================================================

describe("lib/columns barrel", () => {
  it("exports statusColumn builder", async () => {
    const mod = await import("@/lib/columns")
    expect(typeof mod.statusColumn).toBe("function")
  })

  it("exports currencyColumn builder", async () => {
    const mod = await import("@/lib/columns")
    expect(typeof mod.currencyColumn).toBe("function")
  })

  it("exports createTotalMetric factory", async () => {
    const mod = await import("@/lib/columns")
    expect(typeof mod.createTotalMetric).toBe("function")
  })

  it("exports createActionsColumn factory", async () => {
    const mod = await import("@/lib/columns")
    expect(typeof mod.createActionsColumn).toBe("function")
  })
})

// ============================================================================
// src/lib/services/index.ts
// ============================================================================

describe("lib/services barrel", () => {
  it("exports logAuditEvent", async () => {
    const mod = await import("@/lib/services")
    expect(typeof mod.logAuditEvent).toBe("function")
  })

  it("exports sendNotification", async () => {
    const mod = await import("@/lib/services")
    expect(typeof mod.sendNotification).toBe("function")
  })

  it("exports executeWorkflow", async () => {
    const mod = await import("@/lib/services")
    expect(typeof mod.executeWorkflow).toBe("function")
  })

  it("exports buildPaymentNotification", async () => {
    const mod = await import("@/lib/services")
    expect(typeof mod.buildPaymentNotification).toBe("function")
  })
})

// ============================================================================
// src/lib/workflows/index.ts
// ============================================================================

describe("lib/workflows barrel", () => {
  it("exports createTenant", async () => {
    const mod = await import("@/lib/workflows")
    expect(typeof mod.createTenant).toBe("function")
  })

  it("exports recordPayment", async () => {
    const mod = await import("@/lib/workflows")
    expect(typeof mod.recordPayment).toBe("function")
  })

  it("exports initiateExitClearance", async () => {
    const mod = await import("@/lib/workflows")
    expect(typeof mod.initiateExitClearance).toBe("function")
  })

  it("exports processApproval", async () => {
    const mod = await import("@/lib/workflows")
    expect(typeof mod.processApproval).toBe("function")
  })
})

// src/lib/pdf/index.ts uses @react-pdf/renderer (ESM-only) — not testable in Jest
