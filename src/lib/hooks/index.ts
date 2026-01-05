/**
 * Centralized Hooks
 *
 * Export all custom hooks from this module.
 */

// List Page Hook
export {
  useListPage,
  TENANT_LIST_CONFIG,
  PAYMENT_LIST_CONFIG,
  BILL_LIST_CONFIG,
  EXPENSE_LIST_CONFIG,
  COMPLAINT_LIST_CONFIG,
  VISITOR_LIST_CONFIG,
  STAFF_LIST_CONFIG,
  PROPERTY_LIST_CONFIG,
  ROOM_LIST_CONFIG,
  EXIT_CLEARANCE_LIST_CONFIG,
  NOTICE_LIST_CONFIG,
  METER_READING_LIST_CONFIG,
  APPROVAL_LIST_CONFIG,
} from "./useListPage"
export type {
  ListPageConfig,
  FilterConfig,
  GroupByOption,
  MetricConfig,
  UseListPageOptions,
  UseListPageReturn,
} from "./useListPage"

// Entity Mutation Hook
export { useEntityMutation } from "./useEntityMutation"
export type {
  UseEntityMutationOptions,
  MutationOptions,
  UseEntityMutationReturn,
} from "./useEntityMutation"
