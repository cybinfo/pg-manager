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
