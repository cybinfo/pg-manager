import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BrandLogo } from "@/components/ui/brand-logo"

interface PublicNavProps {
  /** Which nav link is currently active (highlighted) */
  activePage?: "products" | "pricing" | "help" | "contact"
  /** CTA button label (default: "Get Started Free") */
  ctaLabel?: string
}

export function PublicNav({ activePage, ctaLabel = "Get Started Free" }: PublicNavProps) {
  const navLinks = [
    { href: "/#products", label: "Products", key: "products" as const },
    { href: "/pricing", label: "Pricing", key: "pricing" as const },
    { href: "/help", label: "Help", key: "help" as const },
    { href: "/contact", label: "Contact", key: "contact" as const },
  ]

  return (
    <nav className="sticky top-0 z-50 glass-nav border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <BrandLogo size="sm" />
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              className={
                activePage === link.key
                  ? "text-sm text-foreground font-medium"
                  : "text-sm text-muted-foreground hover:text-foreground transition-colors"
              }
            >
              {link.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Login</Button>
          </Link>
          <Link href="/register">
            <Button variant="gradient" size="sm">
              {ctaLabel}
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  )
}
