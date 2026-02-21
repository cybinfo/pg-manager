"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { DetailSection, InfoRow } from "@/components/ui"
import { StatusBadge } from "@/components/ui/status-badge"
import { FileText, Calendar, User, Phone, Mail, Home, Building2 } from "lucide-react"
import { formatDate } from "@/lib/format"

const statusLabels: Record<string, string> = {
  unpaid: "Unpaid",
  pending: "Pending",
  partial: "Partial Payment",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
}

const statusConfig: Record<string, "warning" | "info" | "success" | "error" | "muted"> = {
  unpaid: "warning",
  pending: "warning",
  partial: "info",
  paid: "success",
  overdue: "error",
  cancelled: "muted",
}

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
              status={statusConfig[bill.status] || "muted"}
              label={statusLabels[bill.status] || bill.status}
              size="sm"
            />
          }
        />
        <InfoRow label="Bill Date" value={formatDate(bill.bill_date)} icon={Calendar} />
        <InfoRow
          label="Due Date"
          value={
            <span className={isOverdue ? "text-red-600 font-medium" : ""}>
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
          <InfoRow label="Name" value={bill.tenant.name} />
          {bill.tenant.phone && (
            <InfoRow
              label="Phone"
              value={
                <a href={`tel:${bill.tenant.phone}`} className="text-teal-600 hover:underline">
                  {bill.tenant.phone}
                </a>
              }
              icon={Phone}
            />
          )}
          {bill.tenant.email && (
            <InfoRow
              label="Email"
              value={
                <a href={`mailto:${bill.tenant.email}`} className="text-teal-600 hover:underline truncate">
                  {bill.tenant.email}
                </a>
              }
              icon={Mail}
            />
          )}
          {bill.room && (
            <InfoRow label="Room" value={`Room ${bill.room.room_number}`} icon={Home} />
          )}
          <Link href={`/tenants/${bill.tenant.id}`}>
            <Button variant="outline" size="sm" className="w-full mt-3">
              View Tenant
            </Button>
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
          <InfoRow label="Name" value={bill.property.name} />
          {bill.property.address && (
            <InfoRow label="Address" value={bill.property.address} />
          )}
          <Link href={`/properties/${bill.property.id}`}>
            <Button variant="outline" size="sm" className="w-full mt-3">
              View Property
            </Button>
          </Link>
        </DetailSection>
      )}
    </div>
  )
}
