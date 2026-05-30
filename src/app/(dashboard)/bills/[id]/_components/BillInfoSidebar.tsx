"use client"

import Link from "next/link"
import { DetailSection, InfoRow } from "@/components/ui"
import { StatusBadge } from "@/components/ui/status-badge"
import { Avatar } from "@/components/ui/avatar"
import { FileText, Calendar, User, Phone, Mail, Building2 } from "lucide-react"
import { formatDate } from "@/lib/format"
import { BILL_STATUS } from "@/lib/status"

interface BillInfoSidebarProps {
  bill: {
    bill_number: string
    status: string
    bill_date: string
    due_date: string
    for_month: string
    period_start?: string
    period_end?: string
    balance_due: number
    tenant?: {
      id: string
      name: string
      phone?: string
      email?: string
      person?: { id: string; photo_url?: string | null } | null
    } | null
    property?: {
      id: string
      name: string
      address?: string
    } | null
    room?: {
      room_number: string
    } | null
  }
  isOverdue: boolean
}

export function BillInfoSidebar({ bill, isOverdue }: BillInfoSidebarProps) {
  return (
    <div className="space-y-6">
      {/* Bill Info */}
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

      {/* Tenant Info */}
      {bill.tenant && (
        <DetailSection
          title="Tenant Details"
          description="Billed to"
          icon={User}
        >
          <Link href={`/tenants/${bill.tenant.id}`}>
            <div className="flex items-center gap-3 p-3 border rounded-lg hover:shadow-md transition-shadow">
              <Avatar name={bill.tenant.name} src={bill.tenant.person?.photo_url} size="md" />
              <div className="flex-1 min-w-0">
                <p className="font-medium">{bill.tenant.name}</p>
                {bill.tenant.phone && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3 shrink-0" />
                    {bill.tenant.phone}
                  </p>
                )}
                {bill.tenant.email && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 truncate">
                    <Mail className="h-3 w-3 shrink-0" />
                    {bill.tenant.email}
                  </p>
                )}
                {bill.room && (
                  <p className="text-xs text-muted-foreground font-mono">Room {bill.room.room_number}</p>
                )}
              </div>
            </div>
          </Link>
        </DetailSection>
      )}

      {/* Property Info */}
      {bill.property && (
        <DetailSection
          title="Property"
          description="Bill location"
          icon={Building2}
        >
          <Link href={`/properties/${bill.property.id}`}>
            <div className="flex items-center gap-3 p-3 border rounded-lg hover:shadow-md transition-shadow">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">{bill.property.name}</p>
                {bill.property.address && (
                  <p className="text-sm text-muted-foreground truncate">{bill.property.address}</p>
                )}
              </div>
            </div>
          </Link>
        </DetailSection>
      )}
    </div>
  )
}
