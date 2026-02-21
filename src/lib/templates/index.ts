/**
 * Centralized Message Templates
 *
 * All message template text generation lives here. The sending infrastructure
 * (WhatsApp link generation, Resend email transport) stays in their original
 * modules (@/lib/notifications, @/lib/email).
 *
 * @example
 * // WhatsApp templates
 * import { whatsappTemplates } from "@/lib/templates"
 * const msg = whatsappTemplates.paymentReceipt(data)
 *
 * // Email templates
 * import { emailSubjects, emailBodyTemplates } from "@/lib/templates"
 * const subject = emailSubjects.paymentReminder({ propertyName: "Sunshine PG" })
 * const html = emailBodyTemplates.paymentReminder(data)
 */

// WhatsApp message templates
export {
  whatsappTemplates,
  getPaymentMethodLabel,
  type WhatsAppPaymentReceiptData,
  type WhatsAppPaymentReminderData,
  type WhatsAppOverdueAlertData,
  type WhatsAppSimpleReceiptData,
} from "./whatsapp"

// Email subject + body templates
export { emailSubjects, emailBodyTemplates } from "./email"
