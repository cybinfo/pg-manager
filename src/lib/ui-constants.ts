/**
 * UI Constants
 *
 * Common repeated UI strings extracted to constants for consistency.
 * Adopt these incrementally across components to reduce hardcoded strings.
 *
 * @example
 * import { UI_STRINGS } from "@/lib/ui-constants"
 *
 * <Button>{UI_STRINGS.SAVE}</Button>
 * <p>{UI_STRINGS.NO_RESULTS}</p>
 */

export const UI_STRINGS = {
  LOADING: "Loading...",
  NO_RESULTS: "No results found",
  BACK: "Back",
  VIEW_ALL: "View All",
  SAVE: "Save",
  CANCEL: "Cancel",
  DELETE: "Delete",
  CONFIRM: "Confirm",
  SEARCH_PLACEHOLDER: "Search...",
} as const
