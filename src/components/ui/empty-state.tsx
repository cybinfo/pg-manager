"use client"

import * as React from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  LucideIcon,
  Plus,
  Search,
  FileX,
  Inbox,
  FolderOpen,
  AlertCircle
} from "lucide-react"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
    icon?: LucideIcon
  }
  secondaryAction?: {
    label: string
    href?: string
    onClick?: () => void
  }
  variant?: "default" | "search" | "error" | "minimal"
  className?: string
}

export function EmptyState({
  icon: CustomIcon,
  title,
  description,
  action,
  secondaryAction,
  variant = "default",
  className,
}: EmptyStateProps) {
  const variantConfig = {
    default: {
      icon: Inbox,
      iconBg: "bg-slate-100",
      iconColor: "text-slate-400",
    },
    search: {
      icon: Search,
      iconBg: "bg-amber-50",
      iconColor: "text-amber-400",
    },
    error: {
      icon: AlertCircle,
      iconBg: "bg-rose-50",
      iconColor: "text-rose-400",
    },
    minimal: {
      icon: FolderOpen,
      iconBg: "bg-slate-50",
      iconColor: "text-slate-300",
    },
  }

  const config = variantConfig[variant]
  const Icon = CustomIcon || config.icon
  const ActionIcon = action?.icon || Plus

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className={cn(
        "p-4 rounded-full mb-4",
        config.iconBg
      )} aria-hidden="true">
        <Icon className={cn("h-10 w-10", config.iconColor)} />
      </div>

      <h3 className="text-lg font-semibold text-slate-900 mb-1">
        {title}
      </h3>

      {description && (
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            action.href ? (
              <Link href={action.href}>
                <Button variant="gradient">
                  <ActionIcon className="mr-2 h-4 w-4" />
                  {action.label}
                </Button>
              </Link>
            ) : (
              <Button variant="gradient" onClick={action.onClick}>
                <ActionIcon className="mr-2 h-4 w-4" />
                {action.label}
              </Button>
            )
          )}

          {secondaryAction && (
            secondaryAction.href ? (
              <Link href={secondaryAction.href}>
                <Button variant="outline">
                  {secondaryAction.label}
                </Button>
              </Link>
            ) : (
              <Button variant="outline" onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )
          )}
        </div>
      )}
    </div>
  )
}

// Specific empty states for common scenarios
export function NoResultsState({
  searchTerm,
  onClear,
  className,
}: {
  searchTerm?: string
  onClear?: () => void
  className?: string
}) {
  return (
    <EmptyState
      variant="search"
      icon={Search}
      title="No results found"
      description={
        searchTerm
          ? `No results match "${searchTerm}". Try adjusting your search or filters.`
          : "No results match your search criteria."
      }
      secondaryAction={onClear ? { label: "Clear filters", onClick: onClear } : undefined}
      className={className}
    />
  )
}

export function NoDataState({
  entity,
  action,
  className,
}: {
  entity: string
  action?: { label: string; href: string }
  className?: string
}) {
  return (
    <EmptyState
      variant="default"
      title={`No ${entity} yet`}
      description={`Get started by creating your first ${entity.toLowerCase()}.`}
      action={action ? { ...action, icon: Plus } : undefined}
      className={className}
    />
  )
}

export function ErrorState({
  message,
  onRetry,
  className,
}: {
  message?: string
  onRetry?: () => void
  className?: string
}) {
  return (
    <EmptyState
      variant="error"
      icon={AlertCircle}
      title="Something went wrong"
      description={message || "An error occurred while loading the data. Please try again."}
      action={onRetry ? { label: "Try again", onClick: onRetry, icon: AlertCircle } : undefined}
      className={className}
    />
  )
}
