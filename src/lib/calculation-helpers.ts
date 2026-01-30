/**
 * Calculation Helpers
 *
 * Centralized calculation utilities for billing, payments, and aggregations.
 * Eliminates duplicate reduce patterns across workflows and cron jobs.
 *
 * @example
 * import {
 *   calculateTotalDues,
 *   calculateBalanceDue,
 *   sumBy,
 * } from "@/lib/calculation-helpers"
 *
 * const totalDues = calculateTotalDues(unpaidBills)
 * const balance = calculateBalanceDue(bill)
 */

// ============================================================================
// BILL CALCULATIONS
// ============================================================================

interface BillLike {
  balance_due?: number | null
  total_amount?: number | null
  paid_amount?: number | null
}

/**
 * Calculate total outstanding dues from an array of bills
 *
 * @example
 * const totalDues = calculateTotalDues(unpaidBills)
 */
export function calculateTotalDues(bills: BillLike[]): number {
  return (bills || []).reduce((sum, bill) => {
    return sum + (bill.balance_due || 0)
  }, 0)
}

/**
 * Calculate balance due for a single bill
 *
 * @example
 * const balance = calculateBalanceDue({ total_amount: 5000, paid_amount: 2000 })
 * // balance = 3000
 */
export function calculateBalanceDue(bill: BillLike): number {
  const total = bill.total_amount || 0
  const paid = bill.paid_amount || 0
  return Math.max(0, total - paid)
}

/**
 * Calculate total amount for an array of bills
 *
 * @example
 * const total = calculateTotalAmount(bills)
 */
export function calculateTotalAmount(bills: BillLike[]): number {
  return (bills || []).reduce((sum, bill) => {
    return sum + (bill.total_amount || 0)
  }, 0)
}

/**
 * Calculate total paid amount for an array of bills
 *
 * @example
 * const totalPaid = calculateTotalPaid(bills)
 */
export function calculateTotalPaid(bills: BillLike[]): number {
  return (bills || []).reduce((sum, bill) => {
    return sum + (bill.paid_amount || 0)
  }, 0)
}

// ============================================================================
// PAYMENT CALCULATIONS
// ============================================================================

interface PaymentLike {
  amount?: number | null
}

/**
 * Calculate total payments from an array
 *
 * @example
 * const total = calculateTotalPayments(payments)
 */
export function calculateTotalPayments(payments: PaymentLike[]): number {
  return (payments || []).reduce((sum, payment) => {
    return sum + (payment.amount || 0)
  }, 0)
}

// ============================================================================
// REFUND CALCULATIONS
// ============================================================================

interface RefundLike {
  amount?: number | null
  status?: string
}

/**
 * Calculate total pending refunds
 *
 * @example
 * const pendingRefunds = calculatePendingRefunds(refunds)
 */
export function calculatePendingRefunds(refunds: RefundLike[]): number {
  return (refunds || [])
    .filter((r) => r.status === "pending" || r.status === "approved")
    .reduce((sum, refund) => sum + (refund.amount || 0), 0)
}

/**
 * Calculate total completed refunds
 */
export function calculateCompletedRefunds(refunds: RefundLike[]): number {
  return (refunds || [])
    .filter((r) => r.status === "completed")
    .reduce((sum, refund) => sum + (refund.amount || 0), 0)
}

// ============================================================================
// EXIT SETTLEMENT CALCULATIONS
// ============================================================================

interface SettlementData {
  unpaidBills: BillLike[]
  securityDeposit: number
  advanceAmount?: number
  pendingRefunds?: RefundLike[]
  additionalCharges?: number
}

interface SettlementResult {
  totalDues: number
  totalRefundable: number
  netSettlement: number
  isOwedToTenant: boolean
}

/**
 * Calculate exit settlement amounts
 *
 * @example
 * const settlement = calculateExitSettlement({
 *   unpaidBills: bills,
 *   securityDeposit: 10000,
 *   advanceAmount: 2000,
 * })
 * // settlement.netSettlement = amount to pay/receive
 * // settlement.isOwedToTenant = true if tenant gets money back
 */
export function calculateExitSettlement(data: SettlementData): SettlementResult {
  const totalDues = calculateTotalDues(data.unpaidBills) + (data.additionalCharges || 0)
  const totalRefundable =
    data.securityDeposit +
    (data.advanceAmount || 0) -
    calculatePendingRefunds(data.pendingRefunds || [])

  const netSettlement = totalRefundable - totalDues

  return {
    totalDues,
    totalRefundable,
    netSettlement: Math.abs(netSettlement),
    isOwedToTenant: netSettlement > 0,
  }
}

// ============================================================================
// GENERIC AGGREGATION HELPERS
// ============================================================================

/**
 * Sum values by a specific key
 *
 * @example
 * const total = sumBy(items, "amount")
 */
export function sumBy<T extends Record<string, unknown>>(
  items: T[],
  key: keyof T
): number {
  return (items || []).reduce((sum, item) => {
    const value = item[key]
    return sum + (typeof value === "number" ? value : 0)
  }, 0)
}

/**
 * Sum values using a custom function
 *
 * @example
 * const total = sumByFn(items, (item) => item.price * item.quantity)
 */
export function sumByFn<T>(
  items: T[],
  fn: (item: T) => number
): number {
  return (items || []).reduce((sum, item) => sum + (fn(item) || 0), 0)
}

/**
 * Count items matching a condition
 *
 * @example
 * const activeCount = countBy(tenants, (t) => t.status === "active")
 */
export function countBy<T>(
  items: T[],
  predicate: (item: T) => boolean
): number {
  return (items || []).filter(predicate).length
}

/**
 * Group items by a key
 *
 * @example
 * const byStatus = groupBy(tenants, "status")
 * // { active: [...], inactive: [...] }
 */
export function groupBy<T extends Record<string, unknown>>(
  items: T[],
  key: keyof T
): Record<string, T[]> {
  return (items || []).reduce(
    (groups, item) => {
      const groupKey = String(item[key] || "unknown")
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(item)
      return groups
    },
    {} as Record<string, T[]>
  )
}

/**
 * Group and count items by a key
 *
 * @example
 * const statusCounts = groupAndCount(tenants, "status")
 * // { active: 5, inactive: 2 }
 */
export function groupAndCount<T extends Record<string, unknown>>(
  items: T[],
  key: keyof T
): Record<string, number> {
  return (items || []).reduce(
    (counts, item) => {
      const groupKey = String(item[key] || "unknown")
      counts[groupKey] = (counts[groupKey] || 0) + 1
      return counts
    },
    {} as Record<string, number>
  )
}

/**
 * Group and sum items by a key
 *
 * @example
 * const revenueByProperty = groupAndSum(payments, "property_id", "amount")
 * // { "prop-1": 50000, "prop-2": 30000 }
 */
export function groupAndSum<T extends Record<string, unknown>>(
  items: T[],
  groupKey: keyof T,
  sumKey: keyof T
): Record<string, number> {
  return (items || []).reduce(
    (sums, item) => {
      const group = String(item[groupKey] || "unknown")
      const value = item[sumKey]
      sums[group] = (sums[group] || 0) + (typeof value === "number" ? value : 0)
      return sums
    },
    {} as Record<string, number>
  )
}

// ============================================================================
// PERCENTAGE CALCULATIONS
// ============================================================================

/**
 * Calculate percentage
 *
 * @example
 * const percent = calculatePercentage(25, 100) // 25
 * const percent = calculatePercentage(1, 3, 2)  // 33.33
 */
export function calculatePercentage(
  value: number,
  total: number,
  decimals: number = 0
): number {
  if (total === 0) return 0
  const percentage = (value / total) * 100
  return Number(percentage.toFixed(decimals))
}

/**
 * Calculate discount amount from percentage
 *
 * @example
 * const discount = calculateDiscount(5000, 10) // 500
 */
export function calculateDiscount(
  amount: number,
  discountPercent: number
): number {
  return Math.round((amount * discountPercent) / 100)
}

/**
 * Apply discount to amount
 *
 * @example
 * const finalAmount = applyDiscount(5000, 10) // 4500
 */
export function applyDiscount(
  amount: number,
  discountPercent: number
): number {
  return amount - calculateDiscount(amount, discountPercent)
}

// ============================================================================
// OCCUPANCY CALCULATIONS
// ============================================================================

/**
 * Calculate occupancy rate
 *
 * @example
 * const rate = calculateOccupancyRate(8, 10) // 80
 */
export function calculateOccupancyRate(
  occupied: number,
  total: number
): number {
  return calculatePercentage(occupied, total, 1)
}

/**
 * Calculate available beds/rooms
 */
export function calculateAvailable(total: number, occupied: number): number {
  return Math.max(0, total - occupied)
}

// ============================================================================
// COLLECTION RATE
// ============================================================================

/**
 * Calculate payment collection rate
 *
 * @example
 * const rate = calculateCollectionRate(45000, 50000) // 90
 */
export function calculateCollectionRate(
  collected: number,
  expected: number
): number {
  return calculatePercentage(collected, expected, 1)
}
