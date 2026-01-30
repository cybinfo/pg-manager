/**
 * PDF Reusable Components
 *
 * Centralized components for PDF generation.
 * Eliminates duplicate header/footer/table patterns across PDF files.
 *
 * @example
 * import { PdfHeader, PdfFooter, PdfTable, PdfSection } from "@/lib/pdf/components"
 *
 * <Document>
 *   <Page>
 *     <PdfHeader title="Report" subtitle="Generated on..." />
 *     <PdfSection title="Details">...</PdfSection>
 *     <PdfTable headers={["Name", "Amount"]} rows={data} />
 *     <PdfFooter contact="owner@email.com" />
 *   </Page>
 * </Document>
 */

import React from "react"
import { Text, View, StyleSheet } from "@react-pdf/renderer"
import {
  pdfColors,
  pdfFonts,
  pdfSpacing,
  pdfBrand,
  pdfStylePresets,
  getStatusColors,
  PdfStatusType,
} from "./theme"

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Header
  header: pdfStylePresets.headerWithBorder,
  brandSection: {
    flexDirection: "column",
  },
  brandName: pdfStylePresets.brandName,
  brandTagline: pdfStylePresets.brandTagline,
  headerRight: {
    alignItems: "flex-end",
  },
  headerTitle: {
    fontSize: pdfFonts.heading,
    fontWeight: pdfFonts.weights.bold,
    color: pdfColors.textPrimary,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: pdfFonts.small,
    color: pdfColors.textMuted,
    marginBottom: 4,
  },

  // Footer
  footer: pdfStylePresets.footer,
  footerText: pdfStylePresets.footerText,
  footerBrand: pdfStylePresets.footerBrand,

  // Section
  section: {
    marginBottom: pdfSpacing.section,
  },
  sectionTitle: pdfStylePresets.sectionTitle,
  sectionContent: {
    // No specific styles needed
  },

  // Table
  table: {
    marginBottom: pdfSpacing.element,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: pdfColors.background,
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
  },
  tableHeaderCell: {
    padding: pdfSpacing.cardTiny,
    fontSize: pdfFonts.micro,
    fontWeight: pdfFonts.weights.bold,
    color: pdfColors.textSecondary,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.borderLight,
  },
  tableRowAlternate: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.borderLight,
    backgroundColor: pdfColors.backgroundLight,
  },
  tableCell: {
    padding: pdfSpacing.cardTiny,
    fontSize: pdfFonts.tiny,
    color: pdfColors.textPrimary,
  },

  // Row
  row: pdfStylePresets.row,
  label: pdfStylePresets.label,
  value: pdfStylePresets.value,

  // Divider
  divider: pdfStylePresets.divider,

  // Status badge
  statusBadge: pdfStylePresets.statusBadge,
  statusText: pdfStylePresets.statusText,

  // Cards
  card: pdfStylePresets.cardBackground,
  cardSuccess: pdfStylePresets.cardSuccess,
  cardWarning: pdfStylePresets.cardWarning,
  cardError: pdfStylePresets.cardError,
})

// ============================================================================
// HEADER COMPONENT
// ============================================================================

interface PdfHeaderProps {
  /** Main title (e.g., "PAYMENT RECEIPT") */
  title: string
  /** Subtitle lines */
  subtitles?: string[]
  /** Show brand section on left (default: true) */
  showBrand?: boolean
  /** Custom brand name override */
  brandName?: string
  /** Custom tagline override */
  tagline?: string
}

export function PdfHeader({
  title,
  subtitles = [],
  showBrand = true,
  brandName = pdfBrand.name,
  tagline = pdfBrand.tagline,
}: PdfHeaderProps) {
  return (
    <View style={styles.header}>
      {showBrand && (
        <View style={styles.brandSection}>
          <Text style={styles.brandName}>{brandName}</Text>
          <Text style={styles.brandTagline}>{tagline}</Text>
        </View>
      )}
      <View style={styles.headerRight}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitles.map((subtitle, index) => (
          <Text key={index} style={styles.headerSubtitle}>
            {subtitle}
          </Text>
        ))}
      </View>
    </View>
  )
}

// ============================================================================
// FOOTER COMPONENT
// ============================================================================

interface PdfFooterProps {
  /** Contact info for queries */
  contact?: string
  /** Custom footer text (overrides default) */
  customText?: string
  /** Show powered by line (default: true) */
  showPoweredBy?: boolean
}

export function PdfFooter({
  contact,
  customText,
  showPoweredBy = true,
}: PdfFooterProps) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>
        {customText || pdfBrand.footerText(contact)}
      </Text>
      {showPoweredBy && (
        <Text style={styles.footerBrand}>{pdfBrand.poweredBy}</Text>
      )}
    </View>
  )
}

// ============================================================================
// SECTION COMPONENT
// ============================================================================

interface PdfSectionProps {
  /** Section title */
  title: string
  /** Section content */
  children: React.ReactNode
  /** Show border under title (default: false) */
  withBorder?: boolean
}

export function PdfSection({ title, children, withBorder }: PdfSectionProps) {
  const titleStyle = withBorder
    ? [
        styles.sectionTitle,
        {
          paddingBottom: 4,
          borderBottomWidth: 1,
          borderBottomColor: pdfColors.border,
        },
      ]
    : styles.sectionTitle

  return (
    <View style={styles.section}>
      <Text style={titleStyle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  )
}

// ============================================================================
// TABLE COMPONENT
// ============================================================================

interface PdfTableColumn<T> {
  /** Column header text */
  header: string
  /** Key to access data or render function */
  accessor: keyof T | ((row: T) => React.ReactNode)
  /** Column width (flex value) */
  width?: number
  /** Text alignment */
  align?: "left" | "center" | "right"
}

interface PdfTableProps<T> {
  /** Column definitions */
  columns: PdfTableColumn<T>[]
  /** Data rows */
  data: T[]
  /** Show alternating row colors (default: true) */
  striped?: boolean
  /** Key field for React keys */
  keyField?: keyof T
}

export function PdfTable<T extends Record<string, unknown>>({
  columns,
  data,
  striped = true,
  keyField,
}: PdfTableProps<T>) {
  const getCellValue = (
    row: T,
    accessor: PdfTableColumn<T>["accessor"]
  ): React.ReactNode => {
    if (typeof accessor === "function") {
      return accessor(row)
    }
    const value = row[accessor]
    if (value === null || value === undefined) return "-"
    return String(value)
  }

  const getTextAlign = (
    align?: "left" | "center" | "right"
  ): "left" | "center" | "right" => {
    return align || "left"
  }

  return (
    <View style={styles.table}>
      {/* Header row */}
      <View style={styles.tableHeader}>
        {columns.map((col, index) => (
          <Text
            key={index}
            style={[
              styles.tableHeaderCell,
              { flex: col.width || 1, textAlign: getTextAlign(col.align) },
            ]}
          >
            {col.header}
          </Text>
        ))}
      </View>

      {/* Data rows */}
      {data.map((row, rowIndex) => (
        <View
          key={keyField ? String(row[keyField]) : rowIndex}
          style={striped && rowIndex % 2 === 1 ? styles.tableRowAlternate : styles.tableRow}
        >
          {columns.map((col, colIndex) => (
            <Text
              key={colIndex}
              style={[
                styles.tableCell,
                { flex: col.width || 1, textAlign: getTextAlign(col.align) },
              ]}
            >
              {getCellValue(row, col.accessor)}
            </Text>
          ))}
        </View>
      ))}
    </View>
  )
}

// ============================================================================
// ROW COMPONENT (Label/Value pair)
// ============================================================================

interface PdfRowProps {
  /** Label text */
  label: string
  /** Value text or element */
  value: React.ReactNode
  /** Style variant */
  variant?: "default" | "muted"
}

export function PdfRow({ label, value, variant = "default" }: PdfRowProps) {
  const valueStyle =
    variant === "muted"
      ? [styles.value, { color: pdfColors.textMuted, fontWeight: pdfFonts.weights.normal }]
      : styles.value

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  )
}

// ============================================================================
// DIVIDER COMPONENT
// ============================================================================

export function PdfDivider() {
  return <View style={styles.divider} />
}

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

interface PdfStatusBadgeProps {
  /** Status text */
  text: string
  /** Status type for coloring */
  status?: PdfStatusType
  /** Custom background color */
  backgroundColor?: string
}

export function PdfStatusBadge({
  text,
  status = "success",
  backgroundColor,
}: PdfStatusBadgeProps) {
  const colors = getStatusColors(status)
  return (
    <View
      style={[
        styles.statusBadge,
        { backgroundColor: backgroundColor || colors.background },
      ]}
    >
      <Text style={[styles.statusText, { color: colors.text }]}>{text}</Text>
    </View>
  )
}

// ============================================================================
// CARD COMPONENTS
// ============================================================================

interface PdfCardProps {
  /** Card content */
  children: React.ReactNode
  /** Card variant */
  variant?: "default" | "success" | "warning" | "error"
}

export function PdfCard({ children, variant = "default" }: PdfCardProps) {
  const variantStyles = {
    default: styles.card,
    success: styles.cardSuccess,
    warning: styles.cardWarning,
    error: styles.cardError,
  }

  return <View style={variantStyles[variant]}>{children}</View>
}

// ============================================================================
// AMOUNT BOX COMPONENT
// ============================================================================

interface PdfAmountBoxProps {
  /** Label text */
  label: string
  /** Amount to display */
  amount: string
  /** Whether amount is positive (green) or negative (red) */
  isPositive?: boolean
}

export function PdfAmountBox({
  label,
  amount,
  isPositive = true,
}: PdfAmountBoxProps) {
  return (
    <View style={styles.cardSuccess}>
      <View style={[styles.row, { alignItems: "center" }]}>
        <Text
          style={{
            fontSize: pdfFonts.body + 3,
            color: pdfColors.textSecondary,
            fontWeight: pdfFonts.weights.bold,
          }}
        >
          {label}
        </Text>
        <Text
          style={{
            fontSize: pdfFonts.title,
            color: isPositive ? pdfColors.primary : pdfColors.error,
            fontWeight: pdfFonts.weights.bold,
          }}
        >
          {amount}
        </Text>
      </View>
    </View>
  )
}

// ============================================================================
// STATS GRID COMPONENT
// ============================================================================

interface StatItem {
  label: string
  value: string | number
  color?: string
}

interface PdfStatsGridProps {
  stats: StatItem[]
  columns?: 2 | 3 | 4
}

export function PdfStatsGrid({ stats, columns = 4 }: PdfStatsGridProps) {
  const width = `${100 / columns}%`

  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: pdfSpacing.element }}>
      {stats.map((stat, index) => (
        <View key={index} style={{ width, padding: pdfSpacing.cardTiny }}>
          <Text style={{ fontSize: pdfFonts.micro, color: pdfColors.textMuted, marginBottom: 2 }}>
            {stat.label}
          </Text>
          <Text
            style={{
              fontSize: pdfFonts.sectionTitle,
              fontWeight: pdfFonts.weights.bold,
              color: stat.color || pdfColors.textPrimary,
            }}
          >
            {stat.value}
          </Text>
        </View>
      ))}
    </View>
  )
}

// ============================================================================
// EXPORT INDEX
// ============================================================================

export const PdfComponents = {
  Header: PdfHeader,
  Footer: PdfFooter,
  Section: PdfSection,
  Table: PdfTable,
  Row: PdfRow,
  Divider: PdfDivider,
  StatusBadge: PdfStatusBadge,
  Card: PdfCard,
  AmountBox: PdfAmountBox,
  StatsGrid: PdfStatsGrid,
}
