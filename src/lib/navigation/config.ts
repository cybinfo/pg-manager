/**
 * Navigation Configuration
 *
 * Centralized navigation definitions for dashboard and tenant portal.
 * Eliminates duplicate navigation arrays across layouts.
 *
 * @example
 * import { DASHBOARD_NAVIGATION, TENANT_NAVIGATION } from "@/lib/navigation/config"
 *
 * const filteredNav = filterNavigation(DASHBOARD_NAVIGATION, {
 *   hasPermission,
 *   isFeatureEnabled,
 * })
 */

import {
  LayoutDashboard,
  Building2,
  Home,
  Users,
  Contact,
  Receipt,
  CreditCard,
  Wallet,
  TrendingDown,
  Gauge,
  UserMinus,
  UserPlus,
  MessageSquare,
  Bell,
  FileText,
  Activity,
  Grid3X3,
  ClipboardCheck,
  UserCog,
  MoreHorizontal,
  User,
  FolderOpen,
  type LucideIcon,
} from "lucide-react"
import type { FeatureFlagKey } from "@/lib/features"

// ============================================================================
// TYPES
// ============================================================================

export interface NavItem {
  /** Display name */
  name: string
  /** Route path */
  href: string
  /** Lucide icon component */
  icon: LucideIcon
  /** Permission required (null = no permission needed) */
  permission: string | null
  /** Feature flag key (null = always show) */
  feature: FeatureFlagKey | null
  /** Badge count (optional) */
  badge?: number
  /** Whether this is a divider/separator before this item */
  dividerBefore?: boolean
}

export interface SimpleNavItem {
  name: string
  href: string
  icon: LucideIcon
}

// ============================================================================
// DASHBOARD NAVIGATION
// ============================================================================

export const DASHBOARD_NAVIGATION: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: null, feature: null },
  { name: "Properties", href: "/properties", icon: Building2, permission: "properties.view", feature: null },
  { name: "Rooms", href: "/rooms", icon: Home, permission: "rooms.view", feature: null },
  { name: "Tenants", href: "/tenants", icon: Users, permission: "tenants.view", feature: null },
  { name: "People", href: "/people", icon: Contact, permission: "tenants.view", feature: null },
  { name: "Bills", href: "/bills", icon: Receipt, permission: "bills.view", feature: null },
  { name: "Payments", href: "/payments", icon: CreditCard, permission: "payments.view", feature: null },
  { name: "Refunds", href: "/refunds", icon: Wallet, permission: "payments.view", feature: null },
  { name: "Expenses", href: "/expenses", icon: TrendingDown, permission: "expenses.view", feature: "expenses" },
  { name: "Meter Readings", href: "/meter-readings", icon: Gauge, permission: "meter_readings.view", feature: "meterReadings" },
  { name: "Meters", href: "/meters", icon: Gauge, permission: "meters.view", feature: null },
  { name: "Exit Clearance", href: "/exit-clearance", icon: UserMinus, permission: "exit_clearance.initiate", feature: "exitClearance" },
  { name: "Visitors", href: "/visitors", icon: UserPlus, permission: "visitors.view", feature: "visitors" },
  { name: "Complaints", href: "/complaints", icon: MessageSquare, permission: "complaints.view", feature: "complaints" },
  { name: "Notices", href: "/notices", icon: Bell, permission: "notices.view", feature: "notices" },
  { name: "Reports", href: "/reports", icon: FileText, permission: "reports.view", feature: "reports" },
  { name: "Activity Log", href: "/activity", icon: Activity, permission: null, feature: "activityLog" },
  { name: "Architecture", href: "/architecture", icon: Grid3X3, permission: "properties.view", feature: "architectureView" },
  { name: "Approvals", href: "/approvals", icon: ClipboardCheck, permission: "tenants.view", feature: "approvals" },
  { name: "Staff", href: "/staff", icon: UserCog, permission: "staff.view", feature: null },
]

/**
 * Mobile bottom nav items (5 most used)
 */
export const DASHBOARD_MOBILE_NAV: SimpleNavItem[] = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tenants", href: "/tenants", icon: Users },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Bills", href: "/bills", icon: Receipt },
  { name: "More", href: "#more", icon: MoreHorizontal },
]

// ============================================================================
// TENANT PORTAL NAVIGATION
// ============================================================================

export const TENANT_NAVIGATION: SimpleNavItem[] = [
  { name: "Home", href: "/tenant", icon: Home },
  { name: "My Profile", href: "/tenant/profile", icon: User },
  { name: "My Bills", href: "/tenant/bills", icon: FileText },
  { name: "Payments", href: "/tenant/payments", icon: CreditCard },
  { name: "Documents", href: "/tenant/documents", icon: FolderOpen },
  { name: "Complaints", href: "/tenant/complaints", icon: MessageSquare },
  { name: "Notices", href: "/tenant/notices", icon: Bell },
]

// ============================================================================
// NAVIGATION FILTERING
// ============================================================================

interface FilterOptions {
  /** Function to check if user has a permission */
  hasPermission: (permission: string) => boolean
  /** Function to check if a feature is enabled */
  isFeatureEnabled: (feature: FeatureFlagKey) => boolean
  /** Whether user is platform admin (bypasses permission checks) */
  isPlatformAdmin?: boolean
}

/**
 * Filter navigation items based on permissions and feature flags
 *
 * @example
 * const filteredNav = filterNavigation(DASHBOARD_NAVIGATION, {
 *   hasPermission,
 *   isFeatureEnabled,
 *   isPlatformAdmin,
 * })
 */
export function filterNavigation(
  items: NavItem[],
  options: FilterOptions
): NavItem[] {
  const { hasPermission, isFeatureEnabled, isPlatformAdmin = false } = options

  return items.filter((item) => {
    // Check feature flag first - if feature is disabled, hide the item
    if (item.feature !== null && !isFeatureEnabled(item.feature)) {
      return false
    }

    // Platform admins see everything (that passes feature check)
    if (isPlatformAdmin) {
      return true
    }

    // Always show items with no permission requirement
    if (item.permission === null) {
      return true
    }

    // Check permission
    return hasPermission(item.permission)
  })
}

// ============================================================================
// ROUTE METADATA
// ============================================================================

/**
 * Route configuration with all metadata in one place
 */
export interface RouteConfig {
  /** Route path */
  path: string
  /** Permission required to access */
  permission: string | null
  /** Feature flag that must be enabled */
  feature: FeatureFlagKey | null
  /** Page title */
  title: string
  /** Icon for navigation */
  icon: LucideIcon
}

/**
 * Complete route configuration map
 * Use this as single source of truth for route metadata
 */
export const ROUTE_CONFIGS: Record<string, RouteConfig> = {
  "/dashboard": { path: "/dashboard", permission: null, feature: null, title: "Dashboard", icon: LayoutDashboard },
  "/properties": { path: "/properties", permission: "properties.view", feature: null, title: "Properties", icon: Building2 },
  "/rooms": { path: "/rooms", permission: "rooms.view", feature: null, title: "Rooms", icon: Home },
  "/tenants": { path: "/tenants", permission: "tenants.view", feature: null, title: "Tenants", icon: Users },
  "/people": { path: "/people", permission: "tenants.view", feature: null, title: "People", icon: Contact },
  "/bills": { path: "/bills", permission: "bills.view", feature: null, title: "Bills", icon: Receipt },
  "/payments": { path: "/payments", permission: "payments.view", feature: null, title: "Payments", icon: CreditCard },
  "/refunds": { path: "/refunds", permission: "payments.view", feature: null, title: "Refunds", icon: Wallet },
  "/expenses": { path: "/expenses", permission: "expenses.view", feature: "expenses", title: "Expenses", icon: TrendingDown },
  "/meter-readings": { path: "/meter-readings", permission: "meter_readings.view", feature: "meterReadings", title: "Meter Readings", icon: Gauge },
  "/meters": { path: "/meters", permission: "meters.view", feature: null, title: "Meters", icon: Gauge },
  "/exit-clearance": { path: "/exit-clearance", permission: "exit_clearance.initiate", feature: "exitClearance", title: "Exit Clearance", icon: UserMinus },
  "/visitors": { path: "/visitors", permission: "visitors.view", feature: "visitors", title: "Visitors", icon: UserPlus },
  "/complaints": { path: "/complaints", permission: "complaints.view", feature: "complaints", title: "Complaints", icon: MessageSquare },
  "/notices": { path: "/notices", permission: "notices.view", feature: "notices", title: "Notices", icon: Bell },
  "/reports": { path: "/reports", permission: "reports.view", feature: "reports", title: "Reports", icon: FileText },
  "/activity": { path: "/activity", permission: null, feature: "activityLog", title: "Activity Log", icon: Activity },
  "/architecture": { path: "/architecture", permission: "properties.view", feature: "architectureView", title: "Architecture", icon: Grid3X3 },
  "/approvals": { path: "/approvals", permission: "tenants.view", feature: "approvals", title: "Approvals", icon: ClipboardCheck },
  "/staff": { path: "/staff", permission: "staff.view", feature: null, title: "Staff", icon: UserCog },
}

/**
 * Get route config for a path
 */
export function getRouteConfig(path: string): RouteConfig | undefined {
  // Try exact match first
  if (ROUTE_CONFIGS[path]) {
    return ROUTE_CONFIGS[path]
  }

  // Try to find parent route (for detail pages like /tenants/123)
  const basePath = "/" + path.split("/").filter(Boolean)[0]
  return ROUTE_CONFIGS[basePath]
}

/**
 * Check if user can access a route
 */
export function canAccessRoute(
  path: string,
  options: FilterOptions
): boolean {
  const config = getRouteConfig(path)
  if (!config) return true // Unknown routes are accessible

  // Check feature first
  if (config.feature && !options.isFeatureEnabled(config.feature)) {
    return false
  }

  // Platform admins can access all
  if (options.isPlatformAdmin) {
    return true
  }

  // No permission required
  if (!config.permission) {
    return true
  }

  return options.hasPermission(config.permission)
}
