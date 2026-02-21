/**
 * Column Definition Builder Functions
 *
 * Reduces repetitive column definitions across list pages.
 * Each builder returns a Column<Record<string, unknown>> compatible with ListPageTemplate.
 *
 * @example
 * import { statusColumn, currencyColumn, dateColumn, badgeColumn } from "@/lib/column-builders"
 *
 * const columns = [
 *   statusColumn("tenant", { key: "status" }),
 *   currencyColumn("monthly_rent", "Rent"),
 *   dateColumn("check_in_date", "Since"),
 *   badgeColumn("payment_method", "Method", PAYMENT_METHODS),
 * ]
 */

import * as React from "react"
import { Column, ColumnWidthKey } from "@/components/ui/data-table/types"
import { formatCurrency, formatDate } from "@/lib/format"

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
        // Dynamic import at module level is not possible for React components in render,
        // so we use React.createElement with a lazy approach
        const { TableBadge } = require("@/components/ui/data-table/TableBadge")
        return React.createElement(TableBadge, { variant: info.status }, info.label)
      }

      const { StatusDot } = require("@/components/ui/data-table/StatusDot")
      return React.createElement(StatusDot, { status: info.status, label: info.label })
    },
  }
}

// ============================================================================
// CURRENCY COLUMN
// ============================================================================

interface CurrencyColumnOptions extends BaseColumnOptions {
  /** Text color class (e.g., "text-emerald-600", "text-rose-600"). Default: none */
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
 * currencyColumn("amount", "Amount", { color: "text-emerald-600", bold: true })
 * currencyColumn("amount", "Amount", { color: "text-rose-600", prefix: "-" })
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
        const { TableBadge } = require("@/components/ui/data-table/TableBadge")
        return React.createElement(TableBadge, { variant: defaultVariant }, value || "\u2014")
      }

      const config = colorMap[value]

      // If config is a string, it's a simple label (like PAYMENT_METHODS)
      if (typeof config === "string") {
        const { TableBadge } = require("@/components/ui/data-table/TableBadge")
        return React.createElement(TableBadge, { variant: defaultVariant }, config)
      }

      // If config is an object with variant, use it
      if (config && typeof config === "object" && "variant" in config) {
        const { TableBadge } = require("@/components/ui/data-table/TableBadge")
        return React.createElement(
          TableBadge,
          { variant: (config.variant || defaultVariant) as BadgeVariant },
          config.label
        )
      }

      // Fallback
      const { TableBadge } = require("@/components/ui/data-table/TableBadge")
      return React.createElement(TableBadge, { variant: defaultVariant }, value || "\u2014")
    },
  }
}
