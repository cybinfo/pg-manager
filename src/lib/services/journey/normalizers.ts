import {
  JourneyEvent,
  EventCategory,
  EventType,
} from "@/types/journey.types"
import { formatCurrency, formatDate } from "@/lib/format"
import {
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
  getBillStatusColor,
  getComplaintStatusColor,
  getPaymentMethodLabel,
} from "./types"

// ============================================
// Event Normalizers
// ============================================

export function normalizeStayEvents(stays: StayRecord[]): JourneyEvent[] {
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

export function normalizeBillEvents(bills: BillRecord[]): JourneyEvent[] {
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

export function normalizePaymentEvents(payments: PaymentRecord[]): JourneyEvent[] {
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

export function normalizeChargeEvents(charges: ChargeRecord[]): JourneyEvent[] {
  return charges
    .filter(charge => charge.late_fee_applied && charge.late_fee_applied > 0)
    .map(charge => ({
      id: `charge_latefee_${charge.id}`,
      timestamp: charge.created_at,
      category: EventCategory.FINANCIAL,
      type: EventType.LATE_FEE_APPLIED,
      title: "Late Fee Applied",
      description: `${formatCurrency(charge.late_fee_applied!)} late fee for ${charge.charge_type?.name || "charge"}`,
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

export function normalizeComplaintEvents(complaints: ComplaintRecord[]): JourneyEvent[] {
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

export function normalizeTransferEvents(transfers: TransferRecord[]): JourneyEvent[] {
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

export function normalizeExitEvents(clearances: ExitClearanceRecord[]): JourneyEvent[] {
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
        amount_type: (clearance.final_amount || 0) > 0 ? "debit" : "credit",
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

export function normalizeRefundEvents(refunds: RefundRecord[]): JourneyEvent[] {
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

export function normalizeVisitorEvents(visitors: VisitorRecord[]): JourneyEvent[] {
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

export function normalizeMeterEvents(readings: MeterReadingRecord[]): JourneyEvent[] {
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
