/**
 * Tests for src/lib/messages.ts
 *
 * Covers: CRUD_MESSAGES dynamic functions, toastSuccess, toastError helpers
 * (AUTH_MESSAGES, VALIDATION_MESSAGES, ENTITY_MESSAGES are static string maps — not tested)
 */

import {
  CRUD_MESSAGES,
  toastSuccess,
  toastError,
  MESSAGES,
  AUTH_MESSAGES,
  VALIDATION_MESSAGES,
} from "@/lib/messages"

// ============================================================================
// CRUD_MESSAGES dynamic functions
// ============================================================================

describe("CRUD_MESSAGES", () => {
  describe("success messages", () => {
    it("createSuccess includes entity name", () => {
      expect(CRUD_MESSAGES.createSuccess("Tenant")).toBe("Tenant created successfully")
    })

    it("updateSuccess includes entity name", () => {
      expect(CRUD_MESSAGES.updateSuccess("Payment")).toBe("Payment updated successfully")
    })

    it("deleteSuccess includes entity name", () => {
      expect(CRUD_MESSAGES.deleteSuccess("Member")).toBe("Member deleted successfully")
    })

    it("saveSuccess includes entity name", () => {
      expect(CRUD_MESSAGES.saveSuccess("Bill")).toBe("Bill saved successfully")
    })
  })

  describe("error messages", () => {
    it("createFailed lowercases entity name", () => {
      expect(CRUD_MESSAGES.createFailed("Tenant")).toBe("Failed to create tenant")
    })

    it("updateFailed lowercases entity name", () => {
      expect(CRUD_MESSAGES.updateFailed("Payment")).toBe("Failed to update payment")
    })

    it("deleteFailed lowercases entity name", () => {
      expect(CRUD_MESSAGES.deleteFailed("Member")).toBe("Failed to delete member")
    })

    it("saveFailed lowercases entity name", () => {
      expect(CRUD_MESSAGES.saveFailed("Settings")).toBe("Failed to save settings")
    })

    it("notFound includes entity name", () => {
      expect(CRUD_MESSAGES.notFound("Room")).toBe("Room not found")
    })

    it("loadFailed is a static string", () => {
      expect(CRUD_MESSAGES.loadFailed).toBeTruthy()
      expect(typeof CRUD_MESSAGES.loadFailed).toBe("string")
    })

    it("unexpectedError is a static string", () => {
      expect(CRUD_MESSAGES.unexpectedError).toBeTruthy()
    })

    it("networkError is a static string", () => {
      expect(CRUD_MESSAGES.networkError).toBeTruthy()
    })
  })
})

// ============================================================================
// toastSuccess helpers
// ============================================================================

describe("toastSuccess", () => {
  it("create returns createSuccess message", () => {
    expect(toastSuccess.create("Tenant")).toBe(CRUD_MESSAGES.createSuccess("Tenant"))
  })

  it("update returns updateSuccess message", () => {
    expect(toastSuccess.update("Bill")).toBe(CRUD_MESSAGES.updateSuccess("Bill"))
  })

  it("delete returns deleteSuccess message", () => {
    expect(toastSuccess.delete("Payment")).toBe(CRUD_MESSAGES.deleteSuccess("Payment"))
  })

  it("save returns saveSuccess message", () => {
    expect(toastSuccess.save("Settings")).toBe(CRUD_MESSAGES.saveSuccess("Settings"))
  })
})

// ============================================================================
// toastError helpers
// ============================================================================

describe("toastError", () => {
  it("create returns createFailed message", () => {
    expect(toastError.create("Tenant")).toBe(CRUD_MESSAGES.createFailed("Tenant"))
  })

  it("update returns updateFailed message", () => {
    expect(toastError.update("Bill")).toBe(CRUD_MESSAGES.updateFailed("Bill"))
  })

  it("delete returns deleteFailed message", () => {
    expect(toastError.delete("Payment")).toBe(CRUD_MESSAGES.deleteFailed("Payment"))
  })

  it("save returns saveFailed message", () => {
    expect(toastError.save("Settings")).toBe(CRUD_MESSAGES.saveFailed("Settings"))
  })

  it("load is a static string", () => {
    expect(toastError.load).toBe(CRUD_MESSAGES.loadFailed)
  })

  it("notFound returns notFound message", () => {
    expect(toastError.notFound("Room")).toBe(CRUD_MESSAGES.notFound("Room"))
  })

  it("unexpected is a static string", () => {
    expect(toastError.unexpected).toBe(CRUD_MESSAGES.unexpectedError)
  })

  it("network is a static string", () => {
    expect(toastError.network).toBe(CRUD_MESSAGES.networkError)
  })
})

// ============================================================================
// MESSAGES consolidated object
// ============================================================================

describe("MESSAGES", () => {
  it("MESSAGES.auth contains auth messages", () => {
    expect(MESSAGES.auth).toBe(AUTH_MESSAGES)
    expect(MESSAGES.auth.sessionExpired).toBeTruthy()
  })

  it("MESSAGES.validation contains validation messages", () => {
    expect(MESSAGES.validation).toBe(VALIDATION_MESSAGES)
    expect(MESSAGES.validation.invalidEmail).toBeTruthy()
  })

  it("MESSAGES.crud contains crud messages", () => {
    expect(MESSAGES.crud).toBe(CRUD_MESSAGES)
    expect(typeof MESSAGES.crud.createSuccess).toBe("function")
  })
})
