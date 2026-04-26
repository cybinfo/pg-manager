/**
 * Tests for toast-helpers.ts
 * Covers showSuccess, showError, showInfo, showWarning.
 */

const mockToastSuccess = jest.fn()
const mockToastError = jest.fn()
const mockToastInfo = jest.fn()
const mockToastWarning = jest.fn()

jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
    info: (...args: unknown[]) => mockToastInfo(...args),
    warning: (...args: unknown[]) => mockToastWarning(...args),
  },
}))

import { showSuccess, showError, showInfo, showWarning } from "@/lib/toast-helpers"

describe("toast-helpers", () => {
  beforeEach(() => {
    mockToastSuccess.mockClear()
    mockToastError.mockClear()
    mockToastInfo.mockClear()
    mockToastWarning.mockClear()
  })

  describe("showSuccess", () => {
    it("calls toast.success with the message", () => {
      showSuccess("Payment recorded")
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Payment recorded",
        expect.objectContaining({ description: undefined })
      )
    })

    it("passes description when provided", () => {
      showSuccess("Done", "3 records updated")
      expect(mockToastSuccess).toHaveBeenCalledWith(
        "Done",
        expect.objectContaining({ description: "3 records updated" })
      )
    })
  })

  describe("showError", () => {
    it("calls toast.error with the message", () => {
      showError("Something went wrong")
      expect(mockToastError).toHaveBeenCalledWith(
        "Something went wrong",
        expect.objectContaining({ description: undefined })
      )
    })

    it("passes description when provided", () => {
      showError("Validation failed", "Name is required")
      expect(mockToastError).toHaveBeenCalledWith(
        "Validation failed",
        expect.objectContaining({ description: "Name is required" })
      )
    })
  })

  describe("showInfo", () => {
    it("calls toast.info with the message", () => {
      showInfo("Syncing...")
      expect(mockToastInfo).toHaveBeenCalledWith(
        "Syncing...",
        expect.objectContaining({ description: undefined })
      )
    })

    it("passes description when provided", () => {
      showInfo("Notice", "Feature is in beta")
      expect(mockToastInfo).toHaveBeenCalledWith(
        "Notice",
        expect.objectContaining({ description: "Feature is in beta" })
      )
    })
  })

  describe("showWarning", () => {
    it("calls toast.warning with the message", () => {
      showWarning("Low balance")
      expect(mockToastWarning).toHaveBeenCalledWith(
        "Low balance",
        expect.objectContaining({ description: undefined })
      )
    })

    it("passes description when provided", () => {
      showWarning("Expiring soon", "Your plan expires in 3 days")
      expect(mockToastWarning).toHaveBeenCalledWith(
        "Expiring soon",
        expect.objectContaining({ description: "Your plan expires in 3 days" })
      )
    })
  })
})
