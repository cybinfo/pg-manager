"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { ArrowLeft, LucideIcon, ChevronRight, MoreVertical, Edit, Trash2 } from "lucide-react"

// ============================================
// Detail Hero - For detail page headers
// ============================================
interface DetailHeroProps {
  title: string
  subtitle?: string | React.ReactNode
  backHref: string
  backLabel?: string
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
      <Link href={backHref}>
        <Button variant="ghost" size="sm" className="gap-2 -ml-2 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Button>
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          {/* Avatar/Icon */}
          {(avatar || Icon) && (
            <div className="shrink-0">
              {typeof avatar === 'string' ? (
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-2xl font-bold shadow-lg shadow-teal-500/20">
                  {avatar}
                </div>
              ) : avatar ? (
                avatar
              ) : Icon ? (
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center shadow-lg shadow-teal-500/20">
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
                  <StatusBadge status={status as any} label={statusLabel} />
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
    default: "bg-white border-slate-200",
    success: "bg-emerald-50 border-emerald-200",
    warning: "bg-amber-50 border-amber-200",
    error: "bg-rose-50 border-rose-200",
    muted: "bg-slate-50 border-slate-200",
  }

  const iconColors = {
    default: "text-slate-600 bg-slate-100",
    success: "text-emerald-600 bg-emerald-100",
    warning: "text-amber-600 bg-amber-100",
    error: "text-rose-600 bg-rose-100",
    muted: "text-slate-500 bg-slate-100",
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
    <div className={cn("bg-white rounded-xl border shadow-sm overflow-hidden animate-fade-in-up", className)}>
      <div
        className={cn(
          "flex items-center justify-between px-5 py-4 border-b bg-slate-50/50",
          collapsible && "cursor-pointer hover:bg-slate-50"
        )}
        onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
      >
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 rounded-lg bg-white shadow-sm">
              <Icon className="h-4 w-4 text-slate-600" />
            </div>
          )}
          <div>
            <h3 className="font-semibold text-slate-900">{title}</h3>
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
// Info Row - Key-value row for detail sections
// ============================================
interface InfoRowProps {
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  className?: string
}

export function InfoRow({ label, value, icon: Icon, className }: InfoRowProps) {
  return (
    <div className={cn("flex items-start justify-between py-2.5 border-b border-dashed last:border-0", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {Icon && <Icon className="h-4 w-4" />}
        {label}
      </div>
      <div className="text-sm font-medium text-right">
        {value || <span className="text-muted-foreground">-</span>}
      </div>
    </div>
  )
}

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

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
      >
        <MoreVertical className="h-4 w-4" />
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border rounded-lg shadow-lg z-20 py-1 animate-fade-in">
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
                    className={cn(
                      "block px-3 py-2 text-sm hover:bg-slate-50 transition-colors",
                      item.variant === "danger" && "text-rose-600 hover:bg-rose-50",
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
                  onClick={() => {
                    item.onClick?.()
                    setIsOpen(false)
                  }}
                  disabled={item.disabled}
                  className={cn(
                    "w-full text-left px-3 py-2 text-sm hover:bg-slate-50 transition-colors",
                    item.variant === "danger" && "text-rose-600 hover:bg-rose-50",
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
