import { normalizePhoneForComparison } from "@/lib/phone"
import { StatusColor, EventCategoryType } from "@/types/journey.types"
import { ONE_DAY_MS } from "@/lib/constants"

export type { StatusColor, EventCategoryType }

// ============================================
// Internal Record Interfaces
// ============================================

export interface StayRecord {
  id: string
  created_at?: string
  join_date: string
  exit_date?: string
  stay_number: number
  monthly_rent?: number
  status: string
  security_deposit?: number
  exit_reason?: string
  tenant_id: string
  property?: { id: string; name: string } | null
  room?: { id: string; room_number: string } | null
}

export interface BillRecord {
  id: string
  created_at: string
  bill_number: string
  total_amount: number
  balance_due: number
  paid_amount?: number
  for_month: string
  status: string
  due_date: string
  line_items?: unknown
  tenant_id: string
  property?: { id: string; name: string } | null
}

export interface PaymentRecord {
  id: string
  created_at: string
  amount: number
  payment_method: string
  for_period?: string
  reference_number?: string
  receipt_number?: string
  notes?: string
  bill?: { id: string; bill_number: string } | null
  charge_type?: { name?: string } | null
}

export interface ChargeRecord {
  id: string
  created_at: string
  amount?: number
  late_fee_applied?: number
  charge_type?: { name?: string } | null
}

export interface ComplaintRecord {
  id: string
  created_at: string
  title: string
  category: string
  priority: string
  description?: string
  status: string
  resolved_at?: string
  resolution_notes?: string
  room?: { id: string; room_number: string } | null
}

export interface TransferRecord {
  id: string
  created_at?: string
  transfer_date: string
  reason?: string
  old_rent: number
  new_rent: number
  from_room?: { room_number: string } | null
  to_room?: { id: string; room_number: string } | null
  from_property?: { name: string } | null
  to_property?: { id: string; name: string } | null
}

export interface ExitClearanceRecord {
  id: string
  created_at: string
  expected_exit_date: string
  settlement_status: string
  notice_given_date?: string
  total_dues?: number
  total_refundable?: number
  final_amount?: number
  deductions?: unknown
  completed_at?: string
  key_returned?: boolean
  room_inspection_done?: boolean
  actual_exit_date?: string
  property?: { id: string; name: string } | null
  room?: { id: string; room_number: string } | null
}

export interface RefundRecord {
  id: string
  created_at: string
  processed_at?: string
  amount: number
  status: string
  payment_mode: string
  refund_type?: string
  reason?: string
  notes?: string
  refund_date?: string
}

export interface VisitorRecord {
  id: string
  created_at: string
  visitor_name: string
  visitor_phone?: string
  relation?: string
  purpose?: string
  is_overnight?: boolean
  check_in_time?: string
  check_out_time?: string
}

export interface MeterReadingRecord {
  id: string
  created_at?: string
  reading_date: string
  reading_value?: number
  previous_reading?: number
  units_consumed: number
  amount?: number
  charge_type?: { name?: string } | null
}

/** Properties accessed on tenant records across analytics, financial, and predictive functions */
export interface TenantRecord {
  id: string
  name: string
  status: string
  photo_url?: string
  monthly_rent?: number
  check_in_date: string
  phone?: string
  phone_numbers?: Array<{ number?: string }>
  police_verification_status?: string
  agreement_signed?: boolean
  security_deposit_paid?: number
  security_deposit?: number
  advance_amount?: number
  advance_balance?: number
  property?: { id: string; name: string; address?: string } | null
  room?: { id: string; room_number: string; room_type?: string } | null
}

// ============================================
// Event Fetch Interfaces
// ============================================

export interface EventFetchOptions {
  limit: number
  offset: number
  categories?: EventCategoryType[]
  date_from?: string
  date_to?: string
}

export interface EventFetchResult {
  events: import("@/types/journey.types").JourneyEvent[]
  total: number
}

// ============================================
// Helper Functions
// ============================================

export function daysBetween(date1: Date, date2: Date): number {
  // CQ-010: Use named constant for day calculation
  return Math.floor(Math.abs((date2.getTime() - date1.getTime()) / ONE_DAY_MS))
}

// Phone normalization delegated to @/lib/phone
export const normalizePhone = normalizePhoneForComparison

export function getBillStatusColor(status: string): StatusColor {
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

export function getComplaintStatusColor(status: string): StatusColor {
  const map: Record<string, StatusColor> = {
    open: "error",
    acknowledged: "warning",
    in_progress: "info",
    resolved: "success",
    closed: "muted",
  }
  return map[status] || "muted"
}

export function getPaymentMethodLabel(method: string): string {
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
