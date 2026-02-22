/**
 * useBackNavigation Hook
 *
 * Provides dynamic back navigation for detail pages. Reads a `from` query
 * parameter (set by list pages when linking to detail pages) to return
 * the user to their previous location with filters/state preserved.
 *
 * Falls back to a static `defaultHref` if no `from` parameter is present
 * (e.g., direct URL access or bookmarks).
 *
 * @example
 * // In a detail page:
 * const { backHref, backLabel } = useBackNavigation({
 *   defaultHref: "/tenants",
 *   defaultLabel: "All Tenants",
 * })
 *
 * <DetailHero backHref={backHref} backLabel={backLabel} ... />
 *
 * @example
 * // In a list page (linking to detail):
 * <Link href={`/tenants/${id}?from=${encodeURIComponent(pathname + search)}`}>
 *
 * @example
 * // Or use the buildDetailHref helper:
 * import { buildDetailHref } from "@/lib/hooks/useBackNavigation"
 * <Link href={buildDetailHref(`/tenants/${id}`, pathname, search)}>
 */

"use client"

import { useSearchParams } from "next/navigation"
import { useMemo } from "react"

// ============================================================================
// TYPES
// ============================================================================

export interface UseBackNavigationOptions {
  /** Fallback href when no `from` parameter is present */
  defaultHref: string
  /** Fallback label for the back button */
  defaultLabel?: string
}

export interface UseBackNavigationReturn {
  /** The resolved back href (from query param or default) */
  backHref: string
  /** The resolved back label */
  backLabel: string
  /** Whether navigation is using the dynamic `from` parameter */
  isDynamic: boolean
}

// ============================================================================
// MODULE-TO-LABEL MAP
// ============================================================================

const MODULE_LABELS: Record<string, string> = {
  "/tenants": "All Tenants",
  "/bills": "All Bills",
  "/payments": "All Payments",
  "/properties": "All Properties",
  "/rooms": "All Rooms",
  "/expenses": "All Expenses",
  "/refunds": "All Refunds",
  "/complaints": "All Complaints",
  "/notices": "All Notices",
  "/visitors": "All Visitors",
  "/staff": "All Staff",
  "/meters": "All Meters",
  "/meter-readings": "All Readings",
  "/exit-clearance": "Exit Clearance",
  "/inquiries": "All Inquiries",
  "/people": "All People",
  "/library": "All Libraries",
  "/library-members": "All Members",
  "/library-sections": "All Sections",
  "/library-seats": "All Seats",
  "/library-lockers": "All Lockers",
  "/library-attendance": "All Attendance",
  "/library-payments": "All Payments",
  "/library-waitlist": "Waitlist",
  "/library-plans": "All Plans",
}

// ============================================================================
// HOOK
// ============================================================================

export function useBackNavigation(
  options: UseBackNavigationOptions
): UseBackNavigationReturn {
  const { defaultHref, defaultLabel = "Back" } = options
  const searchParams = useSearchParams()

  return useMemo(() => {
    const from = searchParams.get("from")

    if (!from) {
      return {
        backHref: defaultHref,
        backLabel: defaultLabel,
        isDynamic: false,
      }
    }

    // Validate the `from` URL is internal (starts with /)
    if (!from.startsWith("/")) {
      return {
        backHref: defaultHref,
        backLabel: defaultLabel,
        isDynamic: false,
      }
    }

    // Extract the base path for label lookup
    const basePath = "/" + from.split("/").filter(Boolean)[0]
    const label = MODULE_LABELS[basePath] || defaultLabel

    return {
      backHref: from,
      backLabel: label,
      isDynamic: true,
    }
  }, [searchParams, defaultHref, defaultLabel])
}

// ============================================================================
// HELPER: Build detail page href with `from` parameter
// ============================================================================

/**
 * Builds a detail page URL with a `from` parameter for dynamic back navigation.
 * Use this when linking from list pages to detail pages.
 *
 * @param detailHref - The detail page URL (e.g., `/tenants/abc-123`)
 * @param currentPath - Current page pathname (from usePathname())
 * @param currentSearch - Current search params string (from window.location.search or searchParams.toString())
 * @returns Full URL with `from` parameter
 *
 * @example
 * const pathname = usePathname()
 * const search = searchParams.toString()
 * <Link href={buildDetailHref(`/tenants/${id}`, pathname, search)}>
 */
export function buildDetailHref(
  detailHref: string,
  currentPath: string,
  currentSearch?: string
): string {
  const fromValue = currentSearch
    ? `${currentPath}?${currentSearch}`
    : currentPath

  const separator = detailHref.includes("?") ? "&" : "?"
  return `${detailHref}${separator}from=${encodeURIComponent(fromValue)}`
}
