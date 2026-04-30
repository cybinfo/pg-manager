/**
 * Navigation Configuration
 *
 * Centralized navigation definitions for dashboard, tenant portal, and member portal.
 * Eliminates duplicate navigation arrays across layouts.
 *
 * @example
 * import { DASHBOARD_NAVIGATION, TENANT_NAVIGATION, LIBRARY_MEMBER_NAVIGATION } from "@/lib/navigation/config"
 *
 * const filteredNav = filterNavigation(DASHBOARD_NAVIGATION, {
 *   hasPermission,
 *   isModuleEnabled,
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
  TrendingUp,
  UserMinus,
  UserPlus,
  MessageSquare,
  Bell,
  FileText,
  Activity,
  Grid3X3,
  Layers,
  ClipboardCheck,
  UserCog,
  MoreHorizontal,
  User,
  FolderOpen,
  Inbox,
  Package,
  ShoppingCart,
  Store,
  Wrench,
  Hammer,
  Library,
  Armchair,
  Clock,
  Lock,
  BarChart3,
  ListOrdered,
  QrCode,
  BookOpen,
  RefreshCw,
  type LucideIcon,
} from "lucide-react"
import type { ModuleKey } from "@/lib/features"

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
  /** Module key required to be enabled (null = always show) */
  module: ModuleKey | null
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
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: null, module: null },
  { name: "Properties", href: "/properties", icon: Building2, permission: "properties.view", module: "properties" },
  { name: "Rooms", href: "/rooms", icon: Home, permission: "rooms.view", module: "rooms" },
  { name: "Tenants", href: "/tenants", icon: Users, permission: "tenants.view", module: "tenants" },
  { name: "People", href: "/people", icon: Contact, permission: "tenants.view", module: "people" },
  { name: "Bills", href: "/bills", icon: Receipt, permission: "bills.view", module: "billing" },
  { name: "Payments", href: "/payments", icon: CreditCard, permission: "payments.view", module: "payments" },
  { name: "Refunds", href: "/refunds", icon: Wallet, permission: "payments.view", module: "refunds" },
  { name: "Expenses", href: "/expenses", icon: TrendingDown, permission: "expenses.view", module: "expenses" },
  { name: "Daily Spend", href: "/expenses/daily-spend", icon: ShoppingCart, permission: "expenses.view", module: "expenses" },
  { name: "Products", href: "/expenses/products", icon: Package, permission: "expenses.view", module: "expenses" },
  { name: "Vendors", href: "/expenses/vendors", icon: Store, permission: "expenses.view", module: "expenses" },
  { name: "Bill Payments", href: "/expenses/bills", icon: Receipt, permission: "expenses.view", module: "expenses" },
  { name: "Service Providers", href: "/expenses/services/providers", icon: Wrench, permission: "expenses.view", module: "expenses" },
  { name: "Services", href: "/expenses/services", icon: Hammer, permission: "expenses.view", module: "expenses" },
  { name: "Meter Readings", href: "/meter-readings", icon: TrendingUp, permission: "meter_readings.view", module: "meters" },
  { name: "Meters", href: "/meters", icon: Gauge, permission: "meters.view", module: "meters" },
  { name: "Exit Clearance", href: "/exit-clearance", icon: UserMinus, permission: "exit_clearance.initiate", module: "exitClearance" },
  { name: "Visitors", href: "/visitors", icon: UserPlus, permission: "visitors.view", module: "visitors" },
  { name: "Inquiries", href: "/inquiries", icon: Inbox, permission: "tenants.view", module: "inquiries" },
  { name: "Complaints", href: "/complaints", icon: MessageSquare, permission: "complaints.view", module: "complaints" },
  { name: "Notices", href: "/notices", icon: Bell, permission: "notices.view", module: "notices" },
  { name: "Reports", href: "/reports", icon: FileText, permission: "reports.view", module: "reports" },
  { name: "Activity Log", href: "/activity", icon: Activity, permission: null, module: "activityLog" },
  { name: "Architecture", href: "/architecture", icon: Grid3X3, permission: "properties.view", module: "properties" },
  { name: "Approvals", href: "/approvals", icon: ClipboardCheck, permission: "tenants.view", module: "approvals" },
  { name: "Staff", href: "/staff", icon: UserCog, permission: "staff.view", module: "staff" },
  // Library Modules
  { name: "Library", href: "/library", icon: Library, permission: "library.view", module: "members", dividerBefore: true },
  { name: "Sections", href: "/library-sections", icon: Layers, permission: "library_sections.view", module: "sections" },
  { name: "Seats", href: "/library-seats", icon: Armchair, permission: "library_seats.view", module: "seats" },
  { name: "Members", href: "/library-members", icon: Users, permission: "library_members.view", module: "members" },
  { name: "Waitlist", href: "/library-waitlist", icon: ListOrdered, permission: "library_waitlist.view", module: "waitlist" },
  { name: "Attendance", href: "/library-attendance", icon: Clock, permission: "library_attendance.view", module: "attendance" },
  { name: "Lockers", href: "/library-lockers", icon: Lock, permission: "library_lockers.view", module: "lockers" },
  { name: "Subscriptions", href: "/library-subscriptions", icon: BookOpen, permission: "library_members.view", module: "subscriptions" },
  { name: "Library Payments", href: "/library-payments", icon: CreditCard, permission: "library_payments.view", module: "payments" },
  { name: "Library Reports", href: "/library-reports", icon: BarChart3, permission: "library.view", module: "reports" },
  { name: "Plans", href: "/library-plans", icon: Receipt, permission: "library.view", module: "plans" },
]

/**
 * Mobile bottom nav items (most used + "More" to open sidebar).
 */
export const DASHBOARD_MOBILE_NAV: NavItem[] = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard, permission: null, module: null },
  { name: "Tenants", href: "/tenants", icon: Users, permission: "tenants.view", module: "tenants" },
  { name: "Payments", href: "/payments", icon: CreditCard, permission: "payments.view", module: "payments" },
  { name: "Bills", href: "/bills", icon: Receipt, permission: "bills.view", module: "billing" },
  { name: "More", href: "#more", icon: MoreHorizontal, permission: null, module: null },
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
  { name: "Renewal", href: "/tenant/renewal", icon: RefreshCw },
  { name: "Complaints", href: "/tenant/complaints", icon: MessageSquare },
  { name: "Notices", href: "/tenant/notices", icon: Bell },
]

// ============================================================================
// LIBRARY MEMBER PORTAL NAVIGATION
// ============================================================================

export const LIBRARY_MEMBER_NAVIGATION: SimpleNavItem[] = [
  { name: "Home", href: "/member", icon: Home },
  { name: "My Profile", href: "/member/profile", icon: User },
  { name: "Attendance", href: "/member/attendance", icon: Clock },
  { name: "My Locker", href: "/member/locker", icon: Lock },
  { name: "Payments", href: "/member/payments", icon: CreditCard },
  { name: "Complaints", href: "/member/complaints", icon: MessageSquare },
  { name: "Notices", href: "/member/notices", icon: Bell },
  { name: "My QR Code", href: "/member/qr", icon: QrCode },
]

// ============================================================================
// NAVIGATION FILTERING
// ============================================================================

interface FilterOptions {
  /** Function to check if user has a permission */
  hasPermission: (permission: string) => boolean
  /** Function to check if a module is enabled */
  isModuleEnabled: (module: ModuleKey) => boolean
  /** Whether user is platform admin (bypasses permission checks) */
  isPlatformAdmin?: boolean
}

/**
 * Filter navigation items based on permissions and module flags.
 */
export function filterNavigation(
  items: NavItem[],
  options: FilterOptions
): NavItem[] {
  const { hasPermission, isModuleEnabled, isPlatformAdmin = false } = options

  return items.filter((item) => {
    if (item.module !== null && !isModuleEnabled(item.module)) {
      return false
    }

    if (isPlatformAdmin) return true

    if (item.permission === null) return true

    return hasPermission(item.permission)
  })
}

// ============================================================================
// PATH-TO-PERMISSION/MODULE DERIVATION
// ============================================================================

interface NavItemWithChildren {
  href: string
  permission: string | null
  module: ModuleKey | null
  children?: NavItemWithChildren[]
}

/**
 * Derive a path-to-permission map from a navigation array.
 */
export function getPathPermissions(items: NavItemWithChildren[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const item of items) {
    if (item.permission && item.href) {
      map[item.href] = item.permission
    }
    if (item.children) {
      for (const child of item.children) {
        if (child.permission && child.href) {
          map[child.href] = child.permission
        }
      }
    }
  }
  return map
}

/**
 * Derive a path-to-module map from a navigation array.
 */
export function getPathModules(items: NavItemWithChildren[]): Record<string, ModuleKey> {
  const map: Record<string, ModuleKey> = {}
  for (const item of items) {
    if (item.module && item.href) {
      map[item.href] = item.module
    }
    if (item.children) {
      for (const child of item.children) {
        if (child.module && child.href) {
          map[child.href] = child.module
        }
      }
    }
  }
  return map
}

/** @deprecated use getPathModules instead */
export function getPathFeatures(items: NavItemWithChildren[]): Record<string, ModuleKey> {
  return getPathModules(items)
}

// ============================================================================
// ROUTE METADATA
// ============================================================================

export interface RouteConfig {
  path: string
  permission: string | null
  module: ModuleKey | null
  title: string
  icon: LucideIcon
}

export const ROUTE_CONFIGS: Record<string, RouteConfig> = {
  "/dashboard":   { path: "/dashboard",   permission: null,                      module: null,           title: "Dashboard",        icon: LayoutDashboard },
  "/properties":  { path: "/properties",  permission: "properties.view",         module: "properties",   title: "Properties",       icon: Building2 },
  "/rooms":       { path: "/rooms",       permission: "rooms.view",              module: "rooms",        title: "Rooms",            icon: Home },
  "/tenants":     { path: "/tenants",     permission: "tenants.view",            module: "tenants",      title: "Tenants",          icon: Users },
  "/people":      { path: "/people",      permission: "tenants.view",            module: "people",       title: "People",           icon: Contact },
  "/bills":       { path: "/bills",       permission: "bills.view",              module: "billing",      title: "Bills",            icon: Receipt },
  "/payments":    { path: "/payments",    permission: "payments.view",           module: "payments",     title: "Payments",         icon: CreditCard },
  "/refunds":     { path: "/refunds",     permission: "payments.view",           module: "refunds",      title: "Refunds",          icon: Wallet },
  "/expenses":    { path: "/expenses",    permission: "expenses.view",           module: "expenses",     title: "Expenses",         icon: TrendingDown },
  "/meter-readings": { path: "/meter-readings", permission: "meter_readings.view", module: "meters",   title: "Meter Readings",   icon: TrendingUp },
  "/meters":      { path: "/meters",      permission: "meters.view",             module: "meters",       title: "Meters",           icon: Gauge },
  "/exit-clearance": { path: "/exit-clearance", permission: "exit_clearance.initiate", module: "exitClearance", title: "Exit Clearance", icon: UserMinus },
  "/visitors":    { path: "/visitors",    permission: "visitors.view",           module: "visitors",     title: "Visitors",         icon: UserPlus },
  "/complaints":  { path: "/complaints",  permission: "complaints.view",         module: "complaints",   title: "Complaints",       icon: MessageSquare },
  "/notices":     { path: "/notices",     permission: "notices.view",            module: "notices",      title: "Notices",          icon: Bell },
  "/reports":     { path: "/reports",     permission: "reports.view",            module: "reports",      title: "Reports",          icon: FileText },
  "/activity":    { path: "/activity",    permission: null,                      module: "activityLog",  title: "Activity Log",     icon: Activity },
  "/architecture":{ path: "/architecture",permission: "properties.view",         module: "properties",   title: "Architecture",     icon: Grid3X3 },
  "/approvals":   { path: "/approvals",   permission: "tenants.view",            module: "approvals",    title: "Approvals",        icon: ClipboardCheck },
  "/staff":       { path: "/staff",       permission: "staff.view",              module: "staff",        title: "Staff",            icon: UserCog },
  "/inquiries":   { path: "/inquiries",   permission: "tenants.view",            module: "inquiries",    title: "Inquiries",        icon: Inbox },
  "/library":     { path: "/library",     permission: "library.view",            module: "members",      title: "Library",          icon: Library },
  "/library-sections": { path: "/library-sections", permission: "library_sections.view", module: "sections", title: "Sections", icon: Layers },
  "/library-members":  { path: "/library-members",  permission: "library_members.view",  module: "members",  title: "Members",  icon: Users },
  "/library-waitlist": { path: "/library-waitlist", permission: "library_waitlist.view", module: "waitlist", title: "Waitlist", icon: ListOrdered },
  "/library-attendance": { path: "/library-attendance", permission: "library_attendance.view", module: "attendance", title: "Attendance", icon: Clock },
  "/library-lockers":  { path: "/library-lockers",  permission: "library_lockers.view",  module: "lockers",  title: "Lockers",  icon: Lock },
  "/library-subscriptions": { path: "/library-subscriptions", permission: "library_members.view", module: "subscriptions", title: "Subscriptions", icon: BookOpen },
  "/library-payments": { path: "/library-payments", permission: "library_payments.view", module: "payments",  title: "Library Payments", icon: CreditCard },
  "/library-reports":  { path: "/library-reports",  permission: "library.view",           module: "reports",   title: "Library Reports",  icon: BarChart3 },
  "/library-plans":    { path: "/library-plans",    permission: "library.view",           module: "plans",     title: "Plans",            icon: Receipt },
}

export function getRouteConfig(path: string): RouteConfig | undefined {
  if (ROUTE_CONFIGS[path]) return ROUTE_CONFIGS[path]
  const basePath = "/" + path.split("/").filter(Boolean)[0]
  return ROUTE_CONFIGS[basePath]
}

export function canAccessRoute(
  path: string,
  options: FilterOptions
): boolean {
  const config = getRouteConfig(path)
  if (!config) return true

  if (config.module && !options.isModuleEnabled(config.module)) return false

  if (options.isPlatformAdmin) return true

  if (!config.permission) return true

  return options.hasPermission(config.permission)
}
