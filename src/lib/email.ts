import { Resend } from "resend"
import {
  paymentReminderTemplate,
  overdueAlertTemplate,
  paymentReceiptTemplate,
  invitationEmailTemplate,
} from "./email-templates"

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
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "ManageKar <onboarding@resend.dev>"

export interface PaymentReminderData {
  to: string
  tenantName: string
  amount: number
  propertyName: string
  roomNumber: string
  dueDate: Date
  ownerName: string
  ownerPhone?: string
}

export interface OverdueAlertData {
  to: string
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

export interface PaymentReceiptData {
  to: string
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

export interface InvitationEmailData {
  to: string
  inviteeName: string
  inviterName: string
  workspaceName: string
  contextType: "staff" | "tenant"
  roleName?: string
  message?: string
  signupUrl: string
}

export async function sendPaymentReminder(
  data: PaymentReminderData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: `Rent Reminder - ${data.propertyName}`,
      html: paymentReminderTemplate(data),
    })

    if (error) {
      console.error("Failed to send payment reminder:", error)
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    console.error("Error sending payment reminder:", err)
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
      subject: `Payment Overdue - Action Required`,
      html: overdueAlertTemplate(data),
    })

    if (error) {
      console.error("Failed to send overdue alert:", error)
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    console.error("Error sending overdue alert:", err)
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
      subject: `Payment Receipt - ${data.receiptNumber}`,
      html: paymentReceiptTemplate(data),
    })

    if (error) {
      console.error("Failed to send payment receipt:", error)
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    console.error("Error sending payment receipt:", err)
    return { success: false, error: String(err) }
  }
}

export async function sendInvitationEmail(
  data: InvitationEmailData
): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    const client = getResendClient()
    const roleLabel = data.contextType === "staff" ? "Staff" : "Tenant"
    const { data: result, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: `You're invited to join ${data.workspaceName} as ${roleLabel} - ManageKar`,
      html: invitationEmailTemplate(data),
    })

    if (error) {
      console.error("Failed to send invitation email:", error)
      return { success: false, error: error.message }
    }

    return { success: true, id: result?.id }
  } catch (err) {
    console.error("Error sending invitation email:", err)
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
      subject: "ManageKar - Test Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #14B8A6, #10B981); padding: 20px; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">ManageKar</h1>
          </div>
          <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
            <h2 style="color: #111827; margin-top: 0;">Test Email Successful!</h2>
            <p style="color: #6b7280; line-height: 1.6;">
              Hi ${ownerName},<br><br>
              This is a test email from ManageKar to confirm your email notification settings are working correctly.
            </p>
            <p style="color: #6b7280; line-height: 1.6;">
              You will receive payment reminders and alerts at this email address when enabled.
            </p>
            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                This email was sent from ManageKar - Smart PG Management Software
              </p>
            </div>
          </div>
        </div>
      `,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}
