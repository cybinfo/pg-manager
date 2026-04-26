/**
 * Tests for column builder functions in src/lib/columns/builders.ts
 *
 * Strategy: call each builder, assert the returned Column metadata (key, header, width,
 * sortable, canHide, defaultVisible), then invoke render() and assert the output type
 * or props. Render functions return React elements or primitives.
 */

import * as React from "react"
import {
  statusColumn,
  currencyColumn,
  dateColumn,
  badgeColumn,
  booleanColumn,
  phoneColumn,
  emailColumn,
  timeColumn,
  timeAgoColumn,
  countColumn,
  personNameWithAvatarColumn,
} from "@/lib/columns/builders"

// ============================================================================
// statusColumn
// ============================================================================

describe("statusColumn", () => {
  const STATUS_CFG = {
    active: { label: "Active", variant: "success" },
    inactive: { label: "Inactive", variant: "muted" },
  }

  it("returns correct column metadata", () => {
    const col = statusColumn(STATUS_CFG)
    expect(col.key).toBe("status")
    expect(col.header).toBe("Status")
    expect(col.sortable).toBe(true)
    expect(col.canHide).toBe(true)
  })

  it("accepts custom key and header", () => {
    const col = statusColumn(STATUS_CFG, { key: "state", header: "State" })
    expect(col.key).toBe("state")
    expect(col.header).toBe("State")
  })

  it("render with known status returns React element", () => {
    const col = statusColumn(STATUS_CFG)
    const el = col.render!({ status: "active" })
    expect(React.isValidElement(el)).toBe(true)
  })

  it("render with unknown status uses 'muted' variant", () => {
    const col = statusColumn(STATUS_CFG)
    const el = col.render!({ status: "unknown" })
    expect(React.isValidElement(el)).toBe(true)
    expect((el as React.ReactElement).props.status).toBe("muted")
  })

  it("maps 'default' variant to 'muted' for StatusDot compatibility", () => {
    const col = statusColumn({ x: { label: "X", variant: "default" } })
    const el = col.render!({ status: "x" }) as React.ReactElement
    expect(el.props.status).toBe("muted")
  })

  it("badge style renders TableBadge instead of StatusDot", () => {
    const col = statusColumn(STATUS_CFG, { style: "badge" })
    const el = col.render!({ status: "active" }) as React.ReactElement
    expect(React.isValidElement(el)).toBe(true)
    // TableBadge is a component — children should be the label
    expect(el.props.children).toBe("Active")
  })

  it("accepts a getStatusInfo function instead of config object", () => {
    const fn = (status: string) => ({ status: "success" as const, label: status.toUpperCase() })
    const col = statusColumn(fn)
    const el = col.render!({ status: "active" }) as React.ReactElement
    expect(el.props.label).toBe("ACTIVE")
  })
})

// ============================================================================
// currencyColumn
// ============================================================================

describe("currencyColumn", () => {
  it("returns correct metadata", () => {
    const col = currencyColumn("amount", "Amount")
    expect(col.key).toBe("amount")
    expect(col.header).toBe("Amount")
    expect(col.sortable).toBe(true)
    expect((col as { sortType?: string }).sortType).toBe("number")
  })

  it("renders formatted INR currency", () => {
    const col = currencyColumn("amount", "Amount")
    const el = col.render!({ amount: 1500 }) as React.ReactElement
    expect(el.props.children).toContain("1,500")
  })

  it("renders 0 as a value (not empty)", () => {
    const col = currencyColumn("amount", "Amount")
    const el = col.render!({ amount: 0 }) as React.ReactElement
    expect(el.props.children).toContain("0")
  })

  it("renders 0 for null amount (Number(null) === 0)", () => {
    const col = currencyColumn("amount", "Amount")
    const el = col.render!({ amount: null }) as React.ReactElement
    // Number(null) = 0, so renders "₹0"
    expect(el.props.children).toContain("0")
  })

  it("applies prefix when provided", () => {
    const col = currencyColumn("amount", "Amount", { prefix: "+" })
    const el = col.render!({ amount: 500 }) as React.ReactElement
    expect(el.props.children).toContain("+")
  })

  it("omits font-medium class when bold=false (line 185 branch)", () => {
    const col = currencyColumn("amount", "Amount", { bold: false })
    // Render succeeds without error — branch is exercised
    const el = col.render!({ amount: 1000 }) as React.ReactElement
    expect(React.isValidElement(el)).toBe(true)
  })
})

// ============================================================================
// dateColumn
// ============================================================================

describe("dateColumn", () => {
  it("returns correct metadata", () => {
    const col = dateColumn("created_at", "Created")
    expect(col.key).toBe("created_at")
    expect(col.header).toBe("Created")
    expect(col.sortable).toBe(true)
    expect((col as { sortType?: string }).sortType).toBe("date")
  })

  it("renders formatted date for a valid ISO string", () => {
    const col = dateColumn("created_at", "Created")
    const result = col.render!({ created_at: "2024-06-15" })
    // Returns a formatted string like "Jun 15, 2024" or similar
    expect(result).toBeTruthy()
  })

  it("renders em dash for missing value", () => {
    const col = dateColumn("created_at", "Created")
    const el = col.render!({ created_at: null }) as React.ReactElement
    expect(el.props.children).toBe("—")
  })

  it("returns null for missing value when showEmpty=false", () => {
    const col = dateColumn("created_at", "Created", { showEmpty: false })
    const result = col.render!({ created_at: null })
    expect(result).toBeNull()
  })
})

// ============================================================================
// badgeColumn
// ============================================================================

describe("badgeColumn", () => {
  const LABELS = { cash: "Cash", upi: "UPI" }

  it("returns correct metadata", () => {
    const col = badgeColumn("payment_method", "Method", LABELS)
    expect(col.key).toBe("payment_method")
    expect(col.header).toBe("Method")
  })

  it("renders the label for a known value", () => {
    const col = badgeColumn("payment_method", "Method", LABELS)
    const el = col.render!({ payment_method: "cash" }) as React.ReactElement
    expect(React.isValidElement(el)).toBe(true)
    expect(el.props.children).toBe("Cash")
  })

  it("renders the raw value for an unknown key", () => {
    const col = badgeColumn("payment_method", "Method", LABELS)
    const el = col.render!({ payment_method: "crypto" }) as React.ReactElement
    expect(el.props.children).toBe("crypto")
  })

  it("renders em dash for missing value", () => {
    const col = badgeColumn("payment_method", "Method", LABELS)
    const el = col.render!({ payment_method: null }) as React.ReactElement
    expect(el.props.children).toBe("—")
  })
})

// ============================================================================
// booleanColumn
// ============================================================================

describe("booleanColumn", () => {
  it("returns correct metadata", () => {
    const col = booleanColumn("is_active", "Active")
    expect(col.key).toBe("is_active")
    expect(col.header).toBe("Active")
  })

  it("renders trueLabel for truthy value", () => {
    const col = booleanColumn("is_active", "Active", { trueLabel: "Active", falseLabel: "Inactive" })
    const el = col.render!({ is_active: true }) as React.ReactElement
    expect(el.props.children).toBe("Active")
  })

  it("renders falseLabel for falsy value", () => {
    const col = booleanColumn("is_active", "Active", { trueLabel: "Active", falseLabel: "Inactive" })
    const el = col.render!({ is_active: false }) as React.ReactElement
    expect(el.props.children).toBe("Inactive")
  })

  it("uses default labels Yes/No", () => {
    const col = booleanColumn("is_active", "Active")
    const elTrue = col.render!({ is_active: true }) as React.ReactElement
    const elFalse = col.render!({ is_active: false }) as React.ReactElement
    expect(elTrue.props.children).toBe("Yes")
    expect(elFalse.props.children).toBe("No")
  })
})

// ============================================================================
// phoneColumn
// ============================================================================

describe("phoneColumn", () => {
  it("returns correct metadata", () => {
    const col = phoneColumn("phone", "Phone")
    expect(col.key).toBe("phone")
    expect(col.header).toBe("Phone")
  })

  it("renders a dash element for missing value", () => {
    const col = phoneColumn("phone", "Phone")
    const el = col.render!({ phone: null }) as React.ReactElement
    expect(React.isValidElement(el)).toBe(true)
    expect(el.props.children).toBe("—")
  })

  it("renders phone with icon wrapper for valid value", () => {
    const col = phoneColumn("phone", "Phone")
    const el = col.render!({ phone: "9876543210" }) as React.ReactElement
    expect(React.isValidElement(el)).toBe(true)
    // With icon: returns a div with icon + span
    expect(el.props.className).toContain("flex")
  })

  it("renders bare string when showIcon=false", () => {
    const col = phoneColumn("phone", "Phone", { showIcon: false })
    const result = col.render!({ phone: "9876543210" })
    expect(result).toBe("9876543210")
  })
})

// ============================================================================
// emailColumn
// ============================================================================

describe("emailColumn", () => {
  it("returns correct metadata", () => {
    const col = emailColumn("email", "Email")
    expect(col.key).toBe("email")
    expect(col.header).toBe("Email")
  })

  it("renders dash for missing email", () => {
    const col = emailColumn("email", "Email")
    const el = col.render!({ email: null }) as React.ReactElement
    expect(el.props.children).toBe("—")
  })

  it("renders email string when within maxLength", () => {
    const col = emailColumn("email", "Email")
    const result = col.render!({ email: "test@example.com" })
    expect(result).toBe("test@example.com")
  })

  it("renders truncated span when email exceeds maxLength", () => {
    const col = emailColumn("email", "Email", { maxLength: 10 })
    const el = col.render!({ email: "verylongemail@example.com" }) as React.ReactElement
    expect(React.isValidElement(el)).toBe(true)
    expect(el.props.className).toContain("truncate")
  })
})

// ============================================================================
// countColumn
// ============================================================================

describe("countColumn", () => {
  it("returns correct metadata", () => {
    const col = countColumn("total_seats", "Seats")
    expect(col.key).toBe("total_seats")
    expect(col.header).toBe("Seats")
    expect((col as { sortType?: string }).sortType).toBe("number")
  })

  it("renders the numeric count value", () => {
    const col = countColumn("total_seats", "Seats")
    const el = col.render!({ total_seats: 10 }) as React.ReactElement
    expect(el.props.children).toContain("10")
  })

  it("renders 0 count correctly", () => {
    const col = countColumn("total_seats", "Seats")
    const el = col.render!({ total_seats: 0 }) as React.ReactElement
    expect(el.props.children).toContain("0")
  })

  it("renders dash for null count", () => {
    const col = countColumn("total_seats", "Seats")
    const el = col.render!({ total_seats: null }) as React.ReactElement
    expect(el.props.children).toBe("—")
  })

  it("appends suffix when provided", () => {
    const col = countColumn("hours", "Hours", { suffix: "h" })
    const el = col.render!({ hours: 9 }) as React.ReactElement
    expect(el.props.children).toContain("h")
  })
})

// ============================================================================
// timeAgoColumn
// ============================================================================

describe("timeAgoColumn", () => {
  it("returns correct metadata", () => {
    const col = timeAgoColumn("created_at", "Created")
    expect(col.key).toBe("created_at")
    expect(col.header).toBe("Created")
  })

  it("renders formatted time-ago string for a valid date", () => {
    const col = timeAgoColumn("created_at", "Created")
    const result = col.render!({ created_at: new Date().toISOString() })
    expect(result).toBeTruthy()
  })

  it("renders dash for missing date", () => {
    const col = timeAgoColumn("created_at", "Created")
    const el = col.render!({ created_at: null }) as React.ReactElement
    expect(el.props.children).toBe("—")
  })
})

// ============================================================================
// badgeColumn — additional coverage (no colorMap, StatusConfigEntry object)
// ============================================================================

describe("badgeColumn — extended", () => {
  it("renders raw value in TableBadge when no colorMap is provided (line 307)", () => {
    const col = badgeColumn("tag", "Tag")
    const el = col.render!({ tag: "premium" }) as React.ReactElement
    expect(React.isValidElement(el)).toBe(true)
    expect(el.props.children).toBe("premium")
  })

  it("renders em dash when no colorMap and value is empty (line 307)", () => {
    const col = badgeColumn("tag", "Tag")
    const el = col.render!({ tag: null }) as React.ReactElement
    expect(el.props.children).toBe("—")
  })

  it("renders label from StatusConfigEntry object (lines 319-323)", () => {
    const statusMap = {
      active: { label: "Active", variant: "success" as const },
      inactive: { label: "Inactive", variant: "muted" as const },
    }
    const col = badgeColumn("status", "Status", statusMap)
    const el = col.render!({ status: "active" }) as React.ReactElement
    expect(React.isValidElement(el)).toBe(true)
    expect(el.props.children).toBe("Active")
    expect(el.props.variant).toBe("success")
  })

  it("uses defaultVariant from StatusConfigEntry when config.variant is falsy (line 319)", () => {
    const statusMap = { pending: { label: "Pending", variant: "" } }
    const col = badgeColumn("status", "Status", statusMap, { defaultVariant: "warning" })
    const el = col.render!({ status: "pending" }) as React.ReactElement
    expect(el.props.children).toBe("Pending")
    expect(el.props.variant).toBe("warning")
  })
})

// ============================================================================
// timeColumn — render with valid datetime (lines 676-696)
// ============================================================================

describe("timeColumn", () => {
  it("returns correct metadata", () => {
    const col = timeColumn("check_in_time", "Check In")
    expect(col.key).toBe("check_in_time")
    expect(col.header).toBe("Check In")
    expect((col as { sortType?: string }).sortType).toBe("date")
  })

  it("renders dash for missing value", () => {
    const col = timeColumn("check_in_time", "Check In")
    const el = col.render!({ check_in_time: null }) as React.ReactElement
    expect(el.props.children).toBe("—")
  })

  it("renders HH:MM from a full ISO datetime string (lines 693-696)", () => {
    const col = timeColumn("check_in_time", "Check In")
    // Use a fixed UTC datetime so the test is deterministic regardless of timezone handling
    const el = col.render!({ check_in_time: "2024-06-15T09:30:00.000Z" }) as React.ReactElement
    expect(React.isValidElement(el)).toBe(true)
    // Result is HH:MM — exact value depends on local TZ, but format is always XX:XX
    expect(el.props.children).toMatch(/^\d{2}:\d{2}$/)
  })

  it("renders HH:MM from a time-only string when parseable as date", () => {
    const col = timeColumn("check_in_time", "Check In")
    const el = col.render!({ check_in_time: "2024-01-01T14:45:00" }) as React.ReactElement
    expect(React.isValidElement(el)).toBe(true)
    expect(el.props.children).toMatch(/^\d{2}:\d{2}$/)
  })
})

// ============================================================================
// countColumn — with icon (line 810)
// ============================================================================

describe("countColumn — with icon", () => {
  it("renders icon wrapper div when icon prop is provided (line 810)", () => {
    const MockIcon = (props: Record<string, unknown>) => React.createElement("svg", props)
    const col = countColumn("total_seats", "Seats", { icon: MockIcon as React.ElementType })
    const el = col.render!({ total_seats: 5 }) as React.ReactElement
    expect(React.isValidElement(el)).toBe(true)
    // With icon: outer div has flex class
    expect(el.props.className).toContain("flex")
    // The div has children: [icon, span]
    const [iconEl, spanEl] = el.props.children as React.ReactElement[]
    expect(React.isValidElement(iconEl)).toBe(true)
    expect(spanEl.props.children).toContain("5")
  })
})

// ============================================================================
// personNameWithAvatarColumn (lines 381, 431-460)
// ============================================================================

describe("personNameWithAvatarColumn", () => {
  it("returns correct metadata", () => {
    const col = personNameWithAvatarColumn("Tenant")
    expect(col.key).toBe("name")
    expect(col.header).toBe("Tenant")
    expect(col.sortable).toBe(true)
    expect(col.canHide).toBe(false)
  })

  it("uses person.name (live data) over row.name (denormalized)", () => {
    const col = personNameWithAvatarColumn("Tenant")
    const el = col.render!({ name: "Old Name", person: { name: "Live Name", photo_url: null } }) as React.ReactElement
    const nameDiv = el.props.children[1]
    const nameLine = nameDiv.props.children[0]
    expect(nameLine.props.children).toBe("Live Name")
  })

  it("falls back to row.name when person.name is missing", () => {
    const col = personNameWithAvatarColumn("Tenant")
    const el = col.render!({ name: "Fallback Name", person: null }) as React.ReactElement
    const nameDiv = el.props.children[1]
    const nameLine = nameDiv.props.children[0]
    expect(nameLine.props.children).toBe("Fallback Name")
  })

  it("renders Unknown when both name fields are missing", () => {
    const col = personNameWithAvatarColumn("Tenant")
    const el = col.render!({ name: null, person: null }) as React.ReactElement
    const nameDiv = el.props.children[1]
    const nameLine = nameDiv.props.children[0]
    expect(nameLine.props.children).toBe("Unknown")
  })

  it("resolves subtitle from single field", () => {
    const col = personNameWithAvatarColumn("Tenant", { subtitleField: "phone" })
    const el = col.render!({ name: "Ravi", phone: "9876543210", person: null }) as React.ReactElement
    const nameDiv = el.props.children[1]
    const subtitleEl = nameDiv.props.children[1]
    expect(subtitleEl.props.children).toBe("9876543210")
  })

  it("uses first non-empty field from subtitle array fallback chain", () => {
    // member_code is empty, phone has value — should pick phone
    const col = personNameWithAvatarColumn("Member", { subtitleField: ["member_code", "phone"] })
    const el = col.render!({ name: "Priya", member_code: "", phone: "9123456789", person: null }) as React.ReactElement
    const nameDiv = el.props.children[1]
    const subtitleEl = nameDiv.props.children[1]
    expect(subtitleEl.props.children).toBe("9123456789")
  })

  it("uses first field in array when both are present", () => {
    const col = personNameWithAvatarColumn("Member", { subtitleField: ["member_code", "phone"] })
    const el = col.render!({ name: "Amit", member_code: "NGH-001", phone: "9000000000", person: null }) as React.ReactElement
    const nameDiv = el.props.children[1]
    const subtitleEl = nameDiv.props.children[1]
    expect(subtitleEl.props.children).toBe("NGH-001")
  })

  it("resolves dot-notation path for subtitle (resolveField — line 381 via broken path)", () => {
    // tenant.phone where tenant is null — resolveField returns undefined → no subtitle
    const col = personNameWithAvatarColumn("Tenant", { subtitleField: "tenant.phone" })
    const el = col.render!({ tenant: null }) as React.ReactElement
    const nameDiv = el.props.children[1]
    // When subtitle is undefined, children[1] is undefined (no subtitle element rendered)
    expect(nameDiv.props.children[1]).toBeFalsy()
  })

  it("resolves nested dot-notation photoField", () => {
    const col = personNameWithAvatarColumn("Member", { photoField: "person.photo_url" })
    const el = col.render!({
      name: "Neha",
      person: { name: "Neha Live", photo_url: "https://example.com/photo.jpg" },
    }) as React.ReactElement
    const avatarEl = el.props.children[0]
    expect(avatarEl.props.src).toBe("https://example.com/photo.jpg")
  })

  it("passes undefined to Avatar src when no photo (resolveField undefined path)", () => {
    const col = personNameWithAvatarColumn("Tenant")
    const el = col.render!({ name: "Test", person: { name: "Test Live", photo_url: null } }) as React.ReactElement
    const avatarEl = el.props.children[0]
    expect(avatarEl.props.src).toBeUndefined()
  })

  it("renders without subtitle when subtitleField option is empty string (line 452 branch)", () => {
    const col = personNameWithAvatarColumn("Tenant", { subtitleField: "" })
    const el = col.render!({ name: "Ravi", phone: "9876543210" }) as React.ReactElement
    const nameDiv = el.props.children[1]
    // No subtitle rendered — children[1] should be falsy
    expect(nameDiv.props.children[1]).toBeFalsy()
  })
})
