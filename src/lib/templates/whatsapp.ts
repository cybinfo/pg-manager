/**
 * WhatsApp Message Templates
 *
 * Centralized template functions for all WhatsApp messages.
 * Generates plain-text messages with WhatsApp-compatible formatting.
 *
 * The sending infrastructure (generateWhatsAppLink, copyToClipboard)
 * remains in @/lib/notifications. This module only contains template text.
 *
 * @example
 * import { whatsappTemplates } from "@/lib/templates"
 *
 * const message = whatsappTemplates.paymentReceipt({
 *   tenantName: "John",
 *   amount: 5000,
 *   receiptNumber: "REC-001",
 *   ...
 * })
 */

import { formatCurrency, formatDate } from "@/lib/format"
import { PAYMENT_METHODS } from "@/lib/status"

// ============================================================================
// HELPER
// ============================================================================

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHODS[method] || method
}

// ============================================================================
// DATA INTERFACES
// ============================================================================

export interface WhatsAppPaymentReceiptData {
  tenantName: string
  amount: number
  receiptNumber: string
  propertyName: string
  propertyAddress?: string
  roomNumber?: string
  paymentDate: string | Date
  paymentMethod: string
  ownerName?: string
  ownerPhone?: string
  forPeriod?: string
  description?: string
}

export interface WhatsAppPaymentReminderData {
  tenantName: string
  amount: number
  propertyName: string
  dueDate: string | Date
  ownerName?: string
}

export interface WhatsAppOverdueAlertData {
  tenantName: string
  amount: number
  dueDate: string | Date
  totalDue: number
  ownerName?: string
}

export interface WhatsAppSimpleReceiptData {
  tenantName: string
  amount: number
  receiptNumber: string
}

// ============================================================================
// TEMPLATES
// ============================================================================

export const whatsappTemplates = {
  paymentReceipt: (data: WhatsAppPaymentReceiptData): string => {
    const period = data.forPeriod ? `\n📆 For: ${data.forPeriod}` : ""
    const room = data.roomNumber ? `\n🚪 Room: ${data.roomNumber}` : ""
    const address = data.propertyAddress ? `\n📍 ${data.propertyAddress}` : ""
    const description = data.description ? `\n📝 ${data.description}` : ""
    const ownerContact = data.ownerPhone ? `\n📞 Contact: ${data.ownerPhone}` : ""

    return `🧾 *Payment Receipt*

Hi ${data.tenantName},

Your payment of *${formatCurrency(data.amount)}* has been received successfully.

━━━━━━━━━━━━━━━━━
📄 Receipt No: ${data.receiptNumber || "N/A"}
📅 Date: ${formatDate(data.paymentDate)}
💳 Method: ${getPaymentMethodLabel(data.paymentMethod)}${period}${description}
━━━━━━━━━━━━━━━━━

🏠 *Property Details*
${data.propertyName}${address}${room}
━━━━━━━━━━━━━━━━━

✅ *Status: PAID*

Thank you for your payment!
${ownerContact}
- ${data.ownerName || "ManageKar"}

_Powered by ManageKar_`
  },

  paymentReminder: (data: WhatsAppPaymentReminderData): string => {
    return `⏰ *Rent Reminder*

Hi ${data.tenantName},

Your rent of *${formatCurrency(data.amount)}* for ${data.propertyName} is due on ${formatDate(data.dueDate)}.

Please make the payment to avoid late fees.

- ${data.ownerName || "ManageKar"}`
  },

  overdueAlert: (data: WhatsAppOverdueAlertData): string => {
    return `⚠️ *Payment Overdue*

Hi ${data.tenantName},

Your payment of *${formatCurrency(data.amount)}* was due on ${formatDate(data.dueDate)}.

Current outstanding: *${formatCurrency(data.totalDue)}*

Please clear the dues at the earliest.

- ${data.ownerName || "ManageKar"}`
  },

  simpleReceipt: (data: WhatsAppSimpleReceiptData): string => {
    return `🧾 Hi ${data.tenantName}, your payment of ${formatCurrency(data.amount)} received. Receipt: ${data.receiptNumber}. Thank you! - ManageKar`
  },
}
