import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"

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
    borderBottomColor: "#10B981",
  },
  brandSection: {
    flexDirection: "column",
  },
  brandName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#10B981",
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
    backgroundColor: "#F0FDF4",
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
    color: "#10B981",
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
    color: "#10B981",
    textAlign: "center",
    fontWeight: "bold",
  },
  statusBadge: {
    backgroundColor: "#10B981",
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
  propertyBox: {
    backgroundColor: "#F9FAFB",
    padding: 15,
    borderRadius: 6,
  },
  propertyName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  propertyAddress: {
    fontSize: 10,
    color: "#6B7280",
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
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.brandSection}>
            <Text style={styles.brandName}>ManageKar</Text>
            <Text style={styles.brandTagline}>From Chaos to Clarity</Text>
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
            This is a computer-generated receipt. For queries, contact {data.ownerPhone || data.ownerEmail || "the property owner"}.
          </Text>
          <Text style={styles.footerBrand}>
            Powered by ManageKar - managekar.com
          </Text>
        </View>
      </Page>
    </Document>
  )
}
