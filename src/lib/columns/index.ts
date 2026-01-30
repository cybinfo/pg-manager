/**
 * Column & Metric Factories
 *
 * Centralized factories for DataTable columns and metrics.
 * Import from here instead of individual files.
 *
 * @example
 * import {
 *   createAvatarNameColumn,
 *   createCurrencyColumn,
 *   createStatusColumn,
 *   createTotalMetric,
 *   createSumMetric,
 * } from "@/lib/columns"
 */

// Column factories
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
