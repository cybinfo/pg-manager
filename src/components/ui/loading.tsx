"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

// ============================================
// Loading Spinner
// ============================================
interface SpinnerProps {
  size?: "sm" | "default" | "lg"
  className?: string
}

export function Spinner({ size = "default", className }: SpinnerProps) {
  const sizes = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
  }

  return (
    <Loader2 className={cn("animate-spin text-primary", sizes[size], className)} />
  )
}

// ============================================
// Page Loading
// ============================================
export function PageLoading({ message }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Spinner size="lg" />
      {message && (
        <p className="text-sm text-muted-foreground animate-pulse">{message}</p>
      )}
    </div>
  )
}

// ============================================
// Skeleton Components
// ============================================
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200/70",
        className
      )}
      {...props}
    />
  )
}

// ============================================
// Skeleton variants for specific use cases
// ============================================

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            "h-4",
            i === lines - 1 && lines > 1 && "w-4/5" // Last line shorter
          )}
        />
      ))}
    </div>
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("bg-white rounded-xl border p-4 space-y-3", className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
    </div>
  )
}

export function SkeletonTable({ rows = 5, columns = 4, className }: { rows?: number; columns?: number; className?: string }) {
  return (
    <div className={cn("bg-white rounded-xl border overflow-hidden", className)}>
      {/* Header */}
      <div className="px-4 py-3 border-b bg-slate-50/80">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-4 py-3">
            <div className="flex items-center gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className={cn(
                    "h-4 flex-1",
                    colIndex === 0 && "max-w-[200px]"
                  )}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonMetricsBar({ items = 4, className }: { items?: number; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-stretch bg-white rounded-xl border shadow-sm overflow-hidden", className)}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex-1 min-w-[140px] px-4 py-3 flex items-center gap-3",
            i !== items - 1 && "border-r border-dashed"
          )}
        >
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SkeletonPageHeader({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
    </div>
  )
}

// ============================================
// Full Page Skeleton
// ============================================
export function PageSkeleton({ variant = "list" }: { variant?: "list" | "detail" | "form" }) {
  if (variant === "list") {
    return (
      <div className="space-y-6">
        <SkeletonPageHeader />
        <SkeletonMetricsBar />
        <Skeleton className="h-10 w-64" /> {/* Search */}
        <SkeletonTable />
      </div>
    )
  }

  if (variant === "detail") {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-20" /> {/* Back button */}
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-2xl" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  // Form variant
  return (
    <div className="space-y-6 max-w-2xl">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <SkeletonCard />
      <SkeletonCard />
      <div className="flex gap-3">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  )
}

// ============================================
// Button Loading State
// ============================================
interface LoadingButtonProps {
  loading?: boolean
  children: React.ReactNode
  loadingText?: string
}

export function LoadingContent({ loading, children, loadingText }: LoadingButtonProps) {
  if (loading) {
    return (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        {loadingText || "Loading..."}
      </>
    )
  }
  return <>{children}</>
}
