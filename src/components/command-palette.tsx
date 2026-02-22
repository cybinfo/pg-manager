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
import { Plus } from "lucide-react"
import { DASHBOARD_NAVIGATION } from "@/lib/navigation/config"

type CommandPaletteItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  keywords: string[]
}

/**
 * Keywords map for enhancing search on navigation items.
 * Keyed by href path. Items not in this map get default keywords
 * derived from their name.
 */
const KEYWORDS_BY_HREF: Record<string, string[]> = {
  "/dashboard": ["home", "overview", "summary", "metrics"],
  "/properties": ["building", "pg", "hostel", "property"],
  "/rooms": ["bed", "accommodation", "room"],
  "/tenants": ["resident", "guest", "tenant", "occupant"],
  "/people": ["contact", "person", "identity"],
  "/bills": ["invoice", "billing", "charges"],
  "/payments": ["money", "transaction", "pay"],
  "/refunds": ["return", "money back", "refund"],
  "/expenses": ["cost", "spending", "expense"],
  "/expenses/daily-spend": ["daily", "cost", "spending"],
  "/expenses/products": ["items", "goods", "inventory"],
  "/expenses/vendors": ["supplier", "vendor", "shop"],
  "/expenses/bills": ["utility", "electricity", "water", "bill"],
  "/expenses/services/providers": ["service", "provider", "contractor"],
  "/expenses/services": ["maintenance", "repair", "service"],
  "/meter-readings": ["utility", "electricity", "water", "consumption", "reading"],
  "/meters": ["utility", "meter", "gauge"],
  "/exit-clearance": ["checkout", "leave", "exit", "departure"],
  "/visitors": ["visitor", "guest", "entry"],
  "/inquiries": ["inquiry", "lead", "prospect"],
  "/complaints": ["issue", "problem", "complaint", "grievance"],
  "/notices": ["announcement", "notice", "alert", "notification"],
  "/reports": ["analytics", "stats", "report", "chart"],
  "/activity": ["audit", "log", "history", "activity"],
  "/architecture": ["map", "layout", "floor plan", "2d"],
  "/approvals": ["approve", "request", "pending", "approval"],
  "/staff": ["employee", "team", "staff", "role"],
  "/library": ["study", "reading room", "library"],
  "/library-sections": ["section", "hall", "area", "zone"],
  "/library-seats": ["seat", "desk", "chair", "position"],
  "/library-members": ["student", "member", "subscriber"],
  "/library-waitlist": ["waitlist", "queue", "waiting"],
  "/library-attendance": ["checkin", "checkout", "attendance", "hours"],
  "/library-lockers": ["locker", "storage", "cabinet"],
  "/library-payments": ["subscription", "payment", "fee", "library"],
  "/library-reports": ["analytics", "stats", "library", "report"],
  "/library-plans": ["plan", "subscription", "pricing", "package"],
}

/**
 * Navigation items generated dynamically from DASHBOARD_NAVIGATION config.
 * This ensures the command palette always stays in sync with the sidebar navigation.
 */
const NAVIGATION_ITEMS: CommandPaletteItem[] = DASHBOARD_NAVIGATION.map((navItem) => ({
  name: navItem.name,
  href: navItem.href,
  icon: navItem.icon,
  keywords: KEYWORDS_BY_HREF[navItem.href] || navItem.name.toLowerCase().split(" "),
}))

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
    <div className="fixed inset-0 z-[var(--z-dialog)]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fade-in"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-[var(--z-dialog)] flex items-start justify-center pt-[20vh]">
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
                    <item.icon className="h-4 w-4 text-primary" />
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
