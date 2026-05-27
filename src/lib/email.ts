/**
 * Email Sending Infrastructure
 *
 * Handles email transport via Resend. Template generation (subjects + bodies)
 * is centralized in @/lib/templates/email.ts, consumed here via
 * emailSubjects and emailBodyTemplates from @/lib/templates.
 *
 * Data type contracts live in ./email.types — re-exported below so existing
 * consumers importing from "@/lib/email" continue working unchanged.
 */

import { Resend } from "resend"
import { emailSubjects, emailBodyTemplates } from "@/lib/templates"
import { logger, extractErrorMeta } from "@/lib/logger"
import { CONTACT } from "@/lib/constants/contact"
import type {
  PaymentReminderData,
  OverdueAlertData,
  PaymentReceiptData,
  InvitationEmailData,
  EmailVerificationData,
  SendDailySummaryOptions,
  LibraryLowHoursData,
  LibraryExpiringMembershipData,
  LibraryRenewalReminderData,
  LibraryExpiredMembershipData,
  TenantWelcomeData,
  LibraryMemberWelcomeData,
  LibraryPaymentReceiptData,
  ComplaintResolvedData,
  RefundProcessedData,
  WaitlistSeatAvailableData,
  MonthlyAttendanceSummaryData,
} from "./email.types"

export type {
  PaymentReminderData,
  OverdueAlertData,
  PaymentReceiptData,
  InvitationEmailData,
  EmailVerificationData,
  SendDailySummaryOptions,
  LibraryLowHoursData,
  LibraryExpiringMembershipData,
  LibraryRenewalReminderData,
  LibraryExpiredMembershipData,
  TenantWelcomeData,
  LibraryMemberWelcomeData,
  LibraryPaymentReceiptData,
  ComplaintResolvedData,
  RefundProcessedData,
  WaitlistSeatAvailableData,
  MonthlyAttendanceSummaryData,
}

const emailLogger = logger.child("email")

// Lazy initialization of Resend client
let resend: Resend | null = null

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not configured")
    }
    resend = new Resend(apiKey)
  }
  return resend
}

// Default sender email (update after domain verification)
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || `${CONTACT.APP_NAME} <onboarding@resend.dev>`

export async function sendPaymentReminder(
  data: PaymentReminderData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.paymentReminder(data),
      html: emailBodyTemplates.paymentReminder(data),
    })

    if (error) {
      emailLogger.error("Failed to send payment reminder", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending payment reminder", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}

export async function sendOverdueAlert(
  data: OverdueAlertData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.overdueAlert(),
      html: emailBodyTemplates.overdueAlert(data),
    })

    if (error) {
      emailLogger.error("Failed to send overdue alert", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending overdue alert", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}

export async function sendPaymentReceipt(
  data: PaymentReceiptData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.paymentReceipt(data),
      html: emailBodyTemplates.paymentReceipt(data),
    })

    if (error) {
      emailLogger.error("Failed to send payment receipt", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending payment receipt", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}

export async function sendInvitationEmail(
  data: InvitationEmailData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.invitation(data),
      html: emailBodyTemplates.invitation(data),
    })

    if (error) {
      emailLogger.error("Failed to send invitation email", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending invitation email", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}

// Test email function for settings page
export async function sendTestEmail(
  to: string,
  ownerName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getResendClient()
    const { error } = await client.emails.send({
      from: FROM_EMAIL,
      to,
      subject: emailSubjects.testEmail(),
      html: emailBodyTemplates.testEmail({ ownerName }),
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// Email verification function
export async function sendVerificationEmail(
  data: EmailVerificationData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.emailVerification(),
      html: emailBodyTemplates.emailVerification(data),
    })

    if (error) {
      emailLogger.error("Failed to send verification email", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending verification email", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}

// Daily summary email for owners
export async function sendDailySummary(
  data: SendDailySummaryOptions
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.dailySummary(data),
      html: emailBodyTemplates.dailySummary(data),
    })

    if (error) {
      emailLogger.error("Failed to send daily summary", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending daily summary", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}

// ========== LIBRARY EMAIL FUNCTIONS ==========

// Low hours warning for library members
export async function sendLibraryLowHoursWarning(
  data: LibraryLowHoursData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.libraryLowHours(data),
      html: emailBodyTemplates.libraryLowHours(data),
    })

    if (error) {
      emailLogger.error("Failed to send low hours warning", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending low hours warning", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}

// Expiring membership notification for library members
export async function sendLibraryExpiringMembership(
  data: LibraryExpiringMembershipData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.libraryExpiringMembership(data),
      html: emailBodyTemplates.libraryExpiringMembership(data),
    })

    if (error) {
      emailLogger.error("Failed to send expiring membership notification", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending expiring membership notification", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}

// Expired membership notification for library members
export async function sendLibraryExpiredMembership(
  data: LibraryExpiredMembershipData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.libraryExpiredMembership(data),
      html: emailBodyTemplates.libraryExpiredMembership(data),
    })

    if (error) {
      emailLogger.error("Failed to send expired membership notification", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending expired membership notification", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}

// ========== WELCOME EMAIL FUNCTIONS ==========

// Welcome email for new tenants
export async function sendTenantWelcomeEmail(
  data: TenantWelcomeData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.tenantWelcome(data),
      html: emailBodyTemplates.tenantWelcome(data),
    })

    if (error) {
      emailLogger.error("Failed to send tenant welcome email", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending tenant welcome email", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}

// Welcome email for new library members
export async function sendLibraryMemberWelcomeEmail(
  data: LibraryMemberWelcomeData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.libraryMemberWelcome(data),
      html: emailBodyTemplates.libraryMemberWelcome(data),
    })

    if (error) {
      emailLogger.error("Failed to send library member welcome email", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending library member welcome email", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}

// Renewal reminder for library members (sent 3 days before expiry)
export async function sendLibraryRenewalReminder(
  data: LibraryRenewalReminderData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.libraryRenewalReminder(data),
      html: emailBodyTemplates.libraryRenewalReminder(data),
    })

    if (error) {
      emailLogger.error("Failed to send renewal reminder", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending renewal reminder", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}

// ========== NEW NOTIFICATION EMAIL FUNCTIONS ==========

// Library payment receipt email
export async function sendLibraryPaymentReceiptEmail(
  data: LibraryPaymentReceiptData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.libraryPaymentReceipt(data),
      html: emailBodyTemplates.libraryPaymentReceipt(data),
    })

    if (error) {
      emailLogger.error("Failed to send library payment receipt", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending library payment receipt", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}

// Complaint resolved email
export async function sendComplaintResolvedEmail(
  data: ComplaintResolvedData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.complaintResolved(data),
      html: emailBodyTemplates.complaintResolved(data),
    })

    if (error) {
      emailLogger.error("Failed to send complaint resolved email", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending complaint resolved email", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}

// Refund processed email
export async function sendRefundProcessedEmail(
  data: RefundProcessedData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.refundProcessed(data),
      html: emailBodyTemplates.refundProcessed(data),
    })

    if (error) {
      emailLogger.error("Failed to send refund processed email", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending refund processed email", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}

// Waitlist seat available email
export async function sendWaitlistSeatAvailableEmail(
  data: WaitlistSeatAvailableData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.waitlistSeatAvailable(data),
      html: emailBodyTemplates.waitlistSeatAvailable(data),
    })

    if (error) {
      emailLogger.error("Failed to send waitlist seat available email", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending waitlist seat available email", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}

// Cron job failure alert email (to platform admin)
export async function sendCronFailureAlert(data: {
  cronName: string
  error: string
  timestamp: string
}): Promise<{ success: boolean; error?: string }> {
  try {
    const client = getResendClient()
    const { error: sendError } = await client.emails.send({
      from: FROM_EMAIL,
      to: "sethrajat0711@gmail.com",
      subject: `[ManageKar] Cron job failed: ${data.cronName}`,
      html: `
        <h2 style="color:#dc2626">Cron Job Failure Alert</h2>
        <p><strong>Job:</strong> ${data.cronName}</p>
        <p><strong>Time:</strong> ${data.timestamp}</p>
        <p><strong>Error:</strong> <code style="background:#f3f4f6;padding:4px 8px;border-radius:4px">${data.error}</code></p>
        <p style="color:#6b7280;font-size:12px">ManageKar — automated alert</p>
      `,
    })
    if (sendError) return { success: false, error: sendError.message }
    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

// Monthly attendance summary email
export async function sendMonthlyAttendanceSummary(
  data: MonthlyAttendanceSummaryData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: emailSubjects.monthlyAttendanceSummary(data),
      html: emailBodyTemplates.monthlyAttendanceSummary(data),
    })

    if (error) {
      emailLogger.error("Failed to send monthly attendance summary", extractErrorMeta(error))
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    emailLogger.error("Error sending monthly attendance summary", extractErrorMeta(err))
    return { success: false, error: String(err) }
  }
}
