"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@/components/ui/command"
import {
  LayoutDashboard,
  Building2,
  Home,
  Users,
  Receipt,
  CreditCard,
  TrendingDown,
  FileText,
  UserCog,
  Library,
  Clock,
  Plus,
} from "lucide-react"

type CommandPaletteItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  keywords: string[]
}

const NAVIGATION_ITEMS: CommandPaletteItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, keywords: ["home", "overview"] },
  { name: "Properties", href: "/properties", icon: Building2, keywords: ["building", "pg"] },
  { name: "Rooms", href: "/rooms", icon: Home, keywords: ["bed", "accommodation"] },
  { name: "Tenants", href: "/tenants", icon: Users, keywords: ["resident", "guest"] },
  { name: "Bills", href: "/bills", icon: Receipt, keywords: ["invoice", "billing"] },
  { name: "Payments", href: "/payments", icon: CreditCard, keywords: ["money", "transaction"] },
  { name: "Expenses", href: "/expenses", icon: TrendingDown, keywords: ["cost", "spending"] },
  { name: "Reports", href: "/reports", icon: FileText, keywords: ["analytics", "stats"] },
  { name: "Staff", href: "/staff", icon: UserCog, keywords: ["employee", "team"] },
  { name: "Libraries", href: "/library", icon: Library, keywords: ["study", "reading"] },
  { name: "Library Members", href: "/library-members", icon: Users, keywords: ["student", "member"] },
  { name: "Library Attendance", href: "/library-attendance", icon: Clock, keywords: ["checkin", "checkout"] },
]

const ACTION_ITEMS: CommandPaletteItem[] = [
  { name: "New Tenant", href: "/tenants/new", icon: Plus, keywords: ["add", "create", "tenant"] },
  { name: "New Payment", href: "/payments/new", icon: Plus, keywords: ["add", "record", "payment"] },
  { name: "New Bill", href: "/bills/new", icon: Plus, keywords: ["add", "create", "bill"] },
  { name: "New Expense", href: "/expenses/new", icon: Plus, keywords: ["add", "create", "expense"] },
  { name: "New Room", href: "/rooms/new", icon: Plus, keywords: ["add", "create", "room"] },
  { name: "New Library Member", href: "/library-members/new", icon: Plus, keywords: ["add", "create", "library", "member"] },
]

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === "Escape" && open) {
        setOpen(false)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open])

  const handleSelect = useCallback(
    (href: string) => {
      setOpen(false)
      router.push(href)
    },
    [router]
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
        <div className="w-full max-w-lg mx-4 animate-scale-in">
          <Command
            className="bg-card border rounded-xl shadow-2xl overflow-hidden"
            loop
          >
            <CommandInput placeholder="Type a command or search..." />
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Quick Navigation">
                {NAVIGATION_ITEMS.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={[item.name, ...item.keywords].join(" ")}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                  >
                    <item.icon className="h-4 w-4 text-muted-foreground" />
                    <span>{item.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Quick Actions">
                {ACTION_ITEMS.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={[item.name, ...item.keywords].join(" ")}
                    onSelect={() => handleSelect(item.href)}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer"
                  >
                    <item.icon className="h-4 w-4 text-teal-600" />
                    <span>{item.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      </div>
    </div>
  )
}
