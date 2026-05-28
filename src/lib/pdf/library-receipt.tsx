import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import { formatCurrency, formatDate } from "@/lib/format"
import { pdfBrand, pdfColors, pdfFonts, pdfSpacing } from "@/lib/pdf/theme"
import { LIBRARY_PAYMENT_TYPE_LABELS } from "@/lib/status"

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: pdfColors.white,
    padding: pdfSpacing.page,
    fontFamily: pdfFonts.family,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: pdfSpacing.sectionLarge,
    paddingBottom: pdfSpacing.section,
    borderBottomWidth: 2,
    borderBottomColor: pdfColors.library,
  },
  brandSection: {
    flexDirection: "column",
  },
  brandName: {
    fontSize: pdfFonts.title,
    fontWeight: "bold",
    color: pdfColors.library,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: pdfFonts.small,
    color: pdfColors.textMuted,
  },
  receiptInfo: {
    alignItems: "flex-end",
  },
  receiptTitle: {
    fontSize: pdfFonts.heading,
    fontWeight: "bold",
    color: pdfColors.textPrimary,
    marginBottom: 8,
  },
  receiptNumber: {
    fontSize: pdfFonts.small,
    color: pdfColors.textMuted,
    marginBottom: 4,
  },
  receiptDate: {
    fontSize: pdfFonts.small,
    color: pdfColors.textMuted,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: pdfFonts.sectionTitle,
    fontWeight: "bold",
    color: pdfColors.textSecondary,
    marginBottom: pdfSpacing.elementSmall,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: pdfSpacing.elementTiny,
  },
  label: {
    fontSize: pdfFonts.body,
    color: pdfColors.textMuted,
  },
  value: {
    fontSize: pdfFonts.body,
    color: pdfColors.textPrimary,
    fontWeight: "bold",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
    marginVertical: pdfSpacing.element,
  },
  amountBox: {
    backgroundColor: pdfColors.libraryLight,
    padding: pdfSpacing.section,
    borderRadius: pdfSpacing.radiusLarge,
    marginTop: pdfSpacing.elementSmall,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 14,
    color: pdfColors.textSecondary,
    fontWeight: "bold",
  },
  amountValue: {
    fontSize: pdfFonts.title,
    color: pdfColors.library,
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
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
    textAlign: "center",
    marginBottom: 4,
  },
  footerBrand: {
    fontSize: pdfFonts.small,
    color: pdfColors.library,
    textAlign: "center",
    fontWeight: "bold",
  },
  statusBadge: {
    backgroundColor: pdfColors.library,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: pdfSpacing.radiusBadge,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: pdfFonts.small,
    color: pdfColors.white,
    fontWeight: "bold",
  },
  libraryBox: {
    backgroundColor: pdfColors.background,
    padding: pdfSpacing.element,
    borderRadius: pdfSpacing.radius,
  },
  libraryName: {
    fontSize: 14,
    fontWeight: "bold",
    color: pdfColors.textPrimary,
    marginBottom: 4,
  },
  libraryAddress: {
    fontSize: pdfFonts.small,
    color: pdfColors.textMuted,
  },
  subscriptionBox: {
    backgroundColor: pdfColors.backgroundWarningAlt,
    padding: pdfSpacing.cardSmall,
    borderRadius: pdfSpacing.radius,
    marginTop: pdfSpacing.elementSmall,
  },
  subscriptionTitle: {
    fontSize: pdfFonts.body,
    fontWeight: "bold",
    color: pdfColors.warningText,
    marginBottom: pdfSpacing.elementTiny,
  },
  subscriptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  subscriptionLabel: {
    fontSize: pdfFonts.small,
    color: pdfColors.warningText,
  },
  subscriptionValue: {
    fontSize: pdfFonts.small,
    color: pdfColors.warningText,
    fontWeight: "bold",
  },
})

export interface LibraryReceiptData {
  receiptNumber: string
  paymentDate: string
  memberName: string
  memberPhone: string
  memberEmail?: string
  memberCode?: string
  libraryName: string
  libraryAddress?: string
  amount: number
  paymentMethod: string
  paymentType: string
  paymentReference?: string
  // Subscription details (if applicable)
  subscription?: {
    planName: string
    hoursIncluded?: number
    timeSlot?: string
    startDate: string
    endDate: string
  }
  ownerName: string
  ownerPhone?: string
  ownerEmail?: string
  notes?: string
}

export function LibraryReceiptPDF({ data }: { data: LibraryReceiptData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandSection}>
            <Text style={styles.brandName}>{pdfBrand.name}</Text>
            <Text style={styles.brandTagline}>Library Management</Text>
          </View>
          <View style={styles.receiptInfo}>
            <Text style={styles.receiptTitle}>LIBRARY RECEIPT</Text>
            <Text style={styles.receiptNumber}>Receipt #: {data.receiptNumber}</Text>
            <Text style={styles.receiptDate}>Date: {formatDate(data.paymentDate)}</Text>
          </View>
        </View>

        {/* Status Badge */}
        <View style={{ marginBottom: 20 }}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>PAID</Text>
          </View>
        </View>

        {/* Library Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Library Details</Text>
          <View style={styles.libraryBox}>
            <Text style={styles.libraryName}>{data.libraryName}</Text>
            {data.libraryAddress && (
              <Text style={styles.libraryAddress}>{data.libraryAddress}</Text>
            )}
          </View>
        </View>

        {/* Member Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Member Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{data.memberName}</Text>
          </View>
          {data.memberCode && (
            <View style={styles.row}>
              <Text style={styles.label}>Member Code</Text>
              <Text style={styles.value}>{data.memberCode}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{data.memberPhone}</Text>
          </View>
          {data.memberEmail && (
            <View style={styles.row}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{data.memberEmail}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Type</Text>
            <Text style={styles.value}>{LIBRARY_PAYMENT_TYPE_LABELS[data.paymentType] || data.paymentType}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.value}>{data.paymentMethod}</Text>
          </View>
          {data.paymentReference && (
            <View style={styles.row}>
              <Text style={styles.label}>Reference</Text>
              <Text style={styles.value}>{data.paymentReference}</Text>
            </View>
          )}
          {data.notes && (
            <View style={styles.row}>
              <Text style={styles.label}>Notes</Text>
              <Text style={styles.value}>{data.notes}</Text>
            </View>
          )}
        </View>

        {/* Subscription Details (if applicable) */}
        {data.subscription && (
          <View style={styles.subscriptionBox}>
            <Text style={styles.subscriptionTitle}>Subscription Details</Text>
            <View style={styles.subscriptionRow}>
              <Text style={styles.subscriptionLabel}>Plan</Text>
              <Text style={styles.subscriptionValue}>{data.subscription.planName}</Text>
            </View>
            {data.subscription.hoursIncluded && (
              <View style={styles.subscriptionRow}>
                <Text style={styles.subscriptionLabel}>Hours Included</Text>
                <Text style={styles.subscriptionValue}>{data.subscription.hoursIncluded} hours</Text>
              </View>
            )}
            {data.subscription.timeSlot && (
              <View style={styles.subscriptionRow}>
                <Text style={styles.subscriptionLabel}>Time Slot</Text>
                <Text style={styles.subscriptionValue}>{data.subscription.timeSlot}</Text>
              </View>
            )}
            <View style={styles.subscriptionRow}>
              <Text style={styles.subscriptionLabel}>Validity</Text>
              <Text style={styles.subscriptionValue}>
                {formatDate(data.subscription.startDate)} - {formatDate(data.subscription.endDate)}
              </Text>
            </View>
          </View>
        )}

        {/* Amount Box */}
        <View style={styles.amountBox}>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Amount Received</Text>
            <Text style={styles.amountValue}>{formatCurrency(data.amount)}</Text>
          </View>
        </View>

        {/* Owner Signature Area */}
        <View style={[styles.section, { marginTop: 40 }]}>
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>Received By</Text>
              <Text style={[styles.value, { marginTop: 4 }]}>{data.ownerName}</Text>
              {data.ownerPhone && (
                <Text style={[styles.label, { marginTop: 2 }]}>{data.ownerPhone}</Text>
              )}
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.label}>Signature</Text>
              <View
                style={{
                  width: 150,
                  height: 40,
                  borderBottomWidth: 1,
                  borderBottomColor: pdfColors.textSecondary,
                  marginTop: 30,
                }}
              />
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            This is a computer-generated receipt. For queries, contact {data.ownerPhone || data.ownerEmail || "the library owner"}.
          </Text>
          <Text style={styles.footerBrand}>
            {pdfBrand.poweredBy}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
