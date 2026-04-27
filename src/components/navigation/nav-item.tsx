"use client"

/**
 * NavItem Component
 *
 * Reusable navigation item component for sidebar and mobile navigation.
 * Eliminates 4+ duplicate nav item rendering patterns.
 *
 * @example
 * <NavItem
 *   item={{ name: "Dashboard", href: "/dashboard", icon: LayoutDashboard }}
 *   isActive={pathname === "/dashboard"}
 *   onClick={() => setSidebarOpen(false)}
 * />
 */

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import type { LucideIcon } from "lucide-react"

// ============================================================================
// TYPES
// ============================================================================

export interface NavItemData {
  name: string
  href: string
  icon: LucideIcon
  badge?: number | string
  disabled?: boolean
}

interface NavItemProps {
  /** Navigation item data */
  item: NavItemData
  /** Whether this item is currently active */
  isActive?: boolean
  /** Click handler (for closing mobile menu, etc.) */
  onClick?: () => void
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** Layout variant */
  variant?: "sidebar" | "mobile" | "minimal"
  /** Additional CSS classes */
  className?: string
}

// ============================================================================
// COMPONENT
// ============================================================================

const sizeClasses = {
  sm: {
    wrapper: "px-2 py-1.5 text-sm",
    icon: "h-4 w-4",
    badge: "text-xs",
  },
  md: {
    wrapper: "px-3 py-2 text-sm",
    icon: "h-5 w-5",
    badge: "text-xs",
  },
  lg: {
    wrapper: "px-4 py-3 text-base",
    icon: "h-6 w-6",
    badge: "text-sm",
  },
}

export function NavItem({
  item,
  isActive = false,
  onClick,
  size = "md",
  variant = "sidebar",
  className,
}: NavItemProps) {
  const Icon = item.icon
  const sizes = sizeClasses[size]

  // Don't render disabled items as links
  if (item.disabled) {
    return (
      <span
        className={cn(
          "flex items-center gap-3 rounded-lg cursor-not-allowed opacity-50",
          sizes.wrapper,
          className
        )}
      >
        <Icon className={sizes.icon} />
        <span className="flex-1">{item.name}</span>
      </span>
    )
  }

  // Sidebar variant (default)
  if (variant === "sidebar") {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 rounded-lg transition-colors",
          sizes.wrapper,
          isActive
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
          className
        )}
      >
        <Icon className={sizes.icon} />
        <span className="flex-1">{item.name}</span>
        {item.badge !== undefined && (
          <Badge variant="secondary" className={cn("ml-auto", sizes.badge)}>
            {item.badge}
          </Badge>
        )}
      </Link>
    )
  }

  // Mobile bottom nav variant
  if (variant === "mobile") {
    return (
      <Link
        href={item.href}
        onClick={onClick}
        className={cn(
          "flex flex-col items-center justify-center gap-1 py-2 px-3 rounded-lg transition-colors",
          isActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground",
          className
        )}
      >
        <Icon className={cn(sizes.icon, isActive && "fill-primary/20")} />
        <span className="text-xs font-medium">{item.name}</span>
        {item.badge !== undefined && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-4 min-w-4 text-[10px] px-1"
          >
            {item.badge}
          </Badge>
        )}
      </Link>
    )
  }

  // Minimal variant (icon only with tooltip)
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={item.name}
      className={cn(
        "flex items-center justify-center rounded-lg transition-colors p-2",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
        className
      )}
    >
      <Icon className={sizes.icon} />
      {item.badge !== undefined && (
        <Badge
          variant="destructive"
          className="absolute -top-1 -right-1 h-4 min-w-4 text-[10px] px-1"
        >
          {item.badge}
        </Badge>
      )}
    </Link>
  )
}

// ============================================================================
// NAV GROUP COMPONENT
// ============================================================================

interface NavGroupProps {
  /** Group title */
  title?: string
  /** Navigation items */
  items: NavItemData[]
  /** Current pathname for active state */
  pathname: string
  /** Click handler for items */
  onItemClick?: () => void
  /** Size variant */
  size?: "sm" | "md" | "lg"
  /** Variant */
  variant?: "sidebar" | "mobile" | "minimal"
  /** Additional CSS classes */
  className?: string
}

/**
 * Renders a group of navigation items
 *
 * @example
 * <NavGroup
 *   title="Main"
 *   items={filteredNavigation}
 *   pathname={pathname}
 *   onItemClick={() => setSidebarOpen(false)}
 * />
 */
export function NavGroup({
  title,
  items,
  pathname,
  onItemClick,
  size = "md",
  variant = "sidebar",
  className,
}: NavGroupProps) {
  if (items.length === 0) return null

  const isActiveRoute = (href: string) => {
    if (href === "#more") return false
    // Root paths need exact match
    if (href.split("/").filter(Boolean).length <= 1) {
      return pathname === href
    }
    // Others can be prefix match
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <div className={cn("space-y-1", className)}>
      {title && (
        <h3 className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
      )}
      {items.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          isActive={isActiveRoute(item.href)}
          onClick={onItemClick}
          size={size}
          variant={variant}
        />
      ))}
    </div>
  )
}

// ============================================================================
// MOBILE NAV BAR
// ============================================================================

interface MobileNavBarProps {
  /** Navigation items */
  items: NavItemData[]
  /** Current pathname */
  pathname: string
  /** Click handler */
  onItemClick?: (item: NavItemData) => void
  /** Additional CSS classes */
  className?: string
}

/**
 * Mobile bottom navigation bar component
 *
 * @example
 * <MobileNavBar
 *   items={DASHBOARD_MOBILE_NAV}
 *   pathname={pathname}
 *   onItemClick={(item) => {
 *     if (item.href === "#more") setMoreMenuOpen(true)
 *   }}
 * />
 */
export function MobileNavBar({
  items,
  pathname,
  onItemClick,
  className,
}: MobileNavBarProps) {
  const isActive = (href: string) => {
    if (href === "#more") return false
    if (href.split("/").filter(Boolean).length <= 1) {
      return pathname === href
    }
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-[var(--z-modal)] bg-background border-t md:hidden",
        className
      )}
    >
      <div className="flex items-center justify-around px-2 py-1">
        {items.map((item) => (
          <NavItem
            key={item.href}
            item={item}
            isActive={isActive(item.href)}
            onClick={() => onItemClick?.(item)}
            variant="mobile"
          />
        ))}
      </div>
    </nav>
  )
}
