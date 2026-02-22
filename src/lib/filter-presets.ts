/**
 * Filter Presets
 *
 * Centralized, reusable filter constants for list pages.
 * Import these instead of defining inline filter objects in every page.
 *
 * Usage:
 *   import { PROPERTY_FILTER, PAYMENT_METHOD_FILTER, createStatusFilter, createDateRangeFilter } from "@/lib/filter-presets"
 *
 *   const filters: FilterConfig[] = [
 *     PROPERTY_FILTER,
 *     createStatusFilter([
 *       { value: "active", label: "Active" },
 *       { value: "inactive", label: "Inactive" },
 *     ]),
 *     PAYMENT_METHOD_FILTER,
 *     createDateRangeFilter("payment_date", "Date"),
 *   ]
 */

import type { FilterConfig } from "@/components/ui/list-page-filters"

// ============================================
// PG Module Filters
// ============================================

/**
 * Property filter - dynamic options loaded from database.
 * Used by: tenants, bills, payments, expenses, rooms, refunds, notices,
 *          complaints, exit-clearance, meters, meter-readings, visitors, inquiries
 */
export const PROPERTY_FILTER: FilterConfig = {
  id: "property",
  label: "Property",
  type: "select",
  placeholder: "All Properties",
}

/**
 * Floor filter - for room-related pages.
 */
export const FLOOR_FILTER: FilterConfig = {
  id: "floor",
  label: "Floor",
  type: "select",
  placeholder: "All Floors",
}

/**
 * Room type filter - for rooms page.
 */
export const ROOM_TYPE_FILTER: FilterConfig = {
  id: "room_type",
  label: "Room Type",
  type: "select",
  placeholder: "All Types",
  options: [
    { value: "single", label: "Single" },
    { value: "double", label: "Double" },
    { value: "triple", label: "Triple" },
    { value: "dormitory", label: "Dormitory" },
  ],
}

// ============================================
// Library Module Filters
// ============================================

/**
 * Library filter - dynamic options loaded from database.
 * Used by: library-members, library-sections, library-lockers
 */
export const LIBRARY_FILTER: FilterConfig = {
  id: "library_id",
  label: "Library",
  type: "select",
  placeholder: "All Libraries",
}

/**
 * Time slot filter for library members/waitlist.
 * Used by: library-members, library-waitlist
 */
export const TIME_SLOT_FILTER: FilterConfig = {
  id: "preferred_slot",
  label: "Slot",
  type: "select",
  placeholder: "All Slots",
  options: [
    { value: "Morning", label: "Morning" },
    { value: "Evening", label: "Evening" },
    { value: "Night", label: "Night" },
    { value: "24 Hours", label: "24 Hours" },
  ],
}

/**
 * AC type filter for library sections/rooms.
 * Used by: library-sections, library
 */
export const LIBRARY_AC_TYPE_FILTER: FilterConfig = {
  id: "is_ac",
  label: "Type",
  type: "select",
  placeholder: "AC Filter",
  options: [
    { value: "true", label: "AC" },
    { value: "false", label: "Non-AC" },
  ],
}

/**
 * Library payment method filter (4 options, excludes cheque from standard).
 * Used by: library-payments
 */
export const LIBRARY_PAYMENT_METHOD_FILTER: FilterConfig = {
  id: "payment_method",
  label: "Method",
  type: "select",
  placeholder: "All Methods",
  options: [
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "card", label: "Card" },
    { value: "bank_transfer", label: "Bank Transfer" },
  ],
}

/**
 * Visitor type filter.
 * Used by: visitors
 */
export const VISITOR_TYPE_FILTER: FilterConfig = {
  id: "visitor_type",
  label: "Type",
  type: "select",
  placeholder: "All Types",
  options: [
    { value: "tenant_visitor", label: "Tenant Visitor" },
    { value: "enquiry", label: "Enquiry" },
    { value: "service_provider", label: "Service Provider" },
    { value: "general", label: "General" },
  ],
}

// ============================================
// Shared / Cross-module Filters
// ============================================

/**
 * Payment method filter (5 standard options).
 * Used by: payments, expenses, library-payments
 */
export const PAYMENT_METHOD_FILTER: FilterConfig = {
  id: "payment_method",
  label: "Method",
  type: "select",
  placeholder: "All Methods",
  options: [
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "bank_transfer", label: "Bank Transfer" },
    { value: "cheque", label: "Cheque" },
    { value: "card", label: "Card" },
  ],
}

/**
 * Active/Inactive boolean filter.
 * Used by: properties, library, library-sections, library-plans, notices,
 *          staff, expenses/products, expenses/vendors, expenses/services/providers
 */
export const ACTIVE_STATUS_FILTER: FilterConfig = {
  id: "is_active",
  label: "Status",
  type: "select",
  placeholder: "All Status",
  options: [
    { value: "true", label: "Active" },
    { value: "false", label: "Inactive" },
  ],
}

/**
 * Meter type filter.
 * Used by: meters, meter-readings
 */
export const METER_TYPE_FILTER: FilterConfig = {
  id: "meter_type",
  label: "Type",
  type: "select",
  placeholder: "All Types",
  options: [
    { value: "electricity", label: "Electricity" },
    { value: "water", label: "Water" },
    { value: "gas", label: "Gas" },
  ],
}

/**
 * Expense category filter - dynamic options loaded from database.
 * Used by: expenses/bills, expenses/daily-spend, expenses/misc,
 *          expenses/products, expenses/vendors, expenses/services,
 *          expenses/services/providers
 */
export const EXPENSE_CATEGORY_FILTER: FilterConfig = {
  id: "category_id",
  label: "Category",
  type: "select",
  placeholder: "All Categories",
}

/**
 * Complaint priority filter.
 * Used by: complaints
 */
export const PRIORITY_FILTER: FilterConfig = {
  id: "priority",
  label: "Priority",
  type: "select",
  placeholder: "All Priority",
  options: [
    { value: "urgent", label: "Urgent" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
  ],
}

// ============================================
// Factory Functions
// ============================================

interface StatusOption {
  value: string
  label: string
}

/**
 * Create a status filter with custom options.
 * The id defaults to "status" but can be overridden (e.g., "settlement_status").
 *
 * @example
 * createStatusFilter([
 *   { value: "active", label: "Active" },
 *   { value: "inactive", label: "Inactive" },
 * ])
 *
 * createStatusFilter(
 *   [{ value: "initiated", label: "Initiated" }],
 *   { id: "settlement_status" }
 * )
 */
export function createStatusFilter(
  options: StatusOption[],
  overrides?: Partial<FilterConfig>
): FilterConfig {
  return {
    id: "status",
    label: "Status",
    type: "select",
    placeholder: "All Status",
    options,
    ...overrides,
  }
}

/**
 * Create a date-range filter for any date column.
 *
 * @example
 * createDateRangeFilter("payment_date", "Date")
 * createDateRangeFilter("bill_date", "Bill Date")
 * createDateRangeFilter("created_at", "Received Date")
 */
export function createDateRangeFilter(
  id: string,
  label: string = "Date"
): FilterConfig {
  return {
    id,
    label,
    type: "date-range",
  }
}

/**
 * Create a single-date filter (not a range).
 *
 * @example
 * createDateFilter("attendance_date", "Date")
 * createDateFilter("spend_date", "Date")
 */
export function createDateFilter(
  id: string,
  label: string = "Date",
  placeholder: string = "Select date"
): FilterConfig {
  return {
    id,
    label,
    type: "date",
    placeholder,
  }
}
