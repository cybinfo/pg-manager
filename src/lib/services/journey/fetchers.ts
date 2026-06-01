import { createClient } from "@/lib/supabase/client"
import { transformArrayJoins } from "@/lib/supabase/transforms"
import { logger, extractErrorMeta } from "@/lib/logger"
import {
  EventFetchOptions,
  EventFetchResult,
  StayRecord,
  BillRecord,
  PaymentRecord,
  ChargeRecord,
  ComplaintRecord,
  TransferRecord,
  ExitClearanceRecord,
  RefundRecord,
  VisitorRecord,
  MeterReadingRecord,
} from "./types"
import {
  normalizeStayEvents,
  normalizeBillEvents,
  normalizePaymentEvents,
  normalizeChargeEvents,
  normalizeComplaintEvents,
  normalizeTransferEvents,
  normalizeExitEvents,
  normalizeRefundEvents,
  normalizeVisitorEvents,
  normalizeMeterEvents,
} from "./normalizers"

const journeyLogger = logger.child("journey")

// ============================================
// Individual Data Source Fetchers
// ============================================

export async function fetchTenantStays(supabase: ReturnType<typeof createClient>, tenant_id: string) {
  const { data, error } = await supabase
    .from("tenant_stays")
    .select(`
      id, join_date, exit_date, monthly_rent, security_deposit, status,
      stay_number, exit_reason, created_at,
      property:entities(id, name),
      room:rooms(id, room_number)
    `)
    .eq("tenant_id", tenant_id)
    .order("stay_number", { ascending: true })

  if (error) {
    journeyLogger.warn("Error fetching tenant stays", extractErrorMeta(error))
    return []
  }

  return transformArrayJoins(data || [], ["property", "room"])
}

export async function fetchBills(supabase: ReturnType<typeof createClient>, tenant_id: string) {
  const { data, error } = await supabase
    .from("bills")
    .select(`
      id, bill_number, bill_date, due_date, total_amount, paid_amount,
      balance_due, status, for_month, line_items, created_at,
      property:entities(id, name)
    `)
    .eq("tenant_id", tenant_id)
    .order("bill_date", { ascending: false })

  if (error) {
    journeyLogger.warn("Error fetching bills", extractErrorMeta(error))
    return []
  }

  return transformArrayJoins(data || [], ["property"])
}

export async function fetchPayments(supabase: ReturnType<typeof createClient>, tenant_id: string) {
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
    journeyLogger.warn("Error fetching payments", extractErrorMeta(error))
    return []
  }

  return transformArrayJoins(data || [], ["bill", "charge_type"])
}

export async function fetchCharges(supabase: ReturnType<typeof createClient>, tenant_id: string) {
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
    journeyLogger.warn("Error fetching charges", extractErrorMeta(error))
    return []
  }

  return transformArrayJoins(data || [], ["charge_type"])
}

export async function fetchComplaints(supabase: ReturnType<typeof createClient>, tenant_id: string) {
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
    journeyLogger.warn("Error fetching complaints", extractErrorMeta(error))
    return []
  }

  return transformArrayJoins(data || [], ["room"])
}

export async function fetchRoomTransfers(supabase: ReturnType<typeof createClient>, tenant_id: string) {
  const { data, error } = await supabase
    .from("room_transfers")
    .select(`
      id, transfer_date, reason, old_rent, new_rent, created_at,
      from_property:entities!room_transfers_from_entity_id_fkey(id, name),
      from_room:rooms!room_transfers_from_room_id_fkey(id, room_number),
      to_property:entities!room_transfers_to_entity_id_fkey(id, name),
      to_room:rooms!room_transfers_to_room_id_fkey(id, room_number)
    `)
    .eq("tenant_id", tenant_id)
    .order("transfer_date", { ascending: false })

  if (error) {
    journeyLogger.warn("Error fetching room transfers", extractErrorMeta(error))
    return []
  }

  return transformArrayJoins(data || [], ["from_property", "from_room", "to_property", "to_room"])
}

export async function fetchExitClearances(supabase: ReturnType<typeof createClient>, tenant_id: string) {
  const { data, error } = await supabase
    .from("exit_clearance")
    .select(`
      id, notice_given_date, expected_exit_date, actual_exit_date,
      total_dues, total_refundable, final_amount, deductions,
      settlement_status, room_inspection_done, key_returned,
      created_at, completed_at,
      property:entities(id, name),
      room:rooms(id, room_number)
    `)
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: false })

  if (error) {
    journeyLogger.warn("Error fetching exit clearances", extractErrorMeta(error))
    return []
  }

  return transformArrayJoins(data || [], ["property", "room"])
}

export async function fetchRefunds(supabase: ReturnType<typeof createClient>, tenant_id: string) {
  const { data, error } = await supabase
    .from("refunds")
    .select(`
      id, refund_type, amount, payment_mode, status,
      refund_date, reason, notes, processed_at, created_at
    `)
    .eq("tenant_id", tenant_id)
    .order("created_at", { ascending: false })

  if (error) {
    journeyLogger.warn("Error fetching refunds", extractErrorMeta(error))
    return []
  }

  return data || []
}

export async function fetchTenantVisitors(supabase: ReturnType<typeof createClient>, tenant_id: string) {
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
    journeyLogger.warn("Error fetching visitors", extractErrorMeta(error))
    return []
  }

  return data || []
}

export async function fetchMeterReadings(supabase: ReturnType<typeof createClient>, tenant_id: string) {
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
    journeyLogger.warn("Error fetching meter readings", extractErrorMeta(error))
    return []
  }

  return transformArrayJoins(data || [], ["charge_type"])
}

// ============================================
// Orchestrator
// ============================================

export async function fetchAndNormalizeEvents(
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
  const allEvents = [
    ...normalizeStayEvents(tenantStays as unknown as StayRecord[]),
    ...normalizeBillEvents(bills as unknown as BillRecord[]),
    ...normalizePaymentEvents(payments as unknown as PaymentRecord[]),
    ...normalizeChargeEvents(charges as unknown as ChargeRecord[]),
    ...normalizeComplaintEvents(complaints as unknown as ComplaintRecord[]),
    ...normalizeTransferEvents(roomTransfers as unknown as TransferRecord[]),
    ...normalizeExitEvents(exitClearances as unknown as ExitClearanceRecord[]),
    ...normalizeRefundEvents(refunds as unknown as RefundRecord[]),
    ...normalizeVisitorEvents(visitors as unknown as VisitorRecord[]),
    ...normalizeMeterEvents(meterReadings as unknown as MeterReadingRecord[]),
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
