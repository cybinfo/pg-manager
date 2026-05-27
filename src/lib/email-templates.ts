/**
 * Email Templates (Backward Compatibility Shim)
 *
 * Template functions have been centralized in @/lib/templates/email.ts.
 * This file re-exports them under their original names for backward compat.
 *
 * New code should import from @/lib/templates directly:
 *   import { emailBodyTemplates } from "@/lib/templates"
 */

import { emailBodyTemplates } from "@/lib/templates"

import type {
  PaymentReminderData,
  OverdueAlertData,
  PaymentReceiptData,
  InvitationEmailData,
  EmailVerificationData,
  SendDailySummaryOptions,
  LibraryLowHoursData,
  LibraryExpiringMembershipData,
  LibraryExpiredMembershipData,
} from "./email.types"

// Delegate to centralized templates, preserving the original function signatures

export function paymentReminderTemplate(data: PaymentReminderData): string {
  return emailBodyTemplates.paymentReminder(data)
}

export function overdueAlertTemplate(data: OverdueAlertData): string {
  return emailBodyTemplates.overdueAlert(data)
}

export function paymentReceiptTemplate(data: PaymentReceiptData): string {
  return emailBodyTemplates.paymentReceipt(data)
}

export function invitationEmailTemplate(data: InvitationEmailData): string {
  return emailBodyTemplates.invitation(data)
}

export function emailVerificationTemplate(data: EmailVerificationData): string {
  return emailBodyTemplates.emailVerification(data)
}

export function dailySummaryTemplate(data: SendDailySummaryOptions): string {
  return emailBodyTemplates.dailySummary(data)
}

export function libraryLowHoursTemplate(data: LibraryLowHoursData): string {
  return emailBodyTemplates.libraryLowHours(data)
}

export function libraryExpiringMembershipTemplate(data: LibraryExpiringMembershipData): string {
  return emailBodyTemplates.libraryExpiringMembership(data)
}

export function libraryExpiredMembershipTemplate(data: LibraryExpiredMembershipData): string {
  return emailBodyTemplates.libraryExpiredMembership(data)
}
