import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import { formatCurrency, formatDate } from "@/lib/format"
import { pdfBrand } from "@/lib/pdf/theme"
import { LIBRARY_PAYMENT_TYPE_LABELS } from "@/lib/status"

// Create styles
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 40,
    fontFamily: "Helvetica",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: "#6366F1", // Indigo for library
  },
  brandSection: {
    flexDirection: "column",
  },
  brandName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#6366F1",
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 10,
    color: "#6B7280",
  },
  receiptInfo: {
    alignItems: "flex-end",
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  receiptNumber: {
    fontSize: 10,
    color: "#6B7280",
    marginBottom: 4,
  },
  receiptDate: {
    fontSize: 10,
    color: "#6B7280",
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  label: {
    fontSize: 11,
    color: "#6B7280",
  },
  value: {
    fontSize: 11,
    color: "#111827",
    fontWeight: "bold",
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginVertical: 15,
  },
  amountBox: {
    backgroundColor: "#EEF2FF", // Light indigo
    padding: 20,
    borderRadius: 8,
    marginTop: 10,
  },
  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  amountLabel: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "bold",
  },
  amountValue: {
    fontSize: 24,
    color: "#6366F1",
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    bottom: 40,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 15,
  },
  footerText: {
    fontSize: 9,
    color: "#9CA3AF",
    textAlign: "center",
    marginBottom: 4,
  },
  footerBrand: {
    fontSize: 10,
    color: "#6366F1",
    textAlign: "center",
    fontWeight: "bold",
  },
  statusBadge: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 10,
    color: "#ffffff",
    fontWeight: "bold",
  },
  libraryBox: {
    backgroundColor: "#F9FAFB",
    padding: 15,
    borderRadius: 6,
  },
  libraryName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  libraryAddress: {
    fontSize: 10,
    color: "#6B7280",
  },
  subscriptionBox: {
    backgroundColor: "#FEF3C7", // Light amber
    padding: 12,
    borderRadius: 6,
    marginTop: 10,
  },
  subscriptionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#92400E",
    marginBottom: 6,
  },
  subscriptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  subscriptionLabel: {
    fontSize: 10,
    color: "#92400E",
  },
  subscriptionValue: {
    fontSize: 10,
    color: "#92400E",
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
                  borderBottomColor: "#374151",
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
