/**
 * Column Definition Builder Functions
 *
 * Reduces repetitive column definitions across list pages.
 * Each builder returns a Column<Record<string, unknown>> compatible with ListPageTemplate.
 *
 * @example
 * import { statusColumn, currencyColumn, dateColumn, badgeColumn, personNameWithAvatarColumn } from "@/lib/columns"
 *
 * const columns = [
 *   personNameWithAvatarColumn("Tenant", { nameField: "name", personNameField: "person.name", photoField: "person.photo_url", subtitleField: "phone" }),
 *   statusColumn("tenant", { key: "status" }),
 *   currencyColumn("monthly_rent", "Rent"),
 *   dateColumn("check_in_date", "Since"),
 *   badgeColumn("payment_method", "Method", PAYMENT_METHODS),
 * ]
 */

import * as React from "react"
import { Column, ColumnWidthKey } from "@/components/ui/data-table/types"
import { formatCurrency, formatDate, formatTimeAgo } from "@/lib/format"
import type { LucideIcon } from "lucide-react"
import { Phone } from "lucide-react"
import { TableBadge } from "@/components/ui/data-table/TableBadge"
import { StatusDot } from "@/components/ui/data-table/StatusDot"
import { Avatar } from "@/components/ui/avatar"

// ============================================================================
// Types
// ============================================================================

/** StatusDot variant type (no "default") */
type StatusDotVariant = "success" | "warning" | "error" | "muted"

/** TableBadge variant type (includes "default") */
type BadgeVariant = "default" | "success" | "warning" | "error" | "muted"

/** Status config object (same shape as in status-config.ts) */
interface StatusConfigEntry {
  label: string
  variant: StatusDotVariant | BadgeVariant | string
}

/** Function that returns status info for StatusDot */
type GetStatusInfoFn = (status: string) => { status: StatusDotVariant; label: string }

/** Common column options that can be passed to any builder */
interface BaseColumnOptions {
  key?: string
  header?: string
  width?: ColumnWidthKey | number
  sortable?: boolean
  sortKey?: string
  sortType?: "string" | "number" | "date"
  hideOnMobile?: boolean
  canHide?: boolean
  defaultVisible?: boolean
  mobilePriority?: 1 | 2 | 3
  editable?: boolean
  editType?: "text" | "number" | "select" | "date" | "boolean"
  editOptions?: { value: string; label: string; disabled?: boolean }[]
  editField?: string
  editValidation?: { required?: boolean; min?: number; max?: number; minLength?: number; maxLength?: number }
  editPlaceholder?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecord = Record<string, any>

// ============================================================================
// STATUS COLUMN
// ============================================================================

interface StatusColumnOptions extends BaseColumnOptions {
  /** Use "badge" style (TableBadge) instead of "dot" style (StatusDot). Default: "dot" */
  style?: "dot" | "badge"
}

/**
 * Creates a status column with StatusDot (or TableBadge) + label.
 *
 * Accepts either:
 * 1. A status config object: Record<string, { label, variant }>
 * 2. A getStatusInfo function: (status) => { status, label }
 *
 * @example
 * // Using a config object from status-config.ts
 * statusColumn(TENANT_STATUS)
 *
 * // Using getStatusInfo function
 * statusColumn((status) => getStatusInfo("tenant", status))
 *
 * // With options
 * statusColumn(REFUND_STATUS, { style: "badge", editable: true, editType: "select", editOptions: [...] })
 */
export function statusColumn(
  configOrFn: Record<string, StatusConfigEntry> | GetStatusInfoFn,
  options: StatusColumnOptions = {}
): Column<AnyRecord> {
  const {
    key = "status",
    header = "Status",
    width = "status",
    sortable = true,
    canHide = true,
    defaultVisible = true,
    style = "dot",
    ...rest
  } = options

  // Lazy imports to avoid circular dependencies
  // These will be resolved at render time
  const getInfo = typeof configOrFn === "function"
    ? configOrFn
    : (status: string): { status: StatusDotVariant; label: string } => {
        const config = configOrFn[status]
        if (!config) return { status: "muted" as StatusDotVariant, label: status }
        // Map "default" to "muted" for StatusDot compatibility
        const variant = config.variant === "default" ? "muted" : config.variant
        return { status: variant as StatusDotVariant, label: config.label }
      }

  return {
    key,
    header,
    width,
    sortable,
    canHide,
    defaultVisible,
    ...rest,
    render: (row: AnyRecord) => {
      const statusValue = row[key] as string
      const info = getInfo(statusValue)

      if (style === "badge") {
        return React.createElement(TableBadge, { variant: info.status }, info.label)
      }

      return React.createElement(StatusDot, { status: info.status, label: info.label })
    },
  }
}

// ============================================================================
// CURRENCY COLUMN
// ============================================================================

interface CurrencyColumnOptions extends BaseColumnOptions {
  /** Text color class (e.g., "text-success", "text-destructive"). Default: none */
  color?: string
  /** Whether to show the font-medium class. Default: true */
  bold?: boolean
  /** Prefix to show before the amount (e.g., "-", "+"). Default: none */
  prefix?: string
}

/**
 * Creates a currency column with formatCurrency, tabular-nums styling.
 *
 * @example
 * currencyColumn("monthly_rent", "Rent")
 * currencyColumn("amount", "Amount", { color: "text-success", bold: true })
 * currencyColumn("amount", "Amount", { color: "text-destructive", prefix: "-" })
 */
export function currencyColumn(
  field: string,
  label: string,
  options: CurrencyColumnOptions = {}
): Column<AnyRecord> {
  const {
    key,
    header,
    width = "amount",
    sortable = true,
    sortType = "number",
    canHide = true,
    defaultVisible = true,
    color,
    bold = true,
    prefix = "",
    ...rest
  } = options

  const className = [
    bold ? "font-medium" : "",
    "tabular-nums",
    color || "",
  ].filter(Boolean).join(" ")

  return {
    key: key || field,
    header: header || label,
    width,
    sortable,
    sortType,
    canHide,
    defaultVisible,
    ...rest,
    render: (row: AnyRecord) => {
      const value = Number(row[field])
      return React.createElement("span", { className }, `${prefix}${formatCurrency(value)}`)
    },
  }
}

// ============================================================================
// DATE COLUMN
// ============================================================================

interface DateColumnOptions extends BaseColumnOptions {
  /** Show dash placeholder when date is null/empty. Default: true */
  showEmpty?: boolean
}

/**
 * Creates a date column with formatDate, sortable, sortType: "date".
 *
 * @example
 * dateColumn("check_in_date", "Since")
 * dateColumn("created_at", "Added On", { defaultVisible: false })
 * dateColumn("check_out_date", "Check-out Date", { defaultVisible: false })
 */
export function dateColumn(
  field: string,
  label: string,
  options: DateColumnOptions = {}
): Column<AnyRecord> {
  const {
    key,
    header,
    width = "date",
    sortable = true,
    sortType = "date",
    canHide = true,
    defaultVisible = true,
    showEmpty = true,
    ...rest
  } = options

  return {
    key: key || field,
    header: header || label,
    width,
    sortable,
    sortType,
    canHide,
    defaultVisible,
    ...rest,
    render: (row: AnyRecord) => {
      const value = row[field]
      if (!value) {
        if (!showEmpty) return null
        return React.createElement("span", { className: "text-muted-foreground" }, "\u2014")
      }
      return formatDate(value as string)
    },
  }
}

// ============================================================================
// BADGE COLUMN
// ============================================================================

interface BadgeColumnOptions extends BaseColumnOptions {
  /** Badge variant when no colorMap match is found. Default: "default" */
  defaultVariant?: BadgeVariant
}

/**
 * Creates a badge/tag column using TableBadge component.
 *
 * @example
 * // Simple label map (renders as text, no badge styling)
 * badgeColumn("payment_method", "Method", PAYMENT_METHODS)
 *
 * // With variant map
 * badgeColumn("priority", "Priority", COMPLAINT_PRIORITY)
 */
export function badgeColumn(
  field: string,
  label: string,
  colorMap?: Record<string, string | StatusConfigEntry>,
  options: BadgeColumnOptions = {}
): Column<AnyRecord> {
  const {
    key,
    header,
    width = "badge",
    sortable = true,
    canHide = true,
    defaultVisible = true,
    defaultVariant = "default",
    ...rest
  } = options

  return {
    key: key || field,
    header: header || label,
    width,
    sortable,
    canHide,
    defaultVisible,
    ...rest,
    render: (row: AnyRecord) => {
      const value = row[field] as string
      if (!colorMap) {
        return React.createElement(TableBadge, { variant: defaultVariant }, value || "\u2014")
      }

      const config = colorMap[value]

      // If config is a string, it's a simple label (like PAYMENT_METHODS)
      if (typeof config === "string") {
        return React.createElement(TableBadge, { variant: defaultVariant }, config)
      }

      // If config is an object with variant, use it
      if (config && typeof config === "object" && "variant" in config) {
        return React.createElement(
          TableBadge,
          { variant: (config.variant || defaultVariant) as BadgeVariant },
          config.label
        )
      }

      // Fallback
      return React.createElement(TableBadge, { variant: defaultVariant }, value || "\u2014")
    },
  }
}

// ============================================================================
// PERSON NAME WITH AVATAR COLUMN
// ============================================================================

interface PersonNameWithAvatarColumnOptions extends BaseColumnOptions {
  /**
   * Primary name field on the row (denormalized copy).
   * Used as fallback when personNameField is not available.
   * Supports dot notation (e.g., "tenant.name").
   * Default: "name"
   */
  nameField?: string
  /**
   * Live name field from the people table (single source of truth).
   * Takes priority over nameField when present.
   * Supports dot notation (e.g., "person.name").
   * Default: "person.name"
   */
  personNameField?: string
  /**
   * Photo URL field. Supports dot notation (e.g., "person.photo_url").
   * Default: "person.photo_url"
   */
  photoField?: string
  /**
   * Subtitle field(s) displayed below the name (e.g., phone, email, member code).
   * Supports dot notation. When an array is provided, the first non-empty value wins.
   * Default: "phone"
   *
   * @example
   * subtitleField: "phone"                          // single field
   * subtitleField: ["member_code", "phone"]          // fallback chain
   */
  subtitleField?: string | string[]
  /**
   * Additional CSS class for the avatar component.
   * Default: none (uses Avatar defaults)
   */
  avatarClassName?: string
}

/**
 * Resolves a dot-notation path (e.g., "person.name") to a value on the row.
 */
function resolveField(row: AnyRecord, path: string): unknown {
  return path.split(".").reduce((acc: unknown, part: string) => {
    if (acc && typeof acc === "object" && part in (acc as AnyRecord)) {
      return (acc as AnyRecord)[part]
    }
    return undefined
  }, row)
}

/**
 * Creates a person name + avatar column for list pages.
 *
 * Encapsulates the common pattern of displaying a person's avatar alongside
 * their name (with live data from the people table) and an optional subtitle.
 *
 * Follows the Live Person Data Pattern (CLAUDE.md 3.5): uses personNameField
 * as the primary source of truth, falling back to nameField.
 *
 * @example
 * // Tenant list — person.name with phone subtitle
 * personNameWithAvatarColumn("Tenant")
 *
 * // Library member — person.name with member_code OR phone subtitle (fallback chain)
 * personNameWithAvatarColumn("Member", { subtitleField: ["member_code", "phone"] })
 *
 * // Refund list — name lives under tenant.name, no person join
 * personNameWithAvatarColumn("Tenant", {
 *   nameField: "tenant.name",
 *   personNameField: "tenant.person.name",
 *   photoField: "tenant.photo_url",
 *   subtitleField: "tenant.phone",
 *   sortKey: "tenant.name",
 * })
 *
 * // With avatar gradient and custom key
 * personNameWithAvatarColumn("Tenant", {
 *   avatarClassName: `${brandGradient.solid} text-white shrink-0`,
 * })
 */
export function personNameWithAvatarColumn(
  label: string,
  options: PersonNameWithAvatarColumnOptions = {}
): Column<AnyRecord> {
  const {
    key = "name",
    header,
    width = "primary",
    sortable = true,
    canHide = false,
    defaultVisible = true,
    nameField = "name",
    personNameField = "person.name",
    photoField = "person.photo_url",
    subtitleField = "phone",
    avatarClassName,
    ...rest
  } = options

  return {
    key,
    header: header || label,
    width,
    sortable,
    canHide,
    defaultVisible,
    ...rest,
    render: (row: AnyRecord) => {
      // Live Person Data Pattern: prefer person.name, fall back to denormalized name
      const personName = resolveField(row, personNameField) as string | undefined
      const fallbackName = resolveField(row, nameField) as string | undefined
      const displayName = personName || fallbackName || "Unknown"

      const photoUrl = resolveField(row, photoField) as string | undefined

      // Resolve subtitle: support single field or fallback chain
      let subtitle: string | undefined
      if (subtitleField) {
        const fields = Array.isArray(subtitleField) ? subtitleField : [subtitleField]
        for (const f of fields) {
          const val = resolveField(row, f) as string | undefined
          if (val) { subtitle = val; break }
        }
      }

      return React.createElement("div", { className: "flex items-center gap-3" },
        React.createElement(Avatar, {
          name: displayName,
          src: photoUrl || undefined,
          size: "sm",
          className: avatarClassName,
        }),
        React.createElement("div", { className: "min-w-0" },
          React.createElement("div", { className: "font-medium truncate" }, displayName),
          subtitle
            ? React.createElement("div", { className: "text-xs text-muted-foreground" }, subtitle)
            : null
        )
      )
    },
  }
}

// ============================================================================
// BOOLEAN COLUMN
// ============================================================================

interface BooleanColumnOptions extends BaseColumnOptions {
  /** Label when value is true. Default: "Yes" */
  trueLabel?: string
  /** Label when value is false. Default: "No" */
  falseLabel?: string
  /** Badge variant when true. Default: "success" */
  trueColor?: BadgeVariant
  /** Badge variant when false. Default: "muted" */
  falseColor?: BadgeVariant
}

/**
 * Creates a boolean column displaying a badge for yes/no values.
 *
 * @example
 * booleanColumn("has_ac", "AC")
 * booleanColumn("agreement_signed", "Agreement", { trueLabel: "Signed", falseLabel: "Pending" })
 */
export function booleanColumn(
  field: string,
  label: string,
  options: BooleanColumnOptions = {}
): Column<AnyRecord> {
  const {
    key,
    header,
    width = "badge",
    sortable = true,
    canHide = true,
    defaultVisible = true,
    trueLabel = "Yes",
    falseLabel = "No",
    trueColor = "success",
    falseColor = "muted",
    ...rest
  } = options

  return {
    key: key || field,
    header: header || label,
    width,
    sortable,
    canHide,
    defaultVisible,
    ...rest,
    render: (row: AnyRecord) => {
      const value = Boolean(row[field])
      return React.createElement(
        TableBadge,
        { variant: value ? trueColor : falseColor },
        value ? trueLabel : falseLabel
      )
    },
  }
}

// ============================================================================
// PHONE COLUMN
// ============================================================================

interface PhoneColumnOptions extends BaseColumnOptions {
  /** Show phone icon before the number. Default: true */
  showIcon?: boolean
}

/**
 * Creates a phone number column with optional icon.
 *
 * @example
 * phoneColumn("phone", "Phone")
 * phoneColumn("person.phone", "Contact", { showIcon: false })
 */
export function phoneColumn(
  field: string,
  label: string,
  options: PhoneColumnOptions = {}
): Column<AnyRecord> {
  const {
    key,
    header,
    width = "secondary",
    sortable = true,
    canHide = true,
    defaultVisible = true,
    showIcon = true,
    ...rest
  } = options

  return {
    key: key || field,
    header: header || label,
    width,
    sortable,
    canHide,
    defaultVisible,
    ...rest,
    render: (row: AnyRecord) => {
      const value = resolveField(row, field) as string | undefined
      if (!value) {
        return React.createElement("span", { className: "text-muted-foreground" }, "\u2014")
      }
      if (showIcon) {
        return React.createElement("div", { className: "flex items-center gap-1.5" },
          React.createElement(Phone, { className: "h-3.5 w-3.5 text-muted-foreground shrink-0" }),
          React.createElement("span", null, value)
        )
      }
      return value
    },
  }
}

// ============================================================================
// EMAIL COLUMN
// ============================================================================

interface EmailColumnOptions extends BaseColumnOptions {
  /** Max width in characters before truncation. Default: 28 */
  maxLength?: number
}

/**
 * Creates an email column that truncates long addresses.
 *
 * @example
 * emailColumn("email", "Email")
 * emailColumn("person.email", "Email", { maxLength: 20 })
 */
export function emailColumn(
  field: string,
  label: string,
  options: EmailColumnOptions = {}
): Column<AnyRecord> {
  const {
    key,
    header,
    width = "secondary",
    sortable = true,
    canHide = true,
    defaultVisible = true,
    maxLength = 28,
    ...rest
  } = options

  return {
    key: key || field,
    header: header || label,
    width,
    sortable,
    canHide,
    defaultVisible,
    ...rest,
    render: (row: AnyRecord) => {
      const value = resolveField(row, field) as string | undefined
      if (!value) {
        return React.createElement("span", { className: "text-muted-foreground" }, "\u2014")
      }
      if (value.length > maxLength) {
        return React.createElement("span", {
          className: "truncate block",
          title: value,
        }, value)
      }
      return value
    },
  }
}

// ============================================================================
// TIME COLUMN
// ============================================================================

type TimeColumnOptions = BaseColumnOptions

/**
 * Creates a time-only column (HH:MM) from a datetime string.
 *
 * @example
 * timeColumn("check_in_time", "Check-in")
 * timeColumn("created_at", "Time")
 */
export function timeColumn(
  field: string,
  label: string,
  options: TimeColumnOptions = {}
): Column<AnyRecord> {
  const {
    key,
    header,
    width = "tertiary",
    sortable = true,
    sortType = "date",
    canHide = true,
    defaultVisible = true,
    ...rest
  } = options

  return {
    key: key || field,
    header: header || label,
    width,
    sortable,
    sortType,
    canHide,
    defaultVisible,
    ...rest,
    render: (row: AnyRecord) => {
      const value = row[field] as string | undefined
      if (!value) {
        return React.createElement("span", { className: "text-muted-foreground" }, "\u2014")
      }
      const date = new Date(value)
      const hours = date.getHours().toString().padStart(2, "0")
      const minutes = date.getMinutes().toString().padStart(2, "0")
      return React.createElement("span", { className: "tabular-nums" }, `${hours}:${minutes}`)
    },
  }
}

// ============================================================================
// TIME AGO COLUMN
// ============================================================================

type TimeAgoColumnOptions = BaseColumnOptions

/**
 * Creates a relative time column ("2 hours ago", "3 days ago").
 *
 * Uses formatTimeAgo from @/lib/format.
 *
 * @example
 * timeAgoColumn("created_at", "Added")
 * timeAgoColumn("last_login", "Last Seen")
 */
export function timeAgoColumn(
  field: string,
  label: string,
  options: TimeAgoColumnOptions = {}
): Column<AnyRecord> {
  const {
    key,
    header,
    width = "secondary",
    sortable = true,
    sortType = "date",
    canHide = true,
    defaultVisible = true,
    ...rest
  } = options

  return {
    key: key || field,
    header: header || label,
    width,
    sortable,
    sortType,
    canHide,
    defaultVisible,
    ...rest,
    render: (row: AnyRecord) => {
      const value = row[field] as string | undefined
      if (!value) {
        return React.createElement("span", { className: "text-muted-foreground" }, "\u2014")
      }
      const formatted = formatTimeAgo(value)
      return React.createElement("span", {
        className: "text-muted-foreground",
        title: formatDate(value),
      }, formatted)
    },
  }
}

// ============================================================================
// COUNT COLUMN
// ============================================================================

interface CountColumnOptions extends BaseColumnOptions {
  /** Icon to display before the count */
  icon?: LucideIcon
  /** Suffix text after the number (e.g., "hrs", "seats") */
  suffix?: string
}

/**
 * Creates a numeric count column with Indian number formatting.
 *
 * @example
 * countColumn("total_beds", "Beds")
 * countColumn("hours_balance", "Hours", { suffix: "h", icon: Clock })
 * countColumn("occupied_beds", "Occupied", { icon: Users })
 */
export function countColumn(
  field: string,
  label: string,
  options: CountColumnOptions = {}
): Column<AnyRecord> {
  const {
    key,
    header,
    width = "tertiary",
    sortable = true,
    sortType = "number",
    canHide = true,
    defaultVisible = true,
    icon,
    suffix,
    ...rest
  } = options

  return {
    key: key || field,
    header: header || label,
    width,
    sortable,
    sortType,
    canHide,
    defaultVisible,
    ...rest,
    render: (row: AnyRecord) => {
      const value = row[field]
      if (value == null) {
        return React.createElement("span", { className: "text-muted-foreground" }, "\u2014")
      }
      const formatted = Number(value).toLocaleString("en-IN")
      const text = suffix ? `${formatted} ${suffix}` : formatted

      if (icon) {
        return React.createElement("div", { className: "flex items-center gap-1.5" },
          React.createElement(icon, { className: "h-3.5 w-3.5 text-muted-foreground shrink-0" }),
          React.createElement("span", { className: "tabular-nums" }, text)
        )
      }
      return React.createElement("span", { className: "tabular-nums" }, text)
    },
  }
}
