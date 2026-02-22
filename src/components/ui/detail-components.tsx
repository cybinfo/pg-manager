"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { StatusBadge, type StatusBadgeProps } from "@/components/ui/status-badge"
import { ArrowLeft, LucideIcon, ChevronRight, MoreVertical, Edit, Trash2, Home } from "lucide-react"
import type { BreadcrumbItem } from "@/components/ui/page-header"

// ============================================
// Detail Hero - For detail page headers
// ============================================
interface DetailHeroProps {
  title: string
  subtitle?: string | React.ReactNode
  backHref: string
  backLabel?: string
  breadcrumbs?: BreadcrumbItem[]
  status?: string | React.ReactNode
  statusLabel?: string
  icon?: LucideIcon
  avatar?: string | React.ReactNode
  actions?: React.ReactNode
  children?: React.ReactNode
  className?: string
}

export function DetailHero({
  title,
  subtitle,
  backHref,
  backLabel = "Back",
  breadcrumbs,
  status,
  statusLabel,
  icon: Icon,
  avatar,
  actions,
  children,
  className,
}: DetailHeroProps) {
  return (
    <div className={cn("space-y-4 animate-fade-in-up", className)}>
      {/* Breadcrumbs (preferred) or Back button (fallback) */}
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 hover:text-foreground transition-colors"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="sr-only sm:not-sr-only">Dashboard</span>
          </Link>
          {breadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              {item.href ? (
                <Link
                  href={item.href}
                  className="hover:text-foreground transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="text-foreground font-medium">{item.label}</span>
              )}
            </React.Fragment>
          ))}
        </nav>
      ) : (
        <Link href={backHref}>
          <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            {backLabel}
          </Button>
        </Link>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar/Icon */}
          {(avatar || Icon) && (
            <div className="shrink-0">
              {typeof avatar === 'string' ? (
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-primary/20">
                  {avatar}
                </div>
              ) : avatar ? (
                avatar
              ) : Icon ? (
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-primary/20">
                  <Icon className="h-8 w-8 text-white" />
                </div>
              ) : null}
            </div>
          )}

          {/* Title & Status */}
          <div className="space-y-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              {status && (
                typeof status === 'string' ? (
                  <StatusBadge status={status as StatusBadgeProps["status"]} label={statusLabel} />
                ) : (
                  status
                )
              )}
            </div>
            {subtitle && (
              <p className="text-muted-foreground">{subtitle}</p>
            )}
            {children}
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================
// Info Card - Small stat cards for detail pages
// ============================================
interface InfoCardProps {
  label: string
  value: string | number | React.ReactNode
  icon?: LucideIcon
  variant?: "default" | "success" | "warning" | "error" | "muted"
  href?: string
  className?: string
}

export function InfoCard({
  label,
  value,
  icon: Icon,
  variant = "default",
  href,
  className,
}: InfoCardProps) {
  const variantStyles = {
    default: "bg-card border-border",
    success: "bg-success/5 border-success/20",
    warning: "bg-warning/5 border-warning/20",
    error: "bg-destructive/5 border-destructive/20",
    muted: "bg-muted border-border",
  }

  const iconColors = {
    default: "text-foreground bg-muted",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    error: "text-destructive bg-destructive/10",
    muted: "text-muted-foreground bg-muted",
  }

  const content = (
    <div
      className={cn(
        "p-4 rounded-xl border transition-all duration-200",
        variantStyles[variant],
        href && "cursor-pointer hover:shadow-md hover:-translate-y-0.5",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
            {label}
          </p>
          <p className="text-xl font-bold tabular-nums">
            {value}
          </p>
        </div>
        {Icon && (
          <div className={cn("p-2.5 rounded-lg", iconColors[variant])}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return content
}

// ============================================
// Detail Section - Section wrapper for detail pages
// ============================================
interface DetailSectionProps {
  title: string
  description?: string
  icon?: LucideIcon
  actions?: React.ReactNode
  children: React.ReactNode
  collapsible?: boolean
  defaultOpen?: boolean
  className?: string
}

export function DetailSection({
  title,
  description,
  icon: Icon,
  actions,
  children,
  collapsible = false,
  defaultOpen = true,
  className,
}: DetailSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)

  return (
    <div className={cn("bg-card rounded-xl border shadow-sm overflow-hidden animate-fade-in-up", className)}>
      <div
        className={cn(
          "flex items-center justify-between px-5 py-4 border-b bg-muted/50",
          collapsible && "cursor-pointer hover:bg-muted"
        )}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 rounded-lg bg-card shadow-sm">
              <Icon className="h-4 w-4 text-foreground" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-foreground">{title}</h3>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {actions}
          {collapsible && (
            <ChevronRight
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                isOpen && "rotate-90"
              )}
            />
          )}
        </div>
      </div>
      {(!collapsible || isOpen) && (
        <div className="p-5">
          {children}
        </div>
      )}
    </div>
  )
}

// ============================================
// Info Row - Re-exported from ./info-row
// ============================================
export { InfoRow } from "./info-row"

// ============================================
// Action Menu - Dropdown menu for actions
// ============================================
interface ActionMenuItem {
  label: string
  icon?: LucideIcon
  onClick?: () => void
  href?: string
  variant?: "default" | "danger"
  disabled?: boolean
}

interface ActionMenuProps {
  items: ActionMenuItem[]
  className?: string
}

export function ActionMenu({ items, className }: ActionMenuProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const menuRef = React.useRef<HTMLDivElement>(null)

  // Handle Escape key to close the menu
  React.useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault()
        setIsOpen(false)
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isOpen])

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div ref={menuRef} role="menu" className="absolute right-0 top-full mt-1 w-48 bg-card border rounded-lg shadow-lg z-20 py-1 animate-fade-in">
            {items.map((item, index) => {
              const Icon = item.icon
              const content = (
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="h-4 w-4" />}
                  {item.label}
                </div>
              )

              if (item.href) {
                return (
                  <Link
                    key={index}
                    href={item.href}
                    role="menuitem"
                    className={cn(
                      "block px-3 py-2 text-sm hover:bg-muted transition-colors",
                      item.variant === "danger" && "text-destructive hover:bg-destructive/5",
                      item.disabled && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => setIsOpen(false)}
                  >
                    {content}
                  </Link>
                )
              }

              return (
                <button
                  key={index}
                  role="menuitem"
                  onClick={() => {
                    item.onClick?.()
                    setIsOpen(false)
                  }}
                  disabled={item.disabled}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors",
                    item.variant === "danger" && "text-destructive hover:bg-destructive/5",
                    item.disabled && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {content}
                </button>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

// ============================================
// Quick Actions Bar
// ============================================
interface QuickAction {
  label: string
  icon: LucideIcon
  onClick?: () => void
  href?: string
  variant?: "default" | "gradient"
}

interface QuickActionsProps {
  actions: QuickAction[]
  className?: string
}

export function QuickActions({ actions, className }: QuickActionsProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {actions.map((action, index) => {
        const Icon = action.icon
        const button = (
          <Button
            key={index}
            variant={action.variant === "gradient" ? "gradient" : "outline"}
            size="sm"
            onClick={action.onClick}
          >
            <Icon className="mr-2 h-4 w-4" />
            {action.label}
          </Button>
        )

        if (action.href) {
          return (
            <Link key={index} href={action.href}>
              {button}
            </Link>
          )
        }

        return button
      })}
    </div>
  )
}
