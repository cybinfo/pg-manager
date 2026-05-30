"use client"

import Link from "next/link"
import { DetailSection, InfoRow } from "@/components/ui"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar } from "@/components/ui/avatar"
import { FileText, Calendar, User, Phone, Mail, Building2 } from "lucide-react"
import { formatDate } from "@/lib/format"
import { BILL_STATUS } from "@/lib/status"

interface BillInfoProps {
  bill: {
    bill_number: string
    status: string
    bill_date: string
    due_date: string
    for_month: string
    period_start?: string
    period_end?: string
    balance_due: number
  }
  isOverdue: boolean
}

interface BillTenantProps {
  tenant: {
    id: string
    name: string
    phone?: string
    email?: string
    person?: { id: string; photo_url?: string | null } | null
  }
  room?: { room_number: string } | null
}

interface BillPropertyProps {
  property: {
    id: string
    name: string
    address?: string
  }
}

export function BillInfoSection({ bill, isOverdue }: BillInfoProps) {
  return (
    <DetailSection
      title="Bill Information"
      description="Dates and status"
      icon={FileText}
    >
      <InfoRow label="Bill Number" value={bill.bill_number} />
      <InfoRow
        label="Status"
        value={
          <StatusBadge
            status={(BILL_STATUS[bill.status] || BILL_STATUS.pending).variant}
            label={(BILL_STATUS[bill.status] || { label: bill.status }).label}
            size="sm"
          />
        }
      />
      <InfoRow label="Bill Date" value={formatDate(bill.bill_date)} icon={Calendar} />
      <InfoRow
        label="Due Date"
        value={
          <span className={isOverdue ? "text-destructive font-medium" : ""}>
            {formatDate(bill.due_date)}
          </span>
        }
        icon={Calendar}
      />
      {bill.period_start && bill.period_end && (
        <InfoRow
          label="Billing Period"
          value={`${formatDate(bill.period_start)} - ${formatDate(bill.period_end)}`}
        />
      )}
    </DetailSection>
  )
}

export function BillTenantSection({ tenant, room }: BillTenantProps) {
  return (
    <DetailSection
      title="Tenant Details"
      description="Billed to"
      icon={User}
    >
      <Link href={`/tenants/${tenant.id}`}>
        <div className="flex items-center gap-3 p-3 border rounded-lg hover:shadow-md transition-shadow">
          <Avatar name={tenant.name} src={tenant.person?.photo_url} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-medium">{tenant.name}</p>
            {tenant.phone && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3 shrink-0" />
                {tenant.phone}
              </p>
            )}
            {tenant.email && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                <Mail className="h-3 w-3 shrink-0" />
                {tenant.email}
              </p>
            )}
            {room && (
              <p className="text-xs text-muted-foreground font-mono">Room {room.room_number}</p>
            )}
          </div>
        </div>
      </Link>
    </DetailSection>
  )
}

export function BillPropertySection({ property }: BillPropertyProps) {
  return (
    <DetailSection
      title="Property"
      description="Bill location"
      icon={Building2}
    >
      <Link href={`/properties/${property.id}`}>
        <div className="flex items-center gap-3 p-3 border rounded-lg hover:shadow-md transition-shadow">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium">{property.name}</p>
            {property.address && (
              <p className="text-sm text-muted-foreground truncate">{property.address}</p>
            )}
          </div>
        </div>
      </Link>
    </DetailSection>
  )
}
