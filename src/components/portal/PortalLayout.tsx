"use client"

import { useEffect, useState, useRef, ReactNode } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { getSession, signOut } from "@/lib/auth/session"
import { Button } from "@/components/ui/button"
import { LogOut, Loader2, Menu, X } from "lucide-react"
import { showSuccess } from "@/lib/toast-helpers"
import type { LucideIcon } from "lucide-react"
import { logger } from "@/lib/logger"

export interface PortalNavItem {
  name: string
  href: string
  icon: LucideIcon
}

export interface PortalLayoutProps {
  children: ReactNode
  /** 'tenant' or 'member' */
  portalType: "tenant" | "member"
  /** Tailwind gradient classes for header/sidebar, e.g. "from-teal-500 to-emerald-500" */
  brandGradient: string
  /** Icon color class for the logo icon, e.g. "text-teal-600" */
  brandIconColor: string
  /** Icon component for the logo */
  icon: LucideIcon
  /** Display name shown in header, e.g. "Tenant Portal" */
  portalName: string
  /** Navigation items */
  navItems: PortalNavItem[]
  /** Render function for entity info section in sidebar */
  entityInfoRenderer?: () => ReactNode
  /** Callback to check auth and load entity data. Returns true if authenticated + authorized. */
  onAuthCheck: (userId: string) => Promise<boolean>
  /** Log tag for console warnings */
  logTag?: string
}

export function PortalLayout({
  children,
  portalType,
  brandGradient,
  brandIconColor,
  icon: Icon,
  portalName,
  navItems,
  entityInfoRenderer,
  onAuthCheck,
  logTag,
}: PortalLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const mountedRef = useRef(true)

  const tag = logTag || `${portalType.charAt(0).toUpperCase() + portalType.slice(1)}Layout`

  useEffect(() => {
    mountedRef.current = true

    const checkAuth = async () => {
      const sessionResult = await getSession()

      if (sessionResult.error || !sessionResult.user) {
        logger.warn("No valid session", { tag, message: sessionResult.error?.message })
        router.push("/login")
        return
      }

      const authorized = await onAuthCheck(sessionResult.user.id)

      if (!mountedRef.current) return

      if (!authorized) {
        router.push("/dashboard")
        return
      }

      setLoading(false)
    }

    checkAuth()

    return () => {
      mountedRef.current = false
    }
  }, [router, onAuthCheck, tag])

  const handleLogout = async () => {
    const result = await signOut()
    if (!result.success) {
      logger.error(`[${tag}] Logout error:`, { detail: result.error?.message })
    }
    showSuccess("Logged out successfully")
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-muted/50">
      {/* Skip to content link for keyboard navigation */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Mobile Header */}
      <header className={`sticky top-0 z-[var(--z-modal)] bg-gradient-to-r ${brandGradient} lg:hidden`}>
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-white rounded-lg flex items-center justify-center">
              <Icon className={`h-4 w-4 ${brandIconColor}`} />
            </div>
            <span className="font-bold text-white">{portalName}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t bg-background">
            <nav className="p-2">
              {navItems.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                )
              })}
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted mt-2"
              >
                <LogOut className="h-5 w-5" />
                Logout
              </button>
            </nav>
          </div>
        )}
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-background border-r">
          {/* Logo */}
          <div className={`flex items-center gap-2 h-16 px-6 border-b bg-gradient-to-r ${brandGradient}`}>
            <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center">
              <Icon className={`h-5 w-5 ${brandIconColor}`} />
            </div>
            <span className="text-xl font-bold text-white">{portalName}</span>
          </div>

          {/* Entity Info */}
          {entityInfoRenderer && (
            <div className="p-4 border-b">
              {entityInfoRenderer()}
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Logout */}
          <div className="p-4 border-t">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <LogOut className="h-5 w-5" />
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main id="main-content" className="flex-1 lg:pl-64">
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
