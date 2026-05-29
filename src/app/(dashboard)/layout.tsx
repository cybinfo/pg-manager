"use client"

import { useState, useMemo } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BrandLogo } from "@/components/ui/brand-logo"
import {
  Building2,
  Settings,
  LogOut as LogOutIcon,
  Loader2,
  Menu,
  X,
  UserCircle2,
  Shield,
  ChevronDown,
  GripVertical,
  ChevronUp,
  Pencil,
  Check,
  ToggleLeft,
  ShieldCheck,
} from "lucide-react"
import { useSidebarOrder } from "@/lib/hooks/useSidebarOrder"
import { showSuccess } from "@/lib/toast-helpers"
import { ThemeToggleSidebar } from "@/components/ui/theme-toggle"
import { PWAInstallPrompt, PWAInstallButton } from "@/components/pwa-install-prompt"
import { AuthProvider, useAuth, useCurrentContext } from "@/lib/auth"
import { ContextSwitcher, SessionTimeout } from "@/components/auth"
import { DemoModeProvider, DemoBanner, DemoWatermark } from "@/lib/demo-mode"
import { DashboardShortcuts } from "@/components/dashboard-shortcuts"
import { CommandPalette } from "@/components/command-palette"
import { useFeatures } from "@/lib/features/use-features"
import { getPathPermissions, getPathModules, DASHBOARD_MOBILE_NAV, DASHBOARD_NAVIGATION_GROUPED, filterNavigation, type GroupedNavItem } from "@/lib/navigation/config"
import { brandGradient } from "@/lib/design-tokens"
import { NotificationBell } from "@/components/ui/notification-bell"
import { UserMenu } from "@/components/ui/user-menu"
import { OfflineBanner } from "@/components/ui/offline-banner"

// Re-export the GroupedNavItem type under the local alias used throughout this file
type NavItem = GroupedNavItem

const pathPermissions = getPathPermissions(DASHBOARD_NAVIGATION_GROUPED)
const pathModules = getPathModules(DASHBOARD_NAVIGATION_GROUPED)

// Mobile bottom nav items are now sourced from DASHBOARD_MOBILE_NAV
// and filtered by permissions/features inside DashboardLayoutInner

// Inner layout component that uses auth context
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [expandedMenus, setExpandedMenus] = useState<string[]>([])
  const [sidebarEditMode, setSidebarEditMode] = useState(false)
  const { applyOrder, reorderMain, reorderChildren, resetOrder, isLoaded: orderLoaded } = useSidebarOrder()

  // Toggle expanded state for a menu
  const toggleMenu = (menuName: string) => {
    setExpandedMenus(prev =>
      prev.includes(menuName)
        ? prev.filter(name => name !== menuName)
        : [...prev, menuName]
    )
  }

  // Check if a menu should be expanded (either manually expanded or has active child)
  const isMenuExpanded = (item: NavItem) => {
    if (expandedMenus.includes(item.name)) return true
    // Auto-expand if current path is in children
    if (item.children) {
      return item.children.some(child =>
        pathname === child.href || pathname.startsWith(child.href + "/")
      )
    }
    return false
  }

  // Use auth context - isPlatformAdmin is centralized here
  const { user, profile, contexts, isLoading, logout, hasPermission, isPlatformAdmin } = useAuth()
  const currentContext = useCurrentContext()

  // Use module flags — skip module filtering while loading to avoid nav items
  // disappearing on first render (would require two clicks to navigate)
  const { isModuleEnabled, isFeatureEnabled, loading: modulesLoading } = useFeatures()

  // NOTE: Setup redirect removed from dashboard layout.
  // The setup page (/setup) handles its own access check.
  // Redirecting from here caused false redirects for existing users
  // due to auth context race conditions (contexts load asynchronously).

  // Filter navigation based on permissions, module flags, and feature flags
  const filterNavItem = (item: NavItem): NavItem | null => {
    if (!modulesLoading && item.module !== null && !isModuleEnabled(item.module)) {
      return null
    }

    if (!modulesLoading && item.module !== null && item.feature) {
      if (!isFeatureEnabled(item.module, item.feature)) {
        return null
      }
    }

    // Check permissions
    const hasAccess = item.permission === null ||
      currentContext.isOwner ||
      hasPermission(item.permission)

    if (!hasAccess) return null

    // If item has children, filter them too
    if (item.children) {
      const filteredChildren = item.children
        .map(child => filterNavItem(child))
        .filter((child): child is NavItem => child !== null)

      // If no children pass the filter, hide the parent
      if (filteredChildren.length === 0) return null

      return { ...item, children: filteredChildren }
    }

    return item
  }

  const filteredNavigation = DASHBOARD_NAVIGATION_GROUPED
    .map(item => filterNavItem(item))
    .filter((item): item is NavItem => item !== null)

  // Add admin link for platform admins
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const baseNavigation: NavItem[] = isPlatformAdmin
    ? [...filteredNavigation, {
        name: "Admin",
        href: "/admin",
        icon: Shield,
        permission: null,
        module: null,
        children: [
          { name: "Workspaces",      href: "/admin",        icon: Building2,   permission: null, module: null },
          { name: "Platform Admins", href: "/admin/admins", icon: ShieldCheck, permission: null, module: null },
        ]
      }]
    : filteredNavigation

  // Apply user's custom order to navigation
  const finalNavigation = useMemo(() => {
    if (!orderLoaded) return baseNavigation

    // Apply order to main items
    const ordered = applyOrder(baseNavigation)

    // Apply order to children of each parent
    return ordered.map(item => {
      if (item.children && item.children.length > 0) {
        return {
          ...item,
          children: applyOrder(item.children, item.name)
        }
      }
      return item
    })
  }, [baseNavigation, applyOrder, orderLoaded])

  // Filter mobile bottom nav items by permissions and feature flags.
  // The "More" item (href="#more") is always preserved at the end.
  const filteredMobileNav = useMemo(() => {
    const moreItem = DASHBOARD_MOBILE_NAV.find(item => item.href === "#more")
    const filterable = DASHBOARD_MOBILE_NAV.filter(item => item.href !== "#more")
    const filtered = filterNavigation(filterable, {
      hasPermission: (perm: string) => currentContext.isOwner || hasPermission(perm),
      isModuleEnabled: (mod) => modulesLoading || isModuleEnabled(mod),
      isFeatureEnabled: (mod, feat) => modulesLoading || isFeatureEnabled(mod, feat),
      isPlatformAdmin,
    })
    // Always append the "More" item if it exists
    return moreItem ? [...filtered, moreItem] : filtered
  }, [currentContext.isOwner, hasPermission, isModuleEnabled, isPlatformAdmin, modulesLoading])

  // Get names array for reordering
  const navNames = finalNavigation.map(item => item.name)

  // Handle move up/down for main items
  const handleMoveMain = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= navNames.length) return
    reorderMain(index, newIndex, navNames)
  }

  // Handle move up/down for child items
  const handleMoveChild = (parentName: string, index: number, direction: "up" | "down", children: NavItem[]) => {
    const childNames = children.map(c => c.name)
    const newIndex = direction === "up" ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= childNames.length) return
    reorderChildren(parentName, index, newIndex, childNames)
  }

  const handleLogout = async () => {
    await logout()
    showSuccess("Logged out successfully")
    // Full page navigation ensures cookies cleared by signOut() are seen by middleware.
    // router.push() uses client-side nav which can race with cookie clearing → redirect loop.
    window.location.href = "/login"
  }

  const handleMobileNavClick = (href: string) => {
    if (href === "#more") {
      setSidebarOpen(true)
    }
  }

  // Get display name from profile or user
  const displayName = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || "User"
  const displayEmail = user?.email

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <BrandLogo size="lg" hideText linkTo={null} />
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    router.push("/login")
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <BrandLogo size="lg" hideText linkTo={null} />
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Setup redirect removed — setup page handles its own access check

  // Route-level permission check - find matching path and check permission
  const matchingPath = Object.keys(pathPermissions).find(path =>
    pathname === path || pathname.startsWith(path + "/")
  )

  if (matchingPath) {
    const requiredPermission = pathPermissions[matchingPath]
    const requiredModule = pathModules[matchingPath]

    // Check module flag first (skip during loading to avoid false blocks)
    if (!modulesLoading && requiredModule && !isModuleEnabled(requiredModule)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background">
          <div className="text-center p-8">
            <div className="p-4 bg-warning/10 rounded-full mb-4 inline-block">
              <Shield className="h-12 w-12 text-warning" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Feature Not Available</h2>
            <p className="text-muted-foreground mb-4">This feature is not enabled for your subscription.</p>
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      )
    }

    // Check permission - owners always have access
    if (!currentContext.isOwner && !hasPermission(requiredPermission)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-background">
          <div className="text-center p-8">
            <div className="p-4 bg-destructive/10 rounded-full mb-4 inline-block">
              <Shield className="h-12 w-12 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You don&apos;t have permission to access this page.</p>
            <Link href="/dashboard">
              <Button>Go to Dashboard</Button>
            </Link>
          </div>
        </div>
      )
    }
  }

  return (
    <SessionTimeout
      inactivityTimeout={30 * 60 * 1000} // 30 minutes
      warningTime={60 * 1000} // 1 minute warning
    >
    <DemoBanner />
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background">
      {/* Skip to content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
      >
        Skip to main content
      </a>
      {/* Mobile sidebar backdrop with glass effect */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[var(--z-dropdown)] lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-[var(--z-modal)] h-full w-64 bg-card/95 backdrop-blur-md border-r shadow-xl transform transition-all duration-300 ease-out lg:translate-x-0 lg:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className={`flex items-center justify-between h-16 px-4 border-b ${brandGradient.horizontal}`}>
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <span className="text-xl font-bold text-white">ManageKar</span>
            </Link>
            <div className="flex items-center gap-1">
              {/* Edit Mode Toggle */}
              <Button
                variant="ghost"
                size="icon"
                className="hidden lg:flex text-white hover:bg-white/20"
                onClick={() => setSidebarEditMode(!sidebarEditMode)}
                title={sidebarEditMode ? "Done editing" : "Reorder menu"}
                aria-label={sidebarEditMode ? "Done editing sidebar" : "Reorder sidebar menu"}
              >
                {sidebarEditMode ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden text-white hover:bg-white/20"
                onClick={() => setSidebarOpen(false)}
                aria-label="Close sidebar"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {/* Edit mode instructions */}
            {sidebarEditMode && (
              <div className="mb-3 p-2 bg-warning/10 rounded-lg text-xs text-warning flex items-center justify-between">
                <span>Use arrows to reorder</span>
                <button
                  onClick={resetOrder}
                  className="text-warning hover:text-warning/80 underline"
                >
                  Reset
                </button>
              </div>
            )}
            <ul className="space-y-1">
              {finalNavigation.map((item, itemIndex) => {
                const hasChildren = item.children && item.children.length > 0
                const isExpanded = hasChildren && isMenuExpanded(item)

                // For items with children, check if any child is active
                const isParentActive = hasChildren && item.children?.some(
                  (child: NavItem) => pathname === child.href || pathname.startsWith(child.href + "/")
                )

                // For items without children, check direct match
                const isActive = !hasChildren && (
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === item.href || pathname.startsWith(item.href + "/")
                )

                return (
                  <li key={item.name} className={sidebarEditMode ? "relative group" : ""}>
                    {/* Edit mode reorder controls for main items */}
                    {sidebarEditMode && (
                      <div className="absolute -left-1 top-1/2 -translate-y-1/2 flex flex-col z-10">
                        <button
                          onClick={() => handleMoveMain(itemIndex, "up")}
                          disabled={itemIndex === 0}
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleMoveMain(itemIndex, "down")}
                          disabled={itemIndex === finalNavigation.length - 1}
                          className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    {hasChildren ? (
                      // Parent item with children - collapsible
                      <>
                        <button
                          onClick={() => !sidebarEditMode && toggleMenu(item.name)}
                          className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                            sidebarEditMode ? "pl-6 " : ""
                          }${
                            isParentActive
                              ? "bg-primary/10 text-primary"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {sidebarEditMode && <GripVertical className="h-4 w-4 text-muted-foreground" />}
                            <item.icon className="h-5 w-5" />
                            {item.name}
                          </div>
                          {!sidebarEditMode && (
                            <ChevronDown
                              className={`h-4 w-4 transition-transform duration-200 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          )}
                        </button>
                        {/* Sub-menu - always expanded in edit mode */}
                        <ul
                          className={`overflow-hidden transition-all duration-200 ${
                            isExpanded || sidebarEditMode ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
                          }`}
                        >
                          {item.children?.map((child: NavItem, childIndex: number) => {
                            // Check if any sibling has an exact match - if so, only highlight that one
                            const siblingHasExactMatch = item.children?.some(
                              (sibling: NavItem) => pathname === sibling.href
                            )
                            const isChildActive = siblingHasExactMatch
                              ? pathname === child.href
                              : pathname === child.href ||
                                (child.href !== "/expenses" && pathname.startsWith(child.href + "/"))
                            return (
                              <li key={child.href} className={sidebarEditMode ? "relative" : ""}>
                                {/* Edit mode reorder controls for child items */}
                                {sidebarEditMode && (
                                  <div className="absolute left-4 top-1/2 -translate-y-1/2 flex flex-col z-10">
                                    <button
                                      onClick={() => handleMoveChild(item.name, childIndex, "up", item.children || [])}
                                      disabled={childIndex === 0}
                                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    >
                                      <ChevronUp className="h-3 w-3" />
                                    </button>
                                    <button
                                      onClick={() => handleMoveChild(item.name, childIndex, "down", item.children || [])}
                                      disabled={childIndex === (item.children?.length || 0) - 1}
                                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                                    >
                                      <ChevronDown className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}
                                {sidebarEditMode ? (
                                  <div
                                    className={`flex items-center gap-3 pl-12 pr-3 py-2 rounded-lg text-sm font-medium ${
                                      "text-muted-foreground"
                                    }`}
                                  >
                                    <GripVertical className="h-3 w-3 text-muted-foreground" />
                                    <child.icon className="h-4 w-4" />
                                    {child.name}
                                  </div>
                                ) : (
                                  <Link
                                    href={child.href}
                                    className={`flex items-center gap-3 pl-10 pr-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                      isChildActive
                                        ? brandGradient.navActive
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                                    onClick={() => setSidebarOpen(false)}
                                  >
                                    <child.icon className={`h-4 w-4 ${isChildActive ? "animate-scale-in" : ""}`} />
                                    {child.name}
                                  </Link>
                                )}
                              </li>
                            )
                          })}
                        </ul>
                      </>
                    ) : sidebarEditMode ? (
                      // Regular item in edit mode - non-clickable
                      <div
                        className={`flex items-center gap-3 pl-6 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground`}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <item.icon className="h-5 w-5" />
                        {item.name}
                      </div>
                    ) : (
                      // Regular item without children
                      <Link
                        href={item.href}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? brandGradient.navActive
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <item.icon className={`h-5 w-5 ${isActive ? "animate-scale-in" : ""}`} />
                        {item.name}
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Theme Toggle, Settings & Logout */}
          <div className="border-t p-4 space-y-1 bg-muted/30">
            {/* Theme Toggle */}
            <ThemeToggleSidebar />
            {/* Settings & Feature Control — owners only */}
            {currentContext.isOwner && (
              <>
                <Link
                  href="/settings"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pathname === "/settings"
                      ? brandGradient.navActive
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Settings className="h-5 w-5" />
                  Settings
                </Link>
                <Link
                  href="/settings/features"
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    pathname === "/settings/features"
                      ? brandGradient.navActive
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <ToggleLeft className="h-5 w-5" />
                  Features
                </Link>
              </>
            )}
            {/* PWA Install — only shows on Chrome/Android when app is installable */}
            <PWAInstallButton />
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
            >
              <LogOutIcon className="h-5 w-5" />
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64 pb-20 lg:pb-0">
        {/* Top bar with glass effect */}
        <header className="sticky top-0 z-[30] h-16 glass-nav border-b flex items-center justify-between px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-muted"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open sidebar menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          {/* Context switcher and user menu */}
          <div className="flex items-center gap-2">
            {/* Notification bell */}
            <NotificationBell />
            {/* Context Switcher - show if user has multiple contexts */}
            {contexts.length > 1 && (
              <ContextSwitcher />
            )}

            {/* Single context indicator - show current workspace/role if only 1 context */}
            {contexts.length === 1 && currentContext.context && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/50 border">
                <UserCircle2 className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">{currentContext.workspaceName}</span>
                <span className="text-xs text-muted-foreground capitalize">({currentContext.context.context_type})</span>
              </div>
            )}

            <UserMenu
              displayName={displayName}
              displayEmail={displayEmail}
              onLogout={logout}
            />
          </div>
        </header>

        <OfflineBanner />
        {/* Page content */}
        <main id="main-content" className="p-4 md:p-6 lg:p-8 animate-fade-in-up">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation - hide when sidebar is open so logout is accessible */}
      <nav className={`mobile-nav lg:hidden transition-opacity duration-200 ${sidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <div className="flex items-center justify-around h-16">
          {filteredMobileNav.map((item) => {
            const isActive = item.href !== "#more" && (pathname === item.href || pathname.startsWith(item.href + "/"))
            return (
              <Link
                key={item.name}
                href={item.href === "#more" ? "#" : item.href}
                onClick={() => handleMobileNavClick(item.href)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "animate-bounce-soft" : ""}`} />
                <span className="text-xs font-medium">{item.name}</span>
                {isActive && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      {/* PWA Install Prompt */}
      <PWAInstallPrompt />

      {/* Demo Mode Watermark */}
      <DemoWatermark />
    </div>
    <DashboardShortcuts />
    <CommandPalette />
    </SessionTimeout>
  )
}

// Main export with AuthProvider and DemoModeProvider wrappers
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <DemoModeProvider>
        <DashboardLayoutInner>{children}</DashboardLayoutInner>
      </DemoModeProvider>
    </AuthProvider>
  )
}
