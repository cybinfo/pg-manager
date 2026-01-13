import type {
  PaymentReminderData,
  OverdueAlertData,
  PaymentReceiptData,
  InvitationEmailData,
  EmailVerificationData,
  DailySummaryData,
} from "./email"

// Use shared formatters
import { formatCurrency, formatDate as formatDateShort } from "@/lib/format"

// Format date with full month name (for emails)
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

// Base email wrapper
function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ManageKar</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f3f4f6;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #14B8A6, #10B981); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">ManageKar</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Smart PG Management</p>
    </div>

    <!-- Content -->
    <div style="background: white; padding: 32px; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      ${content}
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: 20px; color: #9ca3af; font-size: 12px;">
      <p style="margin: 0;">Sent via ManageKar - Smart PG Management Software</p>
      <p style="margin: 8px 0 0 0;">
        <a href="https://managekar.com" style="color: #10B981; text-decoration: none;">managekar.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}

// Payment Reminder Template
export function paymentReminderTemplate(data: PaymentReminderData): string {
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
}

// Overdue Alert Template
export function overdueAlertTemplate(data: OverdueAlertData): string {
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
}

// Payment Receipt Template
export function paymentReceiptTemplate(data: PaymentReceiptData): string {
  const paymentMethodLabels: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    card: "Card",
  }

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
          <td style="padding: 8px 0; color: #111827; font-weight: 500; text-align: right;">${paymentMethodLabels[data.paymentMethod] || data.paymentMethod}</td>
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
}

// Invitation Email Template (for Staff/Tenant invitations)
export function invitationEmailTemplate(data: InvitationEmailData): string {
  const roleLabels: Record<string, string> = {
    staff: "Staff Member",
    tenant: "Tenant",
  }

  const roleDescriptions: Record<string, string> = {
    staff: "As a staff member, you'll be able to help manage the property through the ManageKar dashboard.",
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
}

// Email Verification Template
export function emailVerificationTemplate(data: EmailVerificationData): string {
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
      Please verify your email address to complete your ManageKar account setup and access all features.
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
        Thank you for using ManageKar!
      </p>
    </div>
  `

  return emailWrapper(content)
}

// Daily Summary Email Template (for Owners)
export function dailySummaryTemplate(data: DailySummaryData): string {
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
        <strong style="color: #111827;">ManageKar</strong>
      </p>
    </div>
  `

  return emailWrapper(content)
}
