import type {
  PaymentReminderData,
  OverdueAlertData,
  PaymentReceiptData,
} from "./email"

// Format currency for display
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

// Format date for display
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
