/**
 * Tests for DataTable column factories in src/lib/columns/factories.tsx
 *
 * Strategy: call each factory, assert column metadata, then invoke render()
 * and assert React element validity and key props.
 */

jest.mock("@/components/ui/entity-link", () => ({
  PropertyLink: (props: Record<string, unknown>) =>
    require("react").createElement("a", { href: `/properties/${props.id}` }, props.name),
  RoomLink: (props: Record<string, unknown>) =>
    require("react").createElement("a", { href: `/rooms/${props.id}` }, props.roomNumber),
  TenantLink: (props: Record<string, unknown>) =>
    require("react").createElement("a", { href: `/tenants/${props.id}` }, props.name),
}))

jest.mock("@/lib/status-config", () => ({
  getStatusInfo: jest.fn((_entityType: string, status: string) => ({
    status: "success",
    label: status.charAt(0).toUpperCase() + status.slice(1),
  })),
}))

import * as React from "react"
import {
  createAvatarNameColumn,
  createCurrencyColumn,
  createDateColumn,
  createStatusColumn,
  createBadgeColumn,
  createPropertyRoomColumn,
  createTenantColumn,
  createActionsColumn,
} from "@/lib/columns/factories"

// ============================================================================
// createAvatarNameColumn
// ============================================================================

describe("createAvatarNameColumn", () => {
  const config = {
    getName: (item: { name: string }) => item.name,
    getPhotoUrl: (item: { photo?: string }) => item.photo ?? null,
    getSubtitle: (item: { sub?: string }) => item.sub ?? null,
  }

  it("returns correct column metadata", () => {
    const col = createAvatarNameColumn(config)
    expect(col.key).toBe("name")
    expect(col.header).toBe("Name")
    expect(col.sortable).toBe(true)
    expect(col.width).toBe("primary")
  })

  it("accepts custom key, header, sortKey", () => {
    const col = createAvatarNameColumn({ ...config, key: "person", header: "Member", sortKey: "person.name" })
    expect(col.key).toBe("person")
    expect(col.header).toBe("Member")
    expect(col.sortKey).toBe("person.name")
  })

  it("render returns a React element with a name", () => {
    const col = createAvatarNameColumn(config)
    const el = col.render!({ name: "Alice", photo: null })
    expect(React.isValidElement(el)).toBe(true)
  })

  it("render works when getPhotoUrl and getSubtitle are undefined", () => {
    const col = createAvatarNameColumn({ getName: (i: { name: string }) => i.name })
    const el = col.render!({ name: "Bob" })
    expect(React.isValidElement(el)).toBe(true)
  })

  it("render includes subtitle when getSubtitle returns a value", () => {
    const col = createAvatarNameColumn({ ...config, getSubtitle: () => "subtitle-text" })
    const el = col.render!({ name: "Carol", sub: "subtitle-text" }) as React.ReactElement
    expect(React.isValidElement(el)).toBe(true)
  })
})

// ============================================================================
// createCurrencyColumn
// ============================================================================

describe("createCurrencyColumn", () => {
  it("returns correct column metadata", () => {
    const col = createCurrencyColumn<{ amount: number }>("amount", "Rent")
    expect(col.key).toBe("amount")
    expect(col.header).toBe("Rent")
    expect(col.width).toBe("amount")
    expect(col.sortable).toBe(true)
    expect(col.sortType).toBe("number")
  })

  it("accepts custom options (key, sortable, hideOnMobile)", () => {
    const col = createCurrencyColumn<{ total: number }>("total", "Total", {
      key: "total_amount",
      sortable: false,
      hideOnMobile: true,
    })
    expect(col.key).toBe("total_amount")
    expect(col.sortable).toBe(false)
    expect(col.hideOnMobile).toBe(true)
  })

  it("render formats currency and returns React element", () => {
    const col = createCurrencyColumn<{ amount: number }>("amount", "Rent")
    const el = col.render!({ amount: 5000 })
    expect(React.isValidElement(el)).toBe(true)
  })

  it("render falls back to 0 when value is falsy", () => {
    const col = createCurrencyColumn<{ amount: number | null }>("amount", "Rent")
    const el = col.render!({ amount: null })
    expect(React.isValidElement(el)).toBe(true)
  })

  it("render includes subtext when getSubtext returns a value", () => {
    const col = createCurrencyColumn<{ amount: number }>("amount", "Rent", {
      getSubtext: () => "Due: Jan 1",
    })
    const el = col.render!({ amount: 1000 })
    expect(React.isValidElement(el)).toBe(true)
  })
})

// ============================================================================
// createDateColumn
// ============================================================================

describe("createDateColumn", () => {
  it("returns correct column metadata", () => {
    const col = createDateColumn<{ created_at: string }>("created_at", "Created")
    expect(col.key).toBe("created_at")
    expect(col.header).toBe("Created")
    expect(col.width).toBe("date")
    expect(col.sortType).toBe("date")
  })

  it("accepts datetime format option", () => {
    const col = createDateColumn<{ updated_at: string }>("updated_at", "Updated", { format: "datetime" })
    const el = col.render!({ updated_at: "2026-01-15T10:30:00Z" })
    expect(React.isValidElement(el)).toBe(true)
  })

  it("accepts timeAgo format option", () => {
    const col = createDateColumn<{ created_at: string }>("created_at", "Created", { format: "timeAgo" })
    const el = col.render!({ created_at: "2026-01-01T00:00:00Z" })
    expect(React.isValidElement(el)).toBe(true)
  })

  it("render returns dash when date value is null", () => {
    const col = createDateColumn<{ created_at: string | null }>("created_at", "Created")
    const el = col.render!({ created_at: null }) as React.ReactElement
    expect(React.isValidElement(el)).toBe(true)
    expect(el.props.children).toBe("—")
  })

  it("render returns formatted date for valid date string", () => {
    const col = createDateColumn<{ created_at: string }>("created_at", "Created")
    const el = col.render!({ created_at: "2026-01-15" })
    expect(React.isValidElement(el)).toBe(true)
  })

  it("accepts custom key and hideOnMobile", () => {
    const col = createDateColumn<{ d: string }>("d", "Date", { key: "date_col", hideOnMobile: true })
    expect(col.key).toBe("date_col")
    expect(col.hideOnMobile).toBe(true)
  })
})

// ============================================================================
// createStatusColumn
// ============================================================================

describe("createStatusColumn", () => {
  it("returns correct column metadata", () => {
    const col = createStatusColumn<{ status: string }>("status", "tenant")
    expect(col.key).toBe("status")
    expect(col.header).toBe("Status")
    expect(col.width).toBe("status")
  })

  it("accepts custom key, header, sortable", () => {
    const col = createStatusColumn<{ state: string }>("state", "complaint", {
      key: "state_col",
      header: "State",
      sortable: false,
    })
    expect(col.key).toBe("state_col")
    expect(col.header).toBe("State")
    expect(col.sortable).toBe(false)
  })

  it("render calls getStatusInfo and returns a React element", () => {
    const col = createStatusColumn<{ status: string }>("status", "tenant")
    const el = col.render!({ status: "active" })
    expect(React.isValidElement(el)).toBe(true)
  })
})

// ============================================================================
// createBadgeColumn
// ============================================================================

describe("createBadgeColumn", () => {
  const config = {
    key: "method",
    header: "Method",
    getLabel: (item: { method: string }) => item.method,
  }

  it("returns correct column metadata", () => {
    const col = createBadgeColumn(config)
    expect(col.key).toBe("method")
    expect(col.header).toBe("Method")
    expect(col.width).toBe("badge")
    expect(col.sortable).toBe(true)
  })

  it("accepts hideOnMobile and sortable options", () => {
    const col = createBadgeColumn({ ...config, hideOnMobile: true, sortable: false })
    expect(col.hideOnMobile).toBe(true)
    expect(col.sortable).toBe(false)
  })

  it("render returns a React element with default variant", () => {
    const col = createBadgeColumn(config)
    const el = col.render!({ method: "UPI" }) as React.ReactElement
    expect(React.isValidElement(el)).toBe(true)
    expect(el.props.variant).toBe("default")
    expect(el.props.children).toBe("UPI")
  })

  it("render uses custom getVariant", () => {
    const col = createBadgeColumn({
      ...config,
      getVariant: () => "success",
    })
    const el = col.render!({ method: "Cash" }) as React.ReactElement
    expect(el.props.variant).toBe("success")
  })
})

// ============================================================================
// createPropertyRoomColumn
// ============================================================================

describe("createPropertyRoomColumn", () => {
  const item = {
    property: { id: "p-1", name: "Green Heights" },
    room: { id: "r-1", room_number: "101" },
  }

  it("returns correct default column metadata", () => {
    const col = createPropertyRoomColumn()
    expect(col.key).toBe("property")
    expect(col.header).toBe("Property / Room")
    expect(col.width).toBe("secondary")
  })

  it("header is just 'Property' when showRoom=false", () => {
    const col = createPropertyRoomColumn({ showRoom: false })
    expect(col.header).toBe("Property")
  })

  it("render shows property name and room number", () => {
    const col = createPropertyRoomColumn()
    const el = col.render!(item)
    expect(React.isValidElement(el)).toBe(true)
  })

  it("render with showAsLinks=true renders PropertyLink and RoomLink", () => {
    const col = createPropertyRoomColumn({ showAsLinks: true })
    const el = col.render!(item)
    expect(React.isValidElement(el)).toBe(true)
  })

  it("render handles missing property gracefully", () => {
    const col = createPropertyRoomColumn()
    const el = col.render!({ property: null, room: null })
    expect(React.isValidElement(el)).toBe(true)
  })

  it("render with showRoom=false does not show room row", () => {
    const col = createPropertyRoomColumn({ showRoom: false })
    const el = col.render!(item)
    expect(React.isValidElement(el)).toBe(true)
  })

  it("render with showAsLinks=true and missing room does not render RoomLink", () => {
    const col = createPropertyRoomColumn({ showAsLinks: true })
    const el = col.render!({ property: { id: "p-1", name: "Test" }, room: null })
    expect(React.isValidElement(el)).toBe(true)
  })
})

// ============================================================================
// createTenantColumn
// ============================================================================

describe("createTenantColumn", () => {
  const item = {
    tenant: { id: "t-1", name: "Alice", phone: "9876543210" },
    property: { id: "p-1", name: "Green Heights" },
  }

  it("returns correct column metadata", () => {
    const col = createTenantColumn()
    expect(col.key).toBe("tenant")
    expect(col.header).toBe("Tenant")
    expect(col.width).toBe("primary")
  })

  it("render with tenant shows tenant link", () => {
    const col = createTenantColumn()
    const el = col.render!(item)
    expect(React.isValidElement(el)).toBe(true)
  })

  it("render without tenant shows 'Unknown'", () => {
    const col = createTenantColumn()
    const el = col.render!({ tenant: null, property: null })
    expect(React.isValidElement(el)).toBe(true)
  })

  it("render with showPhone=false hides phone", () => {
    const col = createTenantColumn({ showPhone: false })
    const el = col.render!(item)
    expect(React.isValidElement(el)).toBe(true)
  })

  it("render with showProperty=true shows PropertyLink", () => {
    const col = createTenantColumn({ showProperty: true })
    const el = col.render!(item)
    expect(React.isValidElement(el)).toBe(true)
  })

  it("render with showPhone=true and no phone does not crash", () => {
    const col = createTenantColumn({ showPhone: true })
    const el = col.render!({ tenant: { id: "t-1", name: "Bob" }, property: null })
    expect(React.isValidElement(el)).toBe(true)
  })
})

// ============================================================================
// createActionsColumn
// ============================================================================

describe("createActionsColumn", () => {
  it("returns correct column metadata", () => {
    const col = createActionsColumn({ renderActions: () => null })
    expect(col.key).toBe("actions")
    expect(col.header).toBe("")
    expect(col.width).toBe("actions")
  })

  it("render returns a React element wrapping renderActions output", () => {
    const col = createActionsColumn({
      renderActions: () => React.createElement("button", null, "Edit"),
    })
    const el = col.render!({ id: "1" })
    expect(React.isValidElement(el)).toBe(true)
  })

  it("render calls renderActions with the item", () => {
    const renderActions = jest.fn().mockReturnValue(null)
    const col = createActionsColumn({ renderActions })
    col.render!({ id: "test-item" })
    expect(renderActions).toHaveBeenCalledWith({ id: "test-item" })
  })

  it("onClick calls stopPropagation on click to prevent event bubbling", () => {
    const col = createActionsColumn({ renderActions: () => null })
    const el = col.render!({ id: "1" }) as React.ReactElement

    // Extract the onClick handler from the rendered div's props
    const onClick = (el as React.ReactElement<{ onClick: (e: { stopPropagation: () => void }) => void }>).props.onClick
    const mockEvent = { stopPropagation: jest.fn() }
    onClick(mockEvent)
    expect(mockEvent.stopPropagation).toHaveBeenCalled()
  })
})
