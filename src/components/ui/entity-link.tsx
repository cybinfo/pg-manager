"use client"

import Link from "next/link"
import { Building2, Home, User, Gauge, FileText, CreditCard, Receipt, MessageSquare, UserCheck, Bell, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Centralized Entity Link Components
 *
 * These components provide consistent, clickable links to entity detail pages
 * throughout the application. Use these instead of manually creating links
 * to ensure consistent styling and behavior.
 *
 * Features:
 * - Consistent hover styling (text-primary transition)
 * - Automatic stopPropagation for use in DataTable rows
 * - Icon + text display with size variants
 * - TypeScript interfaces for type safety
 */

// Common props for all entity links
interface BaseEntityLinkProps {
  className?: string
  size?: "sm" | "default"
  showIcon?: boolean
  /** Set to true when used inside a clickable row (DataTable) */
  stopPropagation?: boolean
}

// =============================================================================
// Property Link
// =============================================================================
interface PropertyLinkProps extends BaseEntityLinkProps {
  id: string
  name: string
}

export function PropertyLink({
  id,
  name,
  className,
  size = "default",
  showIcon = true,
  stopPropagation = true
}: PropertyLinkProps) {
  const sizeClasses = size === "sm" ? "text-xs" : "text-sm"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  return (
    <Link
      href={`/properties/${id}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={cn(
        "inline-flex items-center gap-1 hover:text-primary transition-colors",
        sizeClasses,
        className
      )}
    >
      {showIcon && <Building2 className={cn(iconSize, "text-muted-foreground")} />}
      <span>{name}</span>
    </Link>
  )
}

// =============================================================================
// Room Link
// =============================================================================
interface RoomLinkProps extends BaseEntityLinkProps {
  id: string
  roomNumber: string
  /** Optionally show "Room" prefix */
  showPrefix?: boolean
}

export function RoomLink({
  id,
  roomNumber,
  className,
  size = "default",
  showIcon = true,
  showPrefix = true,
  stopPropagation = true
}: RoomLinkProps) {
  const sizeClasses = size === "sm" ? "text-xs" : "text-sm"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  return (
    <Link
      href={`/rooms/${id}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={cn(
        "inline-flex items-center gap-1 hover:text-primary transition-colors",
        sizeClasses,
        className
      )}
    >
      {showIcon && <Home className={cn(iconSize, "text-muted-foreground")} />}
      <span>{showPrefix ? `Room ${roomNumber}` : roomNumber}</span>
    </Link>
  )
}

// =============================================================================
// Tenant Link
// =============================================================================
interface TenantLinkProps extends BaseEntityLinkProps {
  id: string
  name: string
}

export function TenantLink({
  id,
  name,
  className,
  size = "default",
  showIcon = true,
  stopPropagation = true
}: TenantLinkProps) {
  const sizeClasses = size === "sm" ? "text-xs" : "text-sm"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  return (
    <Link
      href={`/tenants/${id}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={cn(
        "inline-flex items-center gap-1 hover:text-primary transition-colors",
        sizeClasses,
        className
      )}
    >
      {showIcon && <User className={cn(iconSize, "text-muted-foreground")} />}
      <span>{name}</span>
    </Link>
  )
}

// =============================================================================
// Bill Link
// =============================================================================
interface BillLinkProps extends BaseEntityLinkProps {
  id: string
  billNumber: string
}

export function BillLink({
  id,
  billNumber,
  className,
  size = "default",
  showIcon = true,
  stopPropagation = true
}: BillLinkProps) {
  const sizeClasses = size === "sm" ? "text-xs" : "text-sm"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  return (
    <Link
      href={`/bills/${id}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={cn(
        "inline-flex items-center gap-1 hover:text-primary transition-colors",
        sizeClasses,
        className
      )}
    >
      {showIcon && <FileText className={cn(iconSize, "text-muted-foreground")} />}
      <span>{billNumber}</span>
    </Link>
  )
}

// =============================================================================
// Payment Link
// =============================================================================
interface PaymentLinkProps extends BaseEntityLinkProps {
  id: string
  /** Display text - could be receipt number or amount */
  label: string
}

export function PaymentLink({
  id,
  label,
  className,
  size = "default",
  showIcon = true,
  stopPropagation = true
}: PaymentLinkProps) {
  const sizeClasses = size === "sm" ? "text-xs" : "text-sm"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  return (
    <Link
      href={`/payments/${id}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={cn(
        "inline-flex items-center gap-1 hover:text-primary transition-colors",
        sizeClasses,
        className
      )}
    >
      {showIcon && <CreditCard className={cn(iconSize, "text-muted-foreground")} />}
      <span>{label}</span>
    </Link>
  )
}

// =============================================================================
// Expense Link
// =============================================================================
interface ExpenseLinkProps extends BaseEntityLinkProps {
  id: string
  label: string
}

export function ExpenseLink({
  id,
  label,
  className,
  size = "default",
  showIcon = true,
  stopPropagation = true
}: ExpenseLinkProps) {
  const sizeClasses = size === "sm" ? "text-xs" : "text-sm"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  return (
    <Link
      href={`/expenses/${id}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={cn(
        "inline-flex items-center gap-1 hover:text-primary transition-colors",
        sizeClasses,
        className
      )}
    >
      {showIcon && <Receipt className={cn(iconSize, "text-muted-foreground")} />}
      <span>{label}</span>
    </Link>
  )
}

// =============================================================================
// Meter Reading Link
// =============================================================================
interface MeterReadingLinkProps extends BaseEntityLinkProps {
  id: string
  label: string
}

export function MeterReadingLink({
  id,
  label,
  className,
  size = "default",
  showIcon = true,
  stopPropagation = true
}: MeterReadingLinkProps) {
  const sizeClasses = size === "sm" ? "text-xs" : "text-sm"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  return (
    <Link
      href={`/meter-readings/${id}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={cn(
        "inline-flex items-center gap-1 hover:text-primary transition-colors",
        sizeClasses,
        className
      )}
    >
      {showIcon && <Gauge className={cn(iconSize, "text-muted-foreground")} />}
      <span>{label}</span>
    </Link>
  )
}

// =============================================================================
// Complaint Link
// =============================================================================
interface ComplaintLinkProps extends BaseEntityLinkProps {
  id: string
  title: string
}

export function ComplaintLink({
  id,
  title,
  className,
  size = "default",
  showIcon = true,
  stopPropagation = true
}: ComplaintLinkProps) {
  const sizeClasses = size === "sm" ? "text-xs" : "text-sm"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  return (
    <Link
      href={`/complaints/${id}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={cn(
        "inline-flex items-center gap-1 hover:text-primary transition-colors truncate",
        sizeClasses,
        className
      )}
    >
      {showIcon && <MessageSquare className={cn(iconSize, "text-muted-foreground flex-shrink-0")} />}
      <span className="truncate">{title}</span>
    </Link>
  )
}

// =============================================================================
// Visitor Link
// =============================================================================
interface VisitorLinkProps extends BaseEntityLinkProps {
  id: string
  name: string
}

export function VisitorLink({
  id,
  name,
  className,
  size = "default",
  showIcon = true,
  stopPropagation = true
}: VisitorLinkProps) {
  const sizeClasses = size === "sm" ? "text-xs" : "text-sm"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  return (
    <Link
      href={`/visitors/${id}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={cn(
        "inline-flex items-center gap-1 hover:text-primary transition-colors",
        sizeClasses,
        className
      )}
    >
      {showIcon && <UserCheck className={cn(iconSize, "text-muted-foreground")} />}
      <span>{name}</span>
    </Link>
  )
}

// =============================================================================
// Notice Link
// =============================================================================
interface NoticeLinkProps extends BaseEntityLinkProps {
  id: string
  title: string
}

export function NoticeLink({
  id,
  title,
  className,
  size = "default",
  showIcon = true,
  stopPropagation = true
}: NoticeLinkProps) {
  const sizeClasses = size === "sm" ? "text-xs" : "text-sm"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  return (
    <Link
      href={`/notices/${id}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={cn(
        "inline-flex items-center gap-1 hover:text-primary transition-colors truncate",
        sizeClasses,
        className
      )}
    >
      {showIcon && <Bell className={cn(iconSize, "text-muted-foreground flex-shrink-0")} />}
      <span className="truncate">{title}</span>
    </Link>
  )
}

// =============================================================================
// Exit Clearance Link
// =============================================================================
interface ExitClearanceLinkProps extends BaseEntityLinkProps {
  id: string
  label: string
}

export function ExitClearanceLink({
  id,
  label,
  className,
  size = "default",
  showIcon = true,
  stopPropagation = true
}: ExitClearanceLinkProps) {
  const sizeClasses = size === "sm" ? "text-xs" : "text-sm"
  const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"

  return (
    <Link
      href={`/exit-clearance/${id}`}
      onClick={stopPropagation ? (e) => e.stopPropagation() : undefined}
      className={cn(
        "inline-flex items-center gap-1 hover:text-primary transition-colors",
        sizeClasses,
        className
      )}
    >
      {showIcon && <LogOut className={cn(iconSize, "text-muted-foreground")} />}
      <span>{label}</span>
    </Link>
  )
}
