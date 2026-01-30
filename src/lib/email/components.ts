/**
 * Email HTML Components
 *
 * Reusable HTML snippet generators for email templates.
 * Eliminates duplicate badge, card, and table patterns.
 *
 * @example
 * import { emailBadge, emailInfoCard, emailSignature } from "@/lib/email/components"
 *
 * const badge = emailBadge("Payment Received", "success")
 * const card = emailInfoCard([
 *   { label: "Property", value: "PG Home" },
 *   { label: "Amount", value: "₹5,000", highlight: true },
 * ])
 */

import { emailColors, emailBrand, emailFonts, emailSpacing, EmailBadgeVariant } from "./theme"

// ============================================================================
// EMAIL WRAPPER
// ============================================================================

/**
 * Wraps email content in the standard ManageKar email template
 */
export function emailWrapper(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailBrand.name}</title>
</head>
<body style="margin: 0; padding: 0; font-family: ${emailFonts.family}; background-color: ${emailColors.pageBg};">
  <div style="max-width: 600px; margin: 0 auto; padding: ${emailSpacing.container};">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, ${emailColors.gradientStart}, ${emailColors.gradientEnd}); padding: ${emailSpacing.header}; border-radius: 12px 12px 0 0; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: bold;">${emailBrand.name}</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: ${emailFonts.body};">${emailBrand.tagline}</p>
    </div>

    <!-- Content -->
    <div style="background: ${emailColors.cardBg}; padding: ${emailSpacing.content}; border-radius: 0 0 12px 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
      ${content}
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding: ${emailSpacing.container}; color: ${emailColors.textLight}; font-size: ${emailFonts.small};">
      <p style="margin: 0;">${emailBrand.footerText}</p>
      <p style="margin: 8px 0 0 0;">
        <a href="${emailBrand.website}" style="color: ${emailColors.primary}; text-decoration: none;">managekar.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}

// ============================================================================
// BADGE COMPONENT
// ============================================================================

/**
 * Creates a badge/pill element for email headers
 */
export function emailBadge(text: string, variant: EmailBadgeVariant = "success"): string {
  const colors = emailColors[variant]
  return `
    <div style="text-align: center; margin-bottom: ${emailSpacing.section};">
      <div style="display: inline-block; background: ${colors.bg}; color: ${colors.text}; padding: 8px 16px; border-radius: 20px; font-size: ${emailFonts.badge}; font-weight: 500;">
        ${text}
      </div>
    </div>
  `
}

// ============================================================================
// GREETING COMPONENT
// ============================================================================

/**
 * Creates a greeting/heading for the email
 */
export function emailGreeting(name: string, customMessage?: string): string {
  return `
    <h2 style="color: ${emailColors.textPrimary}; margin: 0 0 ${emailSpacing.element} 0; font-size: ${emailFonts.heading};">
      Hi ${name},
    </h2>
    ${customMessage ? `
    <p style="color: ${emailColors.textSecondary}; line-height: 1.6; margin: 0 0 ${emailSpacing.section} 0;">
      ${customMessage}
    </p>
    ` : ""}
  `
}

// ============================================================================
// INFO CARD COMPONENT
// ============================================================================

interface InfoCardRow {
  label: string
  value: string
  highlight?: boolean
  highlightColor?: string
  showBorder?: boolean
}

/**
 * Creates an info card with label/value rows
 */
export function emailInfoCard(
  rows: InfoCardRow[],
  options: {
    variant?: EmailBadgeVariant | "default"
    headerContent?: string
  } = {}
): string {
  const { variant = "default", headerContent } = options

  let bgColor: string = emailColors.infoBg
  let borderColor: string = emailColors.infoBorder

  if (variant !== "default") {
    const colors = emailColors[variant]
    bgColor = colors.cardBg
    borderColor = colors.border
  }

  const rowsHtml = rows
    .map((row) => {
      const valueColor = row.highlightColor || (row.highlight ? emailColors.primary : emailColors.textPrimary)
      const fontSize = row.highlight ? emailFonts.amount : emailFonts.body
      const fontWeight = row.highlight ? "bold" : "500"
      const padding = row.highlight ? "16px 0 8px 0" : "8px 0"
      const borderStyle = row.showBorder ? `border-top: 1px solid ${borderColor};` : ""

      return `
        <tr style="${borderStyle}">
          <td style="padding: ${padding}; color: ${emailColors.textMuted}; font-size: ${emailFonts.body};">${row.label}</td>
          <td style="padding: ${padding}; color: ${valueColor}; font-weight: ${fontWeight}; font-size: ${fontSize}; text-align: right;">${row.value}</td>
        </tr>
      `
    })
    .join("")

  return `
    <div style="background: ${bgColor}; border: 1px solid ${borderColor}; border-radius: 8px; padding: 20px; margin-bottom: ${emailSpacing.section};">
      ${headerContent || ""}
      <table style="width: 100%; border-collapse: collapse;">
        ${rowsHtml}
      </table>
    </div>
  `
}

// ============================================================================
// RECEIPT HEADER
// ============================================================================

/**
 * Creates a receipt number header for info cards
 */
export function emailReceiptHeader(receiptNumber: string): string {
  return `
    <div style="text-align: center; margin-bottom: 16px;">
      <p style="color: ${emailColors.textMuted}; font-size: ${emailFonts.small}; margin: 0;">Receipt Number</p>
      <p style="color: ${emailColors.textPrimary}; font-size: 18px; font-weight: bold; margin: 4px 0 0 0;">${receiptNumber}</p>
    </div>
  `
}

// ============================================================================
// CONTACT INFO
// ============================================================================

/**
 * Creates a contact info paragraph
 */
export function emailContactInfo(phone?: string, label: string = "For any queries, contact"): string {
  if (!phone) return ""

  return `
    <p style="color: ${emailColors.textMuted}; font-size: ${emailFonts.body}; margin: 0;">
      ${label}: <strong>${phone}</strong>
    </p>
  `
}

// ============================================================================
// SIGNATURE COMPONENT
// ============================================================================

/**
 * Creates the email signature
 */
export function emailSignature(ownerName: string): string {
  return `
    <div style="margin-top: 32px; padding-top: ${emailSpacing.section}; border-top: 1px solid ${emailColors.infoBorder};">
      <p style="color: ${emailColors.textMuted}; margin: 0; font-size: ${emailFonts.body};">
        Thank you,<br>
        <strong style="color: ${emailColors.textPrimary};">${ownerName}</strong>
      </p>
    </div>
  `
}

// ============================================================================
// CTA BUTTON
// ============================================================================

/**
 * Creates a call-to-action button
 */
export function emailCTAButton(
  text: string,
  url: string,
  variant: "primary" | "secondary" = "primary"
): string {
  const bgColor = variant === "primary" ? emailColors.primary : emailColors.infoBg
  const textColor = variant === "primary" ? "#ffffff" : emailColors.textPrimary

  return `
    <div style="text-align: center; margin: ${emailSpacing.section} 0;">
      <a href="${url}" style="display: inline-block; background: ${bgColor}; color: ${textColor}; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 500; font-size: ${emailFonts.body};">
        ${text}
      </a>
    </div>
  `
}

// ============================================================================
// PARAGRAPH
// ============================================================================

/**
 * Creates a styled paragraph
 */
export function emailParagraph(text: string, options: { muted?: boolean; centered?: boolean } = {}): string {
  const color = options.muted ? emailColors.textMuted : emailColors.textSecondary
  const align = options.centered ? "center" : "left"

  return `
    <p style="color: ${color}; line-height: 1.6; margin: 0 0 ${emailSpacing.section} 0; text-align: ${align};">
      ${text}
    </p>
  `
}

// ============================================================================
// DIVIDER
// ============================================================================

/**
 * Creates a horizontal divider
 */
export function emailDivider(): string {
  return `
    <hr style="border: none; border-top: 1px solid ${emailColors.infoBorder}; margin: ${emailSpacing.section} 0;">
  `
}

// ============================================================================
// STAT BOX
// ============================================================================

interface StatItem {
  label: string
  value: string | number
  color?: string
}

/**
 * Creates a statistics box for summaries
 */
export function emailStatsBox(stats: StatItem[]): string {
  const statsHtml = stats
    .map(
      (stat) => `
      <div style="text-align: center; flex: 1; padding: 10px;">
        <p style="color: ${emailColors.textMuted}; font-size: ${emailFonts.small}; margin: 0 0 4px 0;">${stat.label}</p>
        <p style="color: ${stat.color || emailColors.textPrimary}; font-size: 20px; font-weight: bold; margin: 0;">${stat.value}</p>
      </div>
    `
    )
    .join("")

  return `
    <div style="display: flex; background: ${emailColors.infoBg}; border-radius: 8px; margin-bottom: ${emailSpacing.section};">
      ${statsHtml}
    </div>
  `
}

// ============================================================================
// LIST COMPONENT
// ============================================================================

/**
 * Creates a bulleted or numbered list
 */
export function emailList(items: string[], type: "bullet" | "number" = "bullet"): string {
  const listType = type === "number" ? "ol" : "ul"
  const itemsHtml = items
    .map(
      (item) => `<li style="color: ${emailColors.textSecondary}; margin-bottom: 8px;">${item}</li>`
    )
    .join("")

  return `
    <${listType} style="margin: 0 0 ${emailSpacing.section} 0; padding-left: 20px;">
      ${itemsHtml}
    </${listType}>
  `
}
