/**
 * Hooks Index
 *
 * Centralized export for all custom hooks.
 *
 * @example
 * import {
 *   useAsyncOperation,
 *   useDebounce,
 *   useFormState,
 *   useDialogState,
 *   useDeleteConfirmation,
 * } from "@/lib/hooks"
 */

// Data fetching and state management
export * from "./useListPage"
export * from "./useAsyncOperation"
export * from "./useFormState"
export * from "./useRequireAuth"

// Utility hooks
export * from "./useDebounce"
export * from "./useCopyToClipboard"
export * from "./useTimer"
export * from "./useDialogState"
export * from "./useDeleteConfirmation"

// Tenant Portal hooks
export * from "./useTenant"
export * from "./useGroupedByMonth"

// Detail page hooks
export * from "./useInlineEdit"
export * from "./useDetailPage"
export * from "./useEntityMutation"
// useTableViews re-exports SortConfig and TableViewConfig which conflict with useListPage
// Export only the hook and unique types
export { useTableViews } from "./useTableViews"
export type { TableView, UseTableViewsOptions, UseTableViewsReturn } from "./useTableViews"
export * from "./useSidebarOrder"
export * from "./useKeyboardShortcuts"
export * from "./useCountUp"
export * from "./useRowSelection"
