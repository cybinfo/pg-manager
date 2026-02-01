/**
 * Library Member Detail Page
 *
 * Shows member 360 view with subscriptions, attendance, and payments.
 */

"use client"

import { useParams } from "next/navigation"
import Link from "next/link"
import { useDetailPage, LIBRARY_MEMBER_DETAIL_CONFIG } from "@/lib/hooks/useDetailPage"
import { Button } from "@/components/ui/button"
import {
  DetailHero,
  InfoCard,
  DetailSection,
  InfoRow,
  DetailListSection,
  DetailPageTemplate,
} from "@/components/ui"
import { StatusBadge } from "@/components/ui/status-badge"
import { Currency } from "@/components/ui/currency"
import { PageLoading } from "@/components/ui/loading"
import { Avatar } from "@/components/ui/avatar"
import {
  Users,
  Phone,
  Mail,
  Calendar,
  Clock,
  CreditCard,
  Armchair,
  Lock,
  Plus,
  Pencil,
  FileText,
} from "lucide-react"
import { formatDate } from "@/lib/format"
import { LIBRARY_MEMBER_STATUS_CONFIG, LIBRARY_MEMBERSHIP_STATUS_CONFIG } from "@/types/library.types"
import type {
  LibraryMember,
  LibraryMembership,
  LibraryAttendance,
  LibraryPayment,
  LibraryLockerAssignment,
} from "@/types/library.types"

export default function LibraryMemberDetailPage() {
  const params = useParams()

  const {
    data: member,
    related,
    loading,
  } = useDetailPage<LibraryMember>({
    config: LIBRARY_MEMBER_DETAIL_CONFIG,
    id: params.id as string,
  })

  if (loading) {
    return <PageLoading message="Loading member details..." />
  }

  if (!member) {
    return null
  }

  const memberships = (related.memberships || []) as LibraryMembership[]
  const attendance = (related.attendance || []) as LibraryAttendance[]
  const payments = (related.payments || []) as LibraryPayment[]
  const lockerAssignments = (related.lockerAssignments || []) as LibraryLockerAssignment[]

  // Calculate stats
  const displayName = member.person?.name || member.name
  const photoUrl = member.person?.photo_url
  const totalPaid = payments.reduce((sum, p) => sum + (p.amount || 0), 0)
  const totalHoursUsed = member.hours_used || 0
  const hoursRemaining = member.hours_balance || 0
  const statusConfig = LIBRARY_MEMBER_STATUS_CONFIG[member.status as keyof typeof LIBRARY_MEMBER_STATUS_CONFIG]

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <DetailHero
        title={displayName}
        subtitle={
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {member.member_code && (
              <span className="font-mono bg-muted px-2 py-0.5 rounded">{member.member_code}</span>
            )}
            {member.library?.name && (
              <Link href={`/library/${member.library.id}`} className="hover:text-primary hover:underline">
                {member.library.name}
              </Link>
            )}
            {member.preferred_slot && (
              <span className="px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                {member.preferred_slot}
              </span>
            )}
          </div>
        }
        backHref="/library-members"
        backLabel="All Members"
        status={statusConfig?.variant || "muted"}
        avatar={
          <Avatar name={displayName} src={photoUrl} size="xl" />
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/library-attendance/new?member=${member.id}`}>
              <Button variant="outline" size="sm">
                <Clock className="mr-2 h-4 w-4" />
                Check In
              </Button>
            </Link>
            {!member.locker_id && (
              <Link href={`/library-lockers?status=available&for_member=${member.id}`}>
                <Button variant="outline" size="sm">
                  <Lock className="mr-2 h-4 w-4" />
                  Assign Locker
                </Button>
              </Link>
            )}
            <Link href={`/library-members/${member.id}/edit`}>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Link href={`/library-payments/new?member=${member.id}`}>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            </Link>
          </div>
        }
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          label="Hours Remaining"
          value={`${hoursRemaining.toFixed(1)}h`}
          icon={Clock}
          variant={hoursRemaining <= 2 ? "warning" : "success"}
        />
        <InfoCard
          label="Hours Used"
          value={`${totalHoursUsed.toFixed(1)}h`}
          icon={Clock}
          variant="default"
        />
        <InfoCard
          label="Total Paid"
          value={<Currency amount={totalPaid} />}
          icon={CreditCard}
          variant="default"
        />
        <InfoCard
          label="Status"
          value={statusConfig?.label || member.status}
          icon={Users}
          variant={statusConfig?.variant || "default"}
        />
      </div>

      <DetailPageTemplate layoutKey="member-detail" entityType="library_member" record={member}>
        {/* Member Details */}
        <DetailSection
          title="Contact Information"
          description="Personal and contact details"
          icon={Users}
        >
          <InfoRow label="Phone" value={member.phone || "—"} icon={Phone} />
          <InfoRow label="Email" value={member.email || "—"} icon={Mail} />
          <InfoRow label="Join Date" value={formatDate(member.join_date)} icon={Calendar} />
          {member.expiry_date && (
            <InfoRow
              label="Expiry Date"
              value={formatDate(member.expiry_date)}
              icon={Calendar}
            />
          )}
          {member.assigned_seat && (
            <InfoRow
              label="Assigned Seat"
              value={`${member.assigned_seat.seat_number}${member.assigned_seat.section ? ` (${member.assigned_seat.section.name})` : ""}`}
              icon={Armchair}
            />
          )}
          {member.locker && (
            <InfoRow
              label="Locker"
              value={`#${member.locker.locker_number}`}
              icon={Lock}
            />
          )}
        </DetailSection>

        {/* ID Proof */}
        {(member.id_proof_type || member.id_proof_number) && (
          <DetailSection
            title="ID Proof"
            description="Identity verification"
            icon={FileText}
          >
            {member.id_proof_type && (
              <InfoRow label="ID Type" value={member.id_proof_type.replace("_", " ").toUpperCase()} />
            )}
            {member.id_proof_number && (
              <InfoRow label="ID Number" value={member.id_proof_number} />
            )}
          </DetailSection>
        )}

        {/* Subscriptions */}
        <DetailListSection
          title="Subscriptions"
          description={`${memberships.length} subscription(s)`}
          icon={CreditCard}
          items={memberships}
          keyExtractor={(membership) => membership.id}
          renderItem={(membership) => {
            const config = LIBRARY_MEMBERSHIP_STATUS_CONFIG[membership.status as keyof typeof LIBRARY_MEMBERSHIP_STATUS_CONFIG]
            return (
              <div className="p-3 border rounded-lg mb-2 last:mb-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold">{membership.plan_name}</span>
                  <StatusBadge
                    status={config?.variant || "muted"}
                    label={config?.label || membership.status}
                    size="sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Period:</span>{" "}
                    {formatDate(membership.start_date)} - {formatDate(membership.end_date)}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Amount:</span>{" "}
                    <Currency amount={membership.final_amount} />
                  </div>
                  {membership.hours_included && (
                    <div>
                      <span className="text-muted-foreground">Hours:</span>{" "}
                      {membership.hours_used?.toFixed(1) || 0}h / {membership.hours_included}h
                    </div>
                  )}
                </div>
              </div>
            )
          }}
          initialLimit={3}
          viewAllMode="expand"
          emptyIcon={CreditCard}
          emptyText="No subscriptions"
          actions={
            <Link href={`/library-members/${member.id}/renew`}>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Renew
              </Button>
            </Link>
          }
        />

        {/* Recent Attendance */}
        <DetailListSection
          title="Recent Attendance"
          description="Check-in/check-out history"
          icon={Clock}
          items={attendance}
          keyExtractor={(att) => att.id}
          renderItem={(att) => (
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className="min-w-0">
                <p className="font-medium text-sm">{formatDate(att.attendance_date)}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(att.check_in_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                  {att.check_out_time && (
                    <> - {new Date(att.check_out_time).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</>
                  )}
                </p>
              </div>
              <div className="text-right">
                {att.hours_spent ? (
                  <span className="font-medium text-sm">{att.hours_spent.toFixed(1)}h</span>
                ) : (
                  <StatusBadge status="success" label="Active" size="sm" />
                )}
              </div>
            </div>
          )}
          initialLimit={5}
          viewAllHref={`/library-attendance?member=${member.id}`}
          viewAllMode="auto"
          emptyIcon={Clock}
          emptyText="No attendance records"
        />

        {/* Recent Payments */}
        <DetailListSection
          title="Payment History"
          description="All payments made"
          icon={CreditCard}
          items={payments}
          keyExtractor={(payment) => payment.id}
          renderItem={(payment) => (
            <Link href={`/library-payments/${payment.id}`}>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm">{payment.receipt_number || payment.payment_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(payment.payment_date)} • {payment.payment_method}
                  </p>
                </div>
                <p className="font-semibold text-sm text-green-600">
                  +<Currency amount={payment.amount} />
                </p>
              </div>
            </Link>
          )}
          initialLimit={5}
          viewAllHref={`/library-payments?member=${member.id}`}
          viewAllMode="auto"
          emptyIcon={CreditCard}
          emptyText="No payments recorded"
          actions={
            <Link href={`/library-payments/new?member=${member.id}`}>
              <Button size="sm">
                <Plus className="mr-1 h-3 w-3" />
                Add Payment
              </Button>
            </Link>
          }
        />

        {/* Locker Assignments */}
        {lockerAssignments.length > 0 && (
          <DetailListSection
            title="Locker History"
            description="Locker assignments"
            icon={Lock}
            items={lockerAssignments}
            keyExtractor={(assignment) => assignment.id}
            renderItem={(assignment) => (
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="min-w-0">
                  <p className="font-medium text-sm">
                    Locker #{(assignment.locker as { locker_number?: string })?.locker_number}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(assignment.start_date)}
                    {assignment.end_date && ` - ${formatDate(assignment.end_date)}`}
                  </p>
                </div>
                <div className="text-right">
                  <StatusBadge
                    status={assignment.status === "active" ? "success" : "muted"}
                    label={assignment.status}
                    size="sm"
                  />
                  {assignment.rent_amount && (
                    <p className="text-xs text-muted-foreground mt-1">
                      <Currency amount={assignment.rent_amount} />/mo
                    </p>
                  )}
                </div>
              </div>
            )}
            initialLimit={3}
            viewAllMode="expand"
            emptyIcon={Lock}
            emptyText="No locker assignments"
          />
        )}

        {/* Notes */}
        {member.notes && (
          <DetailSection
            title="Notes"
            description="Additional information"
            icon={FileText}
          >
            <p className="text-sm whitespace-pre-wrap">{member.notes}</p>
          </DetailSection>
        )}
      </DetailPageTemplate>
    </div>
  )
}
