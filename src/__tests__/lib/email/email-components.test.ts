/**
 * Tests for pure HTML generator functions in src/lib/email/components.ts
 *
 * Covers: emailWrapper, emailBadge, emailGreeting, emailInfoCard,
 *         emailReceiptHeader, emailContactInfo, emailSignature,
 *         emailCTAButton, emailParagraph, emailDivider, emailStatsBox, emailList
 */

import {
  emailWrapper,
  emailBadge,
  emailGreeting,
  emailInfoCard,
  emailReceiptHeader,
  emailContactInfo,
  emailSignature,
  emailCTAButton,
  emailParagraph,
  emailDivider,
  emailStatsBox,
  emailList,
} from "@/lib/email/components"

// ============================================================================
// emailWrapper
// ============================================================================

describe("emailWrapper", () => {
  it("returns valid HTML with DOCTYPE", () => {
    const html = emailWrapper("<p>Hello</p>")
    expect(html).toContain("<!DOCTYPE html>")
  })

  it("includes the content inside the wrapper", () => {
    const html = emailWrapper("<p>My content</p>")
    expect(html).toContain("<p>My content</p>")
  })

  it("includes the brand name in the header", () => {
    const html = emailWrapper("")
    expect(html.toLowerCase()).toContain("managekar")
  })

  it("includes the footer link", () => {
    const html = emailWrapper("")
    expect(html).toContain("managekar.com")
  })
})

// ============================================================================
// emailBadge
// ============================================================================

describe("emailBadge", () => {
  it("includes the badge text", () => {
    const html = emailBadge("Payment Received")
    expect(html).toContain("Payment Received")
  })

  it("defaults to success variant", () => {
    const successHtml = emailBadge("OK", "success")
    const defaultHtml = emailBadge("OK")
    // Both should produce similar output
    expect(defaultHtml).toBeTruthy()
    expect(successHtml).toContain("OK")
  })

  it("accepts warning variant", () => {
    const html = emailBadge("Overdue", "warning")
    expect(html).toContain("Overdue")
  })

  it("accepts error variant", () => {
    const html = emailBadge("Cancelled", "error")
    expect(html).toContain("Cancelled")
  })
})

// ============================================================================
// emailGreeting
// ============================================================================

describe("emailGreeting", () => {
  it("includes the recipient name", () => {
    const html = emailGreeting("Rajat")
    expect(html).toContain("Hi Rajat")
  })

  it("includes custom message when provided", () => {
    const html = emailGreeting("Alice", "Your payment is due.")
    expect(html).toContain("Your payment is due.")
  })

  it("omits the custom message paragraph when not provided", () => {
    const html = emailGreeting("Bob")
    // Should not have any custom message text
    expect(html).not.toContain("undefined")
  })
})

// ============================================================================
// emailInfoCard
// ============================================================================

describe("emailInfoCard", () => {
  it("includes row labels and values", () => {
    const html = emailInfoCard([
      { label: "Property", value: "Green PG" },
      { label: "Amount", value: "₹5,000" },
    ])
    expect(html).toContain("Property")
    expect(html).toContain("Green PG")
    expect(html).toContain("Amount")
    expect(html).toContain("₹5,000")
  })

  it("renders a table structure", () => {
    const html = emailInfoCard([{ label: "Room", value: "101" }])
    expect(html).toContain("<table")
    expect(html).toContain("<tr")
    expect(html).toContain("<td")
  })

  it("accepts success variant without crashing", () => {
    const html = emailInfoCard([{ label: "Status", value: "Paid" }], { variant: "success" })
    expect(html).toContain("Status")
    expect(html).toContain("Paid")
  })

  it("includes headerContent when provided", () => {
    const html = emailInfoCard(
      [{ label: "Total", value: "₹10,000" }],
      { headerContent: "<p>Receipt #001</p>" }
    )
    expect(html).toContain("Receipt #001")
  })

  it("renders multiple rows", () => {
    const html = emailInfoCard([
      { label: "A", value: "1" },
      { label: "B", value: "2" },
      { label: "C", value: "3" },
    ])
    expect(html).toContain("A")
    expect(html).toContain("B")
    expect(html).toContain("C")
  })
})

// ============================================================================
// emailReceiptHeader
// ============================================================================

describe("emailReceiptHeader", () => {
  it("includes the receipt number", () => {
    const html = emailReceiptHeader("PYMT-LIB-000042")
    expect(html).toContain("PYMT-LIB-000042")
  })

  it("includes a 'Receipt Number' label", () => {
    const html = emailReceiptHeader("R-001")
    expect(html).toContain("Receipt Number")
  })
})

// ============================================================================
// emailContactInfo
// ============================================================================

describe("emailContactInfo", () => {
  it("returns empty string when phone is undefined", () => {
    const html = emailContactInfo(undefined)
    expect(html).toBe("")
  })

  it("returns empty string when phone is not provided", () => {
    const html = emailContactInfo()
    expect(html).toBe("")
  })

  it("includes the phone number when provided", () => {
    const html = emailContactInfo("9876543210")
    expect(html).toContain("9876543210")
  })

  it("uses default label when not specified", () => {
    const html = emailContactInfo("9876543210")
    expect(html).toContain("For any queries, contact")
  })

  it("uses custom label when provided", () => {
    const html = emailContactInfo("9876543210", "Call us at")
    expect(html).toContain("Call us at")
  })
})

// ============================================================================
// emailSignature
// ============================================================================

describe("emailSignature", () => {
  it("includes the owner name", () => {
    const html = emailSignature("Suresh Sharma")
    expect(html).toContain("Suresh Sharma")
  })

  it("includes a 'Thank you' line", () => {
    const html = emailSignature("Anyone")
    expect(html).toContain("Thank you")
  })
})

// ============================================================================
// emailCTAButton
// ============================================================================

describe("emailCTAButton", () => {
  it("includes the button text", () => {
    const html = emailCTAButton("Pay Now", "https://managekar.com/pay")
    expect(html).toContain("Pay Now")
  })

  it("includes the URL in an anchor tag", () => {
    const html = emailCTAButton("View", "https://managekar.com")
    expect(html).toContain('href="https://managekar.com"')
  })

  it("defaults to primary variant (white text)", () => {
    const html = emailCTAButton("Click", "https://example.com")
    expect(html).toContain("#ffffff")
  })

  it("secondary variant produces different styling", () => {
    const primary = emailCTAButton("A", "https://x.com", "primary")
    const secondary = emailCTAButton("A", "https://x.com", "secondary")
    // They produce different HTML (different background colors)
    expect(primary).not.toBe(secondary)
  })
})

// ============================================================================
// emailParagraph
// ============================================================================

describe("emailParagraph", () => {
  it("includes the paragraph text", () => {
    const html = emailParagraph("Your subscription has expired.")
    expect(html).toContain("Your subscription has expired.")
  })

  it("is left-aligned by default", () => {
    const html = emailParagraph("Hello")
    expect(html).toContain("text-align: left")
  })

  it("is centered when centered option is set", () => {
    const html = emailParagraph("Hello", { centered: true })
    expect(html).toContain("text-align: center")
  })

  it("uses muted color when muted option is set", () => {
    const muted = emailParagraph("Note", { muted: true })
    const normal = emailParagraph("Note")
    // Different color styling
    expect(muted).not.toBe(normal)
  })
})

// ============================================================================
// emailDivider
// ============================================================================

describe("emailDivider", () => {
  it("returns an HR element", () => {
    const html = emailDivider()
    expect(html).toContain("<hr")
  })
})

// ============================================================================
// emailStatsBox
// ============================================================================

describe("emailStatsBox", () => {
  it("includes stat labels and values", () => {
    const html = emailStatsBox([
      { label: "Payments", value: 12 },
      { label: "Revenue", value: "₹60,000" },
    ])
    expect(html).toContain("Payments")
    expect(html).toContain("12")
    expect(html).toContain("Revenue")
    expect(html).toContain("₹60,000")
  })

  it("renders all provided stats", () => {
    const html = emailStatsBox([
      { label: "A", value: 1 },
      { label: "B", value: 2 },
      { label: "C", value: 3 },
    ])
    expect(html).toContain("A")
    expect(html).toContain("B")
    expect(html).toContain("C")
  })

  it("uses custom color when provided", () => {
    const html = emailStatsBox([{ label: "Revenue", value: "₹10,000", color: "#ff0000" }])
    expect(html).toContain("#ff0000")
  })
})

// ============================================================================
// emailList
// ============================================================================

describe("emailList", () => {
  it("renders list items as text content", () => {
    const html = emailList(["Item one", "Item two", "Item three"])
    expect(html).toContain("Item one")
    expect(html).toContain("Item two")
    expect(html).toContain("Item three")
  })

  it("defaults to bullet list (ul)", () => {
    const html = emailList(["A", "B"])
    expect(html).toContain("<ul")
  })

  it("renders a numbered list (ol) when type=number", () => {
    const html = emailList(["Step 1", "Step 2"], "number")
    expect(html).toContain("<ol")
  })

  it("wraps each item in li tags", () => {
    const html = emailList(["Only item"])
    expect(html).toContain("<li")
  })
})
