/**
 * Email Theme Configuration
 *
 * Centralized colors and styling for email templates.
 * Eliminates duplicate color values across email templates.
 *
 * @example
 * import { emailColors, emailBrand } from "@/lib/email/theme"
 *
 * const badgeStyle = `background: ${emailColors.success.bg}; color: ${emailColors.success.text};`
 */

// ============================================================================
// BRAND INFO
// ============================================================================

export const emailBrand = {
  name: "ManageKar",
  tagline: "Smart PG Management",
  website: "https://managekar.com",
  footerText: "Sent via ManageKar - Smart PG Management Software",
} as const

// ============================================================================
// COLORS
// ============================================================================

export const emailColors = {
  // Brand
  primary: "#10B981",
  primaryDark: "#059669",
  gradientStart: "#14B8A6",
  gradientEnd: "#10B981",

  // Backgrounds
  pageBg: "#f3f4f6",
  cardBg: "#ffffff",
  infoBg: "#F9FAFB",
  infoBorder: "#E5E7EB",

  // Text
  textPrimary: "#111827",
  textSecondary: "#4B5563",
  textMuted: "#6B7280",
  textLight: "#9ca3af",

  // Status colors
  success: {
    bg: "#D1FAE5",
    text: "#059669",
    border: "#BBF7D0",
    cardBg: "#F0FDF4",
  },
  warning: {
    bg: "#FEF3C7",
    text: "#D97706",
    border: "#FDE68A",
    cardBg: "#FFFBEB",
  },
  error: {
    bg: "#FEE2E2",
    text: "#DC2626",
    border: "#FECACA",
    cardBg: "#FEF2F2",
  },
  info: {
    bg: "#DBEAFE",
    text: "#2563EB",
    border: "#BFDBFE",
    cardBg: "#EFF6FF",
  },
} as const

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const emailFonts = {
  family: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  heading: "22px",
  body: "14px",
  small: "12px",
  badge: "14px",
  amount: "24px",
} as const

// ============================================================================
// SPACING
// ============================================================================

export const emailSpacing = {
  container: "20px",
  header: "24px",
  content: "32px",
  section: "24px",
  element: "16px",
  small: "8px",
} as const

// ============================================================================
// BADGE STYLES
// ============================================================================

export type EmailBadgeVariant = "success" | "warning" | "error" | "info"

export function getBadgeColors(variant: EmailBadgeVariant) {
  return emailColors[variant]
}
