/**
 * PDF Theme Configuration
 *
 * Centralized colors, fonts, and spacing for all PDF documents.
 * Eliminates 40+ hardcoded color values across PDF files.
 *
 * @example
 * import { pdfColors, pdfFonts, pdfSpacing } from "@/lib/pdf/theme"
 *
 * const styles = StyleSheet.create({
 *   header: {
 *     color: pdfColors.primary,
 *     fontSize: pdfFonts.heading,
 *   },
 * })
 */

// ============================================================================
// BRAND COLORS
// ============================================================================

export const pdfColors = {
  // Brand
  primary: "#10B981", // Emerald green - brand color
  primaryLight: "#D1FAE5", // Light emerald
  primaryDark: "#059669", // Dark emerald

  // Library brand (indigo)
  library: "#6366F1",
  libraryLight: "#EEF2FF", // Light indigo background

  // Backgrounds
  white: "#ffffff",
  background: "#F9FAFB",
  backgroundLight: "#F3F4F6",
  backgroundMuted: "#FAFAFA", // Very light gray (alternate table rows)
  backgroundSuccess: "#F0FDF4",
  backgroundWarning: "#FFFBEB",
  backgroundWarningAlt: "#FEF3C7", // Light amber (subscription boxes, recommendations)
  backgroundError: "#FEF2F2",
  backgroundInfo: "#EFF6FF",

  // Text
  textPrimary: "#111827",
  textSecondary: "#374151",
  textMuted: "#6B7280",
  textLight: "#9CA3AF",
  textBody: "#4B5563", // gray-600 (table cell text)

  // Borders
  border: "#E5E7EB",
  borderLight: "#F3F4F6",

  // Status colors
  success: "#10B981",
  successText: "#065F46",
  warning: "#F59E0B",
  warningText: "#92400E",
  warningDeep: "#78350F", // amber-900 (recommendation description text)
  error: "#EF4444",
  errorText: "#991B1B",
  errorDeep: "#7F1D1D", // red-900 (alert description text)
  info: "#3B82F6",
  infoText: "#1E40AF",

  // Category colors (for journey report)
  categories: {
    payment: "#10B981",
    billing: "#3B82F6",
    complaint: "#F59E0B",
    communication: "#8B5CF6",
    risk: "#EF4444",
    milestone: "#6366F1",
    notice: "#F97316",
    document: "#14B8A6",
    other: "#6B7280",
  },
} as const

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const pdfFonts = {
  // Font family
  family: "Helvetica",
  familyBold: "Helvetica-Bold",

  // Font sizes
  title: 24,
  heading: 20,
  subheading: 16,
  sectionTitle: 12,
  body: 11,
  small: 10,
  tiny: 9,
  micro: 8,

  // Font weights (for style objects)
  weights: {
    normal: "normal" as const,
    bold: "bold" as const,
  },
} as const

// ============================================================================
// SPACING
// ============================================================================

export const pdfSpacing = {
  // Page padding
  page: 40,
  pageSmall: 30,

  // Section spacing
  sectionLarge: 30,
  section: 20,
  sectionSmall: 15,

  // Element spacing
  elementLarge: 20,
  element: 15,
  elementSmall: 10,
  elementTiny: 6,

  // Card padding
  cardLarge: 20,
  card: 15,
  cardSmall: 12,
  cardTiny: 8,

  // Border radius
  radiusLarge: 8,
  radius: 6,
  radiusSmall: 4,
  radiusBadge: 12,
  radiusPill: 10,
} as const

// ============================================================================
// BRAND INFO
// ============================================================================

export const pdfBrand = {
  name: "ManageKar",
  tagline: "From Chaos to Clarity",
  website: "managekar.com",
  footerText: (contact?: string) =>
    `This is a computer-generated document. For queries, contact ${contact || "the property owner"}.`,
  poweredBy: "Powered by ManageKar - managekar.com",
} as const

// ============================================================================
// STATUS HELPERS
// ============================================================================

export type PdfStatusType = "success" | "warning" | "error" | "info" | "muted"

export function getStatusColors(status: PdfStatusType) {
  switch (status) {
    case "success":
      return {
        background: pdfColors.success,
        text: pdfColors.white,
      }
    case "warning":
      return {
        background: pdfColors.warning,
        text: pdfColors.white,
      }
    case "error":
      return {
        background: pdfColors.error,
        text: pdfColors.white,
      }
    case "info":
      return {
        background: pdfColors.info,
        text: pdfColors.white,
      }
    case "muted":
    default:
      return {
        background: pdfColors.textMuted,
        text: pdfColors.white,
      }
  }
}

// ============================================================================
// SCORE COLOR HELPERS (for Journey Report)
// ============================================================================

export type ScoreLevel = "excellent" | "good" | "fair" | "poor" | "critical"

export function getScoreLevel(score: number): ScoreLevel {
  if (score >= 90) return "excellent"
  if (score >= 70) return "good"
  if (score >= 50) return "fair"
  if (score >= 30) return "poor"
  return "critical"
}

export function getScoreColor(score: number) {
  const level = getScoreLevel(score)
  switch (level) {
    case "excellent":
      return pdfColors.success
    case "good":
      return "#22C55E" // green-500
    case "fair":
      return pdfColors.warning
    case "poor":
      return "#F97316" // orange-500
    case "critical":
      return pdfColors.error
  }
}

export function getScoreLevelLabel(score: number): string {
  const level = getScoreLevel(score)
  switch (level) {
    case "excellent":
      return "Excellent"
    case "good":
      return "Good"
    case "fair":
      return "Fair"
    case "poor":
      return "Poor"
    case "critical":
      return "Critical"
  }
}

// ============================================================================
// CATEGORY HELPERS (for Journey Report)
// ============================================================================

export function getCategoryColor(
  category: string
): string {
  const colors = pdfColors.categories
  const key = category.toLowerCase() as keyof typeof colors
  return colors[key] || colors.other
}

// ============================================================================
// COMMON STYLE PRESETS
// ============================================================================

/**
 * Common style definitions that can be spread into StyleSheet.create()
 */
export const pdfStylePresets = {
  // Page base
  pageBase: {
    flexDirection: "column" as const,
    backgroundColor: pdfColors.white,
    padding: pdfSpacing.page,
    fontFamily: pdfFonts.family,
  },

  // Header with brand
  headerWithBorder: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    alignItems: "flex-start" as const,
    marginBottom: pdfSpacing.section,
    paddingBottom: pdfSpacing.elementSmall,
    borderBottomWidth: 2,
    borderBottomColor: pdfColors.primary,
  },

  // Brand text
  brandName: {
    fontSize: pdfFonts.heading,
    fontWeight: pdfFonts.weights.bold,
    color: pdfColors.primary,
    marginBottom: 4,
  },

  brandTagline: {
    fontSize: pdfFonts.small,
    color: pdfColors.textMuted,
  },

  // Section title
  sectionTitle: {
    fontSize: pdfFonts.sectionTitle,
    fontWeight: pdfFonts.weights.bold,
    color: pdfColors.textSecondary,
    marginBottom: pdfSpacing.elementSmall,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
    marginVertical: pdfSpacing.element,
  },

  // Row layout
  row: {
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
    marginBottom: pdfSpacing.elementTiny,
  },

  // Label/value pair
  label: {
    fontSize: pdfFonts.body,
    color: pdfColors.textMuted,
  },

  value: {
    fontSize: pdfFonts.body,
    color: pdfColors.textPrimary,
    fontWeight: pdfFonts.weights.bold,
  },

  // Status badge
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: pdfSpacing.radiusBadge,
    alignSelf: "flex-start" as const,
  },

  statusText: {
    fontSize: pdfFonts.small,
    fontWeight: pdfFonts.weights.bold,
    color: pdfColors.white,
  },

  // Card/box styles
  cardBackground: {
    backgroundColor: pdfColors.background,
    padding: pdfSpacing.card,
    borderRadius: pdfSpacing.radius,
  },

  cardSuccess: {
    backgroundColor: pdfColors.backgroundSuccess,
    padding: pdfSpacing.cardLarge,
    borderRadius: pdfSpacing.radiusLarge,
  },

  cardWarning: {
    backgroundColor: pdfColors.backgroundWarning,
    padding: pdfSpacing.card,
    borderRadius: pdfSpacing.radius,
  },

  cardError: {
    backgroundColor: pdfColors.backgroundError,
    padding: pdfSpacing.card,
    borderRadius: pdfSpacing.radius,
  },

  // Footer
  footer: {
    position: "absolute" as const,
    bottom: pdfSpacing.page,
    left: pdfSpacing.page,
    right: pdfSpacing.page,
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
    paddingTop: pdfSpacing.element,
  },

  footerText: {
    fontSize: pdfFonts.tiny,
    color: pdfColors.textLight,
    textAlign: "center" as const,
    marginBottom: 4,
  },

  footerBrand: {
    fontSize: pdfFonts.small,
    color: pdfColors.primary,
    textAlign: "center" as const,
    fontWeight: pdfFonts.weights.bold,
  },
} as const
