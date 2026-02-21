"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { getSession, signOut } from "@/lib/auth/session"
import { Button } from "@/components/ui/button"
import {
  Home,
  User,
  CreditCard,
  Clock,
  LogOut,
  Loader2,
  Menu,
  X,
  BookOpen,
  QrCode,
} from "lucide-react"
import { showSuccess } from "@/lib/toast-helpers"

interface MemberPortalInfo {
  id: string
  name: string
  phone: string | null
  email: string
  member_code: string | null
  hours_balance: number
  library: {
    name: string
  } | null
}

const navigation = [
  { name: "Home", href: "/member", icon: Home },
  { name: "My Profile", href: "/member/profile", icon: User },
  { name: "Attendance", href: "/member/attendance", icon: Clock },
  { name: "Payments", href: "/member/payments", icon: CreditCard },
  { name: "My QR Code", href: "/member/qr", icon: QrCode },
]

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [member, setMember] = useState<MemberPortalInfo | null>(null)
  const mountedRef = useRef(true)

  useEffect(() => {
    mountedRef.current = true

    const checkAuth = async () => {
      const sessionResult = await getSession()

      if (sessionResult.error || !sessionResult.user) {
        console.warn('[MemberLayout] No valid session:', sessionResult.error?.message)
        router.push("/login")
        return
      }

      const user = sessionResult.user
      const supabase = createClient()

      // Check if user is a library member
      const { data: memberData, error } = await supabase
        .from("library_members")
        .select(`
          id,
          name,
          phone,
          member_code,
          hours_balance,
          library:libraries(name)
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (error || !memberData) {
        // Not a library member - redirect to dashboard or tenant portal
        router.push("/dashboard")
        return
      }

      if (!mountedRef.current) return

      // Transform the data
      const library = Array.isArray(memberData.library)
        ? memberData.library[0]
        : memberData.library

      setMember({
        id: memberData.id,
        name: memberData.name,
        phone: memberData.phone,
        email: user.email || "",
        member_code: memberData.member_code,
        hours_balance: memberData.hours_balance,
        library,
      })
      setLoading(false)
    }

    checkAuth()

    return () => {
      mountedRef.current = false
    }
  }, [router])

  const handleLogout = async () => {
    const result = await signOut()
    if (!result.success) {
      console.error('[MemberLayout] Logout error:', result.error?.message)
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
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 bg-gradient-to-r from-purple-500 to-indigo-500 lg:hidden">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 bg-white rounded-lg flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-purple-600" />
            </div>
            <span className="font-bold text-white">Member Portal</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t bg-background">
            <nav className="p-2">
              {navigation.map((item) => {
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
          <div className="flex items-center gap-2 h-16 px-6 border-b bg-gradient-to-r from-purple-500 to-indigo-500">
            <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-xl font-bold text-white">Member Portal</span>
          </div>

          {/* Member Info */}
          <div className="p-4 border-b">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium truncate">{member?.name}</p>
              <p className="text-sm text-muted-foreground truncate">
                {member?.library?.name}
              </p>
              {member?.member_code && (
                <p className="text-xs font-mono text-muted-foreground mt-1">
                  {member.member_code}
                </p>
              )}
            </div>
            {/* Hours Balance */}
            <div className="mt-3 p-3 bg-purple-50 rounded-lg">
              <p className="text-xs text-purple-600 font-medium">Hours Balance</p>
              <p className="text-2xl font-bold text-purple-700">
                {member?.hours_balance?.toFixed(1) || "0.0"}h
              </p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => {
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
        <main className="flex-1 lg:pl-64">
          <div className="p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
