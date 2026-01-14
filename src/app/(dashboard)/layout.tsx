"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Building2,
  LayoutDashboard,
  Home,
  Users,
  CreditCard,
  FileText,
  MessageSquare,
  Bell,
  Settings,
  LogOut as LogOutIcon,
  Loader2,
  Menu,
  X,
  UserMinus,
  UserPlus,
  Gauge,
  UserCog,
  Receipt,
  TrendingDown,
  MoreHorizontal,
  UserCircle2,
  Grid3X3,
  ClipboardCheck,
  Shield,
  Activity,
  Wallet,
  Contact,
} from "lucide-react"
import { toast } from "sonner"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { AuthProvider, useAuth, useCurrentContext } from "@/lib/auth"
import { ContextSwitcher, SessionTimeout } from "@/components/auth"
import { DemoModeProvider, DemoBanner, DemoWatermark } from "@/lib/demo-mode"
import { useFeatures } from "@/lib/features/use-features"
import { FeatureFlagKey } from "@/lib/features"

// Path-to-permission mapping for route-level access control
// This ensures direct URL access is also protected
const pathPermissions: Record<string, string> = {
  "/properties": "properties.view",
  "/rooms": "rooms.view",
  "/tenants": "tenants.view",
  "/people": "tenants.view",
  "/bills": "bills.view",
  "/payments": "payments.view",
  "/refunds": "payments.view",
  "/expenses": "expenses.view",
  "/meter-readings": "meter_readings.view",
  "/exit-clearance": "exit_clearance.initiate",
  "/visitors": "visitors.view",
  "/complaints": "complaints.view",
  "/notices": "notices.view",
  "/reports": "reports.view",
  "/architecture": "properties.view",
  "/approvals": "tenants.view",
  "/staff": "staff.view",
}

// Path-to-feature mapping for feature-gated routes
const pathFeatures: Record<string, FeatureFlagKey> = {
  "/expenses": "expenses",
  "/meter-readings": "meterReadings",
  "/exit-clearance": "exitClearance",
  "/visitors": "visitors",
  "/complaints": "complaints",
  "/notices": "notices",
  "/reports": "reports",
  "/activity": "activityLog",
  "/architecture": "architectureView",
  "/approvals": "approvals",
}

// Navigation items with required permissions and feature flags
// null permission means always visible, string means need that permission
// feature: null means always visible, string means feature must be enabled
const navigation: {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  permission: string | null
  feature: FeatureFlagKey | null
}[] = [
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

// Mobile bottom nav items (5 most used)
const mobileNavItems = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tenants", href: "/tenants", icon: Users },
  { name: "Payments", href: "/payments", icon: CreditCard },
  { name: "Bills", href: "/bills", icon: Receipt },
  { name: "More", href: "#more", icon: MoreHorizontal },
]

// Inner layout component that uses auth context
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Use auth context - isPlatformAdmin is centralized here
  const { user, profile, contexts, isLoading, logout, hasPermission, isPlatformAdmin } = useAuth()
  const currentContext = useCurrentContext()

  // Use feature flags
  const { isEnabled: isFeatureEnabled } = useFeatures()

  // Filter navigation based on permissions AND feature flags
  const filteredNavigation = navigation.filter(item => {
    // Check feature flag first - if feature is disabled, hide the item
    if (item.feature !== null && !isFeatureEnabled(item.feature)) {
      return false
    }

    // Then check permissions
    // Always show items with no permission requirement
    if (item.permission === null) return true
    // Owners see everything (permission-wise)
    if (currentContext.isOwner) return true
    // Check staff permissions
    return hasPermission(item.permission)
  })

  // Add admin link for platform admins
  const finalNavigation = isPlatformAdmin
    ? [...filteredNavigation, { name: "Admin", href: "/admin", icon: Shield, permission: null, feature: null }]
    : filteredNavigation

  const handleLogout = async () => {
    await logout()
    toast.success("Logged out successfully")
    router.push("/login")
    // Note: Don't call router.refresh() here - it causes hydration issues
    // The auth context handles state clearing internally
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="h-12 w-12 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/25">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
        </div>
      </div>
    )
  }

  // Redirect if not authenticated
  if (!user) {
    router.push("/login")
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="h-12 w-12 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/25">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Redirecting to login...</p>
        </div>
      </div>
    )
  }

  // Redirect to setup if user has no contexts (new owner without workspace)
  if (contexts.length === 0) {
    router.push("/setup")
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-emerald-50">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="h-12 w-12 bg-gradient-to-br from-teal-500 to-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-teal-500/25">
            <Building2 className="h-6 w-6 text-white" />
          </div>
          <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
          <p className="text-sm text-muted-foreground">Setting up your workspace...</p>
        </div>
      </div>
    )
  }

  // Route-level permission check - find matching path and check permission
  const matchingPath = Object.keys(pathPermissions).find(path =>
    pathname === path || pathname.startsWith(path + "/")
  )

  if (matchingPath) {
    const requiredPermission = pathPermissions[matchingPath]
    const requiredFeature = pathFeatures[matchingPath]

    // Check feature flag first
    if (requiredFeature && !isFeatureEnabled(requiredFeature)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
          <div className="text-center p-8">
            <div className="p-4 bg-amber-50 rounded-full mb-4 inline-block">
              <Shield className="h-12 w-12 text-amber-500" />
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
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
          <div className="text-center p-8">
            <div className="p-4 bg-rose-50 rounded-full mb-4 inline-block">
              <Shield className="h-12 w-12 text-rose-500" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">You don't have permission to access this page.</p>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Mobile sidebar backdrop with glass effect */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-white/95 backdrop-blur-md border-r shadow-xl transform transition-all duration-300 ease-out lg:translate-x-0 lg:shadow-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-between h-16 px-4 border-b bg-gradient-to-r from-teal-500 to-emerald-500">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <Building2 className="h-5 w-5 text-teal-600" />
              </div>
              <span className="text-xl font-bold text-white">ManageKar</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-white hover:bg-white/20"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <ul className="space-y-1">
              {finalNavigation.map((item) => {
                // Fix: Dashboard should only be active on exact match, not on all routes
                const isActive = item.href === "/dashboard"
                  ? pathname === "/dashboard"
                  : pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isActive
                          ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                      onClick={() => setSidebarOpen(false)}
                    >
                      <item.icon className={`h-5 w-5 ${isActive ? "animate-scale-in" : ""}`} />
                      {item.name}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* Settings & Logout */}
          <div className="border-t p-4 space-y-1 bg-muted/30">
            {/* Settings only for owners */}
            {currentContext.isOwner && (
              <Link
                href="/settings"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === "/settings"
                    ? "bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-md shadow-teal-500/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <Settings className="h-5 w-5" />
                Settings
              </Link>
            )}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-rose-50 hover:text-rose-600 transition-all duration-200"
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
        <header className="sticky top-0 z-30 h-16 glass-nav border-b flex items-center justify-between px-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-muted"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          {/* Context switcher and user menu */}
          <div className="flex items-center gap-3">
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

            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{displayEmail}</p>
            </div>
            <Button variant="ghost" size="icon" className="rounded-full">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-sm font-medium shadow-md shadow-teal-500/20">
                {displayName[0].toUpperCase()}
              </div>
            </Button>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6 lg:p-8 animate-fade-in-up">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation - hide when sidebar is open so logout is accessible */}
      <nav className={`mobile-nav lg:hidden transition-opacity duration-200 ${sidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100"}`}>
        <div className="flex items-center justify-around h-16">
          {mobileNavItems.map((item) => {
            const isActive = item.href !== "#more" && (pathname === item.href || pathname.startsWith(item.href + "/"))
            return (
              <Link
                key={item.name}
                href={item.href === "#more" ? "#" : item.href}
                onClick={() => handleMobileNavClick(item.href)}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "text-teal-600"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className={`h-5 w-5 ${isActive ? "animate-bounce-soft" : ""}`} />
                <span className="text-xs font-medium">{item.name}</span>
                {isActive && (
                  <div className="absolute bottom-1 w-1 h-1 rounded-full bg-teal-500" />
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
