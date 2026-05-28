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
    borderBottomColor: pdfColors.primary,
  },
  brandSection: {
    flexDirection: "column",
  },
  brandName: {
    fontSize: pdfFonts.title,
    fontWeight: "bold",
    color: pdfColors.primary,
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
    backgroundColor: pdfColors.backgroundSuccess,
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
    color: pdfColors.primary,
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
    color: pdfColors.primary,
    textAlign: "center",
    fontWeight: "bold",
  },
  statusBadge: {
    backgroundColor: pdfColors.primary,
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
  propertyBox: {
    backgroundColor: pdfColors.background,
    padding: pdfSpacing.element,
    borderRadius: pdfSpacing.radius,
  },
  propertyName: {
    fontSize: 14,
    fontWeight: "bold",
    color: pdfColors.textPrimary,
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: pdfFonts.small,
    color: pdfColors.textMuted,
  },
})

export interface ReceiptData {
  receiptNumber: string
  paymentDate: string
  tenantName: string
  tenantPhone: string
  tenantEmail?: string
  propertyName: string
  propertyAddress?: string
  roomNumber: string
  amount: number
  paymentMethod: string
  forPeriod?: string
  ownerName: string
  ownerPhone?: string
  ownerEmail?: string
  description?: string
}

export function RentReceiptPDF({ data }: { data: ReceiptData }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandSection}>
            <Text style={styles.brandName}>{pdfBrand.name}</Text>
            <Text style={styles.brandTagline}>{pdfBrand.tagline}</Text>
          </View>
          <View style={styles.receiptInfo}>
            <Text style={styles.receiptTitle}>PAYMENT RECEIPT</Text>
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

        {/* Property Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Property Details</Text>
          <View style={styles.propertyBox}>
            <Text style={styles.propertyName}>{data.propertyName}</Text>
            {data.propertyAddress && (
              <Text style={styles.propertyAddress}>{data.propertyAddress}</Text>
            )}
            <Text style={styles.propertyAddress}>Room: {data.roomNumber}</Text>
          </View>
        </View>

        {/* Tenant Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Received From</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Name</Text>
            <Text style={styles.value}>{data.tenantName}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Phone</Text>
            <Text style={styles.value}>{data.tenantPhone}</Text>
          </View>
          {data.tenantEmail && (
            <View style={styles.row}>
              <Text style={styles.label}>Email</Text>
              <Text style={styles.value}>{data.tenantEmail}</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Payment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Payment Method</Text>
            <Text style={styles.value}>{data.paymentMethod}</Text>
          </View>
          {data.forPeriod && (
            <View style={styles.row}>
              <Text style={styles.label}>For Period</Text>
              <Text style={styles.value}>{data.forPeriod}</Text>
            </View>
          )}
          {data.description && (
            <View style={styles.row}>
              <Text style={styles.label}>Description</Text>
              <Text style={styles.value}>{data.description}</Text>
            </View>
          )}
        </View>

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
            This is a computer-generated receipt. For queries, contact {data.ownerPhone || data.ownerEmail || "the property owner"}.
          </Text>
          <Text style={styles.footerBrand}>
            {pdfBrand.poweredBy}
          </Text>
        </View>
      </Page>
    </Document>
  )
}
