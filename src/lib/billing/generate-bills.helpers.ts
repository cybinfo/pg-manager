/**
 * Pure helper functions extracted from the generate-bills cron route.
 *
 * These functions contain no database calls or side effects and are
 * exported so they can be unit-tested in isolation.
 *
 * The cron route (src/app/api/cron/generate-bills/route.ts) orchestrates
 * these helpers together with DB queries.
 */

import { parsePositiveNumber } from "@/lib/format"

// ============================================================================
// Types (mirrors the interfaces in the route)
// ============================================================================

export interface LineItem {
  type: string
  description: string
  amount: number
}

export interface ChargeTypeInfo {
  name?: string
  code?: string
}

export interface UnpaidBill {
  balance_due: number | string | null
}

// ============================================================================
// Line-item builders
// ============================================================================

/**
 * Build the monthly rent line item.
 *
 * @returns A LineItem or null when monthlyRent is not a positive number.
 */
export function buildRentLineItem(
  monthlyRent: unknown,
  currentMonth: string
): LineItem | null {
  const amount = parsePositiveNumber(monthlyRent)
  if (!amount) return null
  return {
    type: "Rent",
    description: `Monthly Rent - ${currentMonth}`,
    amount,
  }
}

/**
 * Build a line item for a pending charge.
 *
 * @returns A LineItem or null when the charge amount is invalid.
 */
export function buildChargeLineItem(
  chargeAmount: unknown,
  chargeType: ChargeTypeInfo | null,
  forPeriod: string | null | undefined,
  currentMonth: string
): LineItem | null {
  const amount = parsePositiveNumber(chargeAmount)
  if (!amount) return null
  return {
    type: chargeType?.name || "Charge",
    description: forPeriod || currentMonth,
    amount,
  }
}

// ============================================================================
// Charge filtering
// ============================================================================

/**
 * Determine whether a charge should be included based on the per-charge-type
 * inclusion map stored in auto_billing_settings.included_charge_types.
 *
 * A charge is included when:
 *  - includedChargeTypes is undefined/null (no restrictions), OR
 *  - the charge type has no code, OR
 *  - the code is not explicitly set to false in the map.
 */
export function shouldIncludeCharge(
  chargeType: ChargeTypeInfo | null,
  includedChargeTypes: Record<string, boolean> | undefined | null
): boolean {
  if (!includedChargeTypes) return true
  if (!chargeType?.code) return true
  return includedChargeTypes[chargeType.code] !== false
}

// ============================================================================
// Amount calculations
// ============================================================================

/**
 * Sum the amounts of all line items.
 */
export function sumLineItems(lineItems: LineItem[]): number {
  return lineItems.reduce((sum, item) => sum + item.amount, 0)
}

/**
 * Calculate the total previous balance from a list of unpaid bills.
 *
 * Uses parsePositiveNumber to guard against null / string / negative values
 * (matching the CQ-006 defensive coding in the route).
 */
export function calculatePreviousBalance(unpaidBills: UnpaidBill[]): number {
  return unpaidBills.reduce((sum, bill) => {
    const balance = parsePositiveNumber(bill.balance_due)
    return sum + (balance ?? 0)
  }, 0)
}

// ============================================================================
// Date arithmetic
// ============================================================================

/**
 * Format a Date as a local-timezone YYYY-MM-DD string.
 *
 * Using toISOString() produces a UTC timestamp which, in timezones ahead of
 * UTC (e.g. IST = UTC+5:30), shifts midnight-constructed local dates back to
 * the previous calendar day. This helper uses local getFullYear/Month/Date
 * to avoid that off-by-one bug.
 */
function toLocalISODate(d: Date): string {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const dd = String(d.getDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

/**
 * Calculate the due date by adding dueDayOffset calendar days to `today`.
 *
 * Returns an ISO date string (YYYY-MM-DD) in the local timezone.
 * Does not mutate the input date.
 */
export function calculateDueDate(today: Date, dueDayOffset: number): string {
  const dueDate = new Date(today)
  dueDate.setDate(dueDate.getDate() + dueDayOffset)
  return toLocalISODate(dueDate)
}

/**
 * Calculate the billing period (first and last day of `today`'s calendar month).
 *
 * Returns ISO date strings (YYYY-MM-DD) in the local timezone.
 * Using new Date(year, month, day) constructs a local-timezone midnight, so
 * we format with toLocalISODate() rather than toISOString() to avoid the
 * UTC-shift bug in positive-offset timezones such as IST (UTC+5:30).
 */
export function calculateBillingPeriod(today: Date): {
  periodStart: string
  periodEnd: string
} {
  const periodStart = new Date(today.getFullYear(), today.getMonth(), 1)
  const periodEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  return {
    periodStart: toLocalISODate(periodStart),
    periodEnd: toLocalISODate(periodEnd),
  }
}

// ============================================================================
// Billing-day gate checks
// ============================================================================

/**
 * Return true when today is NOT the configured billing day — meaning we should
 * skip generation for this owner config.
 */
export function shouldSkipBillingDay(
  currentDay: number,
  billingDay: number
): boolean {
  return currentDay !== billingDay
}

/**
 * Return true when bills have already been generated for the given month —
 * i.e. the cron should be idempotent and skip this run.
 */
export function alreadyGeneratedThisMonth(
  lastGeneratedMonth: string | null,
  currentMonth: string
): boolean {
  return lastGeneratedMonth === currentMonth
}
