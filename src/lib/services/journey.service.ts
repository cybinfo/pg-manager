/**
 * Journey Service
 *
 * Aggregates tenant lifecycle data from multiple tables into a unified
 * journey timeline with analytics and predictive insights.
 *
 * Architecture:
 * - Parallel queries for optimal performance
 * - Event normalization layer for consistent output
 * - Uses transformJoin for Supabase JOIN handling
 */

import { createClient } from "@/lib/supabase/client"
import { transformJoin, transformArrayJoins } from "@/lib/supabase/transforms"
import {
  TenantJourneyData,
  JourneyEvent,
  JourneyAnalytics,
  FinancialSummary,
  PredictiveInsights,
  LinkedVisitor,
  PreTenantVisit,
  EventCategory,
  EventType,
  GetTenantJourneyOptions,
  createDefaultAnalytics,
  createDefaultFinancialSummary,
  createDefaultInsights,
  EventCategoryType,
  StatusColor,
} from "@/types/journey.types"
import {
  ServiceResult,
  createSuccessResult,
  createErrorResult,
  createServiceError,
  ERROR_CODES,
} from "./types"

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000
  return Math.floor(Math.abs((date2.getTime() - date1.getTime()) / oneDay))
}

function normalizePhone(phone: string): string {
  if (!phone) return ""
  const digits = phone.replace(/\D/g, "")
  if (digits.length === 12 && digits.startsWith("91")) {
    return digits.slice(2)
  }
  if (digits.length === 11 && digits.startsWith("0")) {
    return digits.slice(1)
  }
  return digits.slice(-10)
}

function getBillStatusColor(status: string): StatusColor {
  const map: Record<string, StatusColor> = {
    paid: "success",
    pending: "warning",
    partial: "warning",
    overdue: "error",
    waived: "muted",
    cancelled: "muted",
  }
  return map[status] || "muted"
}

function getComplaintStatusColor(status: string): StatusColor {
  const map: Record<string, StatusColor> = {
    open: "error",
    acknowledged: "warning",
    in_progress: "info",
    resolved: "success",
    closed: "muted",
  }
  return map[status] || "muted"
}

function getPaymentMethodLabel(method: string): string {
  const map: Record<string, string> = {
    cash: "Cash",
    upi: "UPI",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
    card: "Card",
    online: "Online",
  }
  return map[method] || method
}

// ============================================
// Main Entry Point
// ============================================

export async function getTenantJourney(
  options: GetTenantJourneyOptions
): Promise<ServiceResult<TenantJourneyData>> {
  const {
    tenant_id,
    workspace_id,
    events_limit = 50,
    events_offset = 0,
    event_categories,
    date_from,
    date_to,
    include_analytics = true,
    include_financial = true,
    include_insights = true,
    include_visitors = true,
  } = options

  try {
    const supabase = createClient()

    // Step 1: Fetch base tenant data
    const { data: tenantData, error: tenantError } = await supabase
      .from("tenants")
      .select(`
        id, name, status, phone, email, photo_url, check_in_date,
        notice_date, expected_exit_date, monthly_rent,
        security_deposit, security_deposit_paid, advance_amount, advance_balance,
        agreement_signed, police_verification_status, phone_numbers,
        property:properties(id, name, address),
        room:rooms(id, room_number, room_type)
      `)
      .eq("id", tenant_id)
      .single()

    if (tenantError || !tenantData) {
      return createErrorResult(
        createServiceError(ERROR_CODES.NOT_FOUND, "Tenant not found", { tenant_id })
      )
    }

    const tenant = {
      ...tenantData,
      property: transformJoin(tenantData.property),
      room: transformJoin(tenantData.room),
    }

    // Step 2: Execute parallel data fetches
    const [
      eventsResult,
      analyticsResult,
      financialResult,
      visitorsResult,
    ] = await Promise.all([
      fetchAndNormalizeEvents(supabase, tenant_id, {
        limit: events_limit,
        offset: events_offset,
        categories: event_categories,
        date_from,
        date_to,
      }),
      include_analytics ? calculateAnalytics(supabase, tenant_id, tenant) : Promise.resolve(createDefaultAnalytics()),
      include_financial ? calculateFinancialSummary(supabase, tenant_id, tenant) : Promise.resolve(createDefaultFinancialSummary()),
      include_visitors ? findLinkedVisitors(supabase, tenant_id, tenant) : Promise.resolve({ linked: [], preTenant: [] }),
    ])

    // Step 3: Calculate predictive insights (depends on analytics)
    const insightsResult = include_insights
      ? calculatePredictiveInsights(tenant, analyticsResult, financialResult)
      : createDefaultInsights()

    return createSuccessResult({
      tenant_id,
      tenant_name: tenant.name,
      tenant_status: tenant.status,
      tenant_photo_url: tenant.photo_url,
      check_in_date: tenant.check_in_date,
      property: tenant.property,
      room: tenant.room,
      events: eventsResult.events,
      total_events: eventsResult.total,
      has_more_events: eventsResult.total > events_offset + events_limit,
      analytics: analyticsResult,
      financial: financialResult,
      insights: insightsResult,
      linked_visitors: visitorsResult.linked,
      pre_tenant_visits: visitorsResult.preTenant,
      generated_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("[JourneyService] Error fetching tenant journey:", error)
    return createErrorResult(
      createServiceError(ERROR_CODES.UNKNOWN_ERROR, "Failed to fetch tenant journey", { error })
    )
  }
}

// ============================================
// Event Fetching and Normalization
// ============================================

interface EventFetchOptions {
  limit: number
  offset: number
  categories?: EventCategoryType[]
  date_from?: string
  date_to?: string
}

interface EventFetchResult {
  events: JourneyEvent[]
  total: number
}

async function fetchAndNormalizeEvents(
  supabase: ReturnType<typeof createClient>,
  tenant_id: string,
  options: EventFetchOptions
): Promise<EventFetchResult> {
  // Parallel fetch from all event sources
  const [
    tenantStays,
    bills,
    payments,
    charges,
    complaints,
    roomTransfers,
    exitClearances,
    refunds,
    visitors,
    meterReadings,
  ] = await Promise.all([
    fetchTenantStays(supabase, tenant_id),
    fetchBills(supabase, tenant_id),
    fetchPayments(supabase, tenant_id),
    fetchCharges(supabase, tenant_id),
    fetchComplaints(supabase, tenant_id),
    fetchRoomTransfers(supabase, tenant_id),
    fetchExitClearances(supabase, tenant_id),
    fetchRefunds(supabase, tenant_id),
    fetchTenantVisitors(supabase, tenant_id),
    fetchMeterReadings(supabase, tenant_id),
  ])

  // Normalize each source to JourneyEvent format
  const allEvents: JourneyEvent[] = [
    ...normalizeStayEvents(tenantStays),
    ...normalizeBillEvents(bills),
    ...normalizePaymentEvents(payments),
    ...normalizeChargeEvents(charges),
    ...normalizeComplaintEvents(complaints),
    ...normalizeTransferEvents(roomTransfers),
    ...normalizeExitEvents(exitClearances),
    ...normalizeRefundEvents(refunds),
    ...normalizeVisitorEvents(visitors),
    ...normalizeMeterEvents(meterReadings),
  ]

  // Filter by categories if specified
  let filteredEvents = allEvents
  if (options.categories && options.categories.length > 0) {
    filteredEvents = allEvents.filter(e => options.categories!.includes(e.category))
  }

  // Filter by date range
  if (options.date_from) {
    filteredEvents = filteredEvents.filter(e => e.timestamp >= options.date_from!)
  }
  if (options.date_to) {
    const endDate = new Date(options.date_to)
    endDate.setHours(23, 59, 59, 999)
    filteredEvents = filteredEvents.filter(e => new Date(e.timestamp) <= endDate)
  }

  // Sort by timestamp descending (most recent first)
  filteredEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  const total = filteredEvents.length

  // Apply pagination
  const paginatedEvents = filteredEvents.slice(options.offset, options.offset + options.limit)

  return { events: paginatedEvents, total }
}

// ============================================
// Individual Data Source Fetchers
// ============================================

async function fetchTenantStays(supabase: ReturnType<typeof createClient>, tenant_id: string) {
  const { data, error } = await supabase
    .from("tenant_stays")
    .select(`
      id, join_date, exit_date, monthly_rent, security_deposit, status,
      stay_number, exit_reason, created_at,
      property:properties(id, name),
      room:rooms(id, room_number)
    `)
    .eq("tenant_id", tenant_id)
    .order("stay_number", { ascending: true })

  if (error) {
    console.warn("[JourneyService] Error fetching tenant stays:", error)
    return []
  }

  return transformArrayJoins(data || [], ["property", "room"])
}

async function fetchBills(supabase: ReturnType<typeof createClient>, tenant_id: string) {
  const { data, error } = await supabase
    .from("bills")
    .select(`
      id, bill_number, bill_date, due_date, total_amount, paid_amount,
      balance_due, status, for_month, line_items, created_at,
      property:properties(id, name)
    `)
    .eq("tenant_id", tenant_id)
    .order("bill_date", { ascending: false })

  if (error) {
    console.warn("[JourneyService] Error fetching bills:", error)
    return []
  }

  return transformArrayJoins(data || [], ["property"])
}

async function fetchPayments(supabase: ReturnType<typeof createClient>, tenant_id: string) {
  const { data, error } = await supabase
    .from("payments")
    .select(`
      id, amount, payment_date, payment_method, reference_number,
      receipt_number, for_period, notes, created_at,
      bill:bills(id, bill_number),
      charge_type:charge_types(id, name, code)
    `)
    .eq("tenant_id", tenant_id)
    .order("payment_date", { ascending: false })

  if (error) {
    console.warn("[JourneyService] Error fetching payments:", error)
    return []
  }

  return transformArrayJoins(data || [], ["bill", "charge_type"])
}

async function fetchCharges(supabase: ReturnType<typeof createClient>, tenant_id: string) {
  const { data, error } = await supabase
    .from("charges")
    .select(`
      id, amount, due_date, status, for_period, paid_amount,
      late_fee_applied, created_at,
      charge_type:charge_types(id, name, code)
    `)
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: false })

  if (error) {
    console.warn("[JourneyService] Error fetching charges:", error)
    return []
  }

  return transformArrayJoins(data || [], ["charge_type"])
}

async function fetchComplaints(supabase: ReturnType<typeof createClient>, tenant_id: string) {
  const { data, error } = await supabase
    .from("complaints")
    .select(`
      id, title, description, category, status, priority,
      created_at, resolved_at, resolution_notes,
      room:rooms(id, room_number)
    `)
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: false })

  if (error) {
    console.warn("[JourneyService] Error fetching complaints:", error)
    return []
  }

  return transformArrayJoins(data || [], ["room"])
}

async function fetchRoomTransfers(supabase: ReturnType<typeof createClient>, tenant_id: string) {
  const { data, error } = await supabase
    .from("room_transfers")
    .select(`
      id, transfer_date, reason, old_rent, new_rent, created_at,
      from_property:properties!room_transfers_from_property_id_fkey(id, name),
      from_room:rooms!room_transfers_from_room_id_fkey(id, room_number),
      to_property:properties!room_transfers_to_property_id_fkey(id, name),
      to_room:rooms!room_transfers_to_room_id_fkey(id, room_number)
    `)
    .eq("tenant_id", tenant_id)
    .order("transfer_date", { ascending: false })

  if (error) {
    console.warn("[JourneyService] Error fetching room transfers:", error)
    return []
  }

  return transformArrayJoins(data || [], ["from_property", "from_room", "to_property", "to_room"])
}

async function fetchExitClearances(supabase: ReturnType<typeof createClient>, tenant_id: string) {
  const { data, error } = await supabase
    .from("exit_clearance")
    .select(`
      id, notice_given_date, expected_exit_date, actual_exit_date,
      total_dues, total_refundable, final_amount, deductions,
      settlement_status, room_inspection_done, key_returned,
      created_at, completed_at,
      property:properties(id, name),
      room:rooms(id, room_number)
    `)
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: false })

  if (error) {
    console.warn("[JourneyService] Error fetching exit clearances:", error)
    return []
  }

  return transformArrayJoins(data || [], ["property", "room"])
}

async function fetchRefunds(supabase: ReturnType<typeof createClient>, tenant_id: string) {
  const { data, error } = await supabase
    .from("refunds")
    .select(`
      id, refund_type, amount, payment_mode, status,
      refund_date, reason, notes, processed_at, created_at
    `)
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: false })

  if (error) {
    console.warn("[JourneyService] Error fetching refunds:", error)
    return []
  }

  return data || []
}

async function fetchTenantVisitors(supabase: ReturnType<typeof createClient>, tenant_id: string) {
  const { data, error } = await supabase
    .from("visitors")
    .select(`
      id, visitor_name, visitor_phone, relation, purpose,
      check_in_time, check_out_time, check_in_date, is_overnight, created_at
    `)
    .eq("tenant_id", tenant_id)
    .order("check_in_time", { ascending: false })
    .limit(50)

  if (error) {
    console.warn("[JourneyService] Error fetching visitors:", error)
    return []
  }

  return data || []
}

async function fetchMeterReadings(supabase: ReturnType<typeof createClient>, tenant_id: string) {
  // First get tenant's room, then fetch meter readings for that room
  const { data: tenantData } = await supabase
    .from("tenants")
    .select("room_id")
    .eq("id", tenant_id)
    .single()

  if (!tenantData?.room_id) return []

  const { data, error } = await supabase
    .from("meter_readings")
    .select(`
      id, reading_date, reading_value, previous_reading, units_consumed,
      amount, created_at,
      charge_type:charge_types(id, name, code)
    `)
    .eq("room_id", tenantData.room_id)
    .order("reading_date", { ascending: false })
    .limit(20)

  if (error) {
    console.warn("[JourneyService] Error fetching meter readings:", error)
    return []
  }

  return transformArrayJoins(data || [], ["charge_type"])
}

// ============================================
// Event Normalizers
// ============================================

function normalizeStayEvents(stays: any[]): JourneyEvent[] {
  const events: JourneyEvent[] = []

  stays.forEach(stay => {
    // Check-in event
    events.push({
      id: `stay_join_${stay.id}`,
      timestamp: stay.created_at || `${stay.join_date}T00:00:00Z`,
      category: EventCategory.ONBOARDING,
      type: stay.stay_number > 1 ? EventType.REJOINED : EventType.CHECK_IN,
      title: stay.stay_number > 1 ? `Rejoined (Stay #${stay.stay_number})` : "Checked In",
      description: `${stay.room?.room_number || "Room"} at ${stay.property?.name || "Property"} • Rent: ${formatCurrency(stay.monthly_rent || 0)}`,
      source_table: "tenant_stays",
      source_id: stay.id,
      amount: stay.monthly_rent,
      amount_type: "neutral",
      status: stay.status,
      status_color: stay.status === "active" ? "success" : "muted",
      related_entities: {
        property_id: stay.property?.id,
        property_name: stay.property?.name,
        room_id: stay.room?.id,
        room_number: stay.room?.room_number,
        stay_id: stay.id,
      },
      metadata: {
        stay_number: stay.stay_number,
        security_deposit: stay.security_deposit,
      },
      icon: "UserPlus",
      action_url: `/tenants/${stay.tenant_id}`,
    })

    // Exit event (if completed)
    if (stay.exit_date && stay.status === "completed") {
      events.push({
        id: `stay_exit_${stay.id}`,
        timestamp: `${stay.exit_date}T23:59:59Z`,
        category: EventCategory.EXIT,
        type: EventType.CHECKOUT_COMPLETED,
        title: "Checked Out",
        description: `Exit from ${stay.room?.room_number || "Room"} • Reason: ${stay.exit_reason || "Not specified"}`,
        source_table: "tenant_stays",
        source_id: stay.id,
        status: "completed",
        status_color: "muted",
        related_entities: {
          property_id: stay.property?.id,
          property_name: stay.property?.name,
          room_id: stay.room?.id,
          room_number: stay.room?.room_number,
        },
        metadata: {
          exit_reason: stay.exit_reason,
        },
        icon: "LogOut",
      })
    }
  })

  return events
}

function normalizeBillEvents(bills: any[]): JourneyEvent[] {
  return bills.map(bill => ({
    id: `bill_${bill.id}`,
    timestamp: bill.created_at,
    category: EventCategory.FINANCIAL,
    type: EventType.BILL_GENERATED,
    title: `Bill Generated - ${bill.bill_number}`,
    description: `${formatCurrency(bill.total_amount)} for ${bill.for_month}${bill.balance_due > 0 ? ` • Due: ${formatCurrency(bill.balance_due)}` : " • Paid"}`,
    source_table: "bills",
    source_id: bill.id,
    amount: bill.total_amount,
    amount_type: "debit",
    status: bill.status,
    status_color: getBillStatusColor(bill.status),
    related_entities: {
      property_id: bill.property?.id,
      property_name: bill.property?.name,
      bill_id: bill.id,
      bill_number: bill.bill_number,
    },
    metadata: {
      due_date: bill.due_date,
      balance_due: bill.balance_due,
      paid_amount: bill.paid_amount,
      line_items: bill.line_items,
    },
    icon: "FileText",
    action_url: `/bills/${bill.id}`,
    quick_actions: bill.status !== "paid" ? [
      { id: "record_payment", label: "Record Payment", icon: "CreditCard", href: `/payments/new?tenant=${bill.tenant_id}&bill=${bill.id}` },
    ] : [],
  }))
}

function normalizePaymentEvents(payments: any[]): JourneyEvent[] {
  return payments.map(payment => ({
    id: `payment_${payment.id}`,
    timestamp: payment.created_at,
    category: EventCategory.FINANCIAL,
    type: EventType.PAYMENT_RECEIVED,
    title: "Payment Received",
    description: `${formatCurrency(payment.amount)} via ${getPaymentMethodLabel(payment.payment_method)}${payment.for_period ? ` for ${payment.for_period}` : ""}`,
    source_table: "payments",
    source_id: payment.id,
    amount: payment.amount,
    amount_type: "credit",
    status: "completed",
    status_color: "success",
    related_entities: {
      bill_id: payment.bill?.id,
      bill_number: payment.bill?.bill_number,
      payment_id: payment.id,
    },
    metadata: {
      payment_method: payment.payment_method,
      reference_number: payment.reference_number,
      receipt_number: payment.receipt_number,
      charge_type: payment.charge_type?.name,
      notes: payment.notes,
    },
    icon: "CreditCard",
    action_url: `/payments/${payment.id}`,
    quick_actions: payment.receipt_number ? [
      { id: "view_receipt", label: "View Receipt", icon: "FileText", href: `/receipts/${payment.id}` },
    ] : [],
  }))
}

function normalizeChargeEvents(charges: any[]): JourneyEvent[] {
  return charges
    .filter(charge => charge.late_fee_applied && charge.late_fee_applied > 0)
    .map(charge => ({
      id: `charge_latefee_${charge.id}`,
      timestamp: charge.created_at,
      category: EventCategory.FINANCIAL,
      type: EventType.LATE_FEE_APPLIED,
      title: "Late Fee Applied",
      description: `${formatCurrency(charge.late_fee_applied)} late fee for ${charge.charge_type?.name || "charge"}`,
      source_table: "charges",
      source_id: charge.id,
      amount: charge.late_fee_applied,
      amount_type: "debit",
      status: "applied",
      status_color: "warning",
      metadata: {
        original_amount: charge.amount,
        charge_type: charge.charge_type?.name,
      },
      icon: "AlertTriangle",
    }))
}

function normalizeComplaintEvents(complaints: any[]): JourneyEvent[] {
  const events: JourneyEvent[] = []

  complaints.forEach(complaint => {
    // Complaint created event
    events.push({
      id: `complaint_created_${complaint.id}`,
      timestamp: complaint.created_at,
      category: EventCategory.COMPLAINT,
      type: EventType.COMPLAINT_RAISED,
      title: `Complaint: ${complaint.title}`,
      description: `${complaint.category} • Priority: ${complaint.priority}`,
      source_table: "complaints",
      source_id: complaint.id,
      status: complaint.status,
      status_color: getComplaintStatusColor(complaint.status),
      related_entities: {
        room_id: complaint.room?.id,
        room_number: complaint.room?.room_number,
        complaint_id: complaint.id,
      },
      metadata: {
        category: complaint.category,
        priority: complaint.priority,
        description: complaint.description,
      },
      icon: "AlertCircle",
      action_url: `/complaints/${complaint.id}`,
    })

    // Complaint resolved event (if applicable)
    if (complaint.status === "resolved" && complaint.resolved_at) {
      events.push({
        id: `complaint_resolved_${complaint.id}`,
        timestamp: complaint.resolved_at,
        category: EventCategory.COMPLAINT,
        type: EventType.COMPLAINT_RESOLVED,
        title: `Complaint Resolved: ${complaint.title}`,
        description: complaint.resolution_notes || "Issue resolved",
        source_table: "complaints",
        source_id: complaint.id,
        status: "resolved",
        status_color: "success",
        related_entities: {
          complaint_id: complaint.id,
        },
        metadata: {
          resolution_notes: complaint.resolution_notes,
        },
        icon: "CheckCircle",
        action_url: `/complaints/${complaint.id}`,
      })
    }
  })

  return events
}

function normalizeTransferEvents(transfers: any[]): JourneyEvent[] {
  return transfers.map(transfer => ({
    id: `transfer_${transfer.id}`,
    timestamp: transfer.created_at || `${transfer.transfer_date}T00:00:00Z`,
    category: EventCategory.ACCOMMODATION,
    type: EventType.ROOM_TRANSFER,
    title: "Room Transfer",
    description: `${transfer.from_room?.room_number || "?"} → ${transfer.to_room?.room_number || "?"} • ${transfer.reason || "No reason specified"}`,
    source_table: "room_transfers",
    source_id: transfer.id,
    amount: transfer.new_rent !== transfer.old_rent ? Math.abs(transfer.new_rent - transfer.old_rent) : undefined,
    amount_type: transfer.new_rent > transfer.old_rent ? "debit" : transfer.new_rent < transfer.old_rent ? "credit" : "neutral",
    status: "completed",
    status_color: "primary",
    related_entities: {
      property_id: transfer.to_property?.id,
      property_name: transfer.to_property?.name,
      room_id: transfer.to_room?.id,
      room_number: transfer.to_room?.room_number,
    },
    metadata: {
      from_property: transfer.from_property?.name,
      from_room: transfer.from_room?.room_number,
      to_property: transfer.to_property?.name,
      to_room: transfer.to_room?.room_number,
      old_rent: transfer.old_rent,
      new_rent: transfer.new_rent,
      reason: transfer.reason,
    },
    icon: "ArrowRightLeft",
  }))
}

function normalizeExitEvents(clearances: any[]): JourneyEvent[] {
  const events: JourneyEvent[] = []

  clearances.forEach(clearance => {
    // Exit initiated event
    events.push({
      id: `exit_initiated_${clearance.id}`,
      timestamp: clearance.created_at,
      category: EventCategory.EXIT,
      type: EventType.EXIT_INITIATED,
      title: "Exit Process Initiated",
      description: `Expected exit: ${formatDate(clearance.expected_exit_date)} • Settlement: ${clearance.settlement_status}`,
      source_table: "exit_clearance",
      source_id: clearance.id,
      status: clearance.settlement_status,
      status_color: clearance.settlement_status === "cleared" ? "success" : "warning",
      related_entities: {
        property_id: clearance.property?.id,
        property_name: clearance.property?.name,
        room_id: clearance.room?.id,
        room_number: clearance.room?.room_number,
      },
      metadata: {
        notice_given_date: clearance.notice_given_date,
        expected_exit_date: clearance.expected_exit_date,
        total_dues: clearance.total_dues,
        total_refundable: clearance.total_refundable,
        final_amount: clearance.final_amount,
        deductions: clearance.deductions,
      },
      icon: "LogOut",
      action_url: `/exit-clearance/${clearance.id}`,
    })

    // Exit completed event
    if (clearance.completed_at && clearance.settlement_status === "cleared") {
      events.push({
        id: `exit_completed_${clearance.id}`,
        timestamp: clearance.completed_at,
        category: EventCategory.EXIT,
        type: EventType.CHECKOUT_COMPLETED,
        title: "Exit Completed",
        description: `Final settlement: ${formatCurrency(clearance.final_amount || 0)} • Keys returned: ${clearance.key_returned ? "Yes" : "No"}`,
        source_table: "exit_clearance",
        source_id: clearance.id,
        amount: clearance.final_amount,
        amount_type: clearance.final_amount > 0 ? "debit" : "credit",
        status: "completed",
        status_color: "success",
        metadata: {
          room_inspection_done: clearance.room_inspection_done,
          key_returned: clearance.key_returned,
          actual_exit_date: clearance.actual_exit_date,
        },
        icon: "CheckCircle2",
      })
    }
  })

  return events
}

function normalizeRefundEvents(refunds: any[]): JourneyEvent[] {
  return refunds.map(refund => ({
    id: `refund_${refund.id}`,
    timestamp: refund.processed_at || refund.created_at,
    category: EventCategory.FINANCIAL,
    type: EventType.REFUND_PROCESSED,
    title: `Refund ${refund.status === "completed" ? "Processed" : refund.status === "pending" ? "Pending" : "Initiated"}`,
    description: `${formatCurrency(refund.amount)} via ${getPaymentMethodLabel(refund.payment_mode)} • ${refund.refund_type?.replace(/_/g, " ")}`,
    source_table: "refunds",
    source_id: refund.id,
    amount: refund.amount,
    amount_type: "credit",
    status: refund.status,
    status_color: refund.status === "completed" ? "success" : refund.status === "failed" ? "error" : "warning",
    metadata: {
      refund_type: refund.refund_type,
      payment_mode: refund.payment_mode,
      reason: refund.reason,
      notes: refund.notes,
      refund_date: refund.refund_date,
    },
    icon: "RotateCcw",
    action_url: `/refunds/${refund.id}`,
  }))
}

function normalizeVisitorEvents(visitors: any[]): JourneyEvent[] {
  return visitors.map(visitor => ({
    id: `visitor_${visitor.id}`,
    timestamp: visitor.check_in_time || visitor.created_at,
    category: EventCategory.VISITOR,
    type: EventType.VISITOR_LOGGED,
    title: `Visitor: ${visitor.visitor_name}`,
    description: `${visitor.relation || "Visitor"} • ${visitor.purpose || "Visit"}${visitor.is_overnight ? " • Overnight" : ""}`,
    source_table: "visitors",
    source_id: visitor.id,
    status: visitor.check_out_time ? "completed" : "active",
    status_color: visitor.check_out_time ? "muted" : "info",
    metadata: {
      visitor_phone: visitor.visitor_phone,
      relation: visitor.relation,
      purpose: visitor.purpose,
      is_overnight: visitor.is_overnight,
      check_in_time: visitor.check_in_time,
      check_out_time: visitor.check_out_time,
    },
    icon: "Users",
  }))
}

function normalizeMeterEvents(readings: any[]): JourneyEvent[] {
  return readings.map(reading => ({
    id: `meter_${reading.id}`,
    timestamp: reading.created_at || `${reading.reading_date}T00:00:00Z`,
    category: EventCategory.ACCOMMODATION,
    type: EventType.METER_READING,
    title: `Meter Reading: ${reading.charge_type?.name || "Utility"}`,
    description: `${reading.units_consumed} units consumed • ${formatCurrency(reading.amount || 0)}`,
    source_table: "meter_readings",
    source_id: reading.id,
    amount: reading.amount,
    amount_type: "debit",
    status: "recorded",
    status_color: "muted",
    metadata: {
      reading_value: reading.reading_value,
      previous_reading: reading.previous_reading,
      units_consumed: reading.units_consumed,
      charge_type: reading.charge_type?.name,
      reading_date: reading.reading_date,
    },
    icon: "Gauge",
  }))
}

// ============================================
// Analytics Calculation
// ============================================

async function calculateAnalytics(
  supabase: ReturnType<typeof createClient>,
  tenant_id: string,
  tenant: any
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

  const stays = staysResult.data || []
  const bills = billsResult.data || []
  const payments = paymentsResult.data || []
  const complaints = complaintsResult.data || []

  // Calculate stay duration
  const checkInDate = tenant.check_in_date ? new Date(tenant.check_in_date) : new Date()
  const today = new Date()
  const totalStayDays = daysBetween(checkInDate, today)

  // Calculate payment metrics
  const billsPaid = bills.filter((b: { status: string }) => b.status === "paid")
  const totalBillsPaid = billsPaid.length

  // Calculate bills paid on time vs late
  let billsPaidOnTime = 0
  let billsPaidLate = 0
  let totalDaysToPaySum = 0
  let paidBillsWithDates = 0

  for (const bill of bills) {
    if (bill.status !== "paid") continue

    const billDate = new Date(bill.created_at || bill.bill_date)
    const dueDate = new Date(bill.due_date)

    // Find the payment closest to this bill
    const relevantPayments = payments.filter((p: { payment_date?: string; created_at: string }) => {
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
  if (stays.length > 0) {
    const stayDurations = stays.map((s: { join_date: string; exit_date?: string }) => {
      const start = new Date(s.join_date)
      const end = s.exit_date ? new Date(s.exit_date) : today
      return daysBetween(start, end)
    })
    avgStayDuration = Math.round(stayDurations.reduce((a: number, b: number) => a + b, 0) / stayDurations.length)
  }

  return {
    total_stay_days: totalStayDays,
    current_stay_days: totalStayDays,
    total_stays: stays.length || 1,
    average_stay_duration: avgStayDuration,
    total_revenue: payments.reduce((sum: number, p: { amount?: number }) => sum + (p.amount || 0), 0),
    total_payments: payments.length,
    total_bills_generated: bills.length,
    total_bills_paid: totalBillsPaid,
    bills_paid_on_time: billsPaidOnTime,
    bills_paid_late: billsPaidLate,
    average_days_to_pay: averageDaysToPay,
    total_complaints: complaints.length,
    complaints_resolved: complaints.filter((c: { status: string }) => c.status === "resolved" || c.status === "closed").length,
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

async function calculateFinancialSummary(
  supabase: ReturnType<typeof createClient>,
  tenant_id: string,
  tenant: any
): Promise<FinancialSummary> {
  const [billsResult, paymentsResult, chargesResult, refundsResult] = await Promise.all([
    supabase.from("bills").select("*").eq("tenant_id", tenant_id),
    supabase.from("payments").select("*, charge_type:charge_types(id, name, code)").eq("tenant_id", tenant_id),
    supabase.from("charges").select("*, charge_type:charge_types(id, name, code)").eq("tenant_id", tenant_id),
    supabase.from("refunds").select("*").eq("tenant_id", tenant_id),
  ])

  const bills = billsResult.data || []
  const payments = transformArrayJoins(paymentsResult.data || [], ["charge_type"])
  const charges = transformArrayJoins(chargesResult.data || [], ["charge_type"])
  const refunds = refundsResult.data || []

  // Calculate totals
  const totalBilled = bills.reduce((sum: number, b: { total_amount?: number }) => sum + (b.total_amount || 0), 0)
  const totalPaid = payments.reduce((sum: number, p: { amount?: number }) => sum + (p.amount || 0), 0)
  const totalOutstanding = bills
    .filter((b: { status: string }) => b.status !== "paid" && b.status !== "cancelled" && b.status !== "waived")
    .reduce((sum: number, b: { balance_due?: number }) => sum + (b.balance_due || 0), 0)
  const totalOverdue = bills
    .filter((b: { status: string }) => b.status === "overdue")
    .reduce((sum: number, b: { balance_due?: number }) => sum + (b.balance_due || 0), 0)

  // Build breakdown by charge type
  interface ChargeWithType {
    amount?: number
    paid_amount?: number
    charge_type?: { code?: string; name?: string }
  }
  const chargeTypeMap = new Map<string, { name: string; billed: number; paid: number }>()

  for (const charge of charges as ChargeWithType[]) {
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
  const pendingBills = bills
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
    total_refunds_processed: refunds
      .filter((r: { status: string }) => r.status === "completed")
      .reduce((sum: number, r: { amount?: number }) => sum + (r.amount || 0), 0),
    pending_refunds: refunds
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

function calculatePredictiveInsights(
  tenant: any,
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
      paymentScore += 10
    }
  } else if (analytics.total_bills_generated === 0) {
    paymentScore = 60 // New tenant
  }

  if (financial.total_overdue > 0) {
    paymentScore -= Math.min(20, Math.round(financial.total_overdue / 1000))
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
      created_at: new Date().toISOString(),
    })
  }

  if (financial.total_overdue > 0) {
    activeAlerts.push({
      id: "overdue_amount",
      type: "overdue",
      severity: financial.total_overdue > 5000 ? "high" : "medium",
      title: "Overdue Amount",
      description: `${formatCurrency(financial.total_overdue)} is overdue`,
      created_at: new Date().toISOString(),
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
      created_at: new Date().toISOString(),
    })
  }

  // === Recommendations ===
  if (financial.total_overdue > 0) {
    recommendations.push({
      type: "collection",
      priority: financial.total_overdue > 5000 ? "high" : "medium",
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

async function findLinkedVisitors(
  supabase: ReturnType<typeof createClient>,
  tenant_id: string,
  tenant: any
): Promise<{ linked: LinkedVisitor[]; preTenant: PreTenantVisit[] }> {
  // Get tenant's phone numbers for matching
  const tenantPhones: string[] = [tenant.phone].filter(Boolean)
  if (tenant.phone_numbers && Array.isArray(tenant.phone_numbers)) {
    tenant.phone_numbers.forEach((p: any) => {
      if (p.number) tenantPhones.push(p.number)
    })
  }

  const normalizedPhones = tenantPhones.map(normalizePhone).filter(Boolean)

  // 1. Find visitors who visited THIS tenant
  const { data: linkedVisitors } = await supabase
    .from("visitors")
    .select(`
      id, visitor_name, visitor_phone, relation, check_in_time, check_in_date
    `)
    .eq("tenant_id", tenant_id)
    .order("check_in_time", { ascending: false })
    .limit(50)

  // 2. Find if this tenant was a visitor before joining
  interface VisitorRecord {
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
      linked: (linkedVisitors || []).map((v: VisitorRecord) => ({
        visitor_id: v.id,
        visitor_name: v.visitor_name,
        visit_date: v.check_in_date || v.check_in_time,
        relationship: v.relation || "Not specified",
        matched_by: "manual" as const,
      })),
      preTenant: [],
    }
  }

  const { data: preTenantVisits } = await supabase
    .from("visitors")
    .select(`
      id, visitor_name, visitor_phone, check_in_time, check_in_date,
      tenant:tenants(id, name),
      property:properties(id, name)
    `)
    .lt("check_in_date", checkInDate)
    .order("check_in_time", { ascending: false })
    .limit(100)

  // Filter pre-tenant visits by phone match
  const matchedPreTenantVisits = (preTenantVisits || [])
    .filter((v: any) => {
      if (!v.visitor_phone) return false
      const normalizedVisitorPhone = normalizePhone(v.visitor_phone)
      return normalizedPhones.includes(normalizedVisitorPhone)
    })
    .map((v: any) => {
      const visitDate = new Date(v.check_in_date || v.check_in_time)
      const joinDate = new Date(checkInDate)
      const daysBeforeJoining = daysBetween(visitDate, joinDate)
      return {
        visitor_id: v.id,
        visited_tenant_name: transformJoin(v.tenant)?.name || "Unknown",
        visit_date: v.check_in_date || v.check_in_time,
        days_before_joining: daysBeforeJoining,
        property_name: transformJoin(v.property)?.name,
      }
    })

  return {
    linked: (linkedVisitors || []).map((v: VisitorRecord) => ({
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
// Event Category Counts
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
