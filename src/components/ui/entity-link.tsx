"use client"

import React from "react"
import Link from "next/link"
import {
  Building2, Home, User, Gauge, FileText, CreditCard,
  Receipt, MessageSquare, UserCheck, Bell, LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { LucideIcon } from "lucide-react"

interface BaseEntityLinkProps {
  className?: string
  size?: "sm" | "default"
  showIcon?: boolean
  stopPropagation?: boolean
}

interface EntityLinkConfig {
  icon: LucideIcon
  urlPattern: (id: string) => string
  iconExtraClasses?: string
  textExtraClasses?: string
}

function createEntityLink(config: EntityLinkConfig) {
  const Component = React.memo(function EntityLink({
    id, displayText, className, size = "default", showIcon = true, stopPropagation = true,
  }: BaseEntityLinkProps & { id: string; displayText: string }) {
    const sizeClasses = size === "sm" ? "text-xs" : "text-sm"
    const iconSize = size === "sm" ? "h-3 w-3" : "h-4 w-4"
    return (
      <Link
        href={config.urlPattern(id)}
        onClick={stopPropagation ? (e: React.MouseEvent) => e.stopPropagation() : undefined}
        className={cn(
          "inline-flex items-center gap-1 hover:text-primary transition-colors",
          sizeClasses, config.textExtraClasses ? "truncate" : undefined, className
        )}
      >
        {showIcon && (
          <config.icon className={cn(iconSize, "text-muted-foreground", config.iconExtraClasses)} />
        )}
        <span className={config.textExtraClasses}>{displayText}</span>
      </Link>
    )
  })
  Component.displayName = "EntityLink"
  return Component
}

const GenericPropertyLink = createEntityLink({ icon: Building2, urlPattern: (id) => `/properties/${id}` })
const GenericTenantLink = createEntityLink({ icon: User, urlPattern: (id) => `/tenants/${id}` })
const GenericBillLink = createEntityLink({ icon: FileText, urlPattern: (id) => `/bills/${id}` })
const GenericPaymentLink = createEntityLink({ icon: CreditCard, urlPattern: (id) => `/payments/${id}` })
const GenericExpenseLink = createEntityLink({ icon: Receipt, urlPattern: (id) => `/expenses/${id}` })
const GenericMeterReadingLink = createEntityLink({ icon: Gauge, urlPattern: (id) => `/meter-readings/${id}` })
const GenericComplaintLink = createEntityLink({ icon: MessageSquare, urlPattern: (id) => `/complaints/${id}`, iconExtraClasses: "flex-shrink-0", textExtraClasses: "truncate" })
const GenericVisitorLink = createEntityLink({ icon: UserCheck, urlPattern: (id) => `/visitors/${id}` })
const GenericNoticeLink = createEntityLink({ icon: Bell, urlPattern: (id) => `/notices/${id}`, iconExtraClasses: "flex-shrink-0", textExtraClasses: "truncate" })
const GenericExitClearanceLink = createEntityLink({ icon: LogOut, urlPattern: (id) => `/exit-clearance/${id}` })
const GenericMeterLink = createEntityLink({ icon: Gauge, urlPattern: (id) => `/meters/${id}` })
const GenericRoomLink = createEntityLink({ icon: Home, urlPattern: (id) => `/rooms/${id}` })

export function PropertyLink({ id, name, ...rest }: BaseEntityLinkProps & { id: string; name: string }) {
  return <GenericPropertyLink id={id} displayText={name} {...rest} />
}

export function RoomLink({ id, roomNumber, showPrefix = true, ...rest }: BaseEntityLinkProps & { id: string; roomNumber: string; showPrefix?: boolean }) {
  return <GenericRoomLink id={id} displayText={showPrefix ? `Room ${roomNumber}` : roomNumber} {...rest} />
}

export function TenantLink({ id, name, ...rest }: BaseEntityLinkProps & { id: string; name: string }) {
  return <GenericTenantLink id={id} displayText={name} {...rest} />
}

export function BillLink({ id, billNumber, ...rest }: BaseEntityLinkProps & { id: string; billNumber: string }) {
  return <GenericBillLink id={id} displayText={billNumber} {...rest} />
}

export function PaymentLink({ id, label, ...rest }: BaseEntityLinkProps & { id: string; label: string }) {
  return <GenericPaymentLink id={id} displayText={label} {...rest} />
}

export function ExpenseLink({ id, label, ...rest }: BaseEntityLinkProps & { id: string; label: string }) {
  return <GenericExpenseLink id={id} displayText={label} {...rest} />
}

export function MeterReadingLink({ id, label, ...rest }: BaseEntityLinkProps & { id: string; label: string }) {
  return <GenericMeterReadingLink id={id} displayText={label} {...rest} />
}

export function ComplaintLink({ id, title, ...rest }: BaseEntityLinkProps & { id: string; title: string }) {
  return <GenericComplaintLink id={id} displayText={title} {...rest} />
}

export function VisitorLink({ id, name, ...rest }: BaseEntityLinkProps & { id: string; name: string }) {
  return <GenericVisitorLink id={id} displayText={name} {...rest} />
}

export function NoticeLink({ id, title, ...rest }: BaseEntityLinkProps & { id: string; title: string }) {
  return <GenericNoticeLink id={id} displayText={title} {...rest} />
}

export function ExitClearanceLink({ id, label, ...rest }: BaseEntityLinkProps & { id: string; label: string }) {
  return <GenericExitClearanceLink id={id} displayText={label} {...rest} />
}

export function MeterLink({ id, meterNumber, ...rest }: BaseEntityLinkProps & { id: string; meterNumber: string }) {
  return <GenericMeterLink id={id} displayText={meterNumber} {...rest} />
}
