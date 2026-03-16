/**
 * Library Member Detail Page
 *
 * Shows member 360 view with subscriptions, attendance, payments,
 * personal details, emergency contacts, and quick actions.
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
import { PermissionGate } from "@/components/auth"
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
  RefreshCw,
  MessageCircle,
  MapPin,
  AlertTriangle,
  Heart,
  Shield,
  User,
  Briefcase,
  Droplets,
} from "lucide-react"
import { MemberHoursCard, MemberQRCode } from "@/components/library"
import { formatDate } from "@/lib/format"
import { useBackNavigation } from "@/lib/hooks/useBackNavigation"
import { LIBRARY_MEMBER_STATUS_CONFIG, LIBRARY_MEMBERSHIP_STATUS_CONFIG } from "@/types/library.types"
import type {
  LibraryMember,
  LibraryMembership,
  LibraryAttendance,
  LibraryPayment,
  LibraryLockerAssignment,
} from "@/types/library.types"

// ============================================
// Helper: Compute overdue info
// ============================================

function computeOverdueInfo(expiryDate: string | null) {
  if (!expiryDate) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const expiry = new Date(expiryDate)
  expiry.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < -30) return { label: "Severely Overdue", days: Math.abs(diffDays), variant: "error" as const, isOverdue: true }
  if (diffDays < 0) return { label: "Overdue", days: Math.abs(diffDays), variant: "warning" as const, isOverdue: true }
  if (diffDays <= 7) return { label: "Expiring Soon", days: diffDays, variant: "warning" as const, isOverdue: false }
  return { label: "Current", days: diffDays, variant: "success" as const, isOverdue: false }
}

// ============================================
// Helper: Profile completeness
// ============================================

function getMissingFields(member: LibraryMember): string[] {
  const missing: string[] = []
  if (!member.phone && !member.person?.phone) missing.push("Phone")
  if (!member.email && !member.person?.email) missing.push("Email")
  if (!member.person?.photo_url) missing.push("Photo")
  if (!member.id_proof_type && !member.person?.id_documents?.length) missing.push("ID Proof")
  if (!member.person?.emergency_contacts?.length) missing.push("Emergency Contact")
  return missing
}

// ============================================
// Helper: Format address
// ============================================

function formatAddress(address: string | null, city: string | null, state?: string | null, pincode?: string | null): string | null {
  const parts = [address, city, state, pincode].filter(Boolean)
  return parts.length > 0 ? parts.join(", ") : null
}

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

  const { backHref, backLabel } = useBackNavigation({ defaultHref: "/library-members", defaultLabel: "All Members" })

  if (loading) {
    return <PageLoading message="Loading member details..." />
  }

  if (!member) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
          <h2 className="text-lg font-semibold">Not Found</h2>
          <p className="text-muted-foreground mt-1">The requested record could not be found.</p>
        </div>
      )
  }

  const memberships = (related.memberships || []) as LibraryMembership[]
  const attendance = (related.attendance || []) as LibraryAttendance[]
  const payments = (related.payments || []) as LibraryPayment[]
  const lockerAssignments = (related.lockerAssignments || []) as LibraryLockerAssignment[]

  // Calculate stats
  const displayName = member.person?.name || member.name
  const photoUrl = member.person?.photo_url
  const totalPaid = payments.reduce((sum: number, p: LibraryPayment) => sum + (p.amount || 0), 0)
  const totalHoursUsed = member.hours_used || 0
  const hoursRemaining = member.hours_balance || 0
  const statusConfig = LIBRARY_MEMBER_STATUS_CONFIG[member.status as keyof typeof LIBRARY_MEMBER_STATUS_CONFIG]

  // Per-day hours model: daily allowance from active membership
  const activeMembership = memberships.find((m: LibraryMembership) => m.status === "active")
  const dailyAllowance = activeMembership?.hours_included || null
  const todayUsed = dailyAllowance ? Math.max(0, dailyAllowance - hoursRemaining) : 0

  // Contact info (live person data with fallback)
  const memberPhone = member.person?.phone || member.phone
  const memberEmail = member.person?.email || member.email

  // Overdue info
  const overdueInfo = computeOverdueInfo(member.expiry_date)

  // Profile completeness
  const missingFields = getMissingFields(member)

  // Person data
  const person = member.person
  const emergencyContacts = person?.emergency_contacts || []
  const phoneNumbers = person?.phone_numbers || []
  const idDocuments = person?.id_documents || []
  const permanentAddress = formatAddress(person?.permanent_address ?? null, person?.permanent_city ?? null, person?.permanent_state ?? null, person?.permanent_pincode ?? null)
  const currentAddress = formatAddress(person?.current_address ?? null, person?.current_city ?? null)

  // Balance due calculation per membership
  const getBalanceDue = (membership: LibraryMembership): number => {
    const membershipPayments = payments.filter((p: LibraryPayment) => p.membership_id === membership.id)
    const paid = membershipPayments.reduce((sum: number, p: LibraryPayment) => sum + (p.amount || 0), 0)
    return Math.max(0, membership.final_amount - paid)
  }

  // Total balance due across active memberships
  const totalBalanceDue = memberships
    .filter((m: LibraryMembership) => m.status === "active")
    .reduce((sum: number, m: LibraryMembership) => sum + getBalanceDue(m), 0)

  return (
    <div className="space-y-6">
      {/* Profile Completeness Banner */}
      {missingFields.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-warning">Incomplete Profile</p>
            <p className="text-xs text-warning/80">Missing: {missingFields.join(", ")}</p>
          </div>
          <Link href={`/library-members/${member.id}/edit`}>
            <Button variant="outline" size="sm" className="text-xs">Complete</Button>
          </Link>
        </div>
      )}

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
        backHref={backHref}
        backLabel={backLabel}
        breadcrumbs={[
          { label: "Library Members", href: "/library-members" },
          { label: displayName || "Details" },
        ]}
        status={statusConfig?.variant || "muted"}
        avatar={
          <Avatar name={displayName} src={photoUrl} size="xl" />
        }
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {/* Quick Actions: Call, WhatsApp, Email */}
            {memberPhone && (
              <a href={`tel:${memberPhone}`}>
                <Button variant="outline" size="icon" className="h-9 w-9" title="Call">
                  <Phone className="h-4 w-4" />
                </Button>
              </a>
            )}
            {memberPhone && (
              <a href={`https://wa.me/91${memberPhone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline" size="icon" className="h-9 w-9 text-green-600 hover:text-green-700" title="WhatsApp">
                  <MessageCircle className="h-4 w-4" />
                </Button>
              </a>
            )}
            {memberEmail && (
              <a href={`mailto:${memberEmail}`}>
                <Button variant="outline" size="icon" className="h-9 w-9" title="Email">
                  <Mail className="h-4 w-4" />
                </Button>
              </a>
            )}
            <Link href={`/library-attendance/new?member=${member.id}`}>
              <Button variant="outline" size="sm">
                <Clock className="mr-2 h-4 w-4" />
                Check In
              </Button>
            </Link>
            {!member.locker_id && (
              <Link href={`/library-members/${member.id}/assign-locker`}>
                <Button variant="outline" size="sm">
                  <Lock className="mr-2 h-4 w-4" />
                  Assign Locker
                </Button>
              </Link>
            )}
            {(member.status === "active" || member.status === "expired") && (
              <PermissionGate permission="library_members.edit" hide>
                <Link href={`/library-members/${member.id}/renew`}>
                  <Button variant="outline" size="sm" className="text-success border-success/30 hover:bg-success/10">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Renew
                  </Button>
                </Link>
              </PermissionGate>
            )}
            <PermissionGate permission="library_members.edit" hide>
              <Link href={`/library-members/${member.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </Link>
            </PermissionGate>
            <Link href={`/library-payments/new?member=${member.id}`}>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Add Payment
              </Button>
            </Link>
          </div>
        }
      />

      {/* Hours Balance Card — Per-Day Model */}
      <MemberHoursCard
        hoursUsed={totalHoursUsed}
        hoursRemaining={hoursRemaining}
        dailyAllowance={dailyAllowance}
        todayUsed={todayUsed}
        memberName={displayName}
      />

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InfoCard
          label="Total Paid"
          value={<Currency amount={totalPaid} />}
          icon={CreditCard}
          variant="default"
        />
        <InfoCard
          label="Balance Due"
          value={<Currency amount={totalBalanceDue} />}
          icon={CreditCard}
          variant={totalBalanceDue > 0 ? "error" : "default"}
        />
        <InfoCard
          label="Subscriptions"
          value={memberships.length}
          icon={RefreshCw}
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
        {/* Contact Information */}
        <DetailSection
          title="Contact Information"
          description="Personal and contact details"
          icon={Users}
        >
          <InfoRow label="Phone" value={memberPhone || "—"} icon={Phone} />
          <InfoRow label="Email" value={memberEmail || "—"} icon={Mail} />
          <InfoRow label="Join Date" value={formatDate(member.join_date)} icon={Calendar} />
          {member.expiry_date && (
            <InfoRow
              label="Expiry Date"
              value={
                <span className="flex items-center gap-2">
                  {formatDate(member.expiry_date)}
                  {overdueInfo && (
                    <StatusBadge
                      status={overdueInfo.variant}
                      label={overdueInfo.isOverdue ? `${overdueInfo.days}d overdue` : `${overdueInfo.days}d left`}
                      size="sm"
                    />
                  )}
                </span>
              }
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

        {/* Personal Details (from people table) */}
        {(person?.gender || person?.date_of_birth || person?.occupation || person?.blood_group) && (
          <DetailSection
            title="Personal Details"
            description="Demographics and personal info"
            icon={User}
          >
            {person?.gender && (
              <InfoRow label="Gender" value={person.gender.charAt(0).toUpperCase() + person.gender.slice(1)} icon={User} />
            )}
            {person?.date_of_birth && (
              <InfoRow label="Date of Birth" value={formatDate(person.date_of_birth)} icon={Calendar} />
            )}
            {person?.occupation && (
              <InfoRow label="Occupation" value={person.occupation} icon={Briefcase} />
            )}
            {person?.company_name && (
              <InfoRow label="Company" value={person.company_name} icon={Briefcase} />
            )}
            {person?.blood_group && (
              <InfoRow label="Blood Group" value={person.blood_group} icon={Droplets} />
            )}
          </DetailSection>
        )}

        {/* Address (from people table) */}
        {(permanentAddress || currentAddress) && (
          <DetailSection
            title="Address"
            description="Residential information"
            icon={MapPin}
          >
            {permanentAddress && (
              <InfoRow label="Permanent Address" value={permanentAddress} icon={MapPin} />
            )}
            {currentAddress && (
              <InfoRow label="Current Address" value={currentAddress} icon={MapPin} />
            )}
          </DetailSection>
        )}

        {/* Phone Numbers (from people table) */}
        {phoneNumbers.length > 0 && (
          <DetailSection
            title="Phone Numbers"
            description="All contact numbers"
            icon={Phone}
          >
            {phoneNumbers.map((pn: { number: string; type: string; is_whatsapp?: boolean }, idx: number) => (
              <div key={idx} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {pn.type?.charAt(0).toUpperCase() + pn.type?.slice(1) || "Phone"}
                  </span>
                  {pn.is_whatsapp && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-700 rounded font-medium">WA</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <a href={`tel:${pn.number}`} className="text-sm hover:underline">{pn.number}</a>
                  {pn.is_whatsapp && (
                    <a
                      href={`https://wa.me/91${pn.number.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-green-600 hover:text-green-700"
                      title="WhatsApp"
                    >
                      <MessageCircle className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </DetailSection>
        )}

        {/* Emergency Contacts (from people table) */}
        {emergencyContacts.length > 0 && (
          <DetailSection
            title="Emergency Contacts"
            description="Family and guardian contacts"
            icon={Heart}
          >
            {emergencyContacts.map((ec: { name: string; phone: string; relation: string }, idx: number) => (
              <div key={idx} className="flex items-center justify-between py-2">
                <div>
                  <p className="font-medium text-sm">{ec.name}</p>
                  <p className="text-xs text-muted-foreground">{ec.relation}</p>
                </div>
                <div className="flex items-center gap-2">
                  <a href={`tel:${ec.phone}`} className="text-sm hover:underline">{ec.phone}</a>
                  <a
                    href={`https://wa.me/91${ec.phone.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:text-green-700"
                    title="WhatsApp"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            ))}
          </DetailSection>
        )}

        {/* ID Proof */}
        {(member.id_proof_type || member.id_proof_number || idDocuments.length > 0) && (
          <DetailSection
            title="ID Proof"
            description="Identity verification"
            icon={Shield}
          >
            {member.id_proof_type && (
              <InfoRow label="ID Type" value={member.id_proof_type.replace("_", " ").toUpperCase()} icon={FileText} />
            )}
            {member.id_proof_number && (
              <InfoRow label="ID Number" value={member.id_proof_number} icon={FileText} />
            )}
            {idDocuments.map((doc: { type: string; number: string; verified?: boolean; expiry?: string }, idx: number) => (
              <InfoRow
                key={idx}
                label={doc.type?.replace("_", " ").toUpperCase() || "Document"}
                value={
                  <span className="flex items-center gap-2">
                    {doc.number}
                    {doc.verified && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-success/10 text-success rounded font-medium">Verified</span>
                    )}
                    {doc.expiry && (
                      <span className="text-xs text-muted-foreground">Exp: {formatDate(doc.expiry)}</span>
                    )}
                  </span>
                }
                icon={Shield}
              />
            ))}
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
            const balanceDue = getBalanceDue(membership)
            return (
              <Link href={`/library-subscriptions/${membership.id}`}>
                <div className="p-3 border rounded-lg mb-2 last:mb-0 hover:bg-muted/50 transition-colors cursor-pointer">
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
                        <span className="text-muted-foreground">Daily Allowance:</span>{" "}
                        {membership.hours_included}h/day
                        <span className="text-muted-foreground ml-2">({membership.hours_used?.toFixed(1) || 0}h used total)</span>
                      </div>
                    )}
                    {balanceDue > 0 && (
                      <div>
                        <span className="text-muted-foreground">Due:</span>{" "}
                        <span className="text-destructive font-medium"><Currency amount={balanceDue} /></span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
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
                <p className="font-semibold text-sm text-success">
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

        {/* QR Code for Check-in */}
        <MemberQRCode
          memberId={member.id}
          memberName={displayName}
          memberCode={member.member_code}
          libraryId={member.library_id}
          size={180}
        />

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
