import { createClient } from "@/lib/supabase/client"
import { transformArrayJoins, transformJoin } from "@/lib/supabase/transforms"
import { logger, extractErrorMeta } from "@/lib/logger"
import {
  JourneyAnalytics,
  FinancialSummary,
  PredictiveInsights,
  LinkedVisitor,
  PreTenantVisit,
  EventCategory,
  EventCategoryType,
  createDefaultAnalytics,
  createDefaultFinancialSummary,
} from "@/types/journey.types"
import { formatCurrency } from "@/lib/format"
import { getNowISO } from "@/lib/date-helpers"
import {
  MAX_OVERDUE_PENALTY,
  OVERDUE_PENALTY_DIVISOR,
  NEW_TENANT_PAYMENT_SCORE,
  PERFECT_PAYMENT_BONUS,
  OVERDUE_THRESHOLD_HIGH,
} from "@/lib/constants"
import { TenantRecord, daysBetween, normalizePhone } from "./types"

export type { EventCategoryType }
export { createDefaultAnalytics, createDefaultFinancialSummary }

const journeyLogger = logger.child("journey")

// ============================================
// Analytics Calculation
// ============================================

export async function calculateAnalytics(
  supabase: ReturnType<typeof createClient>,
  tenant_id: string,
  tenant: TenantRecord
): Promise<JourneyAnalytics> {
  // Parallel queries for analytics data
  const [staysResult, billsResult, paymentsResult, complaintsResult, transfersResult, visitorsResult] = await Promise.all([
    supabase.from("tenant_stays").select("id, join_date, exit_date, status").eq("tenant_id", tenant_id),
    supabase.from("bills").select("id, total_amount, paid_amount, status, due_date, bill_date, created_at").eq("tenant_id", tenant_id),
    supabase.from("payments").select("id, amount, payment_date, created_at").eq("tenant_id", tenant_id),
    supabase.from("complaints").select("id, status").eq("tenant_id", tenant_id),
    supabase.from("room_transfers").select("id").eq("tenant_id", tenant_id),
    supabase.from("visitors").select("id").eq("tenant_id", tenant_id),
  ])

  if (staysResult.error) {
    journeyLogger.warn("Error fetching analytics stays", extractErrorMeta(staysResult.error))
  }
  if (billsResult.error) {
    journeyLogger.warn("Error fetching analytics bills", extractErrorMeta(billsResult.error))
  }
  if (paymentsResult.error) {
    journeyLogger.warn("Error fetching analytics payments", extractErrorMeta(paymentsResult.error))
  }
  if (complaintsResult.error) {
    journeyLogger.warn("Error fetching analytics complaints", extractErrorMeta(complaintsResult.error))
  }
  if (transfersResult.error) {
    journeyLogger.warn("Error fetching analytics transfers", extractErrorMeta(transfersResult.error))
  }
  if (visitorsResult.error) {
    journeyLogger.warn("Error fetching analytics visitors", extractErrorMeta(visitorsResult.error))
  }

  const safeStays = staysResult.data || []
  const safeBills = billsResult.data || []
  const safePayments = paymentsResult.data || []
  const safeComplaints = complaintsResult.data || []

  // Calculate stay duration
  const checkInDate = tenant.check_in_date ? new Date(tenant.check_in_date) : new Date()
  const today = new Date()
  const totalStayDays = daysBetween(checkInDate, today)

  // Calculate payment metrics
  const billsPaid = safeBills.filter((b: { status: string }) => b.status === "paid")
  const totalBillsPaid = billsPaid.length

  // Calculate bills paid on time vs late
  let billsPaidOnTime = 0
  let billsPaidLate = 0
  let totalDaysToPaySum = 0
  let paidBillsWithDates = 0

  for (const bill of safeBills) {
    if (bill.status !== "paid") continue

    const billDate = new Date(bill.created_at || bill.bill_date)
    const dueDate = new Date(bill.due_date)

    // Find the payment closest to this bill
    const relevantPayments = safePayments.filter((p: { payment_date?: string; created_at: string }) => {
      const payDate = new Date(p.payment_date || p.created_at)
      return payDate >= billDate
    }).sort((a: { created_at: string }, b: { created_at: string }) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    if (relevantPayments.length > 0) {
      const payment = relevantPayments[0]
      const payDate = new Date(payment.payment_date || payment.created_at)

      if (payDate <= dueDate) {
        billsPaidOnTime++
      } else {
        billsPaidLate++
      }

      const daysToPayLocal = daysBetween(billDate, payDate)
      totalDaysToPaySum += daysToPayLocal
      paidBillsWithDates++
    }
  }

  const averageDaysToPay = paidBillsWithDates > 0 ? Math.round(totalDaysToPaySum / paidBillsWithDates) : 0

  // Calculate average stay duration
  let avgStayDuration = totalStayDays
  if (safeStays.length > 0) {
    const stayDurations = safeStays.map((s: { join_date: string; exit_date?: string }) => {
      const start = new Date(s.join_date)
      const end = s.exit_date ? new Date(s.exit_date) : today
      return daysBetween(start, end)
    })
    avgStayDuration = Math.round(stayDurations.reduce((a: number, b: number) => a + b, 0) / stayDurations.length)
  }

  return {
    total_stay_days: totalStayDays,
    current_stay_days: totalStayDays,
    total_stays: safeStays.length || 1,
    average_stay_duration: avgStayDuration,
    total_revenue: safePayments.reduce((sum: number, p: { amount?: number }) => sum + (p.amount || 0), 0),
    total_payments: safePayments.length,
    total_bills_generated: safeBills.length,
    total_bills_paid: totalBillsPaid,
    bills_paid_on_time: billsPaidOnTime,
    bills_paid_late: billsPaidLate,
    average_days_to_pay: averageDaysToPay,
    total_complaints: safeComplaints.length,
    complaints_resolved: safeComplaints.filter((c: { status: string }) => c.status === "resolved" || c.status === "closed").length,
    total_room_transfers: transfersResult.data?.length || 0,
    total_visitors: visitorsResult.data?.length || 0,
    documents_submitted: 0,
    documents_verified: 0,
    police_verification_status: tenant.police_verification_status || "pending",
    agreement_status: tenant.agreement_signed ? "signed" : "pending",
  }
}

// ============================================
// Financial Summary Calculation
// ============================================

export async function calculateFinancialSummary(
  supabase: ReturnType<typeof createClient>,
  tenant_id: string,
  tenant: TenantRecord
): Promise<FinancialSummary> {
  const [billsResult, paymentsResult, chargesResult, refundsResult] = await Promise.all([
    supabase.from("bills").select("*").eq("tenant_id", tenant_id),
    supabase.from("payments").select("*, charge_type:charge_types(id, name, code)").eq("tenant_id", tenant_id),
    supabase.from("charges").select("*, charge_type:charge_types(id, name, code)").eq("tenant_id", tenant_id),
    supabase.from("refunds").select("*").eq("tenant_id", tenant_id),
  ])

  if (billsResult.error) {
    journeyLogger.warn("Error fetching financial bills", extractErrorMeta(billsResult.error))
  }
  if (paymentsResult.error) {
    journeyLogger.warn("Error fetching financial payments", extractErrorMeta(paymentsResult.error))
  }
  if (chargesResult.error) {
    journeyLogger.warn("Error fetching financial charges", extractErrorMeta(chargesResult.error))
  }
  if (refundsResult.error) {
    journeyLogger.warn("Error fetching financial refunds", extractErrorMeta(refundsResult.error))
  }

  const safeBills = billsResult.data || []
  const safePayments = transformArrayJoins(paymentsResult.data || [], ["charge_type"])
  const safeCharges = transformArrayJoins(chargesResult.data || [], ["charge_type"])
  const safeRefunds = refundsResult.data || []

  // Calculate totals
  const totalBilled = safeBills.reduce((sum: number, b: { total_amount?: number }) => sum + (b.total_amount || 0), 0)
  const totalPaid = safePayments.reduce((sum: number, p: { amount?: number }) => sum + (p.amount || 0), 0)
  const totalOutstanding = safeBills
    .filter((b: { status: string }) => b.status !== "paid" && b.status !== "cancelled" && b.status !== "waived")
    .reduce((sum: number, b: { balance_due?: number }) => sum + (b.balance_due || 0), 0)
  const totalOverdue = safeBills
    .filter((b: { status: string }) => b.status === "overdue")
    .reduce((sum: number, b: { balance_due?: number }) => sum + (b.balance_due || 0), 0)

  // Build breakdown by charge type
  interface ChargeWithType {
    amount?: number
    paid_amount?: number
    charge_type?: { code?: string; name?: string }
  }
  const chargeTypeMap = new Map<string, { name: string; billed: number; paid: number }>()

  for (const charge of safeCharges as ChargeWithType[]) {
    const typeCode = charge.charge_type?.code || "other"
    const typeName = charge.charge_type?.name || "Other"
    const existing = chargeTypeMap.get(typeCode) || { name: typeName, billed: 0, paid: 0 }
    existing.billed += charge.amount || 0
    existing.paid += charge.paid_amount || 0
    chargeTypeMap.set(typeCode, existing)
  }

  const breakdown = Array.from(chargeTypeMap.entries()).map(([code, data]) => ({
    charge_type: data.name,
    charge_type_code: code,
    total_billed: data.billed,
    total_paid: data.paid,
    balance: data.billed - data.paid,
  }))

  // Find next due
  const pendingBills = safeBills
    .filter((b: { status: string }) => b.status === "pending" || b.status === "partial")
    .sort((a: { due_date: string }, b: { due_date: string }) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())

  const nextBill = pendingBills[0]

  return {
    security_deposit_paid: tenant.security_deposit_paid || 0,
    security_deposit_expected: tenant.security_deposit || 0,
    advance_amount: tenant.advance_amount || 0,
    advance_balance: tenant.advance_balance || 0,
    total_billed: totalBilled,
    total_paid: totalPaid,
    total_outstanding: totalOutstanding,
    total_overdue: totalOverdue,
    breakdown,
    total_refunds_processed: safeRefunds
      .filter((r: { status: string }) => r.status === "completed")
      .reduce((sum: number, r: { amount?: number }) => sum + (r.amount || 0), 0),
    pending_refunds: safeRefunds
      .filter((r: { status: string }) => r.status === "pending" || r.status === "processing")
      .reduce((sum: number, r: { amount?: number }) => sum + (r.amount || 0), 0),
    current_monthly_rent: tenant.monthly_rent || 0,
    next_due_date: nextBill?.due_date || null,
    next_due_amount: nextBill?.balance_due || null,
  }
}

// ============================================
// Predictive Insights Calculation
// ============================================

export function calculatePredictiveInsights(
  tenant: TenantRecord,
  analytics: JourneyAnalytics,
  financial: FinancialSummary
): PredictiveInsights {
  const recommendations: PredictiveInsights["recommendations"] = []
  const churnFactors: string[] = []
  const satisfactionFactors: string[] = []
  const activeAlerts: PredictiveInsights["active_alerts"] = []

  // === Payment Reliability Score (0-100) ===
  let paymentScore = 50

  if (analytics.total_bills_paid > 0) {
    const onTimeRate = analytics.bills_paid_on_time / analytics.total_bills_paid
    paymentScore += Math.round(onTimeRate * 30)

    if (analytics.average_days_to_pay > 15) {
      paymentScore -= Math.min(15, analytics.average_days_to_pay - 15)
    }

    if (analytics.bills_paid_late === 0 && analytics.total_bills_paid >= 3) {
      paymentScore += PERFECT_PAYMENT_BONUS
    }
  } else if (analytics.total_bills_generated === 0) {
    paymentScore = NEW_TENANT_PAYMENT_SCORE
  }

  // CQ-010: Use named constants for penalty calculation
  if (financial.total_overdue > 0) {
    paymentScore -= Math.min(MAX_OVERDUE_PENALTY, Math.round(financial.total_overdue / OVERDUE_PENALTY_DIVISOR))
  }

  paymentScore = Math.max(0, Math.min(100, paymentScore))

  // Payment reliability level
  const paymentLevel = paymentScore >= 90 ? "excellent" :
    paymentScore >= 70 ? "good" :
    paymentScore >= 50 ? "fair" :
    paymentScore >= 30 ? "poor" : "critical"

  // === Churn Risk Score (0-100) ===
  let churnScore = 20

  if (tenant.status === "notice_period") {
    churnScore += 60
    churnFactors.push("Currently on notice period")
  }

  if (analytics.total_complaints > 2) {
    const unresolvedRate = 1 - (analytics.complaints_resolved / analytics.total_complaints)
    if (unresolvedRate > 0.5) {
      churnScore += 15
      churnFactors.push("Multiple unresolved complaints")
    }
  }

  if (analytics.total_room_transfers >= 2) {
    churnScore += 10
    churnFactors.push("Multiple room transfers")
  }

  if (paymentScore < 40) {
    churnScore += 10
    churnFactors.push("Payment reliability concerns")
  }

  if (analytics.total_stays > 1 && analytics.average_stay_duration < 90) {
    churnScore += 15
    churnFactors.push("Short average stay duration")
  }

  churnScore = Math.max(0, Math.min(100, churnScore))

  const churnLevel = churnScore < 30 ? "low" :
    churnScore < 50 ? "medium" :
    churnScore < 75 ? "high" : "critical"

  // === Satisfaction Level ===
  let satisfactionScore = 70

  if (analytics.total_complaints === 0) {
    satisfactionScore += 15
    satisfactionFactors.push("No complaints filed")
  } else if (analytics.complaints_resolved === analytics.total_complaints) {
    satisfactionScore += 10
    satisfactionFactors.push("All complaints resolved")
  } else {
    satisfactionScore -= 10
    satisfactionFactors.push("Pending complaints")
  }

  if (analytics.total_stay_days > 365) {
    satisfactionScore += 10
    satisfactionFactors.push("Long-term resident")
  }

  if (analytics.total_stays > 1) {
    satisfactionScore += 10
    satisfactionFactors.push("Returning tenant")
  }

  const satisfactionLevel = satisfactionScore >= 70 ? "high" :
    satisfactionScore >= 40 ? "medium" : "low"

  // === Risk Alerts ===
  if (analytics.bills_paid_late >= 3) {
    activeAlerts.push({
      id: "consecutive_late_payments",
      type: "payment_delay",
      severity: "high",
      title: "Consecutive Late Payments",
      description: `${analytics.bills_paid_late} bills were paid after due date`,
      created_at: getNowISO(),
    })
  }

  if (financial.total_overdue > 0) {
    activeAlerts.push({
      id: "overdue_amount",
      type: "overdue",
      severity: financial.total_overdue > OVERDUE_THRESHOLD_HIGH ? "high" : "medium",
      title: "Overdue Amount",
      description: `${formatCurrency(financial.total_overdue)} is overdue`,
      created_at: getNowISO(),
      action_url: `/payments/new?tenant=${tenant.id}`,
    })
  }

  if (financial.security_deposit_paid < financial.current_monthly_rent) {
    activeAlerts.push({
      id: "low_deposit",
      type: "deposit_low",
      severity: "low",
      title: "Security Deposit Below Rent",
      description: `Deposit (${formatCurrency(financial.security_deposit_paid)}) is less than monthly rent`,
      created_at: getNowISO(),
    })
  }

  // === Recommendations ===
  if (financial.total_overdue > 0) {
    recommendations.push({
      type: "collection",
      priority: financial.total_overdue > OVERDUE_THRESHOLD_HIGH ? "high" : "medium",
      message: `Outstanding overdue: ${formatCurrency(financial.total_overdue)}. Send payment reminder.`,
      action_url: `/payments/new?tenant=${tenant.id}`,
    })
  }

  if (churnScore > 60 && tenant.status === "active") {
    recommendations.push({
      type: "retention",
      priority: "high",
      message: "High churn risk detected. Consider reaching out to understand concerns.",
    })
  }

  if (analytics.police_verification_status === "pending") {
    recommendations.push({
      type: "verification",
      priority: "medium",
      message: "Police verification pending. Complete for compliance.",
      action_url: `/tenants/${tenant.id}/edit`,
    })
  }

  if (!tenant.agreement_signed) {
    recommendations.push({
      type: "verification",
      priority: "medium",
      message: "Rental agreement not signed. Get agreement signed for legal protection.",
    })
  }

  return {
    payment_reliability_score: paymentScore,
    payment_reliability_level: paymentLevel,
    payment_reliability_trend: "stable",
    predicted_payment_behavior: paymentScore > 70 ? "on_time" : paymentScore > 40 ? "slightly_late" : "significantly_late",
    churn_risk_score: churnScore,
    churn_risk_level: churnLevel,
    churn_risk_factors: churnFactors,
    satisfaction_level: satisfactionLevel,
    satisfaction_factors: satisfactionFactors,
    active_alerts: activeAlerts,
    recommendations,
    confidence: analytics.total_bills_paid >= 3 ? "high" : analytics.total_bills_paid >= 1 ? "medium" : "low",
    data_points_analyzed: analytics.total_payments + analytics.total_bills_generated + analytics.total_complaints,
  }
}

// ============================================
// Visitor-to-Tenant Linkage
// ============================================

export async function findLinkedVisitors(
  supabase: ReturnType<typeof createClient>,
  tenant_id: string,
  tenant: TenantRecord
): Promise<{ linked: LinkedVisitor[]; preTenant: PreTenantVisit[] }> {
  // Get tenant's phone numbers for matching
  const tenantPhones: string[] = [tenant.phone].filter((p): p is string => Boolean(p))
  if (tenant.phone_numbers && Array.isArray(tenant.phone_numbers)) {
    tenant.phone_numbers.forEach((p: { number?: string }) => {
      if (p.number) tenantPhones.push(p.number)
    })
  }

  const normalizedPhones = tenantPhones.map(normalizePhone).filter(Boolean)

  // 1. Find visitors who visited THIS tenant
  const { data: linkedVisitors, error: linkedVisitorsError } = await supabase
    .from("visitors")
    .select(`
      id, visitor_name, visitor_phone, relation, check_in_time, check_in_date
    `)
    .eq("tenant_id", tenant_id)
    .order("check_in_time", { ascending: false })
    .limit(50)

  if (linkedVisitorsError) {
    journeyLogger.warn("Error fetching linked visitors", extractErrorMeta(linkedVisitorsError))
  }
  const safeLinkedVisitors = linkedVisitors || []

  // 2. Find if this tenant was a visitor before joining
  interface LinkedVisitorRecord {
    id: string
    visitor_name: string
    visitor_phone?: string
    relation?: string
    check_in_time?: string
    check_in_date?: string
  }
  const checkInDate = tenant.check_in_date
  if (!checkInDate || normalizedPhones.length === 0) {
    return {
      linked: safeLinkedVisitors.map((v: LinkedVisitorRecord) => ({
        visitor_id: v.id,
        visitor_name: v.visitor_name,
        visit_date: v.check_in_date || v.check_in_time,
        relationship: v.relation || "Not specified",
        matched_by: "manual" as const,
      })),
      preTenant: [],
    }
  }

  const { data: preTenantVisits, error: preTenantError } = await supabase
    .from("visitors")
    .select(`
      id, visitor_name, visitor_phone, check_in_time, check_in_date,
      tenant:tenants(id, name),
      property:properties(id, name)
    `)
    .lt("check_in_date", checkInDate)
    .order("check_in_time", { ascending: false })
    .limit(100)

  if (preTenantError) {
    journeyLogger.warn("Error fetching pre-tenant visits", extractErrorMeta(preTenantError))
  }
  const safePreTenantVisits = preTenantVisits || []

  // Filter pre-tenant visits by phone match
  const matchedPreTenantVisits = safePreTenantVisits
    .filter((v: { visitor_phone?: string }) => {
      if (!v.visitor_phone) return false
      const normalizedVisitorPhone = normalizePhone(v.visitor_phone)
      return normalizedPhones.includes(normalizedVisitorPhone)
    })
    .map((v: { id: string; visitor_phone?: string; check_in_date?: string; check_in_time?: string; tenant?: unknown; property?: unknown }) => {
      const visitDate = new Date(v.check_in_date || v.check_in_time || "")
      const joinDate = new Date(checkInDate)
      const daysBeforeJoining = daysBetween(visitDate, joinDate)
      const tenantJoin = transformJoin(v.tenant) as { name?: string } | null
      const propertyJoin = transformJoin(v.property) as { name?: string } | null
      return {
        visitor_id: v.id,
        visited_tenant_name: tenantJoin?.name || "Unknown",
        visit_date: v.check_in_date || v.check_in_time,
        days_before_joining: daysBeforeJoining,
        property_name: propertyJoin?.name,
      }
    })

  return {
    linked: safeLinkedVisitors.map((v: LinkedVisitorRecord) => ({
      visitor_id: v.id,
      visitor_name: v.visitor_name,
      visit_date: v.check_in_date || v.check_in_time,
      relationship: v.relation || "Not specified",
      matched_by: "manual" as const,
    })),
    preTenant: matchedPreTenantVisits,
  }
}

// ============================================
// Event Category Counts (public export)
// ============================================

export async function getEventCategoryCounts(
  tenant_id: string
): Promise<Record<EventCategoryType, number>> {
  const supabase = createClient()

  const [stays, bills, payments, complaints, transfers, exits, visitors, refunds] = await Promise.all([
    supabase.from("tenant_stays").select("id", { count: "exact", head: true }).eq("tenant_id", tenant_id),
    supabase.from("bills").select("id", { count: "exact", head: true }).eq("tenant_id", tenant_id),
    supabase.from("payments").select("id", { count: "exact", head: true }).eq("tenant_id", tenant_id),
    supabase.from("complaints").select("id", { count: "exact", head: true }).eq("tenant_id", tenant_id),
    supabase.from("room_transfers").select("id", { count: "exact", head: true }).eq("tenant_id", tenant_id),
    supabase.from("exit_clearance").select("id", { count: "exact", head: true }).eq("tenant_id", tenant_id),
    supabase.from("visitors").select("id", { count: "exact", head: true }).eq("tenant_id", tenant_id),
    supabase.from("refunds").select("id", { count: "exact", head: true }).eq("tenant_id", tenant_id),
  ])

  if (stays.error) journeyLogger.warn("Error counting stays", extractErrorMeta(stays.error))
  if (bills.error) journeyLogger.warn("Error counting bills", extractErrorMeta(bills.error))
  if (payments.error) journeyLogger.warn("Error counting payments", extractErrorMeta(payments.error))
  if (complaints.error) journeyLogger.warn("Error counting complaints", extractErrorMeta(complaints.error))
  if (transfers.error) journeyLogger.warn("Error counting transfers", extractErrorMeta(transfers.error))
  if (exits.error) journeyLogger.warn("Error counting exits", extractErrorMeta(exits.error))
  if (visitors.error) journeyLogger.warn("Error counting visitors", extractErrorMeta(visitors.error))
  if (refunds.error) journeyLogger.warn("Error counting refunds", extractErrorMeta(refunds.error))

  return {
    [EventCategory.ONBOARDING]: stays.count || 0,
    [EventCategory.FINANCIAL]: (bills.count || 0) + (payments.count || 0) + (refunds.count || 0),
    [EventCategory.ACCOMMODATION]: transfers.count || 0,
    [EventCategory.COMPLAINT]: complaints.count || 0,
    [EventCategory.EXIT]: exits.count || 0,
    [EventCategory.VISITOR]: visitors.count || 0,
    [EventCategory.DOCUMENT]: 0,
    [EventCategory.COMMUNICATION]: 0,
    [EventCategory.SYSTEM]: 0,
  }
}
