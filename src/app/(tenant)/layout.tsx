"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Home,
  User,
  CreditCard,
  MessageSquare,
  Bell,
  LogOut,
  Loader2,
  Menu,
  X,
  Building2
} from "lucide-react"
import { toast } from "sonner"

interface TenantInfo {
  id: string
  name: string
  email: string
  phone: string
  property: {
    name: string
  } | null
  room: {
    room_number: string
  } | null
}

interface RawTenantInfo {
  id: string
  name: string
  phone: string
  property: {
    name: string
  }[] | null
  room: {
    room_number: string
  }[] | null
}

const navigation = [
  { name: "Home", href: "/tenant", icon: Home },
  { name: "My Profile", href: "/tenant/profile", icon: User },
  { name: "Payments", href: "/tenant/payments", icon: CreditCard },
  { name: "Complaints", href: "/tenant/complaints", icon: MessageSquare },
  { name: "Notices", href: "/tenant/notices", icon: Bell },
]

export default function TenantLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [tenant, setTenant] = useState<TenantInfo | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push("/login")
        return
      }

      // Check if user is a tenant
      const { data: tenantData, error } = await supabase
        .from("tenants")
        .select(`
          id,
          name,
          phone,
          property:properties(name),
          room:rooms(room_number)
        `)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single()

      if (error || !tenantData) {
        // Not a tenant, might be an owner - redirect to dashboard
        router.push("/dashboard")
        return
      }

      // Transform the data from arrays to single objects
      const rawData = tenantData as RawTenantInfo
      setTenant({
        id: rawData.id,
        name: rawData.name,
        phone: rawData.phone,
        email: user.email || "",
        property: rawData.property && rawData.property.length > 0 ? rawData.property[0] : null,
        room: rawData.room && rawData.room.length > 0 ? rawData.room[0] : null,
      })
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success("Logged out successfully")
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
      <header className="sticky top-0 z-50 bg-background border-b lg:hidden">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold">Tenant Portal</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
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
          <div className="flex items-center gap-2 h-16 px-6 border-b">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Tenant Portal</span>
          </div>

          {/* Tenant Info */}
          <div className="p-4 border-b">
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium truncate">{tenant?.name}</p>
              <p className="text-sm text-muted-foreground truncate">
                {tenant?.property?.name} • Room {tenant?.room?.room_number}
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
