/**
 * Notification utilities for SMS and WhatsApp messaging
 * Currently implements FREE WhatsApp click-to-chat
 * Future: Twilio API integration for automated messaging
 */

// Format phone number for WhatsApp (India)
export function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters
  let cleaned = phone.replace(/\D/g, "")

  // If number starts with 0, remove it
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1)
  }

  // If number doesn't have country code, add India's +91
  if (cleaned.length === 10) {
    cleaned = "91" + cleaned
  }

  // If number starts with 91 but is 12 digits, it's correct
  // If it has + prefix in original, we already stripped it

  return cleaned
}

// Generate WhatsApp click-to-chat URL
export function generateWhatsAppLink(phone: string, message: string): string {
  const formattedPhone = formatPhoneNumber(phone)
  const encodedMessage = encodeURIComponent(message)
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`
}

// Format currency for display
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format date for display
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// Payment method display names
const paymentMethodLabels: Record<string, string> = {
  cash: "Cash",
  upi: "UPI",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
  card: "Card",
}

export function getPaymentMethodLabel(method: string): string {
  return paymentMethodLabels[method] || method
}

// Message template data interfaces
export interface PaymentReceiptData {
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

export interface PaymentReminderData {
  tenantName: string
  amount: number
  propertyName: string
  dueDate: string | Date
  ownerName?: string
}

export interface OverdueAlertData {
  tenantName: string
  amount: number
  dueDate: string | Date
  totalDue: number
  ownerName?: string
}

// Message templates
export const messageTemplates = {
  paymentReceipt: (data: PaymentReceiptData): string => {
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

  paymentReminder: (data: PaymentReminderData): string => {
    return `⏰ *Rent Reminder*

Hi ${data.tenantName},

Your rent of *${formatCurrency(data.amount)}* for ${data.propertyName} is due on ${formatDate(data.dueDate)}.

Please make the payment to avoid late fees.

- ${data.ownerName || "ManageKar"}`
  },

  overdueAlert: (data: OverdueAlertData): string => {
    return `⚠️ *Payment Overdue*

Hi ${data.tenantName},

Your payment of *${formatCurrency(data.amount)}* was due on ${formatDate(data.dueDate)}.

Current outstanding: *${formatCurrency(data.totalDue)}*

Please clear the dues at the earliest.

- ${data.ownerName || "ManageKar"}`
  },

  // Simple receipt message (shorter version)
  simpleReceipt: (data: { tenantName: string; amount: number; receiptNumber: string }): string => {
    return `🧾 Hi ${data.tenantName}, your payment of ${formatCurrency(data.amount)} received. Receipt: ${data.receiptNumber}. Thank you! - ManageKar`
  },
}

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
