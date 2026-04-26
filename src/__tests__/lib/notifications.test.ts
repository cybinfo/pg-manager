/**
 * Tests for pure utility functions in src/lib/notifications.ts
 *
 * Covers: generateWhatsAppLink (URL format, phone normalization, message encoding)
 */

import { generateWhatsAppLink } from "@/lib/notifications"

// ============================================================================
// generateWhatsAppLink
// ============================================================================

describe("generateWhatsAppLink", () => {
  it("returns a wa.me URL", () => {
    const url = generateWhatsAppLink("9876543210", "Hello")
    expect(url).toMatch(/^https:\/\/wa\.me\//)
  })

  it("normalises 10-digit Indian number by prepending 91", () => {
    const url = generateWhatsAppLink("9876543210", "Hello")
    expect(url).toContain("wa.me/919876543210")
  })

  it("strips leading zero before adding country code", () => {
    const url = generateWhatsAppLink("09876543210", "Hello")
    expect(url).toContain("wa.me/919876543210")
  })

  it("handles number that already has country code", () => {
    const url = generateWhatsAppLink("+919876543210", "Hello")
    expect(url).toContain("919876543210")
  })

  it("encodes message in query string", () => {
    const url = generateWhatsAppLink("9876543210", "Hello World")
    expect(url).toContain("?text=Hello%20World")
  })

  it("encodes special characters in message", () => {
    const url = generateWhatsAppLink("9876543210", "Amount: ₹500")
    expect(url).toContain("?text=")
    expect(url).not.toContain(" ") // spaces should be encoded
  })

  it("includes both phone and message in URL", () => {
    const url = generateWhatsAppLink("9876543210", "Pay now")
    expect(url).toMatch(/wa\.me\/919876543210\?text=/)
  })

  it("handles empty message", () => {
    const url = generateWhatsAppLink("9876543210", "")
    expect(url).toBe("https://wa.me/919876543210?text=")
  })
})
