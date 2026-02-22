/**
 * Column & Metric Factories
 *
 * Centralized factories for DataTable columns and metrics.
 * Import from here instead of individual files.
 *
 * @example
 * // Simple column builders (Record<string, any> based)
 * import { statusColumn, currencyColumn, dateColumn, badgeColumn } from "@/lib/columns"
 *
 * // Generic typed column factories
 * import {
 *   createAvatarNameColumn,
 *   createCurrencyColumn,
 *   createStatusColumn,
 * } from "@/lib/columns"
 *
 * // Metric factories
 * import { createTotalMetric, createSumMetric } from "@/lib/columns"
 */

// Simple column builders (widely used across list pages)
export {
  statusColumn,
  currencyColumn,
  dateColumn,
  badgeColumn,
} from "./builders"

// Generic typed column factories
export {
  createAvatarNameColumn,
  createCurrencyColumn,
  createDateColumn,
  createStatusColumn,
  createBadgeColumn,
  createPropertyRoomColumn,
  createTenantColumn,
  createActionsColumn,
} from "./factories"

// Metric factories
export {
  createTotalMetric,
  createCountMetric,
  createCountInMetric,
  createSumMetric,
  createFilteredSumMetric,
  createCustomMetric,
  MetricHighlights,
} from "./metrics"
