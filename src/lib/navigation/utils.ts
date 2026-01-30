/**
 * Navigation Utilities
 *
 * Centralized utilities for navigation active states and route matching.
 * Eliminates 3+ duplicate active state implementations.
 *
 * @example
 * import { isActiveRoute, getActivePath } from "@/lib/navigation/utils"
 *
 * const isActive = isActiveRoute("/tenants", pathname)
 */

// ============================================================================
// ACTIVE STATE DETECTION
// ============================================================================

/**
 * Check if a route is currently active
 *
 * @param href - The navigation link href
 * @param pathname - Current pathname from usePathname()
 * @param options - Matching options
 *
 * @example
 * // Exact match (for dashboard home)
 * isActiveRoute("/dashboard", pathname, { exact: true })
 *
 * // Prefix match (for section pages)
 * isActiveRoute("/tenants", pathname) // Matches /tenants, /tenants/123, etc.
 */
export function isActiveRoute(
  href: string,
  pathname: string,
  options: { exact?: boolean } = {}
): boolean {
  const { exact = false } = options

  // Handle special cases
  if (href === "#more") {
    return false
  }

  // Normalize paths
  const normalizedHref = normalizePath(href)
  const normalizedPathname = normalizePath(pathname)

  if (exact) {
    return normalizedPathname === normalizedHref
  }

  // Special case: root paths like /dashboard or /tenant should be exact
  const isRootPath = normalizedHref.split("/").filter(Boolean).length <= 1
  if (isRootPath) {
    return normalizedPathname === normalizedHref
  }

  // Prefix match for section pages
  return (
    normalizedPathname === normalizedHref ||
    normalizedPathname.startsWith(`${normalizedHref}/`)
  )
}

/**
 * Normalize a path by removing trailing slashes
 */
function normalizePath(path: string): string {
  return path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path
}

/**
 * Get the base path from a pathname (first segment)
 *
 * @example
 * getBasePath("/tenants/123/journey") // "/tenants"
 * getBasePath("/dashboard") // "/dashboard"
 */
export function getBasePath(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean)
  return segments.length > 0 ? `/${segments[0]}` : "/"
}

/**
 * Get the active navigation item's href from a list
 *
 * @example
 * const activeHref = getActiveNavHref(navigation, pathname)
 */
export function getActiveNavHref<T extends { href: string }>(
  items: T[],
  pathname: string
): string | null {
  // First try exact match
  const exactMatch = items.find((item) =>
    isActiveRoute(item.href, pathname, { exact: true })
  )
  if (exactMatch) return exactMatch.href

  // Then try prefix match
  const prefixMatch = items.find((item) => isActiveRoute(item.href, pathname))
  return prefixMatch?.href || null
}

// ============================================================================
// BREADCRUMB HELPERS
// ============================================================================

export interface BreadcrumbItem {
  label: string
  href?: string
}

/**
 * Generate breadcrumb items from pathname
 *
 * @example
 * const crumbs = generateBreadcrumbs("/tenants/123/journey", {
 *   labels: { tenants: "Tenants", journey: "Journey" }
 * })
 * // [{ label: "Dashboard", href: "/dashboard" }, { label: "Tenants", href: "/tenants" }, { label: "Journey" }]
 */
export function generateBreadcrumbs(
  pathname: string,
  options: {
    /** Custom labels for segments */
    labels?: Record<string, string>
    /** Home breadcrumb config */
    home?: { label: string; href: string }
    /** Skip numeric/UUID segments */
    skipIds?: boolean
  } = {}
): BreadcrumbItem[] {
  const {
    labels = {},
    home = { label: "Dashboard", href: "/dashboard" },
    skipIds = true,
  } = options

  const segments = pathname.split("/").filter(Boolean)
  const crumbs: BreadcrumbItem[] = [home]

  let currentPath = ""

  segments.forEach((segment, index) => {
    currentPath += `/${segment}`

    // Skip IDs (numeric or UUID)
    if (skipIds && isIdSegment(segment)) {
      return
    }

    const isLast = index === segments.length - 1
    const label = labels[segment] || formatSegmentLabel(segment)

    crumbs.push({
      label,
      href: isLast ? undefined : currentPath,
    })
  })

  return crumbs
}

/**
 * Check if a segment is an ID (numeric or UUID)
 */
function isIdSegment(segment: string): boolean {
  // Numeric
  if (/^\d+$/.test(segment)) return true

  // UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(segment)) {
    return true
  }

  return false
}

/**
 * Format a URL segment as a readable label
 *
 * @example
 * formatSegmentLabel("meter-readings") // "Meter Readings"
 * formatSegmentLabel("exitClearance") // "Exit Clearance"
 */
export function formatSegmentLabel(segment: string): string {
  return segment
    // Handle kebab-case
    .replace(/-/g, " ")
    // Handle camelCase
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    // Capitalize words
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

// ============================================================================
// NAVIGATION STATE HELPERS
// ============================================================================

/**
 * Check if current page is a detail/sub page
 *
 * @example
 * isDetailPage("/tenants/123") // true
 * isDetailPage("/tenants") // false
 */
export function isDetailPage(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean)
  return segments.length > 1
}

/**
 * Check if current page is a "new" page
 *
 * @example
 * isNewPage("/tenants/new") // true
 * isNewPage("/tenants/123") // false
 */
export function isNewPage(pathname: string): boolean {
  return pathname.endsWith("/new")
}

/**
 * Check if current page is an edit page
 *
 * @example
 * isEditPage("/tenants/123/edit") // true
 */
export function isEditPage(pathname: string): boolean {
  return pathname.endsWith("/edit")
}

/**
 * Get the parent list page from a detail page
 *
 * @example
 * getParentListPath("/tenants/123/journey") // "/tenants"
 * getParentListPath("/tenants/new") // "/tenants"
 */
export function getParentListPath(pathname: string): string {
  const basePath = getBasePath(pathname)
  return basePath
}

// ============================================================================
// SCROLL STATE
// ============================================================================

/**
 * Scroll navigation into view when active item changes
 * Useful for long navigation lists
 */
export function scrollNavItemIntoView(
  containerSelector: string,
  activeItemSelector: string
): void {
  const container = document.querySelector(containerSelector)
  const activeItem = document.querySelector(activeItemSelector)

  if (container && activeItem) {
    activeItem.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    })
  }
}
