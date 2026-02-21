/**
 * Notification utilities for SMS and WhatsApp messaging
 * Currently implements FREE WhatsApp click-to-chat
 * Future: Twilio API integration for automated messaging
 *
 * Template text generation is centralized in @/lib/templates/whatsapp.ts.
 * This module provides the sending infrastructure and re-exports templates
 * for backward compatibility.
 */

// Import shared formatters
import { formatCurrency, formatDate } from "@/lib/format"
import { normalizePhone } from "@/lib/phone"
import {
  whatsappTemplates,
  getPaymentMethodLabel as _getPaymentMethodLabel,
} from "@/lib/templates"

// Re-export for backward compatibility
export { formatCurrency, formatDate }

/**
 * Format phone number for WhatsApp (India).
 * Re-exported from @/lib/phone for backward compatibility.
 * New code should use normalizePhone from @/lib/phone directly.
 */
export const formatPhoneNumber = normalizePhone

// Generate WhatsApp click-to-chat URL
export function generateWhatsAppLink(phone: string, message: string): string {
  const formattedPhone = normalizePhone(phone)
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`
}

/**
 * Payment method display name lookup.
 * Delegated to @/lib/templates/whatsapp. Re-exported for backward compat.
 */
export const getPaymentMethodLabel = _getPaymentMethodLabel

// Re-export data interfaces from centralized templates for backward compat
export type {
  WhatsAppPaymentReceiptData as PaymentReceiptData,
  WhatsAppPaymentReminderData as PaymentReminderData,
  WhatsAppOverdueAlertData as OverdueAlertData,
} from "@/lib/templates"

/**
 * WhatsApp message templates.
 * Delegated to @/lib/templates/whatsapp. Re-exported for backward compat.
 * New code should import from @/lib/templates directly.
 */
export const messageTemplates = whatsappTemplates

// Copy text to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Fallback for older browsers
    const textArea = document.createElement("textarea")
    textArea.value = text
    textArea.style.position = "fixed"
    textArea.style.left = "-999999px"
    document.body.appendChild(textArea)
    textArea.select()
    try {
      document.execCommand("copy")
      document.body.removeChild(textArea)
      return true
    } catch {
      document.body.removeChild(textArea)
      return false
    }
  }
}
