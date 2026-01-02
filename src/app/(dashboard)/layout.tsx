"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
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
  UserCircle2
} from "lucide-react"
import { toast } from "sonner"
import { PWAInstallPrompt } from "@/components/pwa-install-prompt"
import { AuthProvider, useAuth, useCurrentContext } from "@/lib/auth"
import { ContextSwitcher } from "@/components/auth"

// Navigation items with required permissions
// null permission means always visible, string means need that permission
const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permission: null },
  { name: "Properties", href: "/dashboard/properties", icon: Building2, permission: "properties.view" },
  { name: "Rooms", href: "/dashboard/rooms", icon: Home, permission: "rooms.view" },
  { name: "Tenants", href: "/dashboard/tenants", icon: Users, permission: "tenants.view" },
  { name: "Bills", href: "/dashboard/bills", icon: Receipt, permission: "bills.view" },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard, permission: "payments.view" },
  { name: "Expenses", href: "/dashboard/expenses", icon: TrendingDown, permission: "expenses.view" },
  { name: "Meter Readings", href: "/dashboard/meter-readings", icon: Gauge, permission: "meter_readings.view" },
  { name: "Exit Clearance", href: "/dashboard/exit-clearance", icon: UserMinus, permission: "exit_clearance.initiate" },
  { name: "Visitors", href: "/dashboard/visitors", icon: UserPlus, permission: "visitors.view" },
  { name: "Complaints", href: "/dashboard/complaints", icon: MessageSquare, permission: "complaints.view" },
  { name: "Notices", href: "/dashboard/notices", icon: Bell, permission: "notices.view" },
  { name: "Reports", href: "/dashboard/reports", icon: FileText, permission: "reports.view" },
  { name: "Staff", href: "/dashboard/staff", icon: UserCog, permission: "staff.view" },
]

// Mobile bottom nav items (5 most used)
const mobileNavItems = [
  { name: "Home", href: "/dashboard", icon: LayoutDashboard },
  { name: "Tenants", href: "/dashboard/tenants", icon: Users },
  { name: "Payments", href: "/dashboard/payments", icon: CreditCard },
  { name: "Bills", href: "/dashboard/bills", icon: Receipt },
  { name: "More", href: "#more", icon: MoreHorizontal },
]

// Inner layout component that uses auth context
function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Use auth context
  const { user, profile, contexts, isLoading, logout, hasPermission } = useAuth()
  const currentContext = useCurrentContext()

  // Filter navigation based on permissions
  const filteredNavigation = navigation.filter(item => {
    // Always show items with no permission requirement
    if (item.permission === null) return true
    // Owners see everything
    if (currentContext.isOwner) return true
    // Check staff permissions
    return hasPermission(item.permission)
  })

  const handleLogout = async () => {
    await logout()
    toast.success("Logged out successfully")
    router.push("/login")
    router.refresh()
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
    return null
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

  return (
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
              {filteredNavigation.map((item) => {
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
                href="/dashboard/settings"
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                  pathname === "/dashboard/settings"
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
    </div>
  )
}

// Main export with AuthProvider wrapper
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </AuthProvider>
  )
}
