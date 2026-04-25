/**
 * Email Templates
 *
 * Centralized email subject and HTML body template functions.
 * The sending infrastructure (Resend client, transport) remains in @/lib/email.ts.
 * This module only contains template text generation.
 *
 * @example
 * import { emailSubjects, emailBodyTemplates } from "@/lib/templates"
 *
 * const subject = emailSubjects.paymentReminder({ propertyName: "Sunshine PG" })
 * const html = emailBodyTemplates.paymentReminder(data)
 */

import { formatCurrency } from "@/lib/format"
import { PAYMENT_METHODS } from "@/lib/status"
import { getEntityName } from "@/lib/entity-names"
import { CONTACT } from "@/lib/constants/contact"

// ============================================================================
// HELPERS
// ============================================================================

/** Format date with full month name (for emails) */
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

/** Base email wrapper - standard app email chrome */
function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${CONTACT.APP_NAME}</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #14B8A6, #10B981); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">${CONTACT.APP_NAME}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Smart PG Management</p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      ${content}
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0;">Sent via ${CONTACT.APP_NAME} - Smart PG Management Software</p>
      <p style="margin: 8px 0 0 0;">
        <a href="${CONTACT.APP_URL}" style="color: #10B981; text-decoration: none;">managekar.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}

// ============================================================================
// EMAIL SUBJECTS
// ============================================================================

export const emailSubjects = {
  paymentReminder: (data: { propertyName: string }): string =>
    `Rent Reminder - ${data.propertyName}`,

  overdueAlert: (): string =>
    `Payment Overdue - Action Required`,

  paymentReceipt: (data: { receiptNumber: string }): string =>
    `Payment Receipt - ${data.receiptNumber}`,

  invitation: (data: { workspaceName: string; contextType: string }): string => {
    const roleLabel = getEntityName(data.contextType || "tenant")
    return `You're invited to join ${data.workspaceName} as ${roleLabel} - ${CONTACT.APP_NAME}`
  },

  testEmail: (): string =>
    `${CONTACT.APP_NAME} - Test Email`,

  emailVerification: (): string =>
    `Verify your email - ${CONTACT.APP_NAME}`,

  dailySummary: (data: { date: Date; businessName?: string }): string => {
    const dateStr = data.date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    return `Daily Summary for ${dateStr} - ${data.businessName || CONTACT.APP_NAME}`
  },

  libraryLowHours: (data: { libraryName: string }): string =>
    `Low Hours Alert - ${data.libraryName}`,

  libraryRenewalReminder: (data: { libraryName: string }): string =>
    `Renewal Reminder - ${data.libraryName}`,

  libraryExpiringMembership: (data: { libraryName: string }): string =>
    `Membership Expiring Soon - ${data.libraryName}`,

  libraryExpiredMembership: (data: { libraryName: string }): string =>
    `Membership Expired - ${data.libraryName}`,

  tenantWelcome: (data: { propertyName: string }): string =>
    `Welcome to ${data.propertyName}!`,

  libraryMemberWelcome: (data: { libraryName: string }): string =>
    `Welcome to ${data.libraryName}!`,

  libraryPaymentReceipt: (data: { receiptNumber: string; libraryName: string }): string =>
    `Payment Receipt ${data.receiptNumber} - ${data.libraryName}`,

  complaintResolved: (data: { complaintTitle: string }): string =>
    `Complaint Resolved - ${data.complaintTitle}`,

  refundProcessed: (data: { amount: number }): string =>
    `Refund of ${formatCurrency(data.amount)} Processed`,

  waitlistSeatAvailable: (data: { libraryName: string }): string =>
    `Seat Available - ${data.libraryName}`,

  monthlyAttendanceSummary: (data: { month: string; year: number; libraryName: string }): string =>
    `${data.month} ${data.year} Attendance Summary - ${data.libraryName}`,
}

// ============================================================================
// EMAIL BODY TEMPLATES
// ============================================================================

// Import types locally to avoid circular — body templates use the same data shapes

interface PaymentReminderBody {
  tenantName: string
  amount: number
  propertyName: string
  roomNumber: string
  dueDate: Date
  ownerName: string
  ownerPhone?: string
}

interface OverdueAlertBody {
  tenantName: string
  amount: number
  totalDue: number
  propertyName: string
  roomNumber: string
  dueDate: Date
  daysOverdue: number
  ownerName: string
  ownerPhone?: string
}

interface PaymentReceiptBody {
  tenantName: string
  amount: number
  receiptNumber: string
  propertyName: string
  roomNumber: string
  paymentDate: Date
  paymentMethod: string
  forPeriod?: string
  ownerName: string
}

interface InvitationEmailBody {
  inviteeName: string
  inviterName: string
  workspaceName: string
  contextType: "staff" | "tenant"
  roleName?: string
  message?: string
  signupUrl: string
}

interface EmailVerificationBody {
  userName: string
  email: string
  verificationUrl: string
  expiresInMinutes: number
}

interface DailySummaryBody {
  ownerName: string
  businessName?: string
  date: Date
  paymentsReceived: number
  paymentsCount: number
  expensesTotal: number
  expensesCount: number
  pendingDues: number
  pendingCount: number
  occupancyRate: number
  newTenants: number
  exits: number
  openComplaints: number
  whatsappMessage: string
}

interface TestEmailBody {
  ownerName: string
}

interface LibraryRenewalReminderBody {
  memberName: string
  memberCode?: string
  libraryName: string
  expiryDate: Date
  daysRemaining: number
  planName: string
  hoursRemaining: number
  ownerPhone?: string
}

interface LibraryLowHoursBody {
  memberName: string
  memberCode?: string
  libraryName: string
  hoursRemaining: number
  totalHours: number
  timeSlot?: string
  ownerPhone?: string
}

interface LibraryExpiringMembershipBody {
  memberName: string
  memberCode?: string
  libraryName: string
  expiryDate: Date
  daysRemaining: number
  planName: string
  hoursRemaining: number
  timeSlot?: string
  ownerPhone?: string
}

interface LibraryExpiredMembershipBody {
  memberName: string
  memberCode?: string
  libraryName: string
  expiryDate: Date
  planName: string
  hoursRemaining: number
  ownerPhone?: string
}

interface TenantWelcomeBody {
  tenantName: string
  propertyName: string
  roomNumber: string
  moveInDate: Date
  monthlyRent: number
  ownerName: string
  ownerPhone?: string
}

interface LibraryMemberWelcomeBody {
  memberName: string
  libraryName: string
  memberCode: string
  planName?: string
  hoursIncluded?: number
  seatNumber?: string
  timeSlot?: string
  ownerPhone?: string
}

interface LibraryPaymentReceiptBody {
  memberName: string
  libraryName: string
  amount: number
  paymentMethod: string
  paymentType: string
  receiptNumber: string
  paymentDate: Date
  ownerPhone?: string
}

interface ComplaintResolvedBody {
  recipientName: string
  complaintTitle: string
  category: string
  resolutionNotes: string | null
  resolvedDate: Date
  propertyName?: string
  ownerPhone?: string
}

interface RefundProcessedBody {
  tenantName: string
  amount: number
  refundType: string
  paymentMode: string
  reason: string | null
  referenceNumber: string | null
  refundDate: Date
  propertyName?: string
  ownerName: string
  ownerPhone?: string
}

interface WaitlistSeatAvailableBody {
  personName: string
  libraryName: string
  queuePosition: number
  ownerPhone?: string
}

interface MonthlyAttendanceSummaryBody {
  memberName: string
  libraryName: string
  memberCode?: string
  month: string
  year: number
  totalDaysAttended: number
  totalHours: number
  averageHoursPerDay: number
  hoursRemaining: number
  ownerPhone?: string
}

export const emailBodyTemplates = {
  // ---- PG Module Templates ----

  paymentReminder: (data: PaymentReminderBody): string => {
    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #FEF3C7; color: #D97706; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        Payment Reminder
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">
      Hi ${data.tenantName},
    </h2>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      This is a friendly reminder that your rent payment is due soon.
    </p>

    <!-- Payment Details Card -->
    <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Property</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.propertyName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Room</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.roomNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Due Date</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${formatDate(data.dueDate)}</td>
        </tr>
        <tr style="border-top: 1px solid #E5E7EB;">
          <td style="padding: 16px 0 8px 0; color: #6B7280; font-size: 14px;">Amount Due</td>
          <td style="padding: 16px 0 8px 0; color: #10B981; font-weight: bold; font-size: 24px; text-align: right;">${formatCurrency(data.amount)}</td>
        </tr>
      </table>
    </div>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Please make the payment at your earliest convenience to avoid any late fees.
    </p>

    ${data.ownerPhone ? `
    <p style="color: #6B7280; font-size: 14px; margin: 0;">
      For any queries, contact: <strong>${data.ownerPhone}</strong>
    </p>
    ` : ""}

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        Thank you,<br>
        <strong style="color: #111827;">${data.ownerName}</strong>
      </p>
    </div>
  `

    return emailWrapper(content)
  },

  overdueAlert: (data: OverdueAlertBody): string => {
    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #FEE2E2; color: #DC2626; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        Payment Overdue
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">
      Hi ${data.tenantName},
    </h2>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Your payment is <strong style="color: #DC2626;">${data.daysOverdue} days overdue</strong>. Please clear your dues at the earliest.
    </p>

    <!-- Payment Details Card -->
    <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Property</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.propertyName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Room</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.roomNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Due Date</td>
          <td style="padding: 8px 0; color: #DC2626; font-weight: 500; text-align: right;">${formatDate(data.dueDate)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Original Amount</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${formatCurrency(data.amount)}</td>
        </tr>
        <tr style="border-top: 1px solid #FECACA;">
          <td style="padding: 16px 0 8px 0; color: #6B7280; font-size: 14px;">Total Outstanding</td>
          <td style="padding: 16px 0 8px 0; color: #DC2626; font-weight: bold; font-size: 24px; text-align: right;">${formatCurrency(data.totalDue)}</td>
        </tr>
      </table>
    </div>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Please make the payment immediately to avoid any inconvenience. Late payments may attract additional charges.
    </p>

    ${data.ownerPhone ? `
    <p style="color: #6B7280; font-size: 14px; margin: 0;">
      For any queries or payment arrangements, contact: <strong>${data.ownerPhone}</strong>
    </p>
    ` : ""}

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        Thank you,<br>
        <strong style="color: #111827;">${data.ownerName}</strong>
      </p>
    </div>
  `

    return emailWrapper(content)
  },

  paymentReceipt: (data: PaymentReceiptBody): string => {
    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #D1FAE5; color: #059669; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        Payment Received
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">
      Hi ${data.tenantName},
    </h2>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Thank you! Your payment has been received successfully.
    </p>

    <!-- Receipt Card -->
    <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <div style="text-align: center; margin-bottom: 16px;">
        <p style="color: #6B7280; font-size: 12px; margin: 0;">Receipt Number</p>
        <p style="color: #111827; font-size: 18px; font-weight: bold; margin: 4px 0 0 0;">${data.receiptNumber}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Property</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.propertyName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Room</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.roomNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Payment Date</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${formatDate(data.paymentDate)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Payment Method</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${PAYMENT_METHODS[data.paymentMethod] || data.paymentMethod}</td>
        </tr>
        ${data.forPeriod ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">For Period</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.forPeriod}</td>
        </tr>
        ` : ""}
        <tr style="border-top: 1px solid #BBF7D0;">
          <td style="padding: 16px 0 8px 0; color: #6B7280; font-size: 14px;">Amount Paid</td>
          <td style="padding: 16px 0 8px 0; color: #059669; font-weight: bold; font-size: 24px; text-align: right;">${formatCurrency(data.amount)}</td>
        </tr>
      </table>
    </div>

    <p style="color: #6B7280; font-size: 14px; text-align: center; margin: 0;">
      This is an auto-generated receipt. Please keep it for your records.
    </p>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        Thank you,<br>
        <strong style="color: #111827;">${data.ownerName}</strong>
      </p>
    </div>
  `

    return emailWrapper(content)
  },

  invitation: (data: InvitationEmailBody): string => {
    const roleLabels: Record<string, string> = {
      staff: getEntityName("staff"),
      tenant: getEntityName("tenant"),
    }

    const roleDescriptions: Record<string, string> = {
      staff: `As a staff member, you'll be able to help manage the property through the ${CONTACT.APP_NAME} dashboard.`,
      tenant: "As a tenant, you'll have access to your personal portal where you can view your bills, payments, submit complaints, and more.",
    }

    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #DBEAFE; color: #2563EB; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        You're Invited!
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">
      Hi ${data.inviteeName},
    </h2>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      <strong style="color: #111827;">${data.inviterName}</strong> has invited you to join
      <strong style="color: #10B981;">${data.workspaceName}</strong> as a <strong>${roleLabels[data.contextType] || data.contextType}</strong>.
    </p>

    <!-- Invitation Details Card -->
    <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Property</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.workspaceName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Your Role</td>
          <td style="padding: 8px 0; color: #2563EB; font-weight: 500; text-align: right;">${roleLabels[data.contextType] || data.contextType}</td>
        </tr>
        ${data.roleName ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Position</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.roleName}</td>
        </tr>
        ` : ""}
      </table>
    </div>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      ${roleDescriptions[data.contextType] || ""}
    </p>

    ${data.message ? `
    <div style="background: #F9FAFB; border-left: 4px solid #10B981; padding: 16px; margin-bottom: 24px;">
      <p style="color: #6B7280; font-size: 14px; margin: 0 0 8px 0;">Message from ${data.inviterName}:</p>
      <p style="color: #111827; margin: 0; font-style: italic;">"${data.message}"</p>
    </div>
    ` : ""}

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.signupUrl}" style="display: inline-block; background: linear-gradient(135deg, #14B8A6, #10B981); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Accept Invitation & Sign Up
      </a>
    </div>

    <p style="color: #9CA3AF; font-size: 13px; text-align: center; margin: 0 0 24px 0;">
      If the button doesn't work, copy and paste this link in your browser:<br>
      <a href="${data.signupUrl}" style="color: #10B981; word-break: break-all;">${data.signupUrl}</a>
    </p>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        If you didn't expect this invitation, you can safely ignore this email.
      </p>
    </div>
  `

    return emailWrapper(content)
  },

  emailVerification: (data: EmailVerificationBody): string => {
    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #DBEAFE; color: #2563EB; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        Verify Your Email
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">
      Hi ${data.userName},
    </h2>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Please verify your email address to complete your ${CONTACT.APP_NAME} account setup and access all features.
    </p>

    <!-- Verification Card -->
    <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="color: #6B7280; font-size: 14px; margin: 0 0 8px 0;">Email to verify:</p>
      <p style="color: #111827; font-size: 18px; font-weight: bold; margin: 0;">${data.email}</p>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin: 32px 0;">
      <a href="${data.verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #14B8A6, #10B981); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Verify Email Address
      </a>
    </div>

    <p style="color: #9CA3AF; font-size: 13px; text-align: center; margin: 0 0 24px 0;">
      If the button doesn't work, copy and paste this link in your browser:<br>
      <a href="${data.verificationUrl}" style="color: #10B981; word-break: break-all;">${data.verificationUrl}</a>
    </p>

    <div style="background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="color: #92400E; font-size: 14px; margin: 0;">
        <strong>This link expires in ${data.expiresInMinutes} minutes.</strong><br>
        If you didn't request this verification, you can safely ignore this email.
      </p>
    </div>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        Thank you for using ${CONTACT.APP_NAME}!
      </p>
    </div>
  `

    return emailWrapper(content)
  },

  testEmail: (data: TestEmailBody): string => {
    return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #14B8A6, #10B981); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${CONTACT.APP_NAME}</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
            <h2 style="color: #111827; margin-top: 0;">Test Email Successful!</h2>
            <p style="color: #6b7280; line-height: 1.6;">
              Hi ${data.ownerName},<br><br>
              This is a test email from ${CONTACT.APP_NAME} to confirm your email notification settings are working correctly.
            </p>
            <p style="color: #6b7280; line-height: 1.6;">
              You will receive payment reminders and alerts at this email address when enabled.
            </p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This email was sent from ${CONTACT.APP_NAME} - Smart PG Management Software
              </p>
            </div>
          </div>
        </div>
      `
  },

  dailySummary: (data: DailySummaryBody): string => {
    const dateStr = formatDate(data.date)
    const net = data.paymentsReceived - data.expensesTotal
    const netColor = net >= 0 ? "#059669" : "#DC2626"
    const netPrefix = net >= 0 ? "+" : ""

    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #DBEAFE; color: #2563EB; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        Daily Summary
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 8px 0; font-size: 22px;">
      Hi ${data.ownerName},
    </h2>
    <p style="color: #6B7280; margin: 0 0 24px 0; font-size: 14px;">
      Here's your daily summary for <strong>${dateStr}</strong>
    </p>

    <!-- Summary Cards -->
    <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #6B7280; font-size: 14px;">💰 Payments Received</span>
        <span style="color: #059669; font-weight: bold; font-size: 18px;">${formatCurrency(data.paymentsReceived)}</span>
      </div>
      <p style="color: #9CA3AF; font-size: 12px; margin: 4px 0 0 0;">${data.paymentsCount} payment${data.paymentsCount !== 1 ? "s" : ""}</p>
    </div>

    <div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #6B7280; font-size: 14px;">📉 Expenses</span>
        <span style="color: #DC2626; font-weight: bold; font-size: 18px;">${formatCurrency(data.expensesTotal)}</span>
      </div>
      <p style="color: #9CA3AF; font-size: 12px; margin: 4px 0 0 0;">${data.expensesCount} expense${data.expensesCount !== 1 ? "s" : ""}</p>
    </div>

    <div style="background: #F3F4F6; border: 1px solid #D1D5DB; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #6B7280; font-size: 14px;">📈 Net</span>
        <span style="color: ${netColor}; font-weight: bold; font-size: 20px;">${netPrefix}${formatCurrency(net)}</span>
      </div>
    </div>

    <!-- Status Section -->
    <h3 style="color: #111827; margin: 0 0 12px 0; font-size: 16px; border-top: 1px solid #E5E7EB; padding-top: 16px;">Current Status</h3>

    <table style="width: 100%; border-collapse: collapse;">
      <tr>
        <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">🏠 Occupancy Rate</td>
        <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.occupancyRate}%</td>
      </tr>
      <tr>
        <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">⏰ Pending Dues</td>
        <td style="padding: 8px 0; color: ${data.pendingDues > 0 ? "#DC2626" : "#059669"}; font-weight: 500; text-align: right;">${formatCurrency(data.pendingDues)} (${data.pendingCount} bills)</td>
      </tr>
      ${data.openComplaints > 0 ? `
      <tr>
        <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">⚠️ Open Complaints</td>
        <td style="padding: 8px 0; color: #F59E0B; font-weight: 500; text-align: right;">${data.openComplaints}</td>
      </tr>
      ` : ""}
    </table>

    ${data.newTenants > 0 || data.exits > 0 ? `
    <!-- Activity Section -->
    <h3 style="color: #111827; margin: 16px 0 12px 0; font-size: 16px; border-top: 1px solid #E5E7EB; padding-top: 16px;">Activity</h3>
    <table style="width: 100%; border-collapse: collapse;">
      ${data.newTenants > 0 ? `
      <tr>
        <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">👥 New Tenants</td>
        <td style="padding: 8px 0; color: #059669; font-weight: 500; text-align: right;">+${data.newTenants}</td>
      </tr>
      ` : ""}
      ${data.exits > 0 ? `
      <tr>
        <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">👋 Exits</td>
        <td style="padding: 8px 0; color: #DC2626; font-weight: 500; text-align: right;">-${data.exits}</td>
      </tr>
      ` : ""}
    </table>
    ` : ""}

    <!-- WhatsApp Message Box -->
    <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 16px; margin-top: 24px;">
      <p style="color: #065F46; font-size: 14px; font-weight: 600; margin: 0 0 8px 0;">📱 Share via WhatsApp</p>
      <p style="color: #6B7280; font-size: 12px; margin: 0 0 12px 0;">Copy the message below to share with your contacts:</p>
      <div style="background: white; border: 1px solid #D1FAE5; border-radius: 6px; padding: 12px; font-family: monospace; font-size: 12px; white-space: pre-wrap; color: #374151;">${data.whatsappMessage}</div>
    </div>

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        Stay on top of your PG business!<br>
        <strong style="color: #111827;">${CONTACT.APP_NAME}</strong>
      </p>
    </div>
  `

    return emailWrapper(content)
  },

  // ---- Library Module Templates ----

  libraryLowHours: (data: LibraryLowHoursBody): string => {
    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #FEF3C7; color: #D97706; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        Low Hours Warning
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">
      Hi ${data.memberName},
    </h2>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Your study hours balance at <strong style="color: #10B981;">${data.libraryName}</strong> is running low.
    </p>

    <!-- Hours Balance Card -->
    <div style="background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="color: #92400E; font-size: 14px; margin: 0 0 8px 0;">Remaining Hours</p>
      <p style="color: #D97706; font-size: 36px; font-weight: bold; margin: 0;">${data.hoursRemaining.toFixed(1)}h</p>
      <p style="color: #B45309; font-size: 14px; margin: 8px 0 0 0;">out of ${data.totalHours}h purchased</p>
    </div>

    ${data.memberCode ? `
    <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Member Code</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right; font-family: monospace;">${data.memberCode}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Time Slot</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.timeSlot || "Any"}</td>
        </tr>
      </table>
    </div>
    ` : ""}

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      To continue uninterrupted access to the library, please renew your subscription or purchase additional hours.
    </p>

    ${data.ownerPhone ? `
    <p style="color: #6B7280; font-size: 14px; margin: 0;">
      Contact library: <strong>${data.ownerPhone}</strong>
    </p>
    ` : ""}

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        Thank you for being a valued member,<br>
        <strong style="color: #111827;">${data.libraryName}</strong>
      </p>
    </div>
  `

    return emailWrapper(content)
  },

  libraryRenewalReminder: (data: LibraryRenewalReminderBody): string => {
    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #DBEAFE; color: #1D4ED8; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        Renewal Reminder
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">
      Hi ${data.memberName},
    </h2>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Your membership at <strong style="color: #10B981;">${data.libraryName}</strong> will expire in <strong>${data.daysRemaining} days</strong>. Renew now to continue uninterrupted access.
    </p>

    <!-- Expiry Card -->
    <div style="background: #DBEAFE; border: 1px solid #93C5FD; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="color: #1D4ED8; font-size: 14px; margin: 0 0 8px 0;">Expiry Date</p>
      <p style="color: #1E40AF; font-size: 28px; font-weight: bold; margin: 0;">${formatDate(data.expiryDate)}</p>
      <p style="color: #2563EB; font-size: 16px; font-weight: 600; margin: 8px 0 0 0;">${data.daysRemaining} days remaining</p>
    </div>

    <!-- Membership Details -->
    <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        ${data.memberCode ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Member Code</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right; font-family: monospace;">${data.memberCode}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Current Plan</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.planName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Hours Remaining</td>
          <td style="padding: 8px 0; color: #10B981; font-weight: 500; text-align: right;">${data.hoursRemaining.toFixed(1)}h</td>
        </tr>
      </table>
    </div>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Visit the library to renew your subscription. Early renewal ensures you keep your current seat and time slot.
    </p>

    ${data.ownerPhone ? `
    <p style="color: #6B7280; font-size: 14px; margin: 0;">
      Contact library for renewal: <strong>${data.ownerPhone}</strong>
    </p>
    ` : ""}

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        Thank you for being a valued member,<br>
        <strong style="color: #111827;">${data.libraryName}</strong>
      </p>
    </div>
  `

    return emailWrapper(content)
  },

  libraryExpiringMembership: (data: LibraryExpiringMembershipBody): string => {
    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #FED7AA; color: #C2410C; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        Membership Expiring Soon
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">
      Hi ${data.memberName},
    </h2>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Your membership at <strong style="color: #10B981;">${data.libraryName}</strong> will expire soon.
    </p>

    <!-- Expiry Card -->
    <div style="background: #FED7AA; border: 1px solid #FDBA74; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="color: #C2410C; font-size: 14px; margin: 0 0 8px 0;">Expiry Date</p>
      <p style="color: #9A3412; font-size: 28px; font-weight: bold; margin: 0;">${formatDate(data.expiryDate)}</p>
      <p style="color: #EA580C; font-size: 16px; font-weight: 600; margin: 8px 0 0 0;">${data.daysRemaining} days remaining</p>
    </div>

    <!-- Membership Details -->
    <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        ${data.memberCode ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Member Code</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right; font-family: monospace;">${data.memberCode}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Plan</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.planName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Hours Remaining</td>
          <td style="padding: 8px 0; color: #10B981; font-weight: 500; text-align: right;">${data.hoursRemaining.toFixed(1)}h</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Time Slot</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.timeSlot || "Any"}</td>
        </tr>
      </table>
    </div>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Renew your membership to continue enjoying uninterrupted access to the library. Early renewal helps secure your preferred seat and time slot.
    </p>

    ${data.ownerPhone ? `
    <p style="color: #6B7280; font-size: 14px; margin: 0;">
      Contact library for renewal: <strong>${data.ownerPhone}</strong>
    </p>
    ` : ""}

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        Thank you for being a valued member,<br>
        <strong style="color: #111827;">${data.libraryName}</strong>
      </p>
    </div>
  `

    return emailWrapper(content)
  },

  libraryExpiredMembership: (data: LibraryExpiredMembershipBody): string => {
    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #FEE2E2; color: #DC2626; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        Membership Expired
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">
      Hi ${data.memberName},
    </h2>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Your membership at <strong style="color: #10B981;">${data.libraryName}</strong> has expired.
    </p>

    <!-- Expired Card -->
    <div style="background: #FEE2E2; border: 1px solid #FECACA; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="color: #DC2626; font-size: 14px; margin: 0 0 8px 0;">Expired On</p>
      <p style="color: #B91C1C; font-size: 28px; font-weight: bold; margin: 0;">${formatDate(data.expiryDate)}</p>
    </div>

    <!-- Membership Details -->
    <div style="background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        ${data.memberCode ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Member Code</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right; font-family: monospace;">${data.memberCode}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Plan</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.planName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Unused Hours</td>
          <td style="padding: 8px 0; color: #DC2626; font-weight: 500; text-align: right;">${data.hoursRemaining.toFixed(1)}h</td>
        </tr>
      </table>
    </div>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      You will not be able to check in until you renew your membership. Contact the library to renew and continue your studies.
    </p>

    ${data.ownerPhone ? `
    <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
      <p style="color: #065F46; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">Ready to Renew?</p>
      <p style="color: #6B7280; font-size: 14px; margin: 0;">
        Call: <strong style="color: #10B981;">${data.ownerPhone}</strong>
      </p>
    </div>
    ` : ""}

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        We hope to see you back soon!<br>
        <strong style="color: #111827;">${data.libraryName}</strong>
      </p>
    </div>
  `

    return emailWrapper(content)
  },

  // ---- Welcome Email Templates ----

  tenantWelcome: (data: TenantWelcomeBody): string => {
    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #D1FAE5; color: #059669; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        Welcome!
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">
      Hi ${data.tenantName},
    </h2>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Welcome to <strong style="color: #10B981;">${data.propertyName}</strong>! We are glad to have you as a tenant.
    </p>

    <!-- Details Card -->
    <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Property</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.propertyName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Room</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.roomNumber}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Move-in Date</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${formatDate(data.moveInDate)}</td>
        </tr>
        <tr style="border-top: 1px solid #BBF7D0;">
          <td style="padding: 16px 0 8px 0; color: #6B7280; font-size: 14px;">Monthly Rent</td>
          <td style="padding: 16px 0 8px 0; color: #059669; font-weight: bold; font-size: 24px; text-align: right;">${formatCurrency(data.monthlyRent)}</td>
        </tr>
      </table>
    </div>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      You can access your tenant portal at <a href="${CONTACT.APP_URL}/tenant" style="color: #10B981; text-decoration: none; font-weight: 500;">${CONTACT.APP_URL}/tenant</a> to view your bills, payments, submit complaints, and more.
    </p>

    ${data.ownerPhone ? `
    <p style="color: #6B7280; font-size: 14px; margin: 0 0 24px 0;">
      For any queries, contact: <strong>${data.ownerPhone}</strong>
    </p>
    ` : ""}

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        Thank you,<br>
        <strong style="color: #111827;">${data.ownerName}</strong>
      </p>
    </div>
  `

    return emailWrapper(content)
  },

  libraryMemberWelcome: (data: LibraryMemberWelcomeBody): string => {
    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #D1FAE5; color: #059669; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        Welcome!
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">
      Hi ${data.memberName},
    </h2>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Welcome to <strong style="color: #10B981;">${data.libraryName}</strong>! Your membership is now active.
    </p>

    <!-- Membership Details Card -->
    <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Member Code</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right; font-family: monospace;">${data.memberCode}</td>
        </tr>
        ${data.planName ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Plan</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.planName}</td>
        </tr>
        ` : ""}
        ${data.hoursIncluded ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Hours Included</td>
          <td style="padding: 8px 0; color: #10B981; font-weight: bold; text-align: right;">${data.hoursIncluded}h</td>
        </tr>
        ` : ""}
        ${data.seatNumber ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Seat</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.seatNumber}</td>
        </tr>
        ` : ""}
        ${data.timeSlot ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Time Slot</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.timeSlot}</td>
        </tr>
        ` : ""}
      </table>
    </div>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      You can access your member portal at <a href="${CONTACT.APP_URL}/member" style="color: #10B981; text-decoration: none; font-weight: 500;">${CONTACT.APP_URL}/member</a> to check your hours balance, attendance history, and more.
    </p>

    ${data.ownerPhone ? `
    <p style="color: #6B7280; font-size: 14px; margin: 0 0 24px 0;">
      For any queries, contact: <strong>${data.ownerPhone}</strong>
    </p>
    ` : ""}

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        Happy studying!<br>
        <strong style="color: #111827;">${data.libraryName}</strong>
      </p>
    </div>
  `

    return emailWrapper(content)
  },

  // ---- Library Payment Receipt ----

  libraryPaymentReceipt: (data: LibraryPaymentReceiptBody): string => {
    const paymentTypeLabels: Record<string, string> = {
      subscription: "Subscription",
      locker_rent: "Locker Rent",
      locker_deposit: "Locker Deposit",
      fine: "Fine",
      other: "Other",
    }

    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #D1FAE5; color: #059669; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        Payment Received
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">
      Hi ${data.memberName},
    </h2>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Thank you! Your payment to <strong style="color: #10B981;">${data.libraryName}</strong> has been received.
    </p>

    <!-- Receipt Card -->
    <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <div style="text-align: center; margin-bottom: 16px;">
        <p style="color: #6B7280; font-size: 12px; margin: 0;">Receipt Number</p>
        <p style="color: #111827; font-size: 18px; font-weight: bold; margin: 4px 0 0 0;">${data.receiptNumber}</p>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Payment Date</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${formatDate(data.paymentDate)}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Payment Type</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${paymentTypeLabels[data.paymentType] || data.paymentType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Payment Method</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${PAYMENT_METHODS[data.paymentMethod] || data.paymentMethod}</td>
        </tr>
        <tr style="border-top: 1px solid #BBF7D0;">
          <td style="padding: 16px 0 8px 0; color: #6B7280; font-size: 14px;">Amount Paid</td>
          <td style="padding: 16px 0 8px 0; color: #059669; font-weight: bold; font-size: 24px; text-align: right;">${formatCurrency(data.amount)}</td>
        </tr>
      </table>
    </div>

    <p style="color: #6B7280; font-size: 14px; text-align: center; margin: 0;">
      This is an auto-generated receipt. Please keep it for your records.
    </p>

    ${data.ownerPhone ? `
    <p style="color: #6B7280; font-size: 14px; margin: 24px 0 0 0;">
      Contact library: <strong>${data.ownerPhone}</strong>
    </p>
    ` : ""}

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        Thank you,<br>
        <strong style="color: #111827;">${data.libraryName}</strong>
      </p>
    </div>
  `

    return emailWrapper(content)
  },

  // ---- Complaint Resolved ----

  complaintResolved: (data: ComplaintResolvedBody): string => {
    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #D1FAE5; color: #059669; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        Complaint Resolved
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">
      Hi ${data.recipientName},
    </h2>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Your complaint has been resolved. Here are the details:
    </p>

    <!-- Complaint Details Card -->
    <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Complaint</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.complaintTitle}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Category</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.category}</td>
        </tr>
        ${data.propertyName ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Property</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.propertyName}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Resolved On</td>
          <td style="padding: 8px 0; color: #059669; font-weight: 500; text-align: right;">${formatDate(data.resolvedDate)}</td>
        </tr>
      </table>
    </div>

    ${data.resolutionNotes ? `
    <div style="background: #F9FAFB; border-left: 4px solid #10B981; padding: 16px; margin-bottom: 24px;">
      <p style="color: #6B7280; font-size: 14px; margin: 0 0 8px 0;">Resolution Notes:</p>
      <p style="color: #111827; margin: 0; white-space: pre-wrap;">${data.resolutionNotes}</p>
    </div>
    ` : ""}

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      If you have any further concerns, please do not hesitate to raise a new complaint.
    </p>

    ${data.ownerPhone ? `
    <p style="color: #6B7280; font-size: 14px; margin: 0;">
      For queries, contact: <strong>${data.ownerPhone}</strong>
    </p>
    ` : ""}

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        Thank you for your patience,<br>
        <strong style="color: #111827;">${CONTACT.APP_NAME}</strong>
      </p>
    </div>
  `

    return emailWrapper(content)
  },

  // ---- Refund Processed ----

  refundProcessed: (data: RefundProcessedBody): string => {
    const refundTypeLabels: Record<string, string> = {
      deposit_refund: "Security Deposit Refund",
      overpayment: "Overpayment Refund",
      adjustment: "Adjustment",
      security_deposit: "Security Deposit",
      advance_rent: "Advance Rent",
      other: "Other",
    }

    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #D1FAE5; color: #059669; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        Refund Processed
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">
      Hi ${data.tenantName},
    </h2>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      A refund has been processed for you. Here are the details:
    </p>

    <!-- Refund Details Card -->
    <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Refund Type</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${refundTypeLabels[data.refundType] || data.refundType}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Payment Mode</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${PAYMENT_METHODS[data.paymentMode] || data.paymentMode}</td>
        </tr>
        ${data.referenceNumber ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Reference No.</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right; font-family: monospace;">${data.referenceNumber}</td>
        </tr>
        ` : ""}
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Refund Date</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${formatDate(data.refundDate)}</td>
        </tr>
        ${data.propertyName ? `
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Property</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.propertyName}</td>
        </tr>
        ` : ""}
        <tr style="border-top: 1px solid #BBF7D0;">
          <td style="padding: 16px 0 8px 0; color: #6B7280; font-size: 14px;">Refund Amount</td>
          <td style="padding: 16px 0 8px 0; color: #059669; font-weight: bold; font-size: 24px; text-align: right;">${formatCurrency(data.amount)}</td>
        </tr>
      </table>
    </div>

    ${data.reason ? `
    <div style="background: #F9FAFB; border-left: 4px solid #10B981; padding: 16px; margin-bottom: 24px;">
      <p style="color: #6B7280; font-size: 14px; margin: 0 0 8px 0;">Reason:</p>
      <p style="color: #111827; margin: 0;">${data.reason}</p>
    </div>
    ` : ""}

    ${data.ownerPhone ? `
    <p style="color: #6B7280; font-size: 14px; margin: 0;">
      For queries, contact: <strong>${data.ownerPhone}</strong>
    </p>
    ` : ""}

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        Thank you,<br>
        <strong style="color: #111827;">${data.ownerName}</strong>
      </p>
    </div>
  `

    return emailWrapper(content)
  },

  // ---- Waitlist Seat Available ----

  waitlistSeatAvailable: (data: WaitlistSeatAvailableBody): string => {
    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #DBEAFE; color: #2563EB; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        Seat Available!
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">
      Hi ${data.personName},
    </h2>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Great news! A seat has become available at <strong style="color: #10B981;">${data.libraryName}</strong>.
    </p>

    <!-- Info Card -->
    <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <p style="color: #2563EB; font-size: 14px; margin: 0 0 8px 0;">Your Queue Position</p>
      <p style="color: #1D4ED8; font-size: 36px; font-weight: bold; margin: 0;">#${data.queuePosition}</p>
    </div>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Please contact the library as soon as possible to confirm your seat. Seats are allocated on a first-come, first-served basis.
    </p>

    ${data.ownerPhone ? `
    <div style="background: #ECFDF5; border: 1px solid #A7F3D0; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
      <p style="color: #065F46; font-size: 14px; font-weight: 600; margin: 0 0 4px 0;">Contact Library</p>
      <p style="color: #6B7280; font-size: 14px; margin: 0;">
        Call: <strong style="color: #10B981;">${data.ownerPhone}</strong>
      </p>
    </div>
    ` : ""}

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        We look forward to having you!<br>
        <strong style="color: #111827;">${data.libraryName}</strong>
      </p>
    </div>
  `

    return emailWrapper(content)
  },

  // ---- Monthly Attendance Summary ----

  monthlyAttendanceSummary: (data: MonthlyAttendanceSummaryBody): string => {
    const content = `
    <div style="text-align: center; margin-bottom: 24px;">
      <div style="display: inline-block; background: #DBEAFE; color: #2563EB; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 500;">
        Monthly Summary
      </div>
    </div>

    <h2 style="color: #111827; margin: 0 0 16px 0; font-size: 22px;">
      Hi ${data.memberName},
    </h2>

    <p style="color: #4B5563; line-height: 1.6; margin: 0 0 24px 0;">
      Here is your attendance summary for <strong>${data.month} ${data.year}</strong> at <strong style="color: #10B981;">${data.libraryName}</strong>.
    </p>

    <!-- Stats Cards -->
    <div style="background: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 20px; margin-bottom: 12px;">
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Days Attended</td>
          <td style="padding: 8px 0; color: #2563EB; font-weight: bold; font-size: 18px; text-align: right;">${data.totalDaysAttended}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Total Hours</td>
          <td style="padding: 8px 0; color: #2563EB; font-weight: bold; font-size: 18px; text-align: right;">${data.totalHours.toFixed(1)}h</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #6B7280; font-size: 14px;">Avg. Hours/Day</td>
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${data.averageHoursPerDay.toFixed(1)}h</td>
        </tr>
      </table>
    </div>

    <div style="background: ${data.hoursRemaining <= 2 ? "#FEF3C7" : "#F0FDF4"}; border: 1px solid ${data.hoursRemaining <= 2 ? "#FCD34D" : "#BBF7D0"}; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center;">
      <p style="color: #6B7280; font-size: 14px; margin: 0 0 4px 0;">Hours Remaining</p>
      <p style="color: ${data.hoursRemaining <= 2 ? "#D97706" : "#059669"}; font-size: 28px; font-weight: bold; margin: 0;">${data.hoursRemaining.toFixed(1)}h</p>
    </div>

    ${data.memberCode ? `
    <p style="color: #6B7280; font-size: 14px; margin: 0 0 24px 0;">
      Member Code: <strong style="font-family: monospace;">${data.memberCode}</strong>
    </p>
    ` : ""}

    ${data.ownerPhone ? `
    <p style="color: #6B7280; font-size: 14px; margin: 0;">
      Contact library: <strong>${data.ownerPhone}</strong>
    </p>
    ` : ""}

    <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #E5E7EB;">
      <p style="color: #6B7280; margin: 0; font-size: 14px;">
        Keep up the great work!<br>
        <strong style="color: #111827;">${data.libraryName}</strong>
      </p>
    </div>
  `

    return emailWrapper(content)
  },
}
