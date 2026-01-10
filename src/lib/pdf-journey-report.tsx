import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer"
import {
  TenantJourneyData,
  JourneyEvent,
  EventCategory,
} from "@/types/journey.types"

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  // Page styles
  page: {
    flexDirection: "column",
    backgroundColor: "#ffffff",
    padding: 40,
    fontFamily: "Helvetica",
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#10B981",
  },
  brandSection: {
    flexDirection: "column",
  },
  brandName: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#10B981",
    marginBottom: 2,
  },
  brandTagline: {
    fontSize: 8,
    color: "#6B7280",
  },
  reportInfo: {
    alignItems: "flex-end",
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  reportSubtitle: {
    fontSize: 9,
    color: "#6B7280",
  },

  // Section styles
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#374151",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },

  // Profile box
  profileBox: {
    backgroundColor: "#F9FAFB",
    padding: 15,
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  profileMain: {
    flex: 1,
  },
  tenantName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  profileDetail: {
    fontSize: 9,
    color: "#6B7280",
    marginBottom: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#ffffff",
  },

  // Score cards
  scoreCardsRow: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 10,
  },
  scoreCard: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  scoreLabel: {
    fontSize: 8,
    color: "#6B7280",
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 2,
  },
  scoreLevel: {
    fontSize: 8,
    fontWeight: "bold",
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 15,
  },
  statItem: {
    width: "25%",
    padding: 8,
  },
  statLabel: {
    fontSize: 8,
    color: "#6B7280",
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#111827",
  },

  // Financial box
  financialBox: {
    backgroundColor: "#F0FDF4",
    padding: 15,
    borderRadius: 6,
    marginBottom: 15,
  },
  financialRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  financialLabel: {
    fontSize: 9,
    color: "#374151",
  },
  financialValue: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#111827",
  },
  financialHighlight: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#10B981",
  },
  financialDanger: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#EF4444",
  },

  // Alert box
  alertBox: {
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 6,
    marginBottom: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#EF4444",
  },
  alertTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#991B1B",
    marginBottom: 2,
  },
  alertDescription: {
    fontSize: 8,
    color: "#7F1D1D",
  },

  // Table styles
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#374151",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  tableRowAlt: {
    backgroundColor: "#FAFAFA",
  },
  tableCell: {
    fontSize: 8,
    color: "#4B5563",
  },
  tableCellBold: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#111827",
  },

  // Timeline styles
  timelineItem: {
    flexDirection: "row",
    marginBottom: 10,
  },
  timelineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
    marginTop: 2,
  },
  timelineContent: {
    flex: 1,
  },
  timelineTitle: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 2,
  },
  timelineDescription: {
    fontSize: 8,
    color: "#6B7280",
    marginBottom: 2,
  },
  timelineDate: {
    fontSize: 7,
    color: "#9CA3AF",
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: {
    fontSize: 8,
    color: "#9CA3AF",
  },
  footerBrand: {
    fontSize: 8,
    color: "#10B981",
    fontWeight: "bold",
  },
  pageNumber: {
    fontSize: 8,
    color: "#9CA3AF",
  },

  // Divider
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
    marginVertical: 10,
  },

  // Empty state
  emptyState: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 10,
    color: "#9CA3AF",
  },
})

// ============================================
// Helper Functions
// ============================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount)
}

function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getStatusColor(status: string): string {
  switch (status?.toLowerCase()) {
    case "active":
    case "paid":
    case "resolved":
    case "completed":
      return "#10B981"
    case "pending":
    case "partial":
      return "#F59E0B"
    case "overdue":
    case "inactive":
    case "critical":
      return "#EF4444"
    default:
      return "#6B7280"
  }
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10B981"
  if (score >= 60) return "#22C55E"
  if (score >= 40) return "#F59E0B"
  if (score >= 20) return "#F97316"
  return "#EF4444"
}

function getCategoryColor(category: string): string {
  switch (category) {
    case EventCategory.ONBOARDING:
      return "#10B981"
    case EventCategory.FINANCIAL:
      return "#0EA5E9"
    case EventCategory.ACCOMMODATION:
      return "#14B8A6"
    case EventCategory.COMPLAINT:
      return "#F43F5E"
    case EventCategory.EXIT:
      return "#F59E0B"
    case EventCategory.VISITOR:
      return "#8B5CF6"
    default:
      return "#6B7280"
  }
}

// ============================================
// PDF Component Interfaces
// ============================================

export interface JourneyReportData extends TenantJourneyData {
  owner_name?: string
  owner_phone?: string
  property_address?: string
  report_generated_by?: string
}

// ============================================
// Page Components
// ============================================

function PageHeader({ title }: { title: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandSection}>
        <Text style={styles.brandName}>ManageKar</Text>
        <Text style={styles.brandTagline}>From Chaos to Clarity</Text>
      </View>
      <View style={styles.reportInfo}>
        <Text style={styles.reportTitle}>{title}</Text>
        <Text style={styles.reportSubtitle}>
          Generated: {formatDateTime(new Date().toISOString())}
        </Text>
      </View>
    </View>
  )
}

function PageFooter({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) {
  return (
    <View style={styles.footer}>
      <Text style={styles.footerText}>Confidential - Internal Use Only</Text>
      <Text style={styles.footerBrand}>Powered by ManageKar</Text>
      <Text style={styles.pageNumber}>
        Page {pageNumber} of {totalPages}
      </Text>
    </View>
  )
}

// ============================================
// Summary Page
// ============================================

function SummaryPage({ data }: { data: JourneyReportData }) {
  const { insights, analytics, financial } = data

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader title="TENANT JOURNEY REPORT" />

      {/* Tenant Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tenant Profile</Text>
        <View style={styles.profileBox}>
          <View style={styles.profileMain}>
            <Text style={styles.tenantName}>{data.tenant_name}</Text>
            <Text style={styles.profileDetail}>
              Property: {data.property?.name || "N/A"} | Room: {data.room?.room_number || "N/A"}
            </Text>
            <Text style={styles.profileDetail}>
              Check-in Date: {formatDate(data.check_in_date)}
            </Text>
            <Text style={styles.profileDetail}>
              Total Stay: {analytics.total_stay_days} days ({analytics.total_stays} stays)
            </Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(data.tenant_status) },
            ]}
          >
            <Text style={styles.statusText}>
              {data.tenant_status?.toUpperCase() || "ACTIVE"}
            </Text>
          </View>
        </View>
      </View>

      {/* AI Scores */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI-Powered Insights</Text>
        <View style={styles.scoreCardsRow}>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Payment Reliability</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(insights.payment_reliability_score) }]}>
              {insights.payment_reliability_score}
            </Text>
            <Text style={[styles.scoreLevel, { color: getScoreColor(insights.payment_reliability_score) }]}>
              {insights.payment_reliability_level?.toUpperCase()}
            </Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Churn Risk</Text>
            <Text style={[styles.scoreValue, { color: getScoreColor(100 - insights.churn_risk_score) }]}>
              {insights.churn_risk_score}
            </Text>
            <Text style={[styles.scoreLevel, { color: getScoreColor(100 - insights.churn_risk_score) }]}>
              {insights.churn_risk_level?.toUpperCase()}
            </Text>
          </View>
          <View style={styles.scoreCard}>
            <Text style={styles.scoreLabel}>Satisfaction</Text>
            <Text style={[styles.scoreValue, { color: insights.satisfaction_level === "high" ? "#10B981" : insights.satisfaction_level === "medium" ? "#F59E0B" : "#EF4444" }]}>
              {insights.satisfaction_level === "high" ? "85+" : insights.satisfaction_level === "medium" ? "50-84" : "<50"}
            </Text>
            <Text style={[styles.scoreLevel, { color: insights.satisfaction_level === "high" ? "#10B981" : insights.satisfaction_level === "medium" ? "#F59E0B" : "#EF4444" }]}>
              {insights.satisfaction_level?.toUpperCase()}
            </Text>
          </View>
        </View>
      </View>

      {/* Key Metrics */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Total Payments</Text>
            <Text style={styles.statValue}>{analytics.total_payments}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Bills Paid On Time</Text>
            <Text style={styles.statValue}>{analytics.bills_paid_on_time}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Bills Paid Late</Text>
            <Text style={styles.statValue}>{analytics.bills_paid_late}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Avg Days to Pay</Text>
            <Text style={styles.statValue}>{analytics.average_days_to_pay}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Complaints</Text>
            <Text style={styles.statValue}>{analytics.total_complaints}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Room Transfers</Text>
            <Text style={styles.statValue}>{analytics.total_room_transfers}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Documents</Text>
            <Text style={styles.statValue}>{analytics.documents_submitted}</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>Visitors</Text>
            <Text style={styles.statValue}>{analytics.total_visitors}</Text>
          </View>
        </View>
      </View>

      {/* Financial Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financial Summary</Text>
        <View style={styles.financialBox}>
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Total Revenue Generated</Text>
            <Text style={styles.financialHighlight}>{formatCurrency(analytics.total_revenue)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Total Billed</Text>
            <Text style={styles.financialValue}>{formatCurrency(financial.total_billed)}</Text>
          </View>
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Total Paid</Text>
            <Text style={styles.financialValue}>{formatCurrency(financial.total_paid)}</Text>
          </View>
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Outstanding Balance</Text>
            <Text style={financial.total_outstanding > 0 ? styles.financialDanger : styles.financialValue}>
              {formatCurrency(financial.total_outstanding)}
            </Text>
          </View>
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Security Deposit</Text>
            <Text style={styles.financialValue}>{formatCurrency(financial.security_deposit_paid)}</Text>
          </View>
          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Current Monthly Rent</Text>
            <Text style={styles.financialValue}>{formatCurrency(financial.current_monthly_rent)}</Text>
          </View>
        </View>
      </View>

      {/* Active Alerts */}
      {insights.active_alerts && insights.active_alerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Risk Alerts</Text>
          {insights.active_alerts.slice(0, 3).map((alert, index) => (
            <View key={index} style={styles.alertBox}>
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertDescription}>{alert.description}</Text>
            </View>
          ))}
        </View>
      )}

      <PageFooter pageNumber={1} totalPages={4} />
    </Page>
  )
}

// ============================================
// Financial History Page
// ============================================

function FinancialHistoryPage({ data }: { data: JourneyReportData }) {
  // Filter financial events
  const paymentEvents = data.events.filter(
    (e) => e.type === "payment_received" || e.type === "refund_processed"
  )
  const billEvents = data.events.filter(
    (e) => e.type === "bill_generated"
  )

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader title="FINANCIAL HISTORY" />

      {/* Payments Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Payment History ({paymentEvents.length} transactions)</Text>
        {paymentEvents.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Date</Text>
              <Text style={[styles.tableHeaderCell, { width: "35%" }]}>Description</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Amount</Text>
              <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Status</Text>
            </View>
            {paymentEvents.slice(0, 15).map((event, index) => (
              <View
                key={event.id}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {formatDate(event.timestamp)}
                </Text>
                <Text style={[styles.tableCell, { width: "35%" }]}>
                  {event.title}
                </Text>
                <Text style={[styles.tableCellBold, { width: "20%", color: event.amount_type === "credit" ? "#10B981" : "#EF4444" }]}>
                  {event.amount ? formatCurrency(event.amount) : "-"}
                </Text>
                <Text style={[styles.tableCell, { width: "25%" }]}>
                  {event.status || "Completed"}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No payment records found</Text>
          </View>
        )}
      </View>

      {/* Bills Table */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Billing History ({billEvents.length} bills)</Text>
        {billEvents.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Date</Text>
              <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Bill #</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Amount</Text>
              <Text style={[styles.tableHeaderCell, { width: "35%" }]}>Description</Text>
            </View>
            {billEvents.slice(0, 15).map((event, index) => (
              <View
                key={event.id}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {formatDate(event.timestamp)}
                </Text>
                <Text style={[styles.tableCellBold, { width: "25%" }]}>
                  {event.related_entities?.bill_number || "-"}
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {event.amount ? formatCurrency(event.amount) : "-"}
                </Text>
                <Text style={[styles.tableCell, { width: "35%" }]}>
                  {event.description}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No billing records found</Text>
          </View>
        )}
      </View>

      {/* Charge Type Breakdown */}
      {data.financial.breakdown.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Breakdown by Charge Type</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "40%" }]}>Charge Type</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Billed</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Paid</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Balance</Text>
            </View>
            {data.financial.breakdown.map((item, index) => (
              <View
                key={item.charge_type_code}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.tableCellBold, { width: "40%" }]}>
                  {item.charge_type}
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {formatCurrency(item.total_billed)}
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {formatCurrency(item.total_paid)}
                </Text>
                <Text style={[styles.tableCell, { width: "20%", color: item.balance > 0 ? "#EF4444" : "#10B981" }]}>
                  {formatCurrency(item.balance)}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <PageFooter pageNumber={2} totalPages={4} />
    </Page>
  )
}

// ============================================
// Interactions Page
// ============================================

function InteractionsPage({ data }: { data: JourneyReportData }) {
  // Filter events by category
  const stayEvents = data.events.filter(
    (e) => e.category === EventCategory.ONBOARDING || e.category === EventCategory.EXIT
  )
  const accommodationEvents = data.events.filter(
    (e) => e.category === EventCategory.ACCOMMODATION
  )
  const complaintEvents = data.events.filter(
    (e) => e.category === EventCategory.COMPLAINT
  )

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader title="INTERACTIONS & HISTORY" />

      {/* Stay History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stay History ({stayEvents.length} events)</Text>
        {stayEvents.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Date</Text>
              <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Event</Text>
              <Text style={[styles.tableHeaderCell, { width: "55%" }]}>Details</Text>
            </View>
            {stayEvents.slice(0, 10).map((event, index) => (
              <View
                key={event.id}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {formatDate(event.timestamp)}
                </Text>
                <Text style={[styles.tableCellBold, { width: "25%" }]}>
                  {event.title}
                </Text>
                <Text style={[styles.tableCell, { width: "55%" }]}>
                  {event.description}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No stay events recorded</Text>
          </View>
        )}
      </View>

      {/* Room Transfers */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Room Transfers ({accommodationEvents.length} transfers)</Text>
        {accommodationEvents.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Date</Text>
              <Text style={[styles.tableHeaderCell, { width: "80%" }]}>Transfer Details</Text>
            </View>
            {accommodationEvents.slice(0, 8).map((event, index) => (
              <View
                key={event.id}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {formatDate(event.timestamp)}
                </Text>
                <Text style={[styles.tableCell, { width: "80%" }]}>
                  {event.description}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No room transfers recorded</Text>
          </View>
        )}
      </View>

      {/* Complaints */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Complaints ({complaintEvents.length} complaints)</Text>
        {complaintEvents.length > 0 ? (
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Date</Text>
              <Text style={[styles.tableHeaderCell, { width: "55%" }]}>Description</Text>
              <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Status</Text>
              <Text style={[styles.tableHeaderCell, { width: "15%" }]}>Priority</Text>
            </View>
            {complaintEvents.slice(0, 8).map((event, index) => (
              <View
                key={event.id}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.tableCell, { width: "15%" }]}>
                  {formatDate(event.timestamp)}
                </Text>
                <Text style={[styles.tableCell, { width: "55%" }]}>
                  {event.description}
                </Text>
                <Text style={[styles.tableCell, { width: "15%", color: getStatusColor(event.status || "") }]}>
                  {event.status || "-"}
                </Text>
                <Text style={[styles.tableCell, { width: "15%" }]}>
                  {(event.metadata as { priority?: string })?.priority || "-"}
                </Text>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No complaints recorded</Text>
          </View>
        )}
      </View>

      <PageFooter pageNumber={3} totalPages={4} />
    </Page>
  )
}

// ============================================
// Timeline Page
// ============================================

function TimelinePage({ data }: { data: JourneyReportData }) {
  // Get recent events for timeline view
  const recentEvents = data.events.slice(0, 25)

  return (
    <Page size="A4" style={styles.page}>
      <PageHeader title="EVENT TIMELINE" />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Recent Activity ({data.total_events} total events)
        </Text>
        {recentEvents.map((event) => (
          <View key={event.id} style={styles.timelineItem}>
            <View
              style={[
                styles.timelineDot,
                { backgroundColor: getCategoryColor(event.category) },
              ]}
            />
            <View style={styles.timelineContent}>
              <Text style={styles.timelineTitle}>{event.title}</Text>
              <Text style={styles.timelineDescription}>{event.description}</Text>
              <Text style={styles.timelineDate}>
                {formatDateTime(event.timestamp)}
                {event.amount && ` | ${formatCurrency(event.amount)}`}
              </Text>
            </View>
          </View>
        ))}
        {data.has_more_events && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              + {data.total_events - recentEvents.length} more events not shown
            </Text>
          </View>
        )}
      </View>

      {/* Pre-tenant Visits */}
      {data.pre_tenant_visits && data.pre_tenant_visits.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Pre-Tenant Visits</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Visit Date</Text>
              <Text style={[styles.tableHeaderCell, { width: "40%" }]}>Visited</Text>
              <Text style={[styles.tableHeaderCell, { width: "35%" }]}>Days Before Joining</Text>
            </View>
            {data.pre_tenant_visits.map((visit, index) => (
              <View
                key={visit.visitor_id}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.tableCell, { width: "25%" }]}>
                  {formatDate(visit.visit_date)}
                </Text>
                <Text style={[styles.tableCell, { width: "40%" }]}>
                  {visit.visited_tenant_name}
                </Text>
                <Text style={[styles.tableCell, { width: "35%" }]}>
                  {visit.days_before_joining} days
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Linked Visitors */}
      {data.linked_visitors && data.linked_visitors.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Visitors ({data.linked_visitors.length})</Text>
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: "30%" }]}>Visitor Name</Text>
              <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Visit Date</Text>
              <Text style={[styles.tableHeaderCell, { width: "25%" }]}>Relationship</Text>
              <Text style={[styles.tableHeaderCell, { width: "20%" }]}>Match Type</Text>
            </View>
            {data.linked_visitors.slice(0, 10).map((visitor, index) => (
              <View
                key={visitor.visitor_id}
                style={[styles.tableRow, index % 2 === 1 ? styles.tableRowAlt : {}]}
              >
                <Text style={[styles.tableCellBold, { width: "30%" }]}>
                  {visitor.visitor_name}
                </Text>
                <Text style={[styles.tableCell, { width: "25%" }]}>
                  {formatDate(visitor.visit_date)}
                </Text>
                <Text style={[styles.tableCell, { width: "25%" }]}>
                  {visitor.relationship}
                </Text>
                <Text style={[styles.tableCell, { width: "20%" }]}>
                  {visitor.matched_by}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Recommendations */}
      {data.insights.recommendations && data.insights.recommendations.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI Recommendations</Text>
          {data.insights.recommendations.slice(0, 3).map((rec, index) => (
            <View
              key={index}
              style={[
                styles.alertBox,
                {
                  backgroundColor: rec.priority === "high" ? "#FEF2F2" : "#FEF3C7",
                  borderLeftColor: rec.priority === "high" ? "#EF4444" : "#F59E0B",
                },
              ]}
            >
              <Text
                style={[
                  styles.alertTitle,
                  { color: rec.priority === "high" ? "#991B1B" : "#92400E" },
                ]}
              >
                {rec.type.toUpperCase()}
              </Text>
              <Text
                style={[
                  styles.alertDescription,
                  { color: rec.priority === "high" ? "#7F1D1D" : "#78350F" },
                ]}
              >
                {rec.message}
              </Text>
            </View>
          ))}
        </View>
      )}

      <PageFooter pageNumber={4} totalPages={4} />
    </Page>
  )
}

// ============================================
// Main PDF Document
// ============================================

export function TenantJourneyReportPDF({ data }: { data: JourneyReportData }) {
  return (
    <Document>
      <SummaryPage data={data} />
      <FinancialHistoryPage data={data} />
      <InteractionsPage data={data} />
      <TimelinePage data={data} />
    </Document>
  )
}

export default TenantJourneyReportPDF
